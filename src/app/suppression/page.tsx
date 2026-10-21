"use client";

import * as React from "react";
import { Plus, ShieldBan, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChipGroup, EmptyState, PageHeader } from "@/components/shared";
import { formatDate } from "@/lib/format";
import { normaliseEmail } from "@/lib/normalise";
import { planPush } from "@/lib/push";
import type { SuppressionReason } from "@/lib/types";
import { useDemoStore } from "@/store/demo-store";

const REASON_VARIANT: Record<SuppressionReason, "warning" | "danger" | "secondary"> = {
  unsubscribe: "warning",
  bounce: "danger",
  manual: "secondary",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SuppressionPage() {
  const suppression = useDemoStore((s) => s.suppression);
  const organisers = useDemoStore((s) => s.organisers);
  const products = useDemoStore((s) => s.products);
  const campaigns = useDemoStore((s) => s.campaigns);
  const addSuppression = useDemoStore((s) => s.addSuppression);
  const removeSuppression = useDemoStore((s) => s.removeSuppression);

  const [email, setEmail] = React.useState("");
  const [note, setNote] = React.useState("");
  const [reasons, setReasons] = React.useState<SuppressionReason[]>([]);

  const shown = reasons.length ? suppression.filter((s) => reasons.includes(s.reason)) : suppression;
  const blocked = React.useMemo(
    () => planPush(organisers, products, campaigns, suppression).skipped.filter((s) => s.reason === "suppressed"),
    [organisers, products, campaigns, suppression],
  );
  const exists = suppression.some((s) => normaliseEmail(s.email) === normaliseEmail(email));
  const valid = EMAIL_RE.test(email.trim()) && !exists;

  return (
    <>
      <PageHeader
        title="Suppression list"
        description="Emails that must never be contacted. Unsubscribes and bounces are added automatically from Instantly webhooks; you can also add entries by hand."
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Add manual entry</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="flex flex-col gap-3 sm:flex-row sm:items-end"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!valid) return;
                  addSuppression(email, "manual", note.trim() || "Added manually");
                  setEmail("");
                  setNote("");
                }}
              >
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="sup-email">Email</Label>
                  <Input id="sup-email" placeholder="someone@example-club.test" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="sup-note">Note</Label>
                  <Input id="sup-note" placeholder="Reason (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
                <Button type="submit" disabled={!valid}>
                  <Plus /> Add
                </Button>
              </form>
              {exists && <p className="text-muted-foreground mt-2 text-xs">This email is already suppressed.</p>}
            </CardContent>
          </Card>

          <Card className="gap-0 py-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
              <span className="text-sm font-medium">{shown.length} entries</span>
              <ChipGroup
                label="Filter by reason"
                options={[
                  { value: "unsubscribe", label: "Unsubscribes" },
                  { value: "bounce", label: "Bounces" },
                  { value: "manual", label: "Manual" },
                ]}
                value={reasons}
                onChange={setReasons}
              />
            </div>
            <CardContent className="px-0">
              {shown.length === 0 ? (
                <div className="p-4">
                  <EmptyState>No entries.</EmptyState>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Email</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead className="pr-4" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shown.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="pl-4 font-medium">{s.email}</TableCell>
                        <TableCell>
                          <Badge variant={REASON_VARIANT[s.reason]}>{s.reason}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-64 truncate">{s.note}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(s.addedAt)}</TableCell>
                        <TableCell className="pr-4 text-right">
                          <Button variant="ghost" size="icon" aria-label={`Remove ${s.email}`} onClick={() => removeSuppression(s.id)}>
                            <Trash2 />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="self-start">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldBan className="size-4" /> Blocked from push
            </CardTitle>
            <CardDescription>Approved leads that will be skipped by the next push because their email is suppressed.</CardDescription>
          </CardHeader>
          <CardContent>
            {blocked.length === 0 ? (
              <div className="text-muted-foreground text-sm">No approved leads are currently blocked.</div>
            ) : (
              <ul className="divide-y text-sm">
                {blocked.map((b) => (
                  <li key={b.organiser.id} className="py-2">
                    <div className="font-medium">{b.organiser.name}</div>
                    <div className="text-muted-foreground text-xs">{b.email}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
