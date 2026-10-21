"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { buildRunLog, createRng, generateOrganiser, int, pick } from "@/data/generate";
import { ORGANISER_TYPES, STATES } from "@/data/reference";
import { buildSeed } from "@/data/seed";
import { RUN_STAGES, sourceName } from "@/lib/format";
import { normaliseEmail } from "@/lib/normalise";
import { planPush, primaryContact } from "@/lib/push";
import type {
  ActivityEvent,
  ComplianceSettings,
  DemoData,
  Organiser,
  OrganiserType,
  ReviewStatus,
  RunStage,
  Run,
  Schedule,
  SearchCriteria,
  Source,
  SourceId,
  SuppressionReason,
} from "@/lib/types";
import { uid } from "@/lib/utils";
import { safeStorage } from "./safe-storage";

const STAGE_MS = 1150; // 7 transitions, about 8 seconds per run
const CRM_SYNC_MS = 1600;

export type OrganiserEdit = Pick<Organiser, "name" | "phone" | "website">;

interface DemoActions {
  hydrated: boolean;
  simulateOutreach: boolean;
  setHydrated: () => void;
  resetDemo: () => void;

  setReviewStatus: (ids: string[], status: ReviewStatus) => void;
  updateOrganiser: (id: string, edit: OrganiserEdit) => void;

  startRun: (criteria: SearchCriteria) => string;
  finishInterruptedRuns: () => void;

  addSchedule: (schedule: Omit<Schedule, "id" | "createdAt">) => void;
  toggleSchedule: (id: string) => void;
  deleteSchedule: (id: string) => void;

  resolveMatch: (id: string, action: "merge" | "keep") => void;

  pushApproved: () => number;
  setSimulateOutreach: (on: boolean) => void;
  simulateOutreachEvent: () => void;

  addSuppression: (email: string, reason: SuppressionReason, note: string) => void;
  removeSuppression: (id: string) => void;

  addProduct: (name: string, audienceTypes: OrganiserType[], campaignName: string) => void;
  updateSource: (id: SourceId, patch: Partial<Pick<Source, "enabled" | "consentBasis">>) => void;
  updateCompliance: (patch: Partial<ComplianceSettings>) => void;
}

export type DemoState = DemoData & DemoActions;

