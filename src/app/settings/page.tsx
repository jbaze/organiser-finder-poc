"use client";

import * as React from "react";
import { Code2, Plus, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ChipGroup, PageHeader } from "@/components/shared";
import { ORGANISER_TYPES } from "@/data/reference";
import { ORGANISER_TYPE_LABEL } from "@/lib/format";
import type { ConsentBasis, OrganiserType } from "@/lib/types";
import { useDemoStore } from "@/store/demo-store";

const CONSENT_OPTIONS: ConsentBasis[] = [
  "Conspicuously published business address",
  "Inferred consent (published for enquiries)",
  "Express consent",
];

function ProductsCard() {
  const products = useDemoStore((s) => s.products);
  const campaigns = useDemoStore((s) => s.campaigns);
  const addProduct = useDemoStore((s) => s.addProduct);
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [types, setTypes] = React.useState<OrganiserType[]>([]);
  const [campaign, setCampaign] = React.useState("");

  const valid = name.trim() && types.length > 0 && campaign.trim();

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Products and audiences</CardTitle>
          <CardDescription>Each product targets organiser types and maps to its own outreach campaign.</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus /> Add product
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="divide-y rounded-lg border">
          {products.map((p) => (
            <li key={p.id} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium">{p.name}</div>
                <div className="text-muted-foreground text-xs">{p.audienceTypes.map((t) => ORGANISER_TYPE_LABEL[t]).join(", ")}</div>
              </div>
              <Badge variant="outline">{campaigns.find((c) => c.id === p.campaignId)?.name ?? "No campaign"}</Badge>
            </li>
          ))}
        </ul>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add product / audience</DialogTitle>
            <DialogDescription>Creates a product and a matching mock Instantly campaign. New products show up on the Outreach page.</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!valid) return;
              addProduct(name.trim(), types, campaign.trim());
              setName("");
              setTypes([]);
              setCampaign("");
              setOpen(false);
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-name">Product name</Label>
              <Input id="p-name" placeholder="e.g. Ticketing - Schools" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Audience (organiser types)</Label>
              <ChipGroup options={ORGANISER_TYPES.map((t) => ({ value: t, label: ORGANISER_TYPE_LABEL[t] }))} value={types} onChange={setTypes} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-cmp">Campaign name</Label>
              <Input id="p-cmp" placeholder="e.g. Term 1 school fete ticketing" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!valid}>
                Add product
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function SourcesCard() {
  const sources = useDemoStore((s) => s.sources);
  const updateSource = useDemoStore((s) => s.updateSource);
  const [open, setOpen] = React.useState(false);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Sources</CardTitle>
          <CardDescription>Where organisers are collected from, and the consent basis recorded for each.</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Code2 /> Add source adapter
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {sources.map((s) => (
          <div key={s.id} className="flex flex-col gap-3 rounded-lg border p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-medium">{s.name}</div>
                <div className="text-muted-foreground text-xs">{s.description}</div>
              </div>
              <Switch checked={s.enabled} onCheckedChange={(v) => updateSource(s.id, { enabled: v })} aria-label={`Enable ${s.name}`} />
            </div>
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
              <Label className="text-muted-foreground shrink-0 text-xs">Consent basis</Label>
              <Select value={s.consentBasis} onValueChange={(v) => updateSource(s.id, { consentBasis: v as ConsentBasis })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONSENT_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adding a source is a developer task</DialogTitle>
            <DialogDescription>Every website is different, so each source gets its own small adapter in code.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 text-sm">
            <p>In the real system a developer would:</p>
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>Check the site&apos;s terms and robots.txt, and record the consent basis.</li>
              <li>Write an adapter (Cheerio for static pages, Playwright for pages that need a browser) that turns search filters into requests and returns raw records.</li>
              <li>Map the fields to the common record shape (name, phone, address, website, email, event signals).</li>
              <li>Set the expected volume per run so the health check can flag a broken scraper.</li>
              <li>Add fixture tests using saved copies of the pages, then enable it here.</li>
            </ol>
            <pre className="bg-muted overflow-x-auto rounded-lg p-3 font-mono text-xs">{`export const myDirectory: SourceAdapter = {
  id: "my-directory",
  async *collect(criteria) {
    // fetch pages, parse, yield RawRecord
  },
};`}</pre>
            <p className="text-muted-foreground text-xs">Typical effort: half a day to two days per source, depending on the site.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setOpen(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ComplianceCard() {
  const compliance = useDemoStore((s) => s.compliance);
  const updateCompliance = useDemoStore((s) => s.updateCompliance);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Compliance</CardTitle>
        <CardDescription>Settings the real system would enforce for Australian commercial email.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="retention">Data retention (days)</Label>
            <Input
              id="retention"
              type="number"
              min={30}
              max={3650}
              value={compliance.retentionDays}
              onChange={(e) => updateCompliance({ retentionDays: Number(e.target.value) || 0 })}
            />
            <p className="text-muted-foreground text-xs">Organisers not contacted within this period are deleted.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sender">Sender name</Label>
            <Input id="sender" value={compliance.senderName} onChange={(e) => updateCompliance({ senderName: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="addr">Sender address shown in emails</Label>
            <Input id="addr" value={compliance.senderAddress} onChange={(e) => updateCompliance({ senderAddress: e.target.value })} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div>
            <div className="text-sm font-medium">Include unsubscribe link</div>
            <div className="text-muted-foreground text-xs">Required for every commercial email.</div>
          </div>
          <Switch checked={compliance.includeUnsubscribeLink} onCheckedChange={(v) => updateCompliance({ includeUnsubscribeLink: v })} />
        </div>
        <div className="rounded-lg border border-amber-400/60 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Reminder: under the Spam Act 2003 every message must have a consent basis, clearly identify the sender and include a working
          unsubscribe option that is honoured within 5 business days. This POC is not legal advice; confirm the approach with the client&apos;s
          adviser.
        </div>
      </CardContent>
    </Card>
  );
}

function ResetCard() {
  const resetDemo = useDemoStore((s) => s.resetDemo);
  const [open, setOpen] = React.useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Demo data</CardTitle>
        <CardDescription>Changes are saved in this browser only. Reset to start the walkthrough again.</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          <RotateCcw /> Reset demo data
        </Button>
      </CardFooter>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset demo data?</DialogTitle>
            <DialogDescription>All approvals, pushes, schedules and settings changes in this browser are replaced with fresh mock data.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                resetDemo();
                setOpen(false);
              }}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="flex flex-col gap-6">
          <ProductsCard />
          <SourcesCard />
        </div>
        <div className="flex flex-col gap-6">
          <ComplianceCard />
          <ResetCard />
        </div>
      </div>
    </>
  );
}
