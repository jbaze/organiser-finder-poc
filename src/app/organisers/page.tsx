"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Download, FilterX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrganiserDetail } from "@/components/organiser-detail";
import { EmptyState, OutreachBadge, PageHeader, ReviewBadge, ScorePill, VerificationBadge } from "@/components/shared";
import { ORGANISER_TYPES, STATES } from "@/data/reference";
import { organisersToCsv, downloadText } from "@/lib/csv";
import { ORGANISER_TYPE_LABEL } from "@/lib/format";
import { primaryContact } from "@/lib/push";
import type { AustralianState, OrganiserType, ReviewStatus, SourceId, VerificationStatus } from "@/lib/types";
import { useDemoStore } from "@/store/demo-store";

const PAGE_SIZE = 25;
const ALL = "all";

interface Filters {
  q: string;
  state: AustralianState | typeof ALL;
  type: OrganiserType | typeof ALL;
  source: SourceId | typeof ALL;
  verification: VerificationStatus | typeof ALL;
  review: ReviewStatus | typeof ALL;
  minScore: string;
  maxScore: string;
}

const EMPTY_FILTERS: Filters = {
  q: "",
  state: ALL,
  type: ALL,
  source: ALL,
  verification: ALL,
  review: ALL,
  minScore: "",
  maxScore: "",
};

