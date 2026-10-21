// Builds the full demo dataset. Deterministic apart from dates, which are relative to `now`
// so the demo never looks stale.

import { matchScore, classifyMatch, normalisePhone } from "@/lib/normalise";
import type {
  ActivityEvent,
  DemoData,
  MatchCandidate,
  MatchSide,
  Organiser,
  OutreachStatus,
  Run,
  Schedule,
  SourceId,
  SuppressionEntry,
} from "@/lib/types";
import { buildRunLog, createRng, daysAgo, formatPhone, generateOrganiser, int, makeName, pick, slugify, type Rng } from "./generate";
import { CAMPAIGNS, ORGANISER_TYPES, PRODUCTS, SOURCES, STATES } from "./reference";

const BASE_ORGANISERS = 135;
const MATCH_PAIRS = 15;

const SHORT_FORMS: [RegExp, string][] = [
  [/Football Club$/, "FC"],
  [/Cricket Club$/, "CC"],
  [/Netball Club$/, "NC"],
  [/Primary School$/, "PS"],
  [/High School$/, "HS"],
  [/Centre$/, "Center"],
];

/** How another source might spell the same organiser's name. */
function variantOf(rng: Rng, name: string): string {
  const short = SHORT_FORMS.find(([re]) => re.test(name));
  const options = [`${name} Inc`, `The ${name} Incorporated`, name.toUpperCase()];
  if (short) options.push(name.replace(short[0], short[1]));
  return pick(rng, options);
}

function toSide(o: Organiser): MatchSide {
  const r = o.sourceRecords[0];
  return {
    organiserId: o.id,
    sourceId: r.sourceId,
    name: r.rawName,
    phone: r.phone,
    address: r.address,
    suburb: r.suburb,
    postcode: r.postcode,
    website: r.website,
    email: r.email,
  };
}

function buildRuns(now: Date): Run[] {
  const rng = createRng(7);
  const runs: Run[] = [];
  const plan: { sourceId: SourceId; daysAgo: number }[] = [
    { sourceId: "venue-directory", daysAgo: 13 },
    { sourceId: "sports-clubs", daysAgo: 12 },
    { sourceId: "school-events", daysAgo: 11 },
    { sourceId: "venue-directory", daysAgo: 9 },
    { sourceId: "sports-clubs", daysAgo: 8 },
    { sourceId: "school-events", daysAgo: 7 },
    { sourceId: "venue-directory", daysAgo: 5 },
    { sourceId: "sports-clubs", daysAgo: 4 },
    { sourceId: "school-events", daysAgo: 4 },
    { sourceId: "venue-directory", daysAgo: 2 },
    { sourceId: "sports-clubs", daysAgo: 1 },
    { sourceId: "school-events", daysAgo: 1 },
  ];
  plan.forEach((p, i) => {
    const source = SOURCES.find((s) => s.id === p.sourceId)!;
    const isLast = i === plan.length - 1;
    const start = daysAgo(now, p.daysAgo);
    start.setHours(2, int(rng, 0, 30), 0, 0);
    // The latest School Events run collects ~80% less than the one before, to show source health alerts.
    const collected = isLast ? 46 : int(rng, Math.round(source.expectedPerRun * 0.9), Math.round(source.expectedPerRun * 1.05));
    const duplicatesMerged = Math.round(collected * (0.25 + rng() * 0.15));
    const newOrganisers = isLast ? 1 : int(rng, 2, 9);
    const errors = isLast ? 3 : rng() < 0.25 ? int(rng, 1, 2) : 0;
    const stats = { collected, expected: source.expectedPerRun, newOrganisers, duplicatesMerged, errors };
    const log = buildRunLog(rng, start, [source.name], stats);
    runs.push({
      id: `run_${String(i + 1).padStart(3, "0")}`,
      trigger: "schedule",
      sourceIds: [p.sourceId],
      criteria: { states: STATES, suburbOrPostcode: "", radiusKm: 0, types: ORGANISER_TYPES, sourceIds: [p.sourceId] },
      stage: "done",
      startedAt: start.toISOString(),
      finishedAt: log[log.length - 1].at,
      ...stats,
      log,
    });
  });
  return runs.reverse();
}

