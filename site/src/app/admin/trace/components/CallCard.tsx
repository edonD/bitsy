"use client";

// The big per-call card: compact summary row + expandable detail view with
// prompt, raw response, tracked-brand hits, sources, tool trace, and the
// memory-vs-search diff against the paired call. Also exports QueryBlock,
// which renders all the cards for one query in a small grid.

import { useState } from "react";
import type { CallCard as CallCardType } from "../types";
import { MODEL_ACCENT, MODEL_LABELS } from "../constants";
import { formatLatency, formatParserStatus } from "../format";
import { getModePeer, getTrackedBrands, summarizeModeDiff } from "../logic";
import { CallCardDetails } from "./CallCardDetails";
import { RunningBadge } from "./Progress";

export function QueryBlock({
  query,
  cards,
  trackedBrands,
}: {
  query: string;
  cards: CallCardType[];
  trackedBrands: string[];
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <span className="text-sm text-[var(--ink)] font-semibold">{query}</span>
        <span className="text-xs text-[var(--muted)]">
          {cards.filter((c) => c.state === "done" || c.state === "error").length}/
          {cards.length} done
        </span>
      </div>
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <CallCardView
            key={c.key}
            card={c}
            peer={getModePeer(c, cards)}
            trackedBrands={trackedBrands}
          />
        ))}
      </div>
    </div>
  );
}

export function CallCardView({
  card,
  peer,
  trackedBrands,
}: {
  card: CallCardType;
  peer?: CallCardType;
  trackedBrands: string[];
}) {
  const [open, setOpen] = useState(false);
  const mentioned = card.log?.parsed_brands?.brands_mentioned ?? [];
  const sources = card.log?.sources ?? [];
  // Prefer the backend's tracked_brands list if present; fall back to
  // matching mentioned brands against the target + competitors list so the
  // card renders usefully even on older log rows.
  const tracked =
    getTrackedBrands(card.log).length > 0
      ? getTrackedBrands(card.log)
      : trackedBrands.map((brand) => {
          const match = mentioned.find(
            (item) => item.brand.toLowerCase() === brand.toLowerCase()
          );
          return {
            brand,
            mentioned: Boolean(match),
            position: match?.position ?? null,
            sentiment: match?.sentiment ?? null,
            detection_source: match ? ("json" as const) : ("none" as const),
            position_source: match ? ("model_json" as const) : ("none" as const),
            position_confidence: match ? ("high" as const) : ("none" as const),
          };
        });
  const modeDiff = summarizeModeDiff(card, peer);
  const accent = MODEL_ACCENT[card.model] || "#555";
  const isSearch = card.mode === "search";
  const isRunning = card.state === "running";
  const isDone = card.state === "done";
  const parserStatus = card.log?.parser_status;
  const searchUsed = card.log?.search_used;
  const toolTrace = card.log?.tool_trace;
  const highConfidenceCount = tracked.filter(
    (item) => item.position_confidence === "high"
  ).length;
  const estimatedCount = tracked.filter(
    (item) => item.position_confidence === "estimated"
  ).length;

  const statusNode =
    card.state === "pending" ? (
      <span className="text-xs text-[var(--muted)]">waiting…</span>
    ) : isRunning ? (
      <RunningBadge isSearch={isSearch} />
    ) : card.state === "error" ? (
      <span className="text-xs font-semibold text-rose-700">failed</span>
    ) : (
      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
        <svg
          className="trace-check"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2.5 6.2l2.4 2.4 5-5" />
        </svg>
        {mentioned.length} brands
      </span>
    );

  const borderColor = isDone
    ? "border-emerald-100"
    : card.state === "error"
    ? "border-rose-200"
    : "border-[color:var(--line)]";

  return (
    <div
      className={`relative rounded-xl border ${borderColor} bg-white/70 transition-all overflow-hidden`}
    >
      {/* Shimmering overlay while the call is in flight */}
      {isRunning && (
        <div
          className="trace-shimmer pointer-events-none absolute inset-0 rounded-xl"
          aria-hidden="true"
        />
      )}
      <button
        onClick={() =>
          isDone || card.state === "error" ? setOpen(!open) : undefined
        }
        className="relative w-full text-left px-4 py-3 flex items-center gap-3"
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
            isRunning ? "trace-ring-pulse" : ""
          }`}
          style={{ backgroundColor: accent, color: "#fff" }}
        >
          {card.model === "chatgpt" ? "G" : card.model === "claude" ? "C" : "Ge"}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--ink)] font-medium flex items-center gap-2">
            <span>{MODEL_LABELS[card.model]}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase ${
                isSearch
                  ? "bg-blue-100 text-blue-800"
                  : "bg-[rgba(0,0,0,0.06)] text-[var(--muted)]"
              }`}
            >
              {isSearch ? "search" : "memory"}
            </span>
            <span className="text-[11px] text-[var(--muted)] font-normal">
              sample {card.sample + 1}
            </span>
          </p>
          {card.state === "pending" && (
            <p className="text-xs text-[var(--muted)] italic">waiting for a worker…</p>
          )}
          {isRunning && (
            <p className="text-xs text-[var(--muted)] italic">
              <span>{isSearch ? "searching the web" : "thinking"}</span>
              <span className="trace-thinking" />
            </p>
          )}
          {card.state === "done" && mentioned.length > 0 && (
            <p className="text-xs text-[var(--muted)] truncate">
              #1 {mentioned[0].brand}
              {mentioned.length > 1 && `, +${mentioned.length - 1} more`}
              {isSearch && sources.length > 0 && (
                <span className="ml-2 text-[10px] text-blue-700">
                  · {sources.length} sources
                </span>
              )}
            </p>
          )}
          {card.state === "done" && mentioned.length === 0 && (
            <p className="text-xs text-[var(--muted)] italic">no tracked brands</p>
          )}
          {card.state === "error" && (
            <p className="text-xs text-rose-600 truncate">
              {card.log?.error || "error"}
            </p>
          )}
          {card.log && !isRunning && (
            <p className="mt-1 text-[10px] text-[var(--muted)]">
              {formatLatency(card.log.latency_ms)}
              {parserStatus && ` · ${formatParserStatus(parserStatus)}`}
              {isSearch && ` · ${searchUsed ? "search used" : "search not used"}`}
            </p>
          )}
        </div>
        {statusNode}
      </button>

      {open && card.log && (
        <CallCardDetails
          card={card}
          tracked={tracked}
          mentioned={mentioned}
          sources={sources}
          isSearch={isSearch}
          parserStatus={parserStatus}
          searchUsed={searchUsed}
          toolTrace={toolTrace}
          highConfidenceCount={highConfidenceCount}
          estimatedCount={estimatedCount}
          modeDiff={modeDiff}
        />
      )}
    </div>
  );
}
