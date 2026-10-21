"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Loader2, MailX, MessageSquareReply, Send, UserMinus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PageHeader, useNow } from "@/components/shared";
import { ORGANISER_TYPE_LABEL, timeAgo } from "@/lib/format";
import { SKIP_REASON_LABEL, planPush } from "@/lib/push";
import type { ActivityKind } from "@/lib/types";
import { useDemoStore } from "@/store/demo-store";

const FEED_KINDS: ActivityKind[] = ["pushed", "reply", "bounce", "unsubscribe"];

const KIND_META: Record<string, { label: string; icon: React.ElementType; tone: string }> = {
  pushed: { label: "Pushed", icon: Send, tone: "text-sky-600 dark:text-sky-400" },
  reply: { label: "Reply", icon: MessageSquareReply, tone: "text-emerald-600 dark:text-emerald-400" },
  bounce: { label: "Bounce", icon: MailX, tone: "text-red-600 dark:text-red-400" },
  unsubscribe: { label: "Unsubscribe", icon: UserMinus, tone: "text-amber-600 dark:text-amber-400" },
};

export default function OutreachPage() {
  const organisers = useDemoStore((s) => s.organisers);
  const products = useDemoStore((s) => s.products);
  const campaigns = useDemoStore((s) => s.campaigns);
  const suppression = useDemoStore((s) => s.suppression);
  const activity = useDemoStore((s) => s.activity);
  const simulate = useDemoStore((s) => s.simulateOutreach);
  const setSimulate = useDemoStore((s) => s.setSimulateOutreach);
  const setProductCampaign = useDemoStore((s) => s.setProductCampaign);
  const pushApproved = useDemoStore((s) => s.pushApproved);
  const now = useNow(5000);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [pushing, setPushing] = React.useState(false);
  const [pushedCount, setPushedCount] = React.useState<number | null>(null);

  const plan = React.useMemo(() => planPush(organisers, products, campaigns, suppression), [organisers, products, campaigns, suppression]);
  const feed = React.useMemo(() => activity.filter((a) => FEED_KINDS.includes(a.kind)).slice(0, 40), [activity]);
  const nameById = React.useMemo(() => new Map(organisers.map((o) => [o.id, o.name])), [organisers]);

  const campaignStats = React.useMemo(
    () =>
      products.map((p) => {
        const inCampaign = organisers.filter((o) => p.audienceTypes.includes(o.type) && o.outreachStatus !== "not_pushed");
        return {
          product: p,
          pushed: inCampaign.length,
          replied: inCampaign.filter((o) => o.outreachStatus === "replied").length,
        };
      }),
    [products, organisers],
  );

  const confirmPush = () => {
    setPushing(true);
    setTimeout(() => {
      setPushedCount(pushApproved());
      setPushing(false);
    }, 1400);
  };

  return (
    <>
      <PageHeader
        title="Outreach"
        description="Approved leads go to the Instantly campaign for their product. Replies, bounces and unsubscribes come back by webhook and sync to the CRM."
        actions={
          <Button
            onClick={() => {
              setPushedCount(null);
              setDialogOpen(true);
            }}
          >
            <Send /> Push approved leads ({plan.toPush.length})
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="flex flex-col gap-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Product to campaign mapping</CardTitle>
              <CardDescription>Each product targets organiser types and sends through one mock Instantly campaign.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {campaignStats.map(({ product, pushed, replied }) => (
                <div key={product.id} className="flex flex-col gap-2 rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{product.name}</div>
                      <div className="text-muted-foreground text-xs">{product.audienceTypes.map((t) => ORGANISER_TYPE_LABEL[t]).join(", ")}</div>
                    </div>
                    <div className="text-muted-foreground text-right text-xs tabular-nums">
                      {pushed} pushed
                      <br />
                      {replied} replied
                    </div>
                  </div>
                  <Select value={product.campaignId} onValueChange={(v) => setProductCampaign(product.id, v)}>
                    <SelectTrigger className="h-8 text-xs" aria-label={`Campaign for ${product.name}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.instantlyId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="xl:col-span-3">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Activity feed</CardTitle>
              <CardDescription>Simulated Instantly webhooks arriving over time</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="sim" checked={simulate} onCheckedChange={setSimulate} />
              <Label htmlFor="sim" className="text-xs">
                Simulate events
              </Label>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y">
              {feed.map((a) => {
                const meta = KIND_META[a.kind];
                const Icon = meta.icon;
                return (
                  <li key={a.id} className="flex items-start gap-3 py-2.5">
                    <Icon className={`mt-0.5 size-4 shrink-0 ${meta.tone}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 text-sm">
                        <span className="font-medium">{meta.label}</span>
                        <span className="truncate">{a.organiserId ? nameById.get(a.organiserId) : a.email}</span>
                      </div>
                      <div className="text-muted-foreground truncate text-xs">
                        {a.email} · {a.message}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-muted-foreground text-xs">{timeAgo(a.at, now)}</span>
                      {a.crmSynced ? (
                        <Badge variant="success">
                          <CheckCircle2 /> Synced to CRM
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Loader2 className="animate-spin" /> Syncing
                        </Badge>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Push approved leads to Instantly</DialogTitle>
            <DialogDescription>
              {pushedCount === null
                ? "Review what will be sent. Suppressed and invalid emails are always skipped."
                : `${pushedCount} leads pushed. They now show as "In Instantly".`}
            </DialogDescription>
          </DialogHeader>

          {pushedCount === null && (
            <div className="flex flex-col gap-5">
              <div>
                <div className="mb-2 text-sm font-medium">Will be pushed ({plan.toPush.length})</div>
                {plan.toPush.length === 0 ? (
                  <div className="text-muted-foreground text-sm">Nothing to push. Approve more organisers on the Organisers page.</div>
                ) : (
                  <ul className="max-h-56 divide-y overflow-y-auto rounded-lg border text-sm">
                    {plan.toPush.map((p) => (
                      <li key={p.organiser.id} className="flex items-center justify-between gap-2 px-3 py-2">
                        <div className="min-w-0">
                          <div className="truncate">{p.organiser.name}</div>
                          <div className="text-muted-foreground truncate text-xs">
                            {p.contact.email} → {p.campaign.name}
                          </div>
                        </div>
                        {p.risky && (
                          <Badge variant="warning">
                            <AlertTriangle /> risky
                          </Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {plan.skipped.length > 0 && (
                <div>
                  <div className="mb-2 text-sm font-medium">Skipped ({plan.skipped.length})</div>
                  <ul className="max-h-48 divide-y overflow-y-auto rounded-lg border text-sm">
                    {plan.skipped.map((s) => (
                      <li key={s.organiser.id} className="flex items-center justify-between gap-2 px-3 py-2">
                        <div className="min-w-0">
                          <div className="truncate">{s.organiser.name}</div>
                          <div className="text-muted-foreground truncate text-xs">{s.email ?? "no email"}</div>
                        </div>
                        <Badge variant={s.reason === "suppressed" ? "danger" : "warning"}>{SKIP_REASON_LABEL[s.reason]}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {pushedCount === null ? (
              <>
                <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button disabled={plan.toPush.length === 0 || pushing} onClick={confirmPush}>
                  {pushing ? <Loader2 className="animate-spin" /> : <Send />}
                  {pushing ? "Pushing to Instantly" : `Push ${plan.toPush.length} leads`}
                </Button>
              </>
            ) : (
              <Button onClick={() => setDialogOpen(false)}>Done</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
