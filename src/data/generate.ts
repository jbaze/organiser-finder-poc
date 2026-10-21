// Deterministic mock data generator. Used for the seed and for organisers "found" by demo runs.

import { scoreSignals } from "@/lib/scoring";
import type {
  AustralianState,
  Contact,
  Organiser,
  OrganiserType,
  RunLogLine,
  SourceId,
  SourceRecord,
  VerificationStatus,
} from "@/lib/types";
import {
  AREA_CODE,
  FIRST_NAMES,
  LAST_NAMES,
  SOURCE_HOST,
  SOURCE_POOL,
  STREETS,
  STREET_TYPES,
  SUBURBS,
} from "./reference";

export type Rng = () => number;

/** mulberry32: small seeded PRNG so the seed data is the same on every load. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T,>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)];
export const int = (rng: Rng, min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;

const DAY_MS = 24 * 60 * 60 * 1000;
export const daysAgo = (now: Date, days: number) => new Date(now.getTime() - days * DAY_MS);
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface NameSet {
  canonical: string;
  /** Alternative spellings a different source might use. */
  variants: string[];
}

const SPORTS: { sport: string; abbr: string | null }[] = [
  { sport: "Football", abbr: "FC" },
  { sport: "Cricket", abbr: "CC" },
  { sport: "Netball", abbr: "NC" },
  { sport: "Tennis", abbr: "TC" },
  { sport: "Rugby", abbr: null },
  { sport: "Basketball", abbr: null },
  { sport: "Swimming", abbr: null },
  { sport: "Hockey", abbr: null },
];

const ADJECTIVES = ["Bright", "Harbour", "Golden", "Bluegum", "Coastal", "Southern", "Wattle", "Urban", "Summit", "Lantern"];
const SAINTS = ["Mary", "Joseph", "Patrick", "Brigid", "Andrew", "Monica", "Luke"];

export function makeName(rng: Rng, type: OrganiserType, suburb: string): NameSet {
  switch (type) {
    case "sports_club": {
      const { sport, abbr } = pick(rng, SPORTS);
      const canonical = `${suburb} ${sport} Club`;
      const variants = [`${canonical} Inc`, `The ${suburb} ${sport} Club Incorporated`];
      if (abbr) variants.unshift(`${suburb} ${abbr}`);
      return { canonical, variants };
    }
    case "school": {
      const kind = pick(rng, ["Primary School", "High School", "Public School", "Secondary College", "saint"]);
      if (kind === "saint") {
        const saint = pick(rng, SAINTS);
        return {
          canonical: `St ${saint}'s College ${suburb}`,
          variants: [`Saint ${saint}'s College, ${suburb}`, `St ${saint}s College`],
        };
      }
      const canonical = `${suburb} ${kind}`;
      const short = kind === "Primary School" ? "PS" : kind === "High School" ? "HS" : null;
      return {
        canonical,
        variants: short ? [`${suburb} ${short}`, `${canonical} P&C`] : [`${canonical} P&C`, `${canonical} Events`],
      };
    }
    case "venue": {
      const kind = pick(rng, ["Town Hall", "Function Centre", "RSL", "Bowls Club", "Civic Centre", "Showgrounds"]);
      const canonical = `${suburb} ${kind}`;
      return {
        canonical,
        variants: [`The ${canonical}`, `${canonical.replace("Centre", "Center")} Pty Ltd`],
      };
    }
    case "event_business": {
      const form = int(rng, 0, 2);
      const canonical =
        form === 0
          ? `${pick(rng, ADJECTIVES)} Events ${suburb}`
          : form === 1
            ? `${pick(rng, LAST_NAMES)} Event Hire`
            : `${pick(rng, ADJECTIVES)} Occasions`;
      return { canonical, variants: [`${canonical} Pty Ltd`, `${canonical} & Co`] };
    }
    case "community_group": {
      const kind = pick(rng, ["Rotary Club", "Lions Club", "Arts Society", "Community Garden", "Historical Society", "Multicultural Association"]);
      const canonical = `${suburb} ${kind}`;
      return { canonical, variants: [`${canonical} Inc`, `${canonical} Incorporated`] };
    }
  }
}

