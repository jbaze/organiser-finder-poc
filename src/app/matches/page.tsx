"use client";

import * as React from "react";
import { GitMerge, Split } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/shared";
import { sourceName } from "@/lib/format";
import { AUTO_MERGE_THRESHOLD, REVIEW_THRESHOLD, normaliseAddress, normaliseDomain, normaliseEmail, normaliseName, normalisePhone } from "@/lib/normalise";
import type { MatchCandidate, MatchSide } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useDemoStore } from "@/store/demo-store";

type Compare = "same" | "equivalent" | "different";

const FIELDS: { key: keyof MatchSide; label: string; normalise: (v: string) => string }[] = [
  { key: "name", label: "Name", normalise: normaliseName },
  { key: "phone", label: "Phone", normalise: normalisePhone },
  { key: "address", label: "Address", normalise: normaliseAddress },
  { key: "postcode", label: "Postcode", normalise: (v) => v.trim() },
  { key: "website", label: "Website", normalise: normaliseDomain },
  { key: "email", label: "Email", normalise: (v) => normaliseEmail(v).split("@")[1] ?? "" },
];

function compare(a: string, b: string, normalise: (v: string) => string): Compare {
  if (a === b) return "same";
  return normalise(a) === normalise(b) ? "equivalent" : "different";
}

const CELL_TONE: Record<Compare, string> = {
  same: "",
  equivalent: "bg-sky-50 dark:bg-sky-950/30",
  different: "bg-amber-100/70 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
};

function MatchCard({ match }: { match: MatchCandidate }) {
  const sources = useDemoStore((s) => s.sources);
  const resolveMatch = useDemoStore((s) => s.resolveMatch);
  return (
    <Card className="gap-3">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">
          {match.left.name} <span className="text-muted-foreground font-normal">vs</span> {match.right.name}
        </CardTitle>
        <Badge variant="warning">{Math.round(match.confidence * 100)}% match</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b text-xs">
                <th className="text-muted-foreground w-24 px-3 py-2 text-left font-medium">Field</th>
                <th className="px-3 py-2 text-left font-medium">{sourceName(sources, match.left.sourceId)}</th>
                <th className="px-3 py-2 text-left font-medium">{sourceName(sources, match.right.sourceId)}</th>
              </tr>
            </thead>
            <tbody>
              {FIELDS.map(({ key, label, normalise }) => {
                const c = compare(match.left[key], match.right[key], normalise);
                return (
                  <tr key={key} className="border-b last:border-0">
                    <td className="text-muted-foreground px-3 py-2 text-xs">{label}</td>
                    <td className={cn("px-3 py-2 break-all", c !== "same" && CELL_TONE[c])}>{match.left[key]}</td>
                    <td className={cn("px-3 py-2 break-all", c !== "same" && CELL_TONE[c])}>
                      {match.right[key]}
                      {c === "equivalent" && <span className="text-sky-700 dark:text-sky-300 ml-2 text-[11px]">same after normalising</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ul className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {match.reasons.map((r) => (
              <li key={r}>• {r}</li>
            ))}
          </ul>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="outline" onClick={() => resolveMatch(match.id, "keep")}>
              <Split /> Keep separate
            </Button>
            <Button size="sm" onClick={() => resolveMatch(match.id, "merge")}>
              <GitMerge /> Merge
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MatchesPage() {
  const matches = useDemoStore((s) => s.matches);
  const pending = matches.filter((m) => m.status === "pending");
  const resolved = matches.filter((m) => m.status !== "pending");

  return (
    <>
      <PageHeader
        title="Match review"
        description={
          <>
            Pairs scoring between {Math.round(REVIEW_THRESHOLD * 100)}% and {Math.round(AUTO_MERGE_THRESHOLD * 100)}% are not merged
            automatically. Decide whether they are the same organiser. Amber cells differ, blue cells differ only in formatting.
          </>
        }
      />
      <div className="flex flex-col gap-4">
        {pending.length === 0 ? (
          <EmptyState>All uncertain matches are resolved. New ones appear here after runs.</EmptyState>
        ) : (
          pending.map((m) => <MatchCard key={m.id} match={m} />)
        )}
        {resolved.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resolved ({resolved.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y text-sm">
                {resolved.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                    <span className="truncate">
                      {m.left.name} / {m.right.name}
                    </span>
                    <Badge variant={m.status === "merged" ? "success" : "secondary"}>{m.status === "merged" ? "Merged" : "Kept separate"}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
