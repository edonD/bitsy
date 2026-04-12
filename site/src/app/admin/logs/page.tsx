"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const API = "http://localhost:8000";

interface ApiLog {
  _id: string;
  date: string;
  query: string;
  model: string;
  sample: number;
  prompt_sent: string;
  raw_response?: string;
  parsed_brands?: { brands_mentioned?: { brand: string; position: number; sentiment: string }[] };
  status: string;
  error?: string;
  _creationTime: number;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch(`${API}/api/simulations/logs?limit=100`)
      .then((r) => r.json())
      .then((data) => setLogs(data.logs ?? []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  const models = [...new Set(logs.map((l) => l.model))];
  const filtered = filter === "all" ? logs : logs.filter((l) => l.model === filter);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <Link href="/simulator" className="ink-link text-sm">Back to engine</Link>
          <h1 className="mt-2 text-4xl text-[var(--ink)] md:text-5xl">API Logs</h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-[var(--muted)]">
            Every prompt sent to ChatGPT, Claude, and Gemini &mdash; and every response received.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setLoading(true);
              fetch(`${API}/api/simulations/logs?limit=100`)
                .then((r) => r.json())
                .then((data) => setLogs(data.logs ?? []))
                .catch(() => setLogs([]))
                .finally(() => setLoading(false));
            }}
            className="btn-secondary rounded-2xl px-4 py-2 text-sm font-semibold"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4 mb-8">
        <div className="metric-card">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Total calls</p>
          <p className="mt-1 text-3xl text-[var(--ink)]">{logs.length}</p>
        </div>
        <div className="metric-card">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Success</p>
          <p className="mt-1 text-3xl text-emerald-700">{logs.filter((l) => l.status === "success").length}</p>
        </div>
        <div className="metric-card">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Parse errors</p>
          <p className="mt-1 text-3xl text-amber-700">{logs.filter((l) => l.status === "parse_error").length}</p>
        </div>
        <div className="metric-card">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Failures</p>
          <p className="mt-1 text-3xl text-rose-700">{logs.filter((l) => l.status === "error").length}</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
            filter === "all" ? "bg-[var(--ink)] text-[var(--paper)]" : "surface-chip text-[var(--muted)] hover:text-[var(--ink)]"
          }`}
        >
          All ({logs.length})
        </button>
        {models.map((m) => (
          <button
            key={m}
            onClick={() => setFilter(m)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              filter === m ? "bg-[var(--ink)] text-[var(--paper)]" : "surface-chip text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {m} ({logs.filter((l) => l.model === m).length})
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="paper-panel rounded-[2rem] p-10 text-center">
          <p className="text-sm text-[var(--muted)]">Loading logs...</p>
        </div>
      )}

      {/* Empty */}
      {!loading && logs.length === 0 && (
        <div className="paper-panel rounded-[2rem] p-10 text-center">
          <p className="text-lg text-[var(--muted)]">No API logs yet</p>
          <p className="mt-2 text-sm text-[var(--muted)]">Run a visibility check from the Engine to generate logs.</p>
        </div>
      )}

      {/* Log entries */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((log) => {
            const isExpanded = expanded === log._id;
            const statusColor =
              log.status === "success" ? "text-emerald-700 bg-emerald-50 border-emerald-200"
              : log.status === "error" ? "text-rose-700 bg-rose-50 border-rose-200"
              : "text-amber-700 bg-amber-50 border-amber-200";
            const modelColor =
              log.model === "chatgpt" ? "#10a37f"
              : log.model === "claude" ? "#d97706"
              : "#4285f4";

            const mentioned = log.parsed_brands?.brands_mentioned ?? [];

            return (
              <div key={log._id} className="paper-card rounded-[1.4rem] overflow-hidden">
                {/* Header row — always visible */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : log._id)}
                  className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-[rgba(255,255,255,0.5)] transition-colors"
                >
                  {/* Model badge */}
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: modelColor }}
                  >
                    {log.model === "chatgpt" ? "G" : log.model === "claude" ? "C" : "Ge"}
                  </span>

                  {/* Query */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--ink)] truncate">{log.query}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {log.model} &middot; sample {log.sample + 1} &middot; {log.date}
                    </p>
                  </div>

                  {/* Brands found */}
                  {mentioned.length > 0 && (
                    <div className="hidden sm:flex gap-1">
                      {mentioned.slice(0, 4).map((b) => (
                        <span key={b.brand} className="surface-chip px-2 py-0.5 text-[10px] text-[var(--muted)]">
                          #{b.position} {b.brand}
                        </span>
                      ))}
                      {mentioned.length > 4 && (
                        <span className="text-[10px] text-[var(--muted)] self-center">+{mentioned.length - 4}</span>
                      )}
                    </div>
                  )}

                  {/* Status */}
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${statusColor}`}>
                    {log.status}
                  </span>

                  {/* Chevron */}
                  <span className={`text-[var(--muted)] transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                    &#9662;
                  </span>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-[color:var(--line)] px-5 py-4 space-y-4">
                    {/* Prompt sent */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">Prompt sent</p>
                      <pre className="text-xs leading-relaxed text-[var(--ink)] bg-[rgba(255,255,255,0.5)] rounded-xl p-4 overflow-x-auto whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                        {log.prompt_sent}
                      </pre>
                    </div>

                    {/* Raw response */}
                    {log.raw_response && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">Raw response</p>
                        <pre className="text-xs leading-relaxed text-[var(--ink)] bg-[rgba(255,255,255,0.5)] rounded-xl p-4 overflow-x-auto whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
                          {log.raw_response}
                        </pre>
                      </div>
                    )}

                    {/* Parsed brands */}
                    {mentioned.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">Parsed brands ({mentioned.length})</p>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {mentioned.map((b) => (
                            <div key={b.brand} className="surface-inset rounded-xl px-3 py-2 flex items-center justify-between">
                              <div>
                                <span className="text-sm font-semibold text-[var(--ink)]">#{b.position} {b.brand}</span>
                              </div>
                              <span className={`text-xs font-semibold ${
                                b.sentiment === "positive" ? "text-emerald-700"
                                : b.sentiment === "negative" ? "text-rose-700"
                                : "text-[var(--muted)]"
                              }`}>
                                {b.sentiment}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Error */}
                    {log.error && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-rose-700 mb-2">Error</p>
                        <pre className="text-xs text-rose-800 bg-rose-50 rounded-xl p-4 font-mono">{log.error}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
