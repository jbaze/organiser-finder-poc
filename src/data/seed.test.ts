import { describe, expect, it } from "vitest";
import { planPush } from "@/lib/push";
import { buildSeed } from "./seed";

describe("buildSeed", () => {
  const now = new Date("2026-10-21T09:00:00+11:00");
  const seed = buildSeed(now);

  it("creates about 150 organisers across all five states", () => {
    expect(seed.organisers.length).toBe(150);
    expect(new Set(seed.organisers.map((o) => o.state)).size).toBe(5);
    expect(new Set(seed.organisers.map((o) => o.id)).size).toBe(150);
  });

  it("gives every organiser 1 to 3 source records", () => {
    for (const o of seed.organisers) {
      expect(o.sourceRecords.length).toBeGreaterThanOrEqual(1);
      expect(o.sourceRecords.length).toBeLessThanOrEqual(3);
    }
  });

  it("only uses fake .test domains", () => {
    for (const o of seed.organisers) {
      expect(o.website).toMatch(/\.test$/);
      for (const c of o.contacts) expect(c.email).toMatch(/\.test$/);
    }
  });

  it("has 15 uncertain match pairs", () => {
    expect(seed.matches).toHaveLength(15);
    for (const m of seed.matches) {
      expect(m.confidence).toBeGreaterThanOrEqual(0.55);
      expect(m.confidence).toBeLessThan(0.85);
    }
  });

  it("is deterministic", () => {
    expect(buildSeed(now).organisers.map((o) => o.name)).toEqual(seed.organisers.map((o) => o.name));
  });

  it("has approved leads that the suppression list blocks from a push", () => {
    const plan = planPush(seed.organisers, seed.products, seed.campaigns, seed.suppression);
    expect(plan.toPush.length).toBeGreaterThan(5);
    expect(plan.skipped.some((s) => s.reason === "suppressed")).toBe(true);
    expect(plan.skipped.some((s) => s.reason === "invalid_email")).toBe(true);
  });
});
