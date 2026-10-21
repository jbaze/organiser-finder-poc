import type { ScoreBreakdown, Signal } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Score 0-100 from three signals:
 * - frequency (40): events per year, capped at weekly
 * - size (30): typical attendance on a log scale, capped at 5,000
 * - recency (30): full marks within 30 days of the last event, zero after a year
 */
export function scoreSignals(signal: Signal, now: Date): ScoreBreakdown {
  const frequency = Math.min(signal.eventsPerYear / 52, 1) * 40;
  const size =
    Math.min(Math.log10(Math.max(signal.typicalAttendance, 1)) / Math.log10(5000), 1) * 30;
  const daysSince = Math.max(0, (now.getTime() - new Date(signal.lastEventDate).getTime()) / DAY_MS);
  const recency = daysSince <= 30 ? 30 : Math.max(0, 30 * (1 - (daysSince - 30) / 335));
  const round = (n: number) => Math.round(n);
  return {
    frequency: round(frequency),
    size: round(size),
    recency: round(recency),
    total: round(frequency) + round(size) + round(recency),
  };
}