function activity(e: Omit<ActivityEvent, "id" | "at">): ActivityEvent {
  return { id: uid("act"), at: new Date().toISOString(), ...e };
}

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => {
      /** Marks outreach events as synced to the CRM after a short delay, like a webhook round trip. */
      const syncToCrm = (ids: string[]) => {
        setTimeout(() => {
          set((s) => ({
            activity: s.activity.map((a) => (ids.includes(a.id) ? { ...a, crmSynced: true } : a)),
          }));
        }, CRM_SYNC_MS);
      };

      const completeRun = (runId: string) => {
        const state = get();
        const run = state.runs.find((r) => r.id === runId);
        if (!run || run.stage === "done") return;
        const rng = createRng(Date.now() % 2147483647);
        const now = new Date();
        const usedNames = new Set(state.organisers.map((o) => o.name));
        const states = run.criteria.states.length ? run.criteria.states : STATES;
        const types = run.criteria.types.length ? run.criteria.types : ORGANISER_TYPES;
        const count = int(rng, 3, 6);
        const found: Organiser[] = Array.from({ length: count }, () =>
          generateOrganiser(rng, {
            id: uid("org"),
            type: pick(rng, types),
            state: pick(rng, states),
            now,
            runId,
            usedNames,
            allowedSources: run.sourceIds,
          }),
        );
        const expected = run.sourceIds.reduce(
          (sum, id) => sum + Math.round((state.sources.find((s) => s.id === id)?.expectedPerRun ?? 100) / 4),
          0,
        );
        const collected = int(rng, Math.round(expected * 0.9), Math.round(expected * 1.05));
        const stats = {
          expected,
          collected,
          newOrganisers: found.length,
          duplicatesMerged: Math.round(collected * 0.3),
          errors: rng() < 0.3 ? 1 : 0,
        };
        const log = buildRunLog(
          rng,
          new Date(run.startedAt),
          run.sourceIds.map((id) => sourceName(state.sources, id)),
          stats,
        );
        set((s) => ({
          organisers: [...found, ...s.organisers],
          runs: s.runs.map((r) =>
            r.id === runId ? { ...r, ...stats, log, stage: "done", finishedAt: now.toISOString() } : r,
          ),
          activity: [
            ...found.map((o) =>
              activity({ kind: "discovered", organiserId: o.id, email: null, message: `Discovered by run ${runId}`, crmSynced: null }),
            ),
            ...s.activity,
          ],
        }));
      };

      return {
        ...buildSeed(),
        hydrated: false,
        simulateOutreach: true,
        setHydrated: () => set({ hydrated: true }),
        resetDemo: () => set({ ...buildSeed() }),

        setReviewStatus: (ids, status) =>
          set((s) => ({
            organisers: s.organisers.map((o) => (ids.includes(o.id) ? { ...o, reviewStatus: status } : o)),
            activity: [
              ...ids.map((id) =>
                activity({
                  kind: status === "approved" ? "approved" : "rejected",
                  organiserId: id,
                  email: null,
                  message: status === "pending" ? "Moved back to pending" : `Marked as ${status}`,
                  crmSynced: null,
                }),
              ),
              ...s.activity,
            ],
          })),

        updateOrganiser: (id, edit) =>
          set((s) => ({
            organisers: s.organisers.map((o) => (o.id === id ? { ...o, ...edit } : o)),
            activity: [activity({ kind: "edited", organiserId: id, email: null, message: "Record edited by reviewer", crmSynced: null }), ...s.activity],
          })),

        startRun: (criteria) => {
          const run: Run = {
            id: uid("run"),
            trigger: "manual",
            sourceIds: criteria.sourceIds,
            criteria,
            stage: "queued",
            startedAt: new Date().toISOString(),
            finishedAt: null,
            expected: 0,
            collected: 0,
            newOrganisers: 0,
            duplicatesMerged: 0,
            errors: 0,
            log: [],
          };
          set((s) => ({ runs: [run, ...s.runs] }));
          RUN_STAGES.slice(1).forEach((stage, i) => {
            setTimeout(() => {
              if (stage === "done") {
                completeRun(run.id);
              } else {
                set((s) => ({
                  runs: s.runs.map((r) => (r.id === run.id && r.stage !== "done" ? { ...r, stage: stage as RunStage } : r)),
                }));
              }
            }, STAGE_MS * (i + 1));
          });
          return run.id;
        },

        // A reload mid-run loses its timers, so finish any run left in progress.
        finishInterruptedRuns: () => {
          get()
            .runs.filter((r) => r.stage !== "done")
            .forEach((r) => completeRun(r.id));
        },

        addSchedule: (schedule) =>
          set((s) => ({ schedules: [...s.schedules, { ...schedule, id: uid("sch"), createdAt: new Date().toISOString() }] })),
        toggleSchedule: (id) =>
          set((s) => ({ schedules: s.schedules.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)) })),
        deleteSchedule: (id) => set((s) => ({ schedules: s.schedules.filter((x) => x.id !== id) })),

        resolveMatch: (id, action) =>
          set((s) => {
            const match = s.matches.find((m) => m.id === id);
            if (!match) return {};
            const matches = s.matches.map((m) =>
              m.id === id ? { ...m, status: action === "merge" ? ("merged" as const) : ("kept_separate" as const) } : m,
            );
            if (action === "keep") {
              return {
                matches,
                activity: [
                  activity({ kind: "kept_separate", organiserId: match.left.organiserId, email: null, message: `Kept separate from "${match.right.name}"`, crmSynced: null }),
                  ...s.activity,
                ],
              };
            }
            const right = s.organisers.find((o) => o.id === match.right.organiserId);
            const organisers = s.organisers
              .filter((o) => o.id !== match.right.organiserId)
              .map((o) => {
                if (o.id !== match.left.organiserId || !right) return o;
                const emails = new Set(o.contacts.map((c) => normaliseEmail(c.email)));
                return {
                  ...o,
                  sourceRecords: [...o.sourceRecords, ...right.sourceRecords],
                  contacts: [
                    ...o.contacts,
                    ...right.contacts.filter((c) => !emails.has(normaliseEmail(c.email))).map((c) => ({ ...c, isPrimary: false })),
                  ],
                };
              });
            return {
              matches,
              organisers,
              activity: [
                activity({ kind: "merged", organiserId: match.left.organiserId, email: null, message: `Merged with "${match.right.name}" from ${sourceName(s.sources, match.right.sourceId)}`, crmSynced: null }),
                ...s.activity,
              ],
            };
          }),

        pushApproved: () => {
          const s = get();
          const plan = planPush(s.organisers, s.products, s.campaigns, s.suppression);
          const ids = new Set(plan.toPush.map((p) => p.organiser.id));
          const events = plan.toPush.map((p) =>
            activity({ kind: "pushed", organiserId: p.organiser.id, email: p.contact.email, message: `Pushed to "${p.campaign.name}"`, crmSynced: false }),
          );
          set({
            organisers: s.organisers.map((o) => (ids.has(o.id) ? { ...o, outreachStatus: "in_instantly" } : o)),
            activity: [...events, ...s.activity],
          });
          syncToCrm(events.map((e) => e.id));
          return ids.size;
        },

        setSimulateOutreach: (on) => set({ simulateOutreach: on }),

        simulateOutreachEvent: () => {
          const s = get();
          const live = s.organisers.filter((o) => o.outreachStatus === "in_instantly");
          if (live.length === 0) return;
          const target = live[Math.floor(Math.random() * live.length)];
          const email = primaryContact(target)?.email ?? null;
          const roll = Math.random();
          const kind: "reply" | "bounce" | "unsubscribe" = roll < 0.6 ? "reply" : roll < 0.8 ? "bounce" : "unsubscribe";
          const messages = {
            reply: [
              "Interested, can you send pricing?",
              "We run 4 events a year, happy to chat",
              "Please talk to our events coordinator instead",
              "Not right now, try again in February",
            ],
            bounce: ["Hard bounce: mailbox does not exist"],
            unsubscribe: ["Clicked unsubscribe link"],
          } as const;
          const event = activity({ kind, organiserId: target.id, email, message: pick(Math.random, messages[kind]), crmSynced: false });
          const status = kind === "reply" ? "replied" : kind === "bounce" ? "bounced" : "unsubscribed";
          const suppress = kind !== "reply" && email && !s.suppression.some((x) => normaliseEmail(x.email) === normaliseEmail(email));
          set({
            organisers: s.organisers.map((o) => (o.id === target.id ? { ...o, outreachStatus: status } : o)),
            activity: [event, ...s.activity],
            suppression: suppress
              ? [
                  { id: uid("sup"), email, reason: kind === "bounce" ? "bounce" : "unsubscribe", note: "Added automatically from Instantly webhook", addedAt: event.at },
                  ...s.suppression,
                ]
              : s.suppression,
          });
          syncToCrm([event.id]);
        },

        addSuppression: (email, reason, note) =>
          set((s) => ({
            suppression: [{ id: uid("sup"), email: email.trim(), reason, note, addedAt: new Date().toISOString() }, ...s.suppression],
            activity: [activity({ kind: "suppressed", organiserId: null, email: email.trim(), message: "Added to suppression list", crmSynced: null }), ...s.activity],
          })),
        removeSuppression: (id) => set((s) => ({ suppression: s.suppression.filter((x) => x.id !== id) })),

        addProduct: (name, audienceTypes, campaignName) =>
          set((s) => {
            const campaignId = uid("cmp");
            return {
              campaigns: [
                ...s.campaigns,
                { id: campaignId, name: campaignName, instantlyId: `inst-mock-${Math.random().toString(16).slice(2, 8)}`, dailySendLimit: 50 },
              ],
              products: [...s.products, { id: uid("prd"), name, audienceTypes, campaignId }],
            };
          }),
        updateSource: (id, patch) =>
          set((s) => ({ sources: s.sources.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
        updateCompliance: (patch) => set((s) => ({ compliance: { ...s.compliance, ...patch } })),
      };
    },
    {
      name: "organiser-finder-poc:v1",
      storage: createJSONStorage(() => safeStorage),
      skipHydration: true,
      partialize: (s): DemoData & { simulateOutreach: boolean } => ({
        sources: s.sources,
        organisers: s.organisers,
        runs: s.runs,
        schedules: s.schedules,
        matches: s.matches,
        products: s.products,
        campaigns: s.campaigns,
        suppression: s.suppression,
        activity: s.activity.slice(0, 400),
        compliance: s.compliance,
        simulateOutreach: s.simulateOutreach,
      }),
    },
  ),
);
