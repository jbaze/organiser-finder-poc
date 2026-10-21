// Normalisation and deduplication helpers.
// The real system would run these in the worker after scraping; here they also drive the demo.

const ABBREVIATIONS: Record<string, string> = {
  fc: "football club",
  afc: "australian football club",
  sc: "sports club",
  cc: "cricket club",
  nc: "netball club",
  tc: "tennis club",
  rsl: "rsl",
  ps: "primary school",
  hs: "high school",
  st: "saint",
  assoc: "association",
  soc: "society",
  comm: "community",
  ctr: "centre",
  center: "centre",
  "&": "and",
};

const LEGAL_NOISE = new Set(["inc", "incorporated", "ltd", "limited", "pty", "co", "the", "assn"]);

const STREET_TYPES: Record<string, string> = {
  st: "street",
  rd: "road",
  ave: "avenue",
  av: "avenue",
  dr: "drive",
  pde: "parade",
  hwy: "highway",
  cres: "crescent",
  cct: "circuit",
  pl: "place",
  tce: "terrace",
  ct: "court",
  ln: "lane",
  bvd: "boulevard",
};

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** "Richmond FC" and "The Richmond Football Club Inc." both become "richmond football club". */
export function normaliseName(name: string): string {
  return tokens(name)
    .flatMap((t) => (ABBREVIATIONS[t] ?? t).split(" "))
    .filter((t) => !LEGAL_NOISE.has(t))
    .join(" ");
}

/** Converts Australian phone formats to a bare national number, e.g. "+61 3 9421 5521" to "0394215521". */
export function normalisePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("61") && digits.length === 11) digits = "0" + digits.slice(2);
  if (digits.length === 9 && !digits.startsWith("0")) digits = "0" + digits;
  return digits;
}

export function normaliseDomain(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normaliseAddress(address: string): string {
  return tokens(address)
    .map((t) => STREET_TYPES[t] ?? t)
    .join(" ");
}

/** Sorensen-Dice similarity on character bigrams, 0 to 1. */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigrams = (s: string) => {
    const map = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2);
      map.set(bg, (map.get(bg) ?? 0) + 1);
    }
    return map;
  };
  const left = bigrams(a);
  const right = bigrams(b);
  let overlap = 0;
  for (const [bg, count] of left) {
    overlap += Math.min(count, right.get(bg) ?? 0);
  }
  return (2 * overlap) / (a.length - 1 + (b.length - 1));
}

export interface MatchInput {
  name: string;
  phone: string;
  website: string;
  address: string;
  postcode: string;
}

export interface MatchResult {
  score: number;
  reasons: string[];
}

/** Weighted match score between two records, with human-readable reasons. */
export function matchScore(a: MatchInput, b: MatchInput): MatchResult {
  const reasons: string[] = [];
  const nameSim = similarity(normaliseName(a.name), normaliseName(b.name));
  const samePhone = normalisePhone(a.phone) !== "" && normalisePhone(a.phone) === normalisePhone(b.phone);
  const sameDomain = normaliseDomain(a.website) !== "" && normaliseDomain(a.website) === normaliseDomain(b.website);
  const samePostcode = a.postcode.trim() === b.postcode.trim();
  const addressSim = similarity(normaliseAddress(a.address), normaliseAddress(b.address));

  let score = nameSim * 0.45;
  reasons.push(`Name similarity ${Math.round(nameSim * 100)}%`);
  if (samePhone) {
    score += 0.2;
    reasons.push("Same phone number");
  }
  if (sameDomain) {
    score += 0.2;
    reasons.push("Same website domain");
  }
  if (samePostcode) {
    score += 0.05;
    reasons.push("Same postcode");
  }
  score += addressSim * 0.1;
  if (addressSim > 0.8) reasons.push("Address matches");

  return { score: Math.min(1, Math.round(score * 100) / 100), reasons };
}

export const AUTO_MERGE_THRESHOLD = 0.85;
export const REVIEW_THRESHOLD = 0.55;

export type MatchDecision = "auto_merge" | "review" | "distinct";

export function classifyMatch(score: number): MatchDecision {
  if (score >= AUTO_MERGE_THRESHOLD) return "auto_merge";
  if (score >= REVIEW_THRESHOLD) return "review";
  return "distinct";
}

/**
 * Groups records that auto-merge with each other (union-find over pairwise matches).
 * Returns groups of indexes into the input array.
 */
export function groupDuplicates<T extends MatchInput>(records: T[]): number[][] {
  const parent = records.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      if (classifyMatch(matchScore(records[i], records[j]).score) === "auto_merge") {
        parent[find(j)] = find(i);
      }
    }
  }
  const groups = new Map<number, number[]>();
  records.forEach((_, i) => {
    const root = find(i);
    groups.set(root, [...(groups.get(root) ?? []), i]);
  });
  return [...groups.values()];
}
