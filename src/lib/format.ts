import type {
  OrganiserType,
  OutreachStatus,
  ReviewStatus,
  RunStage,
  Schedule,
  SourceId,
  Source,
} from "./types";

export const ORGANISER_TYPE_LABEL: Record<OrganiserType, string> = {
  venue: "Venue",
  event_business: "Event business",
  school: "School",
  sports_club: "Sports club",
  community_group: "Community group",
};

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export const OUTREACH_STATUS_LABEL: Record<OutreachStatus, string> = {
  not_pushed: "Not pushed",
  in_instantly: "In Instantly",
  replied: "Replied",
  bounced: "Bounced",
  unsubscribed: "Unsubscribed",
};

export const RUN_STAGES: RunStage[] = [
  "queued",
  "scraping",
  "normalising",
  "deduplicating",
  "enriching",
  "verifying",
  "done",
];

export const RUN_STAGE_LABEL: Record<RunStage, string> = {
  queued: "Queued",
  scraping: "Scraping",
  normalising: "Normalising",
  deduplicating: "Deduplicating",
  enriching: "Enriching",
  verifying: "Verifying emails",
  done: "Done",
};

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function sourceName(sources: Source[], id: SourceId): string {
  return sources.find((s) => s.id === id)?.name ?? id;
}

const dateTime = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const dateOnly = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" });

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

export function formatDate(iso: string): string {
  return dateOnly.format(new Date(iso));
}

export function formatDuration(startIso: string, endIso: string | null): string {
  if (!endIso) return "running";
  const secs = Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000));
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  return `${mins}m ${secs % 60}s`;
}

export function timeAgo(iso: string, now: number = Date.now()): string {
  const secs = Math.round((now - new Date(iso).getTime()) / 1000);
  if (secs < 45) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Next time a schedule fires after `from`. */
export function nextRunAt(schedule: Schedule, from: Date = new Date()): Date {
  const [h, m] = schedule.time.split(":").map(Number);
  const next = new Date(from);
  next.setSeconds(0, 0);
  next.setHours(h, m);
  if (schedule.frequency === "daily") {
    if (next <= from) next.setDate(next.getDate() + 1);
    return next;
  }
  let delta = (schedule.dayOfWeek - next.getDay() + 7) % 7;
  if (delta === 0 && next <= from) delta = 7;
  next.setDate(next.getDate() + delta);
  return next;
}
