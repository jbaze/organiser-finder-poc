"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, MessageSquareReply, Send, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, useNow } from "@/components/shared";
import { formatDuration, sourceName, timeAgo } from "@/lib/format";
import { sourceHealth } from "@/lib/health";
import { useDemoStore } from "@/store/demo-store";

function Stat({ label, value, icon: Icon, href }: { label: string; value: number; icon: React.ElementType; href: string }) {
  return (
    <Link href={href} className="group">
      <Card className="group-hover:border-primary/40 gap-2 py-4 transition-colors">
        <CardContent className="flex items-center justify-between">
          <div>
            <div className="text-muted-foreground text-xs">{label}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
          </div>
          <div className="bg-primary/10 text-primary grid size-9 place-items-center rounded-lg">
            <Icon className="size-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const organisers = useDemoStore((s) => s.organisers);
  const runs = useDemoStore((s) => s.runs);
  const sources = useDemoStore((s) => s.sources);
  const now = useNow();

  const counts = React.useMemo(() => {
    let pending = 0;
    let approved = 0;
    let pushed = 0;
    let replies = 0;
    for (const o of organisers) {
      if (o.reviewStatus === "pending") pending++;
      if (o.reviewStatus === "approved") approved++;
      if (o.outreachStatus !== "not_pushed") pushed++;
      if (o.outreachStatus === "replied") replies++;
    }
    return { pending, approved, pushed, replies };
  }, [organisers]);

  const health = React.useMemo(() => sourceHealth(sources, runs), [sources, runs]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Pipeline overview: what was collected, what needs review and how outreach is going."
        actions={
          <Button asChild>
            <Link href="/searches">
              New search <ArrowRight />
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Stat label="Organisers" value={organisers.length} icon={Users} href="/organisers" />
        <Stat label="Pending review" value={counts.pending} icon={ClipboardCheck} href="/organisers" />
        <Stat label="Approved" value={counts.approved} icon={CheckCircle2} href="/organisers" />
        <Stat label="Pushed to Instantly" value={counts.pushed} icon={Send} href="/outreach" />
        <Stat label="Replies" value={counts.replies} icon={MessageSquareReply} href="/outreach" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Recent runs</CardTitle>
              <CardDescription>Latest scraping jobs across all sources</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/runs">All runs</Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Source</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Collected</TableHead>
                  <TableHead className="pr-5 text-right">New</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.slice(0, 6).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-2">
                        {r.sourceIds.map((id) => sourceName(sources, id)).join(", ")}
                        {r.stage !== "done" && <Badge variant="info">running</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{timeAgo(r.startedAt, now)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDuration(r.startedAt, r.finishedAt)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.stage === "done" ? r.collected : "-"}</TableCell>
                    <TableCell className="pr-5 text-right tabular-nums">{r.stage === "done" ? r.newOrganisers : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Sources health</CardTitle>
            <CardDescription>Last run compared with expected volume and the previous run</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {health.map((h) => (
              <div key={h.source.id} className={`rounded-lg border p-3 ${h.alert ? "border-amber-400/70 bg-amber-50 dark:bg-amber-950/30" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{h.source.name}</div>
                    <div className="text-muted-foreground text-xs">
                      Last run {h.lastRun ? timeAgo(h.lastRun.startedAt, now) : "never"}
                    </div>
                  </div>
                  {h.alert ? (
                    <Badge variant="warning">
                      <AlertTriangle /> Check source
                    </Badge>
                  ) : (
                    <Badge variant="success">Healthy</Badge>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">Expected</div>
                    <div className="font-medium tabular-nums">{h.source.expectedPerRun}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Collected</div>
                    <div className="font-medium tabular-nums">{h.collected ?? "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Previous</div>
                    <div className="font-medium tabular-nums">{h.previousCollected ?? "-"}</div>
                  </div>
                </div>
                {h.alert && h.change !== null && (
                  <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
                    Collected dropped {Math.round(Math.abs(h.change) * 100)}% vs last run. The page layout may have changed and the adapter
                    may need updating.
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
