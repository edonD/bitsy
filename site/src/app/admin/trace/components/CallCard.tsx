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
import { StatusPill, ParserStatusPill } from "./Pills";
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
        <div className="border-t border-[color:var(--line)] px-4 py-3 space-y-3 bg-white/40">
          {/* Metadata bar */}
          <div className="flex flex-wrap items-center gap-3 text-[10px]">
            <StatusPill status={card.log.status} />
            {parserStatus && <ParserStatusPill status={parserStatus} />}
            <span className="text-[var(--muted)]">
              mode{" "}
              <span className="text-[var(--ink)] font-semibold">{card.mode}</span>
            </span>
            <span className="text-[var(--muted)]">
              model{" "}
              <span className="text-[var(--ink)] font-semibold">{card.model}</span>
            </span>
            <span className="text-[var(--muted)]">
              sample{" "}
              <span className="text-[var(--ink)] font-semibold">
                {card.sample + 1}
              </span>
            </span>
            <span className="text-[var(--muted)]">
              latency{" "}
              <span className="text-[var(--ink)] font-semibold">
                {formatLatency(card.log.latency_ms)}
              </span>
            </span>
            {isSearch && (
              <span className="text-[var(--muted)]">
                search{" "}
                <span className="text-[var(--ink)] font-semibold">
                  {searchUsed ? "used" : "not used"}
                </span>
              </span>
            )}
            {card.log.raw_response && (
              <span className="text-[var(--muted)]">
                response{" "}
                <span className="text-[var(--ink)] font-semibold">
                  {card.log.raw_response.length.toLocaleString()} chars
                </span>
              </span>
            )}
            <span className="text-[var(--muted)]">
              logged{" "}
              <span className="text-[var(--ink)] font-semibold">
                {new Date(card.log._creationTime).toLocaleTimeString()}
              </span>
            </span>
          </div>
          {card.log.error && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-rose-700 mb-1">
                Error
              </p>
              <pre className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-[11px] leading-relaxed text-rose-900 overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
                {card.log.error}
              </pre>
            </div>
          )}
          {isSearch && (
            <div className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3">
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">
                Search actually used
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`rounded-full px-2 py-1 font-semibold ${
                    searchUsed
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {searchUsed ? "Yes" : "No"}
                </span>
                <span className="text-[var(--muted)]">
                  {searchUsed
                    ? "Provider returned search evidence for this call."
                    : "Provider returned no search evidence; this may have answered from memory."}
                </span>
              </div>
            </div>
          )}
          {toolTrace && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1">
                Tool trace
              </p>
              <div className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3 space-y-2">
                <div className="flex flex-wrap gap-3 text-[11px] text-[var(--muted)]">
                  <span>
                    provider{" "}
                    <span className="font-semibold text-[var(--ink)]">
                      {toolTrace.provider || "—"}
                    </span>
                  </span>
                  <span>
                    tool{" "}
                    <span className="font-semibold text-[var(--ink)]">
                      {toolTrace.tool_name || "—"}
                    </span>
                  </span>
                  <span>
                    calls{" "}
                    <span className="font-semibold text-[var(--ink)]">
                      {toolTrace.search_call_count ?? 0}
                    </span>
                  </span>
                  <span>
                    sources{" "}
                    <span className="font-semibold text-[var(--ink)]">
                      {toolTrace.source_count ?? sources.length}
                    </span>
                  </span>
                </div>
                {toolTrace.search_calls && toolTrace.search_calls.length > 0 && (
                  <div className="space-y-1.5">
                    {toolTrace.search_calls.map((call, idx) => (
                      <div
                        key={`${call.type || "tool"}-${idx}`}
                        className="rounded-md border border-[color:var(--line)] bg-[rgba(0,0,0,0.02)] px-2.5 py-2 text-[11px]"
                      >
                        <div className="flex flex-wrap gap-2 text-[var(--muted)]">
                          <span className="font-semibold text-[var(--ink)]">
                            {call.type || "tool event"}
                          </span>
                          {call.status && <span>status {call.status}</span>}
                          {typeof call.hit_count === "number" && (
                            <span>hits {call.hit_count}</span>
                          )}
                          {typeof call.grounding_chunk_count === "number" && (
                            <span>grounding {call.grounding_chunk_count}</span>
                          )}
                        </div>
                        {call.queries && call.queries.length > 0 && (
                          <p className="mt-1 text-[var(--muted)] break-words">
                            queries: {call.queries.join(" · ")}
                          </p>
                        )}
                        {call.hits && call.hits.length > 0 && (
                          <p className="mt-1 text-[var(--muted)] break-words">
                            sample hits: {call.hits.slice(0, 3).join(" · ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1">
              Tracked-brand hit / miss
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {tracked.map((item) => (
                <div
                  key={item.brand}
                  className="rounded-lg border border-[color:var(--line)] bg-white/80 px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-[var(--ink)]">
                      {item.brand}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        item.mentioned
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {item.mentioned ? "hit" : "miss"}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--muted)]">
                    <span>source {item.detection_source}</span>
                    <span>position {item.position ?? "—"}</span>
                    <span>{item.sentiment ?? "no sentiment"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3">
            <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">
              Position confidence
            </p>
            <div className="flex flex-wrap gap-3 text-[11px] text-[var(--muted)]">
              <span>
                high{" "}
                <span className="font-semibold text-[var(--ink)]">
                  {highConfidenceCount}
                </span>
              </span>
              <span>
                estimated{" "}
                <span className="font-semibold text-[var(--ink)]">
                  {estimatedCount}
                </span>
              </span>
              <span>
                missing{" "}
                <span className="font-semibold text-[var(--ink)]">
                  {tracked.length - highConfidenceCount - estimatedCount}
                </span>
              </span>
            </div>
            <p className="mt-2 text-[11px] text-[var(--muted)]">
              High = model-provided ranked JSON. Estimated = raw-text fallback position.
            </p>
          </div>
          <div className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3">
            <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">
              Memory vs search diff
            </p>
            {modeDiff ? (
              <div className="space-y-1.5 text-[11px] text-[var(--muted)]">
                <p>
                  Against{" "}
                  <span className="font-semibold text-[var(--ink)]">
                    {modeDiff.peerMode}
                  </span>{" "}
                  mode for the same model/sample.
                </p>
                <p>
                  tracked hits gained:{" "}
                  <span className="font-semibold text-[var(--ink)]">
                    {modeDiff.gained.length > 0 ? modeDiff.gained.join(", ") : "none"}
                  </span>
                </p>
                <p>
                  tracked hits lost:{" "}
                  <span className="font-semibold text-[var(--ink)]">
                    {modeDiff.lost.length > 0 ? modeDiff.lost.join(", ") : "none"}
                  </span>
                </p>
                <p>
                  top-ranked brand:{" "}
                  <span className="font-semibold text-[var(--ink)]">
                    {modeDiff.topChanged
                      ? `${modeDiff.topChanged.peerTop || "none"} -> ${
                          modeDiff.topChanged.currentTop || "none"
                        }`
                      : card.log.parsed_brands?.brands_mentioned?.[0]?.brand || "none"}
                  </span>
                </p>
                <p>
                  parser status changed:{" "}
                  <span className="font-semibold text-[var(--ink)]">
                    {modeDiff.parserChanged ? "yes" : "no"}
                  </span>
                </p>
                {isSearch && (
                  <p>
                    source delta vs {modeDiff.peerMode}:{" "}
                    <span className="font-semibold text-[var(--ink)]">
                      {modeDiff.sourceDelta > 0 ? "+" : ""}
                      {modeDiff.sourceDelta}
                    </span>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-[var(--muted)]">
                The paired {card.mode === "memory" ? "search" : "memory"} call is not available yet.
              </p>
            )}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1">
              Prompt sent
            </p>
            <pre className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3 text-[11px] leading-relaxed text-[var(--ink)] overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
              {card.log.prompt_sent}
            </pre>
          </div>
          {card.log.raw_response && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1">
                Raw LLM response
              </p>
              <pre className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3 text-[11px] leading-relaxed text-[var(--ink)] overflow-x-auto whitespace-pre-wrap max-h-80 overflow-y-auto">
                {card.log.raw_response}
              </pre>
            </div>
          )}
          {mentioned.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1">
                Parsed brands ({mentioned.length})
              </p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {mentioned.map((m) => (
                  <div
                    key={m.brand}
                    className="flex items-center justify-between rounded-lg bg-white/80 border border-[color:var(--line)] px-3 py-1.5 text-xs"
                  >
                    <span className="text-[var(--ink)] font-medium">
                      #{m.position} {m.brand}
                    </span>
                    <span
                      className={
                        m.sentiment === "positive"
                          ? "text-emerald-700 font-semibold"
                          : m.sentiment === "negative"
                          ? "text-rose-700 font-semibold"
                          : "text-[var(--muted)]"
                      }
                    >
                      {m.sentiment}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {sources.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1">
                Cited sources ({sources.length})
              </p>
              <ul className="space-y-1">
                {sources.slice(0, 10).map((url, i) => (
                  <li key={i} className="text-[11px] truncate">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 hover:underline break-all"
                    >
                      {url}
                    </a>
                  </li>
                ))}
                {sources.length > 10 && (
                  <li className="text-[10px] text-[var(--muted)]">
                    +{sources.length - 10} more
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
