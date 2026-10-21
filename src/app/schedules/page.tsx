"use client";

import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageHeader, useNow } from "@/components/shared";
import { DAY_NAMES, ORGANISER_TYPE_LABEL, formatDateTime, nextRunAt, sourceName } from "@/lib/format";
import { useDemoStore } from "@/store/demo-store";

export default function SchedulesPage() {
  const schedules = useDemoStore((s) => s.schedules);
  const sources = useDemoStore((s) => s.sources);
  const toggleSchedule = useDemoStore((s) => s.toggleSchedule);
  const deleteSchedule = useDemoStore((s) => s.deleteSchedule);
  const now = useNow(30000);

  return (
    <>
      <PageHeader
        title="Schedules"
        description="Saved searches that run automatically. In the real system these are repeatable jobs on the queue."
        actions={
          <Button asChild>
            <Link href="/searches">
              <Plus /> New schedule
            </Link>
          </Button>
        }
      />
      {schedules.length === 0 ? (
        <EmptyState>No schedules yet. Create one from the Searches page.</EmptyState>
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Name</TableHead>
                  <TableHead>Filters</TableHead>
                  <TableHead>Sources</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next run</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead className="pr-5" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((s) => (
                  <TableRow key={s.id} className={s.enabled ? "" : "opacity-60"}>
                    <TableCell className="pl-5 font-medium">{s.name}</TableCell>
                    <TableCell className="max-w-72 whitespace-normal">
                      <div className="text-xs">
                        {s.criteria.states.join(", ")}
                        {s.criteria.suburbOrPostcode && ` · ${s.criteria.suburbOrPostcode} +${s.criteria.radiusKm}km`}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {s.criteria.types.map((t) => ORGANISER_TYPE_LABEL[t]).join(", ")}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-56 whitespace-normal text-xs">
                      {s.criteria.sourceIds.map((id) => sourceName(sources, id)).join(", ")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {s.frequency === "daily" ? "Daily" : `Weekly, ${DAY_NAMES[s.dayOfWeek]}`} at {s.time}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.enabled ? formatDateTime(nextRunAt(s, new Date(now)).toISOString()) : "Paused"}
                    </TableCell>
                    <TableCell>
                      <Switch checked={s.enabled} onCheckedChange={() => toggleSchedule(s.id)} aria-label={`Enable ${s.name}`} />
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <Button variant="ghost" size="icon" aria-label={`Delete ${s.name}`} onClick={() => deleteSchedule(s.id)}>
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