function phoneDigits(rng: Rng, state: AustralianState): string {
  if (rng() < 0.2) return `04${int(rng, 10, 99)}${int(rng, 100000, 999999)}`;
  return `${AREA_CODE[state]}${int(rng, 3000, 9999)}${int(rng, 1000, 9999)}`;
}

/** Formats a 10 digit national number in one of the styles sources use. */
export function formatPhone(digits: string, style: number): string {
  const mobile = digits.startsWith("04");
  if (mobile) {
    const local = `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    return style === 1 ? `+61 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}` : local;
  }
  const area = digits.slice(0, 2);
  const rest = `${digits.slice(2, 6)} ${digits.slice(6)}`;
  if (style === 1) return `+61 ${area.slice(1)} ${rest}`;
  if (style === 2) return `${area} ${rest}`;
  return `(${area}) ${rest}`;
}

const ROLES: Record<OrganiserType, string[]> = {
  sports_club: ["Secretary", "Events Coordinator", "President", "Treasurer"],
  school: ["Business Manager", "P&C President", "Events Coordinator"],
  venue: ["Venue Manager", "Bookings Manager", "Functions Coordinator"],
  event_business: ["Director", "Operations Manager"],
  community_group: ["Secretary", "President", "Volunteer Coordinator"],
};

const SIGNAL_RANGES: Record<OrganiserType, { events: [number, number]; attendance: [number, number] }> = {
  sports_club: { events: [10, 60], attendance: [80, 1500] },
  school: { events: [6, 25], attendance: [150, 1200] },
  venue: { events: [24, 150], attendance: [100, 5000] },
  event_business: { events: [20, 120], attendance: [50, 3000] },
  community_group: { events: [4, 30], attendance: [20, 400] },
};

function verification(rng: Rng): VerificationStatus {
  const r = rng();
  return r < 0.72 ? "valid" : r < 0.9 ? "risky" : "invalid";
}

export interface GenerateOptions {
  id: string;
  type: OrganiserType;
  state: AustralianState;
  now: Date;
  runId: string | null;
  usedNames: Set<string>;
  /** Restrict which sources the records can come from. */
  allowedSources?: SourceId[];
}

export function generateOrganiser(rng: Rng, opts: GenerateOptions): Organiser {
  const { type, state, now } = opts;
  let place = pick(rng, SUBURBS[state]);
  let names = makeName(rng, type, place.suburb);
  for (let attempt = 0; opts.usedNames.has(names.canonical) && attempt < 30; attempt++) {
    place = pick(rng, SUBURBS[state]);
    names = makeName(rng, type, place.suburb);
  }
  if (opts.usedNames.has(names.canonical)) {
    names = { ...names, canonical: `${names.canonical} ${opts.id.slice(-3).toUpperCase()}` };
  }
  opts.usedNames.add(names.canonical);

  const slug = slugify(names.canonical);
  const domain = `example-${slug}.test`;
  const digits = phoneDigits(rng, state);
  const streetNo = int(rng, 1, 240);
  const street = pick(rng, STREETS);
  const [stShort, stLong] = pick(rng, STREET_TYPES);

  const firstName = pick(rng, FIRST_NAMES);
  const lastName = pick(rng, LAST_NAMES);
  const contacts: Contact[] = [
    {
      id: `${opts.id}_c1`,
      name: `${firstName} ${lastName}`,
      role: pick(rng, ROLES[type]),
      email: rng() < 0.5 ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}` : `info@${domain}`,
      verification: verification(rng),
      isPrimary: true,
    },
  ];
  if (rng() < 0.45) {
    const f2 = pick(rng, FIRST_NAMES);
    const l2 = pick(rng, LAST_NAMES);
    contacts.push({
      id: `${opts.id}_c2`,
      name: `${f2} ${l2}`,
      role: pick(rng, ROLES[type]),
      email: `${pick(rng, ["events", "bookings", "admin"])}@${domain}`,
      verification: verification(rng),
      isPrimary: false,
    });
  }

  const pool = (opts.allowedSources?.length
    ? SOURCE_POOL[type].filter((s) => opts.allowedSources?.includes(s))
    : SOURCE_POOL[type]
  ).slice();
  if (pool.length === 0) pool.push(opts.allowedSources?.[0] ?? SOURCE_POOL[type][0]);
  const recordCount = Math.min(pool.length, 1 + (rng() < 0.55 ? 0 : rng() < 0.7 ? 1 : 2));

  const sourceRecords: SourceRecord[] = pool.slice(0, recordCount).map((sourceId, i) => {
    const rawName = i === 0 ? names.canonical : names.variants[(i - 1) % names.variants.length];
    return {
      id: `${opts.id}_r${i + 1}`,
      sourceId,
      rawName,
      phone: formatPhone(digits, i % 3),
      address: `${streetNo} ${street} ${i % 2 === 0 ? stLong : stShort}`,
      suburb: place.suburb,
      postcode: place.postcode,
      state,
      website: i === 1 ? `http://${domain}/contact` : `https://www.${domain}`,
      email: i === 0 ? contacts[0].email : `info@${domain}`,
      sourceUrl: `https://${SOURCE_HOST[sourceId]}/listing/${slug}`,
      collectedAt: daysAgo(now, int(rng, 0, 20)).toISOString(),
    };
  });

  const range = SIGNAL_RANGES[type];
  const signals = {
    eventsPerYear: int(rng, ...range.events),
    typicalAttendance: Math.round(int(rng, ...range.attendance) / 10) * 10,
    lastEventDate: isoDate(daysAgo(now, Math.floor(rng() * rng() * 330))),
  };

  return {
    id: opts.id,
    name: names.canonical,
    type,
    state,
    suburb: place.suburb,
    postcode: place.postcode,
    address: `${streetNo} ${street} ${stLong}`,
    website: `https://www.${domain}`,
    phone: formatPhone(digits, 0),
    sourceRecords,
    contacts,
    signals,
    score: scoreSignals(signals, now),
    reviewStatus: "pending",
    outreachStatus: "not_pushed",
    createdAt: sourceRecords[0].collectedAt,
    runId: opts.runId,
  };
}

