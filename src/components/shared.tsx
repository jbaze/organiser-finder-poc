"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { OUTREACH_STATUS_LABEL, REVIEW_STATUS_LABEL } from "@/lib/format";
import type { OutreachStatus, ReviewStatus, VerificationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground mt-1 max-w-3xl text-sm">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const variant = status === "valid" ? "success" : status === "risky" ? "warning" : "danger";
  return <Badge variant={variant}>{status}</Badge>;
}

export function ReviewBadge({ status }: { status: ReviewStatus }) {
  const variant = status === "approved" ? "success" : status === "rejected" ? "danger" : "secondary";
  return <Badge variant={variant}>{REVIEW_STATUS_LABEL[status]}</Badge>;
}

export function OutreachBadge({ status }: { status: OutreachStatus }) {
  const variant =
    status === "in_instantly" ? "info" : status === "replied" ? "success" : status === "not_pushed" ? "outline" : "danger";
  return <Badge variant={variant}>{OUTREACH_STATUS_LABEL[status]}</Badge>;
}

export function ScorePill({ score }: { score: number }) {
  const tone =
    score >= 70
      ? "bg-emerald-500"
      : score >= 45
        ? "bg-sky-500"
        : score >= 25
          ? "bg-amber-500"
          : "bg-slate-400";
  return (
    <div className="flex items-center gap-2">
      <div className="bg-muted h-1.5 w-14 overflow-hidden rounded-full">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${score}%` }} />
      </div>
      <span className="w-6 text-right text-xs font-medium tabular-nums">{score}</span>
    </div>
  );
}

/** Toggle chips used as a compact multi-select. */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T[];
  onChange: (next: T[]) => void;
  label?: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">{children}</div>;
}

/** Re-renders every `ms` so relative times ("2m ago") stay current. */
export function useNow(ms = 15000): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}
