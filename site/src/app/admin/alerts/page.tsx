"use client";

// Alerts — pulls drops + new-entrants data from the backend and renders
// them as cards. No email delivery yet; this is the in-app inbox.

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/config";

interface DropRow {
  brand: string;
  latest_rate: number;
  prior_mean: number;
  delta_pp: number;
  latest_date: string;
  window_days: number;
  severity: "high" | "medium";
}

interface EntrantRow {
  brand: string;
  mentions_in_window: number;
}

interface Summary {
  drops: DropRow[];
  entrants: EntrantRow[];
  as_of: string;
  window_days: number;
  counts: { drops: number; entrants: number };
}

export default function AlertsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [windowDays, setWindowDays] = useState(7);
  const [threshold, setThreshold] = useState(5);

  async function load() {
    setLoading(true);
    try {
      const r = await apiFetch(
        `/api/simulations/alerts/summary?days=${windowDays}&threshold_pp=${threshold}`
      );
      const d = await r.json();
      setData(d as Summary);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/admin/trace" className="ink-link text-sm">
              ← back to trace
            </Link>
            <h1 className="mt-2 text-4xl text-[var(--ink)] md:text-5xl">Alerts</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
              Mention-rate drops and new entrants in the benchmark panel. No
              email delivery yet — poll this page or the{" "}
              <code className="font-mono">/alerts/summary</code> endpoint.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--muted)]">window</label>
            <select
              value={windowDays}
              onChange={(e) => setWindowDays(parseInt(e.target.value, 10))}
              className="rounded-xl border border-[color:var(--line)] bg-white/60 px-3 py-1.5 text-sm"
            >
              <option value={3}>3d</option>
              <option value={7}>7d</option>
              <option value={14}>14d</option>
              <option value={30}>30d</option>
            </select>
            <label className="text-xs text-[var(--muted)]">threshold</label>
            <select
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
              className="rounded-xl border border-[color:var(--line)] bg-white/60 px-3 py-1.5 text-sm"
            >
              <option value={3}>3pp</option>
              <option value={5}>5pp</option>
              <option value={10}>10pp</option>
            </select>
            <button
              onClick={load}
              className="rounded-full bg-[var(--ink)] text-[var(--paper)] px-4 py-1.5 text-xs font-semibold"
            >
              {loading ? "…" : "refresh"}
            </button>
          </div>
        </div>

        {data && (
          <>
            <div className="grid gap-3 md:grid-cols-3 mb-6">
              <Stat label="As of" value={data.as_of} />
              <Stat label="Drops" value={String(data.counts.drops)} tone={data.counts.drops > 0 ? "bad" : undefined} />
              <Stat label="New entrants" value={String(data.counts.entrants)} tone={data.counts.entrants > 0 ? "warn" : undefined} />
            </div>

            <section className="paper-panel rounded-[1.6rem] p-6 mb-6">
              <h2 className="text-lg text-[var(--ink)] mb-4">
                Mention-rate drops (≥{threshold}pp vs {windowDays}d mean)
              </h2>
              {data.drops.length === 0 ? (
                <p className="text-sm italic text-[var(--muted)]">
                  No drops. Every tracked brand is stable or up.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.drops.map((d) => (
                    <div
                      key={d.brand}
                      className="rounded-xl border border-rose-200 bg-rose-50/40 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[var(--ink)]">{d.brand}</p>
                          <p className="mt-1 text-[11px] text-[var(--muted)]">
                            {d.latest_rate}% today vs {d.prior_mean}% avg over {d.window_days} days
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              d.severity === "high"
                                ? "bg-rose-200 text-rose-900"
                                : "bg-amber-100 text-amber-900"
                            }`}
                          >
                            {d.severity}
                          </span>
                          <p className="mt-1 font-mono text-lg text-rose-700">
                            {d.delta_pp > 0 ? "+" : ""}
                            {d.delta_pp}pp
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="paper-panel rounded-[1.6rem] p-6">
              <h2 className="text-lg text-[var(--ink)] mb-4">
                New entrants ({windowDays * 2}-day window)
              </h2>
              {data.entrants.length === 0 ? (
                <p className="text-sm italic text-[var(--muted)]">
                  No new brand names in recent LLM responses.
                </p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {data.entrants.map((e) => (
                    <div
                      key={e.brand}
                      className="rounded-xl border border-[color:var(--line)] bg-white/70 px-4 py-3 flex items-center justify-between"
                    >
                      <span className="text-sm font-semibold text-[var(--ink)]">{e.brand}</span>
                      <span className="font-mono text-xs text-[var(--muted)]">
                        {e.mentions_in_window} mentions
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "bad" | "warn";
}) {
  const color =
    tone === "bad"
      ? "text-rose-700"
      : tone === "warn"
      ? "text-amber-700"
      : "text-[var(--ink)]";
  return (
    <div className="metric-card">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className={`mt-1 text-2xl font-mono ${color}`}>{value}</p>
    </div>
  );
}