function buildSchedules(now: Date): Schedule[] {
  const created = daysAgo(now, 20).toISOString();
  return [
    {
      id: "sch_1",
      name: "Nightly sweep, all sources",
      criteria: { states: STATES, suburbOrPostcode: "", radiusKm: 0, types: ORGANISER_TYPES, sourceIds: ["venue-directory", "sports-clubs", "school-events"] },
      frequency: "daily",
      time: "02:00",
      dayOfWeek: 1,
      enabled: true,
      createdAt: created,
    },
    {
      id: "sch_2",
      name: "Melbourne sports clubs",
      criteria: { states: ["VIC"], suburbOrPostcode: "3000", radiusKm: 40, types: ["sports_club"], sourceIds: ["sports-clubs"] },
      frequency: "weekly",
      time: "06:30",
      dayOfWeek: 1,
      enabled: true,
      createdAt: created,
    },
    {
      id: "sch_3",
      name: "SE QLD schools (paused)",
      criteria: { states: ["QLD"], suburbOrPostcode: "4000", radiusKm: 80, types: ["school"], sourceIds: ["school-events"] },
      frequency: "weekly",
      time: "05:00",
      dayOfWeek: 4,
      enabled: false,
      createdAt: created,
    },
  ];
}

export function buildSeed(now: Date = new Date()): DemoData {
  const rng = createRng(20261021);
  const runs = buildRuns(now);
  const usedNames = new Set<string>();
  const organisers: Organiser[] = [];

  for (let i = 0; i < BASE_ORGANISERS; i++) {
    const organiser = generateOrganiser(rng, {
      id: `org_${String(i + 1).padStart(3, "0")}`,
      type: ORGANISER_TYPES[i % ORGANISER_TYPES.length],
      state: STATES[Math.floor(rng() * STATES.length)],
      now,
      runId: pick(rng, runs).id,
      usedNames,
    });
    organisers.push(organiser);
  }

  // Review and outreach state so every page has something to show.
  const pushedMix: OutreachStatus[] = ["in_instantly", "in_instantly", "in_instantly", "in_instantly", "replied", "replied", "bounced", "unsubscribed"];
  for (const o of organisers) {
    const r = rng();
    o.reviewStatus = r < 0.5 ? "pending" : r < 0.82 ? "approved" : "rejected";
    if (o.reviewStatus === "approved" && o.contacts[0].verification !== "invalid" && rng() < 0.5) {
      o.outreachStatus = pick(rng, pushedMix);
    }
  }

  // Guarantee a few of each outcome so the suppression list and feed show every kind of event.
  const live = organisers.filter((o) => o.outreachStatus === "in_instantly");
  (["bounced", "bounced", "unsubscribed", "replied"] as OutreachStatus[]).forEach((status, i) => {
    if (live[i]) live[i].outreachStatus = status;
  });

  // Uncertain match pairs: some are real duplicates, some are different organisers sharing a building.
  const matches: MatchCandidate[] = [];
  let next = BASE_ORGANISERS + 1;
  for (let i = 0; matches.length < MATCH_PAIRS && i < organisers.length * 3; i++) {
    const base = organisers[(i * 7) % BASE_ORGANISERS];
    if (base.reviewStatus !== "pending" || matches.some((m) => m.left.organiserId === base.id)) continue;
    const isDuplicate = matches.length % 2 === 0;
    const baseRecord = base.sourceRecords[0];
    const otherSource = (["venue-directory", "sports-clubs", "school-events"] as SourceId[]).find(
      (s) => !base.sourceRecords.some((r) => r.sourceId === s),
    ) ?? "venue-directory";
    const id = `org_${String(next).padStart(3, "0")}`;
    const twin = generateOrganiser(rng, { id, type: base.type, state: base.state, now, runId: base.runId, usedNames, allowedSources: [otherSource] });

    // Duplicates: another spelling of the same name. Non-duplicates: a different organiser in the same building.
    let name = isDuplicate ? variantOf(rng, base.name) : makeName(rng, base.type, base.suburb).canonical;
    for (let tries = 0; !isDuplicate && (name === base.name || usedNames.has(name)) && tries < 10; tries++) {
      name = makeName(rng, base.type, base.suburb).canonical;
    }
    const domain = `example-${slugify(name)}.test`;
    const oldDomain = twin.website.replace("https://www.", "");

    Object.assign(twin, {
      name,
      suburb: base.suburb,
      postcode: base.postcode,
      address: base.address,
      website: `https://www.${domain}`,
      phone: formatPhone(normalisePhone(baseRecord.phone), 1),
      contacts: twin.contacts.map((c) => ({ ...c, email: c.email.replace(oldDomain, domain) })),
    });
    twin.sourceRecords = [
      {
        ...twin.sourceRecords[0],
        rawName: name,
        website: twin.website,
        email: twin.contacts[0].email,
        sourceUrl: twin.sourceRecords[0].sourceUrl.replace(/[^/]+$/, slugify(name)),
        suburb: base.suburb,
        postcode: base.postcode,
        address: base.address.replace(/ Street$| Road$| Avenue$| Parade$/, (m) => ({ " Street": " St", " Road": " Rd", " Avenue": " Ave", " Parade": " Pde" })[m] ?? m),
        phone: twin.phone,
      },
    ];
    twin.reviewStatus = "pending";
    twin.outreachStatus = "not_pushed";

    const left = toSide(base);
    const right = toSide(twin);
    const result = matchScore(left, right);
    if (classifyMatch(result.score) !== "review") continue;

    usedNames.add(name);
    organisers.push(twin);
    next++;
    matches.push({
      id: `mtc_${String(matches.length + 1).padStart(2, "0")}`,
      left,
      right,
      confidence: result.score,
      reasons: result.reasons,
      status: "pending",
    });
  }

  // Suppression: real bounces/unsubscribes, plus manual entries that block approved leads from a push.
  const suppression: SuppressionEntry[] = [];
  const activity: ActivityEvent[] = [];
  let sid = 1;
  let aid = 1;
  const addActivity = (e: Omit<ActivityEvent, "id">) => activity.push({ id: `act_${aid++}`, ...e });

  for (const o of organisers) {
    const contact = o.contacts[0];
    if (o.outreachStatus === "not_pushed") continue;
    const pushedAt = daysAgo(now, int(rng, 3, 12));
    addActivity({ at: pushedAt.toISOString(), kind: "pushed", organiserId: o.id, email: contact.email, message: `Pushed to Instantly campaign`, crmSynced: true });
    const later = new Date(pushedAt.getTime() + int(rng, 1, 48) * 3600 * 1000).toISOString();
    if (o.outreachStatus === "replied") {
      addActivity({ at: later, kind: "reply", organiserId: o.id, email: contact.email, message: pick(rng, ["Interested, asked for a demo next week", "Asked about pricing for 3 events a year", "Forwarded to committee, will come back"]), crmSynced: true });
    } else if (o.outreachStatus === "bounced") {
      addActivity({ at: later, kind: "bounce", organiserId: o.id, email: contact.email, message: "Hard bounce: mailbox does not exist", crmSynced: true });
      suppression.push({ id: `sup_${sid++}`, email: contact.email, reason: "bounce", note: "Hard bounce from Instantly", addedAt: later });
    } else if (o.outreachStatus === "unsubscribed") {
      addActivity({ at: later, kind: "unsubscribe", organiserId: o.id, email: contact.email, message: "Clicked unsubscribe link", crmSynced: true });
      suppression.push({ id: `sup_${sid++}`, email: contact.email, reason: "unsubscribe", note: "Unsubscribed via Instantly", addedAt: later });
    }
  }

  const blockable = organisers.filter((o) => o.reviewStatus === "approved" && o.outreachStatus === "not_pushed" && o.contacts[0].verification === "valid");
  for (const o of blockable.slice(0, 3)) {
    suppression.push({ id: `sup_${sid++}`, email: o.contacts[0].email, reason: "manual", note: "Asked not to be contacted (phone call)", addedAt: daysAgo(now, int(rng, 5, 30)).toISOString() });
  }
  suppression.push({ id: `sup_${sid++}`, email: "noreply@example-council.test", reason: "manual", note: "Council addresses excluded by policy", addedAt: daysAgo(now, 40).toISOString() });

  activity.sort((a, b) => b.at.localeCompare(a.at));

  return {
    sources: SOURCES.map((s) => ({ ...s })),
    organisers,
    runs,
    schedules: buildSchedules(now),
    matches,
    products: PRODUCTS.map((p) => ({ ...p, audienceTypes: [...p.audienceTypes] })),
    campaigns: CAMPAIGNS.map((c) => ({ ...c })),
    suppression,
    activity,
    compliance: {
      retentionDays: 365,
      senderName: "Example Software Pty Ltd (placeholder)",
      senderAddress: "Level 1, 1 Example St, Melbourne VIC 3000",
      includeUnsubscribeLink: true,
    },
  };
}
