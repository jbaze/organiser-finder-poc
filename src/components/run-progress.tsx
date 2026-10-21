"use client";

import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RUN_STAGES, RUN_STAGE_LABEL, sourceName } from "@/lib/format";
import type { Run, Source } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RunProgress({ run, sources }: { run: Run; sources: Source[] }) {
  const index = RUN_STAGES.indexOf(run.stage);
  const done = run.stage === "done";
  const pct = Math.round((index / (RUN_STAGES.length - 1)) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {done ? <Check className="size-4 text-emerald-600" /> : <Loader2 className="text-primary size-4 animate-spin" />}
          {done ? "Run complete" : "Run in progress"}
        </CardTitle>
        <CardDescription>
          {run.sourceIds.map((id) => sourceName(sources, id)).join(", ")} · {run.id}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <Progress value={pct} />
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {RUN_STAGES.map((stage, i) => (
            <li
              key={stage}
              className={cn(
                "flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs",
                i < index || done ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400" : "",
                i === index && !done ? "border-primary bg-primary/5 text-primary font-medium" : "",
                i > index ? "text-muted-foreground" : "",
              )}
            >
              {i < index || done ? (
                <Check className="size-3.5" />
              ) : i === index ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <span className="size-3.5 rounded-full border" />
              )}
              {RUN_STAGE_LABEL[stage]}
            </li>
          ))}
        </ol>
        {done && (
          <div className="flex flex-col gap-3 rounded-lg border bg-emerald-50 p-4 text-sm sm:flex-row sm:items-center sm:justify-between dark:bg-emerald-950/30">
            <div>
              Collected <b>{run.collected}</b> records, merged <b>{run.duplicatesMerged}</b> duplicates and found{" "}
              <b>{run.newOrganisers}</b> new organisers.
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href={`/runs?run=${run.id}`}>View log</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href={`/organisers?run=${run.id}`}>Review new organisers</Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