/** A plausible worker log for a finished run. */
export function buildRunLog(
  rng: Rng,
  start: Date,
  sourceNames: string[],
  stats: { collected: number; expected: number; newOrganisers: number; duplicatesMerged: number; errors: number },
): RunLogLine[] {
  let t = start.getTime();
  const step = () => {
    t += int(rng, 400, 9000);
    return new Date(t).toISOString();
  };
  const lines: RunLogLine[] = [{ at: step(), level: "info", message: "Job picked up by worker mock-worker-1" }];
  for (const name of sourceNames) {
    lines.push({ at: step(), level: "info", message: `[${name}] Fetching listing pages (rate limit 1 req/s)` });
    lines.push({ at: step(), level: "info", message: `[${name}] Parsed ${int(rng, 3, 14)} pages` });
  }
  if (stats.errors > 0) {
    lines.push({ at: step(), level: "error", message: `${stats.errors} page(s) returned HTTP 503, will retry next run` });
  }
  if (stats.collected < stats.expected * 0.5) {
    lines.push({
      at: step(),
      level: "warn",
      message: `Collected ${stats.collected} records, expected about ${stats.expected}. Page layout may have changed.`,
    });
  }
  lines.push({ at: step(), level: "info", message: `Normalised ${stats.collected} records (names, phones, addresses, domains)` });
  lines.push({ at: step(), level: "info", message: `Merged ${stats.duplicatesMerged} duplicates, ${stats.newOrganisers} new organisers` });
  lines.push({ at: step(), level: "info", message: "Enrichment: looked up contact pages and staff listings" });
  lines.push({ at: step(), level: "info", message: "Email verification complete (mock verifier)" });
  lines.push({ at: step(), level: "info", message: "Run finished" });
  return lines;
}
