"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarClock, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChipGroup, PageHeader } from "@/components/shared";
import { RunProgress } from "@/components/run-progress";
import { ORGANISER_TYPES, STATES } from "@/data/reference";
import { DAY_NAMES, ORGANISER_TYPE_LABEL } from "@/lib/format";
import type { AustralianState, OrganiserType, ScheduleFrequency, SourceId } from "@/lib/types";
import { useDemoStore } from "@/store/demo-store";

type Mode = "now" | "schedule";

export default function SearchesPage() {
  const sources = useDemoStore((s) => s.sources);
  const runs = useDemoStore((s) => s.runs);
  const startRun = useDemoStore((s) => s.startRun);
  const addSchedule = useDemoStore((s) => s.addSchedule);

  const [states, setStates] = React.useState<AustralianState[]>(["VIC", "NSW"]);
  const [suburb, setSuburb] = React.useState("");
  const [radius, setRadius] = React.useState(25);
  const [types, setTypes] = React.useState<OrganiserType[]>(["sports_club", "venue"]);
  const [sourceIds, setSourceIds] = React.useState<SourceId[]>(sources.filter((s) => s.enabled).map((s) => s.id));
  const [mode, setMode] = React.useState<Mode>("now");
  const [frequency, setFrequency] = React.useState<ScheduleFrequency>("weekly");
  const [time, setTime] = React.useState("03:00");
  const [day, setDay] = React.useState(1);
  const [scheduleName, setScheduleName] = React.useState("");
  const [activeRunId, setActiveRunId] = React.useState<string | null>(null);
  const [savedSchedule, setSavedSchedule] = React.useState(false);

  const activeRun = runs.find((r) => r.id === activeRunId) ?? null;
  const running = activeRun !== null && activeRun.stage !== "done";
  const valid = states.length > 0 && types.length > 0 && sourceIds.length > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const criteria = { states, suburbOrPostcode: suburb.trim(), radiusKm: suburb.trim() ? radius : 0, types, sourceIds };
    if (mode === "now") {
      setActiveRunId(startRun(criteria));
      setSavedSchedule(false);
    } else {
      addSchedule({
        name: scheduleName.trim() || `${states.join("/")} ${types.map((t) => ORGANISER_TYPE_LABEL[t]).join(", ")}`,
        criteria,
        frequency,
        time,
        dayOfWeek: day,
        enabled: true,
      });
      setSavedSchedule(true);
    }
  };

  return (
    <>
      <PageHeader
        title="Searches"
        description="Choose where and what to look for. Run it now to watch the pipeline, or save it as a schedule."
      />

      <div className="grid gap-6 xl:grid-cols-5">
        <form onSubmit={submit} className="xl:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>New search</CardTitle>
              <CardDescription>In the real system each source has its own adapter that turns these filters into requests.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <Label>States</Label>
                <ChipGroup label="States" options={STATES.map((s) => ({ value: s, label: s }))} value={states} onChange={setStates} />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <Label htmlFor="suburb">Suburb or postcode (optional)</Label>
                  <Input id="suburb" placeholder="e.g. Richmond or 3121" value={suburb} onChange={(e) => setSuburb(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="radius">Radius (km)</Label>
                  <Input
                    id="radius"
                    type="number"
                    min={1}
                    max={500}
                    disabled={!suburb.trim()}
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Organiser types</Label>
                <ChipGroup
                  label="Organiser types"
                  options={ORGANISER_TYPES.map((t) => ({ value: t, label: ORGANISER_TYPE_LABEL[t] }))}
                  value={types}
                  onChange={setTypes}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Sources</Label>
                <ChipGroup
                  label="Sources"
                  options={sources.filter((s) => s.enabled).map((s) => ({ value: s.id, label: s.name }))}
                  value={sourceIds}
                  onChange={setSourceIds}
                />
              </div>

              <div className="flex flex-col gap-3 rounded-lg border p-4">
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="mode" checked={mode === "now"} onChange={() => setMode("now")} className="accent-primary" />
                    Run now
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="mode" checked={mode === "schedule"} onChange={() => setMode("schedule")} className="accent-primary" />
                    Schedule
                  </label>
                </div>
                {mode === "schedule" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2 sm:col-span-2">
                      <Label htmlFor="sname">Schedule name</Label>
                      <Input id="sname" placeholder="e.g. Weekly VIC sports clubs" value={scheduleName} onChange={(e) => setScheduleName(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Frequency</Label>
                      <Select value={frequency} onValueChange={(v) => setFrequency(v as ScheduleFrequency)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      {frequency === "weekly" && (
                        <div className="flex flex-1 flex-col gap-2">
                          <Label>Day</Label>
                          <Select value={String(day)} onValueChange={(v) => setDay(Number(v))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DAY_NAMES.map((d, i) => (
                                <SelectItem key={d} value={String(i)}>
                                  {d}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="flex flex-1 flex-col gap-2">
                        <Label htmlFor="time">Time</Label>
                        <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex-wrap justify-between gap-3">
              <p className="text-muted-foreground text-xs">
                {valid ? "Ready." : "Pick at least one state, organiser type and source."}
              </p>
              <Button type="submit" disabled={!valid || (mode === "now" && running)}>
                {mode === "now" ? (
                  <>
                    <Play /> Run now
                  </>
                ) : (
                  <>
                    <CalendarClock /> Save schedule
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>

        <div className="flex flex-col gap-4 xl:col-span-2">
          {savedSchedule && (
            <Card>
              <CardContent className="flex flex-col gap-3 text-sm">
                <div>Schedule saved. It will appear on the Schedules page with its next run time.</div>
                <Button variant="outline" size="sm" className="self-start" asChild>
                  <Link href="/schedules">Open schedules</Link>
                </Button>
              </CardContent>
            </Card>
          )}
          {activeRun ? (
            <RunProgress run={activeRun} sources={sources} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>What happens when you run a search</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="text-muted-foreground list-decimal space-y-1.5 pl-5 text-sm">
                  <li>The job is queued and picked up by a worker.</li>
                  <li>Each selected source adapter scrapes matching listings.</li>
                  <li>Names, phones, addresses and domains are normalised.</li>
                  <li>Records are deduplicated across sources. Uncertain pairs go to Match review.</li>
                  <li>Contacts are enriched and emails are verified.</li>
                  <li>New organisers land in the review queue, scored by event signals.</li>
                </ol>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
