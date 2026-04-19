"use client";

import { formatParserStatus } from "../format";

// Colored chip for the API log's top-level status (success / error / parse_error / etc).
export function StatusPill({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string }> = {
    success: { bg: "bg-emerald-100", text: "text-emerald-800" },
    error: { bg: "bg-rose-100", text: "text-rose-800" },
    parse_error: { bg: "bg-amber-100", text: "text-amber-800" },
    extraction_conflict: { bg: "bg-amber-100", text: "text-amber-800" },
    pending: { bg: "bg-neutral-100", text: "text-neutral-700" },
  };
  const s = styles[status] || { bg: "bg-neutral-100", text: "text-neutral-700" };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${s.bg} ${s.text}`}
    >
      {status}
    </span>
  );
}

// Colored chip for how the parser arrived at the result (structured JSON,
// partial recovery, text fallback, etc). Users can tell quality at a glance.
export function ParserStatusPill({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string }> = {
    structured_json: { bg: "bg-emerald-100", text: "text-emerald-800" },
    partial_recovery: { bg: "bg-amber-100", text: "text-amber-800" },
    text_fallback: { bg: "bg-sky-100", text: "text-sky-800" },
    extraction_conflict: { bg: "bg-amber-100", text: "text-amber-800" },
    call_error: { bg: "bg-rose-100", text: "text-rose-800" },
    parse_error: { bg: "bg-rose-100", text: "text-rose-800" },
  };
  const s = styles[status] || { bg: "bg-neutral-100", text: "text-neutral-700" };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${s.bg} ${s.text}`}
      title={formatParserStatus(status)}
    >
      {formatParserStatus(status)}
    </span>
  );
}
