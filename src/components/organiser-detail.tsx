"use client";

import * as React from "react";
import { Check, ExternalLink, Pencil, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { OutreachBadge, ReviewBadge, VerificationBadge } from "@/components/shared";
import { ORGANISER_TYPE_LABEL, formatDate, formatDateTime, sourceName } from "@/lib/format";
import { productForType } from "@/lib/push";
import type { Organiser, SourceRecord } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useDemoStore } from "@/store/demo-store";

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

const RECORD_FIELDS: { key: keyof SourceRecord; label: string }[] = [
  { key: "rawName", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "suburb", label: "Suburb" },
  { key: "postcode", label: "Postcode" },
  { key: "website", label: "Website" },
  { key: "email", label: "Email" },
];

function SourceRecordsGrid({ organiser }: { organiser: Organiser }) {
  const sources = useDemoStore((s) => s.sources);
  const records = organiser.sourceRecords;
  const first = records[0];
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50 border-b">
            <th className="text-muted-foreground w-24 px-3 py-2 text-left font-medium">Field</th>
            {records.map((r) => (
              <th key={r.id} className="px-3 py-2 text-left font-medium">
                {sourceName(sources, r.sourceId)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {RECORD_FIELDS.map(({ key, label }) => (
            <tr key={key} className="border-b last:border-0">
              <td className="text-muted-foreground px-3 py-2">{label}</td>
              {records.map((r, i) => {
                const differs = i > 0 && r[key] !== first[key];
                return (
                  <td
                    key={r.id}
                    className={cn("px-3 py-2 break-all", differs && "bg-amber-100/70 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200")}
                  >
                    {String(r[key])}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <td className="text-muted-foreground px-3 py-2">Collected</td>
            {records.map((r) => (
              <td key={r.id} className="px-3 py-2">
                <a href={r.sourceUrl} onClick={(e) => e.preventDefault()} className="text-primary inline-flex items-center gap-1" title={r.sourceUrl}>
                  {formatDateTime(r.collectedAt)} <ExternalLink className="size-3" />
                </a>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ScoreBar({ label, value, max, hint }: { label: string; value: number; max: number; hint: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span>
          {label} <span className="text-muted-foreground">({hint})</span>
        </span>
        <span className="tabular-nums">
          {value}/{max}
        </span>
      </div>
      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div className="bg-primary h-full rounded-full" style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  );
}

export function OrganiserDetail({ organiser }: { organiser: Organiser }) {
  const products = useDemoStore((s) => s.products);
  const allActivity = useDemoStore((s) => s.activity);
  const setReviewStatus = useDemoStore((s) => s.setReviewStatus);
  const updateOrganiser = useDemoStore((s) => s.updateOrganiser);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState({ name: organiser.name, phone: organiser.phone, website: organiser.website });

  React.useEffect(() => {
    setEditing(false);
    setDraft({ name: organiser.name, phone: organiser.phone, website: organiser.website });
  }, [organiser.id, organiser.name, organiser.phone, organiser.website]);

  const activity = React.useMemo(
    () => allActivity.filter((a) => a.organiserId === organiser.id),
    [allActivity, organiser.id],
  );
  const product = productForType(organiser, products);

  return (
    <>
      <SheetHeader>
        <div className="flex flex-wrap items-center gap-2">
          <ReviewBadge status={organiser.reviewStatus} />
          <OutreachBadge status={organiser.outreachStatus} />
          <Badge variant="outline">{ORGANISER_TYPE_LABEL[organiser.type]}</Badge>
        </div>
        <SheetTitle>{organiser.name}</SheetTitle>
        <SheetDescription>
          {organiser.suburb} {organiser.state} {organiser.postcode} · {organiser.sourceRecords.length} source record
          {organiser.sourceRecords.length > 1 ? "s" : ""} merged
        </SheetDescription>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" disabled={organiser.reviewStatus === "approved"} onClick={() => setReviewStatus([organiser.id], "approved")}>
            <Check /> Approve
          </Button>
          <Button size="sm" variant="outline" disabled={organiser.reviewStatus === "rejected"} onClick={() => setReviewStatus([organiser.id], "rejected")}>
            <X /> Reject
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing((e) => !e)}>
            <Pencil /> Edit
          </Button>
        </div>
      </SheetHeader>

      <div className="flex flex-col gap-7 overflow-y-auto px-5 pb-8">
        <Section title="Merged record">
          {editing ? (
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                updateOrganiser(organiser.id, draft);
                setEditing(false);
              }}
            >
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="ed-name">Name</Label>
                <Input id="ed-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ed-phone">Phone</Label>
                <Input id="ed-phone" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ed-web">Website</Label>
                <Input id="ed-web" value={draft.website} onChange={(e) => setDraft({ ...draft, website: e.target.value })} />
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <Button size="sm" type="submit">
                  Save
                </Button>
                <Button size="sm" type="button" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {[
                ["Phone", organiser.phone],
                ["Website", organiser.website],
                ["Address", `${organiser.address}, ${organiser.suburb} ${organiser.state} ${organiser.postcode}`],
                ["Product / campaign", product?.name ?? "Not mapped"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-muted-foreground text-xs">{k}</dt>
                  <dd className="break-all">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </Section>

        <Section
          title="Source records"
          aside={<span className="text-muted-foreground text-xs">Highlighted values differ from the first source</span>}
        >
          <SourceRecordsGrid organiser={organiser} />
        </Section>

        <Section title="Contacts">
          <div className="flex flex-col divide-y rounded-lg border">
            {organiser.contacts.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <div>
                  <div className="font-medium">
                    {c.name} {c.isPrimary && <Badge variant="secondary">primary</Badge>}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {c.role} · {c.email}
                  </div>
                </div>
                <VerificationBadge status={c.verification} />
              </div>
            ))}
          </div>
        </Section>

        <div className="grid gap-7 sm:grid-cols-2">
          <Section title="Signals">
            <dl className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Events per year</dt>
                <dd className="tabular-nums">{organiser.signals.eventsPerYear}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Typical attendance</dt>
                <dd className="tabular-nums">{organiser.signals.typicalAttendance.toLocaleString("en-AU")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Last event</dt>
                <dd>{formatDate(organiser.signals.lastEventDate)}</dd>
              </div>
            </dl>
          </Section>
          <Section title={`Score ${organiser.score.total}/100`}>
            <div className="flex flex-col gap-3">
              <ScoreBar label="Frequency" value={organiser.score.frequency} max={40} hint="events per year" />
              <ScoreBar label="Size" value={organiser.score.size} max={30} hint="attendance" />
              <ScoreBar label="Recency" value={organiser.score.recency} max={30} hint="last event" />
            </div>
          </Section>
        </div>

        <Section title="Activity">
          {activity.length === 0 ? (
            <div className="text-muted-foreground text-sm">No activity yet.</div>
          ) : (
            <ol className="flex flex-col gap-2 border-l pl-4">
              {activity.map((a) => (
                <li key={a.id} className="text-sm">
                  <span className="text-muted-foreground text-xs">{formatDateTime(a.at)}</span> · {a.message}
                </li>
              ))}
            </ol>
          )}
        </Section>
      </div>
    </>
  );
}