function FilterSelect<T extends string>({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: T | typeof ALL;
  onChange: (v: T | typeof ALL) => void;
  placeholder: string;
  options: { value: T; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T | typeof ALL)}>
      <SelectTrigger className="h-8 w-full text-xs sm:w-40" aria-label={placeholder}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}: all</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function OrganisersContent() {
  const organisers = useDemoStore((s) => s.organisers);
  const sources = useDemoStore((s) => s.sources);
  const setReviewStatus = useDemoStore((s) => s.setReviewStatus);
  const params = useSearchParams();
  const router = useRouter();
  const runFilter = params.get("run");
  const selectedId = params.get("id");

  const [filters, setFilters] = React.useState<Filters>(EMPTY_FILTERS);
  const [sortDesc, setSortDesc] = React.useState(true);
  const [page, setPage] = React.useState(0);
  const [checked, setChecked] = React.useState<Set<string>>(new Set());

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(0);
  };

  const filtered = React.useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const min = filters.minScore === "" ? 0 : Number(filters.minScore);
    const max = filters.maxScore === "" ? 100 : Number(filters.maxScore);
    return organisers
      .filter((o) => {
        if (runFilter && o.runId !== runFilter) return false;
        if (q && !`${o.name} ${o.suburb} ${o.postcode}`.toLowerCase().includes(q)) return false;
        if (filters.state !== ALL && o.state !== filters.state) return false;
        if (filters.type !== ALL && o.type !== filters.type) return false;
        if (filters.source !== ALL && !o.sourceRecords.some((r) => r.sourceId === filters.source)) return false;
        if (filters.review !== ALL && o.reviewStatus !== filters.review) return false;
        if (filters.verification !== ALL && primaryContact(o)?.verification !== filters.verification) return false;
        return o.score.total >= min && o.score.total <= max;
      })
      .sort((a, b) => (sortDesc ? b.score.total - a.score.total : a.score.total - b.score.total));
  }, [organisers, filters, sortDesc, runFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const selected = organisers.find((o) => o.id === selectedId) ?? null;
  const allOnPageChecked = pageRows.length > 0 && pageRows.every((o) => checked.has(o.id));
  const someOnPageChecked = pageRows.some((o) => checked.has(o.id));

  const navigate = (id: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (id) next.set("id", id);
    else next.delete("id");
    const qs = next.toString();
    router.replace(qs ? `/organisers?${qs}` : "/organisers", { scroll: false });
  };

  const bulk = (status: ReviewStatus) => {
    setReviewStatus([...checked], status);
    setChecked(new Set());
  };

  const filtersActive = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS) || runFilter !== null;

  return (
    <>
      <PageHeader
        title="Organisers"
        description="Deduplicated organisers waiting for review. Approve the ones worth contacting; only approved leads can be pushed to outreach."
        actions={
          <Button variant="outline" onClick={() => downloadText(`organisers-${new Date().toISOString().slice(0, 10)}.csv`, organisersToCsv(filtered))}>
            <Download /> Export CSV ({filtered.length})
          </Button>
        }
      />

      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-2 border-b p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search name, suburb, postcode"
              className="h-8 w-full text-xs sm:w-56"
              value={filters.q}
              onChange={(e) => set("q", e.target.value)}
            />
            <FilterSelect placeholder="State" value={filters.state} onChange={(v) => set("state", v)} options={STATES.map((s) => ({ value: s, label: s }))} />
            <FilterSelect
              placeholder="Type"
              value={filters.type}
              onChange={(v) => set("type", v)}
              options={ORGANISER_TYPES.map((t) => ({ value: t, label: ORGANISER_TYPE_LABEL[t] }))}
            />
            <FilterSelect placeholder="Source" value={filters.source} onChange={(v) => set("source", v)} options={sources.map((s) => ({ value: s.id, label: s.name }))} />
            <FilterSelect
              placeholder="Email"
              value={filters.verification}
              onChange={(v) => set("verification", v)}
              options={[
                { value: "valid", label: "Valid" },
                { value: "risky", label: "Risky" },
                { value: "invalid", label: "Invalid" },
              ]}
            />
            <FilterSelect
              placeholder="Review"
              value={filters.review}
              onChange={(v) => set("review", v)}
              options={[
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
              ]}
            />
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">Score</span>
              <Input aria-label="Minimum score" type="number" min={0} max={100} placeholder="0" className="h-8 w-16 text-xs" value={filters.minScore} onChange={(e) => set("minScore", e.target.value)} />
              <span className="text-muted-foreground">to</span>
              <Input aria-label="Maximum score" type="number" min={0} max={100} placeholder="100" className="h-8 w-16 text-xs" value={filters.maxScore} onChange={(e) => set("maxScore", e.target.value)} />
            </div>
            {filtersActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilters(EMPTY_FILTERS);
                  setPage(0);
                  if (runFilter) router.replace("/organisers");
                }}
              >
                <FilterX /> Clear
              </Button>
            )}
          </div>
          {runFilter && <div className="text-muted-foreground text-xs">Showing organisers found by run {runFilter}</div>}
        </div>

        {checked.size > 0 && (
          <div className="bg-primary/5 flex flex-wrap items-center gap-2 border-b px-3 py-2 text-sm">
            <span className="font-medium">{checked.size} selected</span>
            <Button size="sm" onClick={() => bulk("approved")}>
              <Check /> Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulk("rejected")}>
              <X /> Reject
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setChecked(new Set())}>
              Clear selection
            </Button>
          </div>
        )}

        <CardContent className="px-0">
          {filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState>No organisers match these filters.</EmptyState>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 pl-4">
                    <Checkbox
                      aria-label="Select page"
                      checked={allOnPageChecked ? true : someOnPageChecked ? "indeterminate" : false}
                      onCheckedChange={(v) => {
                        const next = new Set(checked);
                        pageRows.forEach((o) => (v === true ? next.add(o.id) : next.delete(o.id)));
                        setChecked(next);
                      }}
                    />
                  </TableHead>
                  <TableHead>Organiser</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Sources</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>
                    <button className="hover:text-foreground inline-flex items-center gap-1" onClick={() => setSortDesc((d) => !d)}>
                      Score {sortDesc ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />}
                    </button>
                  </TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead className="pr-4">Outreach</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((o) => {
                  const contact = primaryContact(o);
                  return (
                    <TableRow key={o.id} className="cursor-pointer" data-state={checked.has(o.id) ? "selected" : undefined} onClick={() => navigate(o.id)}>
                      <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          aria-label={`Select ${o.name}`}
                          checked={checked.has(o.id)}
                          onCheckedChange={(v) => {
                            const next = new Set(checked);
                            if (v === true) next.add(o.id);
                            else next.delete(o.id);
                            setChecked(next);
                          }}
                        />
                      </TableCell>
                      <TableCell className="max-w-64 truncate font-medium">{o.name}</TableCell>
                      <TableCell className="text-muted-foreground">{ORGANISER_TYPE_LABEL[o.type]}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {o.suburb}, {o.state}
                      </TableCell>
                      <TableCell className="tabular-nums">{o.sourceRecords.length}</TableCell>
                      <TableCell>{contact ? <VerificationBadge status={contact.verification} /> : "-"}</TableCell>
                      <TableCell>
                        <ScorePill score={o.score.total} />
                      </TableCell>
                      <TableCell>
                        <ReviewBadge status={o.reviewStatus} />
                      </TableCell>
                      <TableCell className="pr-4">
                        <OutreachBadge status={o.outreachStatus} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>

        <div className="text-muted-foreground flex items-center justify-between border-t px-4 py-2 text-xs">
          <span>
            {filtered.length} organisers · page {page + 1} of {pageCount}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      </Card>

      <Sheet open={selected !== null} onOpenChange={(o) => !o && navigate(null)}>
        <SheetContent>{selected && <OrganiserDetail organiser={selected} />}</SheetContent>
      </Sheet>
    </>
  );
}

export default function OrganisersPage() {
  return (
    <Suspense>
      <OrganisersContent />
    </Suspense>
  );
}
