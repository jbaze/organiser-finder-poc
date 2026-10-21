// All domain types for the Organiser Finder POC live in this file.

export type AustralianState = "NSW" | "VIC" | "QLD" | "WA" | "SA";

export type OrganiserType =
  | "venue"
  | "event_business"
  | "school"
  | "sports_club"
  | "community_group";

export type SourceId = "venue-directory" | "sports-clubs" | "school-events";

export type VerificationStatus = "valid" | "risky" | "invalid";

export type ReviewStatus = "pending" | "approved" | "rejected";

export type OutreachStatus =
  | "not_pushed"
  | "in_instantly"
  | "replied"
  | "bounced"
  | "unsubscribed";

export type ConsentBasis =
  | "Conspicuously published business address"
  | "Inferred consent (published for enquiries)"
  | "Express consent";

export interface Source {
  id: SourceId;
  name: string;
  description: string;
  enabled: boolean;
  consentBasis: ConsentBasis;
  /** Typical number of records a full run should collect. */
  expectedPerRun: number;
}

/** One raw record about an organiser, as collected from a single source. */
export interface SourceRecord {
  id: string;
  sourceId: SourceId;
  rawName: string;
  phone: string;
  address: string;
  suburb: string;
  postcode: string;
  state: AustralianState;
  website: string;
  email: string;
  sourceUrl: string;
  collectedAt: string;
}

export interface Contact {
  id: string;
  name: string;
  role: string;
  email: string;
  verification: VerificationStatus;
  isPrimary: boolean;
}

export interface Signal {
  eventsPerYear: number;
  typicalAttendance: number;
  /** ISO date (yyyy-mm-dd). */
  lastEventDate: string;
}

export interface ScoreBreakdown {
  frequency: number;
  size: number;
  recency: number;
  total: number;
}

/** The merged, deduplicated view of an organiser built from one or more source records. */
export interface Organiser {
  id: string;
  name: string;
  type: OrganiserType;
  state: AustralianState;
  suburb: string;
  postcode: string;
  address: string;
  website: string;
  phone: string;
  sourceRecords: SourceRecord[];
  contacts: Contact[];
  signals: Signal;
  score: ScoreBreakdown;
  reviewStatus: ReviewStatus;
  outreachStatus: OutreachStatus;
  createdAt: string;
  /** Run that first discovered this organiser. */
  runId: string | null;
}

export interface SearchCriteria {
  states: AustralianState[];
  suburbOrPostcode: string;
  radiusKm: number;
  types: OrganiserType[];
  sourceIds: SourceId[];
}

export type RunStage =
  | "queued"
  | "scraping"
  | "normalising"
  | "deduplicating"
  | "enriching"
  | "verifying"
  | "done";

export interface RunLogLine {
  at: string;
  level: "info" | "warn" | "error";
  message: string;
}

export interface Run {
  id: string;
  trigger: "manual" | "schedule";
  sourceIds: SourceId[];
  criteria: SearchCriteria;
  stage: RunStage;
  startedAt: string;
  finishedAt: string | null;
  expected: number;
  collected: number;
  newOrganisers: number;
  duplicatesMerged: number;
  errors: number;
  log: RunLogLine[];
}

export type ScheduleFrequency = "daily" | "weekly";

export interface Schedule {
  id: string;
  name: string;
  criteria: SearchCriteria;
  frequency: ScheduleFrequency;
  /** 24h "HH:mm", local time. */
  time: string;
  /** 0 = Sunday. Only used for weekly schedules. */
  dayOfWeek: number;
  enabled: boolean;
  createdAt: string;
}

export interface MatchSide {
  organiserId: string;
  sourceId: SourceId;
  name: string;
  phone: string;
  address: string;
  suburb: string;
  postcode: string;
  website: string;
  email: string;
}

export interface MatchCandidate {
  id: string;
  left: MatchSide;
  right: MatchSide;
  /** 0 to 1. Pairs between the auto-merge and auto-separate thresholds land here. */
  confidence: number;
  reasons: string[];
  status: "pending" | "merged" | "kept_separate";
}

export interface Campaign {
  id: string;
  name: string;
  /** Mock Instantly campaign id. */
  instantlyId: string;
  dailySendLimit: number;
}

export interface Product {
  id: string;
  name: string;
  audienceTypes: OrganiserType[];
  campaignId: string;
}

export type SuppressionReason = "unsubscribe" | "bounce" | "manual";

export interface SuppressionEntry {
  id: string;
  email: string;
  reason: SuppressionReason;
  note: string;
  addedAt: string;
}

export type ActivityKind =
  | "approved"
  | "rejected"
  | "edited"
  | "merged"
  | "kept_separate"
  | "pushed"
  | "reply"
  | "bounce"
  | "unsubscribe"
  | "suppressed"
  | "discovered";

export interface ActivityEvent {
  id: string;
  at: string;
  kind: ActivityKind;
  organiserId: string | null;
  email: string | null;
  message: string;
  /** Only meaningful for outreach events that the real system would sync to HubSpot/Attio. */
  crmSynced: boolean | null;
}

export interface ComplianceSettings {
  retentionDays: number;
  senderName: string;
  senderAddress: string;
  includeUnsubscribeLink: boolean;
}

export interface DemoData {
  sources: Source[];
  organisers: Organiser[];
  runs: Run[];
  schedules: Schedule[];
  matches: MatchCandidate[];
  products: Product[];
  campaigns: Campaign[];
  suppression: SuppressionEntry[];
  activity: ActivityEvent[];
  compliance: ComplianceSettings;
}
