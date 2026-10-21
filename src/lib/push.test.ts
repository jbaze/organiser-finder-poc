import { describe, expect, it } from "vitest";
import { planPush } from "./push";
import type { Campaign, Contact, Organiser, Product, SuppressionEntry } from "./types";

const campaigns: Campaign[] = [{ id: "cmp_1", name: "Sports", instantlyId: "inst-1", dailySendLimit: 50 }];
const products: Product[] = [{ id: "prd_1", name: "Ticketing - Sports Clubs", audienceTypes: ["sports_club"], campaignId: "cmp_1" }];

function organiser(id: string, contact: Partial<Contact> | null, overrides: Partial<Organiser> = {}): Organiser {
  return {
    id,
    name: `Org ${id}`,
    type: "sports_club",
    state: "VIC",
    suburb: "Richmond",
    postcode: "3121",
    address: "1 Test St",
    website: `https://example-${id}.test`,
    phone: "(03) 9000 0000",
    sourceRecords: [],
    contacts: contact
      ? [{ id: `${id}_c`, name: "Test", role: "Secretary", email: `info@example-${id}.test`, verification: "valid", isPrimary: true, ...contact }]
      : [],
    signals: { eventsPerYear: 10, typicalAttendance: 100, lastEventDate: "2026-09-01" },
    score: { frequency: 10, size: 10, recency: 10, total: 30 },
    reviewStatus: "approved",
    outreachStatus: "not_pushed",
    createdAt: "2026-10-01T00:00:00.000Z",
    runId: null,
    ...overrides,
  };
}

const suppression: SuppressionEntry[] = [
  { id: "s1", email: "INFO@example-blocked.test", reason: "unsubscribe", note: "", addedAt: "2026-10-01T00:00:00.000Z" },
];

describe("planPush", () => {
  it("excludes suppressed emails, case-insensitively", () => {
    const plan = planPush([organiser("blocked", {})], products, campaigns, suppression);
    expect(plan.toPush).toHaveLength(0);
    expect(plan.skipped[0].reason).toBe("suppressed");
  });

  it("excludes invalid emails", () => {
    const plan = planPush([organiser("bad", { verification: "invalid" })], products, campaigns, []);
    expect(plan.toPush).toHaveLength(0);
    expect(plan.skipped[0].reason).toBe("invalid_email");
  });

  it("pushes valid emails and flags risky ones", () => {
    const plan = planPush(
      [organiser("ok", {}), organiser("maybe", { verification: "risky" })],
      products,
      campaigns,
      suppression,
    );
    expect(plan.toPush.map((p) => p.organiser.id)).toEqual(["ok", "maybe"]);
    expect(plan.toPush[1].risky).toBe(true);
    expect(plan.toPush[0].campaign.id).toBe("cmp_1");
  });

  it("ignores organisers that are not approved or already pushed", () => {
    const plan = planPush(
      [
        organiser("pending", {}, { reviewStatus: "pending" }),
        organiser("rejected", {}, { reviewStatus: "rejected" }),
        organiser("pushed", {}, { outreachStatus: "in_instantly" }),
      ],
      products,
      campaigns,
      [],
    );
    expect(plan.toPush).toHaveLength(0);
    expect(plan.skipped).toHaveLength(0);
  });

  it("skips organisers with no contact or no mapped campaign", () => {
    const plan = planPush(
      [organiser("nocontact", null), organiser("venue", {}, { type: "venue" })],
      products,
      campaigns,
      [],
    );
    expect(plan.skipped.map((s) => s.reason)).toEqual(["no_contact", "no_campaign"]);
  });
});
