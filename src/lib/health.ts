import type { Run, Source } from "./types";

export interface SourceHealth {
  source: Source;
  lastRun: Run | null;
  collected: number | null;
  previousCollected: number | null;
  /** Negative when collection dropped, e.g. -0.8 for an 80% drop. */
  change: number | null;
  alert: boolean;
}

const DROP_ALERT = -0.5;

/** Compares each source's last finished run with the one before to spot broken scrapers. */
export function sourceHealth(sources: Source[], runs: Run[]): SourceHealth[] {
  return sources.map((source) => {
    const finished = runs
      .filter((r) => r.stage === "done" && r.sourceIds.includes(source.id))
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    const share = (r: Run | undefined) => (r ? Math.round(r.collected / r.sourceIds.length) : null);
    const collected = share(finished[0]);
    const previousCollected = share(finished[1]);
    const change =
      collected !== null && previousCollected ? (collected - previousCollected) / previousCollected : null;
    return {
      source,
      lastRun: finished[0] ?? null,
      collected,
      previousCollected,
      change,
      alert: change !== null && change <= DROP_ALERT,
    };
  });
}
