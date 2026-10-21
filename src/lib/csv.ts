import { ORGANISER_TYPE_LABEL } from "./format";
import { primaryContact } from "./push";
import type { Organiser } from "./types";

function escape(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function organisersToCsv(organisers: Organiser[]): string {
  const header = [
    "id",
    "name",
    "type",
    "state",
    "suburb",
    "postcode",
    "phone",
    "website",
    "contact_name",
    "contact_email",
    "email_status",
    "score",
    "events_per_year",
    "typical_attendance",
    "last_event_date",
    "review_status",
    "outreach_status",
    "sources",
  ];
  const rows = organisers.map((o) => {
    const c = primaryContact(o);
    return [
      o.id,
      o.name,
      ORGANISER_TYPE_LABEL[o.type],
      o.state,
      o.suburb,
      o.postcode,
      o.phone,
      o.website,
      c?.name ?? "",
      c?.email ?? "",
      c?.verification ?? "",
      o.score.total,
      o.signals.eventsPerYear,
      o.signals.typicalAttendance,
      o.signals.lastEventDate,
      o.reviewStatus,
      o.outreachStatus,
      o.sourceRecords.map((r) => r.sourceId).join("|"),
    ]
      .map(escape)
      .join(",");
  });
  return [header.join(","), ...rows].join("\n");
}

export function downloadText(filename: string, content: string, mime = "text/csv") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
