"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared";
import { RUN_STAGE_LABEL, formatDateTime, formatDuration, sourceName } from "@/lib/format";
import type { Run, Source } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useDemoStore } from "@/store/demo-store";

function RunDetail({ run, sources }: { run: Run; sources: Source[] }) {
  const stats: [string, number][] = [
    ["Expected", run.expected],
    ["Collected", run.collected],
    ["New organisers", run.newOrganisers],
    ["Duplicates merged", run.duplicatesMerged],
    ["Errors", run.errors],
  ];
  return (
    <>
      <SheetHeader>
        <SheetTitle>Run {run.id}</SheetTitle>
        <SheetDescription>
          {run.sourceIds.map((id) => sourceName(sources, id)).join(", ")} · {run.trigger === "manual" ? "Run manually" : "Scheduled"} ·{" "}
          {formatDateTime(run.startedAt)}
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-5 overflow-y-auto px-5 pb-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-lg border p-3">
              <div className="text-muted-foreground text-xs">{label}</div>
              <div className="text-lg font-semibold tabular-nums">{run.stage === "done" ? value : "-"}</div>
            </div>
          ))}
        </div>
        <div>
          <div className="mb-2 text-sm font-medium">Worker log (mock)</div>
          {run.log.length === 0 ? (
            <div className="text-muted-foreground text-sm">Log appears when the run finishes. Current stage: {RUN_STAGE_LABEL[run.stage]}.</div>
          ) : (
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 font-mono text-xs leading-relaxed">
              {run.log.map((line, i) => (
                <div
                  key={i}
                  className={cn(
                    line.level === "warn" && "text-amber-700 dark:text-amber-400",
                    line.level === "error" && "text-red-700 dark:text-red-400",
                  )}
                >
                  {new Date(line.at).toLocaleTimeString("en-AU", { hour12: false })} {line.level.toUpperCase().padEnd(5)} {line.message}
                </div>
              ))}
            </pre>
          )}
        </div>
      </div>
    </>
  );
}

function RunsContent() {
  const runs = useDemoStore((s) => s.runs);
  const sources = useDemoStore((s) => s.sources);
  const params = useSearchParams();
  const router = useRouter();
  const selectedId = params.get("run");
  const selected = runs.find((r) => r.id === selectedId) ?? null;

  const open = (id: string | null) => router.replace(id ? `/runs?run=${id}` : "/runs", { scroll: false });

  return (
    <>
      <PageHeader title="Runs" description="History of scraping jobs. Click a run to see its log." />
      <Card className="py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Source</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Collected</TableHead>
                <TableHead className="text-right">New</TableHead>
                <TableHead className="text-right">Duplicates merged</TableHead>
                <TableHead className="pr-5 text-right">Errors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((r) => {
                const low = r.stage === "done" && r.collected < r.expected * 0.5;
                return (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => open(r.id)}>
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r.sourceIds.map((id) => sourceName(sources, id)).join(", ")}</span>
                        {r.trigger === "manual" && <Badge variant="outline">manual</Badge>}
                        {r.stage !== "done" && <Badge variant="info">{RUN_STAGE_LABEL[r.stage]}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(r.startedAt)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDuration(r.startedAt, r.finishedAt)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.stage === "done" ? r.expected : "-"}</TableCell>
                    <TableCell className={cn("text-right tabular-nums", low && "font-semibold text-amber-700 dark:text-amber-400")}>
                      {r.stage === "done" ? r.collected : "-"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.stage === "done" ? r.newOrganisers : "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.stage === "done" ? r.duplicatesMerged : "-"}</TableCell>
                    <TableCell className={cn("pr-5 text-right tabular-nums", r.errors > 0 && "text-red-600 dark:text-red-400")}>
                      {r.stage === "done" ? r.errors : "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Sheet open={selected !== null} onOpenChange={(o) => !o && open(null)}>
        <SheetContent>{selected && <RunDetail run={selected} sources={sources} />}</SheetContent>
      </Sheet>
    </>
  );
}

export default function RunsPage() {
  return (
    <Suspense>
      <RunsContent />
    </Suspense>
  );
}
