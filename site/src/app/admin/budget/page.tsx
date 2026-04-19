"use client";

// Budget — Cloudflare Browser Run daily usage + monthly projection.

import { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface TodayRes {
  date: string;
  seconds_used: number;
  seconds_budget: number;
  seconds_remaining: number;
  pct_used: number;
  request_count: number;
  blocked_today: boolean;
}

interface RecentRow {
  date: string;
  seconds_used: number;
  request_count: number;
}

interface RecentRes {
  timeline: RecentRow[];
  total_seconds: number;
  total_requests: number;
  avg_daily_seconds: number;
  projected_monthly_hours: number;
  projected_overage_usd: number;
  daily_budget_seconds: number;
}

export default function BudgetPage() {
  const [today, setToday] = useState<TodayRes | null>(null);
  const [recent, setRecent] = useState<RecentRes | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        fetch(`${API}/api/simulations/budget/today`).then((r) => r.json()),
        fetch(`${API}/api/simulations/budget/recent?days=30`).then((r) => r.json()),
      ]);
      setToday(a as TodayRes);
      setRecent(b as RecentRes);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const maxSeconds = recent
    ? Math.max(...recent.timeline.map((r) => r.seconds_used), 1)
    : 1;

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/admin/trace" className="ink-link text-sm">
              ← back to trace
            </Link>
            <h1 className="mt-2 text-4xl text-[var(--ink)] md:text-5xl">Budget</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
              Cloudflare Browser Run usage. Workers Paid tier includes 10
              browser-hours/month; overage is $0.09/hr. The daily cap below
              keeps us comfortably under.
            </p>
          </div>
          <button
            onClick={load}
            className="rounded-full bg-[var(--ink)] text-[var(--paper)] px-4 py-1.5 text-xs font-semibold"
          >
            {loading ? "…" : "refresh"}
          </button>
        </div>

        {today && (
          <section className="paper-panel rounded-[1.6rem] p-6 mb-6">
            <h2 className="text-lg text-[var(--ink)] mb-4">Today — {today.date}</h2>
            <div className="grid gap-3 md:grid-cols-4">
              <Stat
                label="Used"
                value={`${today.seconds_used.toFixed(1)}s`}
                tone={today.pct_used > 80 ? "bad" : today.pct_used > 50 ? "warn" : undefined}
              />
              <Stat label="Remaining" value={`${today.seconds_remaining.toFixed(1)}s`} />
              <Stat label="Daily cap" value={`${today.seconds_budget}s`} />
              <Stat
                label="Requests"
                value={String(today.request_count)}
                tone={today.blocked_today ? "bad" : undefined}
              />
            </div>
            <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-[rgba(0,0,0,0.06)]">
              <div
                className={`h-full transition-all ${
                  today.pct_used > 80 ? "bg-rose-500" : today.pct_used > 50 ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, today.pct_used)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {today.pct_used.toFixed(1)}% of daily cap used.
              {today.blocked_today && (
                <span className="ml-2 text-rose-700 font-semibold">
                  Scripted crawl blocked until 00:00 UTC.
                </span>
              )}
            </p>
          </section>
        )}

        {recent && (
          <section className="paper-panel rounded-[1.6rem] p-6 mb-6">
            <h2 className="text-lg text-[var(--ink)] mb-4">Last 30 days</h2>
            <div className="grid gap-3 md:grid-cols-4 mb-5">
              <Stat label="Total sec" value={`${Math.round(recent.total_seconds)}s`} />
              <Stat label="Avg/day" value={`${recent.avg_daily_seconds.toFixed(1)}s`} />
              <Stat
                label="Projected hrs/mo"
                value={recent.projected_monthly_hours.toFixed(2)}
                tone={recent.projected_monthly_hours > 10 ? "warn" : undefined}
              />
              <Stat
                label="Projected overage"
                value={`$${recent.projected_overage_usd.toFixed(2)}`}
                tone={recent.projected_overage_usd > 0 ? "warn" : undefined}
              />
            </div>
            <div className="rounded-xl border border-[color:var(--line)] bg-white/70 p-4">
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-3">
                daily browser-seconds
              </p>
              <div className="flex items-end gap-1 h-24">
                {recent.timeline.map((r) => (
                  <div
                    key={r.date}
                    className="flex-1 flex flex-col items-stretch group"
                    title={`${r.date} — ${r.seconds_used.toFixed(0)}s`}
                  >
                    <div className="flex-1 flex items-end">
                      <div
                        className="w-full rounded-sm bg-[var(--ink)] opacity-80 group-hover:opacity-100 transition-opacity"
                        style={{
                          height: `${Math.max(2, (r.seconds_used / maxSeconds) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-[var(--muted)] font-mono">
                <span>{recent.timeline[0]?.date ?? "—"}</span>
                <span>today</span>
              </div>
            </div>
          </section>
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
  tone?: "warn" | "bad";
}) {
  const color =
    tone === "bad" ? "text-rose-700" : tone === "warn" ? "text-amber-700" : "text-[var(--ink)]";
  return (
    <div className="metric-card">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className={`mt-1 text-2xl font-mono ${color}`}>{value}</p>
    </div>
  );
}
