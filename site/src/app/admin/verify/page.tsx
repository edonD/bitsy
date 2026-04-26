"use client";

// Verify — log a shipped change, then track predicted-vs-actual once 14 days
// of benchmark data have accumulated. Completes the five-step loop.

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE_URL as API, apiFetch } from "@/lib/config";

const FEATURE_OPTIONS = [
  "citation_count",
  "statistics_count",
  "statistics_density",
  "quotation_count",
  "readability_grade",
  "freshness_days",
  "content_length",
  "heading_count",
  "has_schema_org",
];

interface ChangeRow {
  id?: string;
  brand: string;
  feature: string;
  description: string;
  shipped_at: number;
  shipped_date: string | null;
  days_elapsed: number | null;
  predicted_lift: number | null;
  baseline_rate: number | null;
  actual_rate: number | null;
  actual_lift: number | null;
  measured_at: string | null;
  status: "accurate" | "close" | "off" | "pending";
}

interface Attribution {
  brand: string;
  changes: ChangeRow[];
  counts: {
    total: number;
    accurate: number;
    close: number;
    off: number;
    pending: number;
  };
  calibration_pct: number | null;
  signal_days_available: number;
}

export default function VerifyPage() {
  const [brand, setBrand] = useState("Bitsy");
  const [feature, setFeature] = useState("citation_count");
  const [description, setDescription] = useState("Added 12 citations + 3 stats to homepage hero");
  const [predictedLift, setPredictedLift] = useState<string>("8");

  const [logMsg, setLogMsg] = useState<string | null>(null);
  const [logErr, setLogErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [attribution, setAttribution] = useState<Attribution | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadAttribution(b: string) {
    setLoading(true);
    try {
      const r = await apiFetch(
        `/api/simulations/verify/attribution?brand=${encodeURIComponent(b)}`
      );
      const d = await r.json();
      setAttribution(d as Attribution);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    loadAttribution(brand);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitChange() {
    if (submitting) return;
    setSubmitting(true);
    setLogMsg(null);
    setLogErr(null);
    try {
      const r = await apiFetch("/api/simulations/verify/log-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand,
          feature,
          description,
          predicted_lift: predictedLift === "" ? null : parseFloat(predictedLift),
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setLogErr(d?.detail ?? r.statusText);
      } else {
        setLogMsg(
          `Logged. Baseline mention rate captured: ${
            d?.baseline_rate != null ? `${(d.baseline_rate * 100).toFixed(1)}%` : "—"
          }. Attribution appears once ≥14 days of post-change benchmark data exists.`
        );
        loadAttribution(brand);
      }
    } catch (e) {
      setLogErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/admin/execute" className="ink-link text-sm">
              ← back to execute
            </Link>
            <h1 className="mt-2 text-4xl text-[var(--ink)] md:text-5xl">Verify</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
              Log what you shipped, when. After 14 days of benchmark data,
              Bitsy shows predicted-vs-actual lift. Predictions are held
              honest — calibration is tracked across every change.
            </p>
          </div>
          <div className="text-right text-xs text-[var(--muted)]">
            <div className="font-mono">{API}</div>
            <div>Dev-only. Blocked in production.</div>
          </div>
        </div>

        {/* Log form */}
        <section className="paper-panel rounded-[1.6rem] p-6 mb-6">
          <h2 className="text-lg text-[var(--ink)] mb-4">Log a change</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Brand</span>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[color:var(--line)] bg-white/60 px-4 py-3 text-sm text-[var(--ink)]"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Feature changed</span>
              <select
                value={feature}
                onChange={(e) => setFeature(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[color:var(--line)] bg-white/60 px-4 py-3 text-sm text-[var(--ink)]"
              >
                {FEATURE_OPTIONS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Description</span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[color:var(--line)] bg-white/60 px-4 py-3 text-sm text-[var(--ink)]"
                placeholder="What did you actually ship?"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Predicted lift (pp) — from the playbook, optional
              </span>
              <input
                type="number"
                step="0.1"
                value={predictedLift}
                onChange={(e) => setPredictedLift(e.target.value)}
                className="mt-1 w-40 rounded-xl border border-[color:var(--line)] bg-white/60 px-4 py-3 text-sm text-[var(--ink)]"
              />
            </label>
          </div>
          <div className="mt-6 flex items-center justify-end">
            <button
              onClick={submitChange}
              disabled={submitting || !brand || !description}
              className="btn-primary rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? "logging…" : "Log change"}
            </button>
          </div>
          {logMsg && (
            <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {logMsg}
            </p>
          )}
          {logErr && (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {logErr}
            </p>
          )}
        </section>

        {/* Attribution */}
        <section className="paper-panel rounded-[1.6rem] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg text-[var(--ink)]">Attribution for {brand}</h2>
            <button
              onClick={() => loadAttribution(brand)}
              className="rounded-full border border-[color:var(--line)] px-4 py-1.5 text-xs hover:text-[var(--ink)] hover:border-[var(--ink)] transition-colors"
            >
              {loading ? "refreshing…" : "refresh"}
            </button>
          </div>
          {attribution && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5 mb-5">
                <Stat label="Total logged" value={String(attribution.counts.total)} />
                <Stat label="Accurate" value={String(attribution.counts.accurate)} tone="good" />
                <Stat label="Close" value={String(attribution.counts.close)} tone="ok" />
                <Stat label="Off" value={String(attribution.counts.off)} tone="bad" />
                <Stat label="Pending" value={String(attribution.counts.pending)} />
              </div>
              {attribution.calibration_pct != null && (
                <p className="mb-4 text-sm text-[var(--ink-soft)]">
                  Calibration rate:{" "}
                  <span className="font-mono text-[var(--ink)] font-semibold">
                    {attribution.calibration_pct}%
                  </span>{" "}
                  of predictions are within 6pp of actual. Higher is better.
                </p>
              )}
              {attribution.changes.length === 0 ? (
                <p className="text-sm italic text-[var(--muted)]">
                  No changes logged yet for {brand}. Log one above — attribution
                  shows up 14 days after ship.
                </p>
              ) : (
                <div className="space-y-3">
                  {attribution.changes.map((c) => (
                    <ChangeRow key={c.id ?? c.shipped_at} row={c} />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
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
  tone?: "good" | "ok" | "bad";
}) {
  const color =
    tone === "good"
      ? "text-emerald-700"
      : tone === "bad"
      ? "text-rose-700"
      : tone === "ok"
      ? "text-amber-700"
      : "text-[var(--ink)]";
  return (
    <div className="metric-card">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className={`mt-1 text-2xl font-mono ${color}`}>{value}</p>
    </div>
  );
}

function ChangeRow({ row }: { row: ChangeRow }) {
  const predicted = row.predicted_lift;
  const actual = row.actual_lift;
  const statusColor = {
    accurate: "bg-emerald-100 text-emerald-900",
    close: "bg-amber-100 text-amber-900",
    off: "bg-rose-100 text-rose-900",
    pending: "bg-neutral-100 text-neutral-700",
  }[row.status];
  return (
    <div className="rounded-xl border border-[color:var(--line)] bg-white/70 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--ink)]">{row.description}</p>
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            {row.feature} · shipped {row.shipped_date ?? "?"} · day {row.days_elapsed ?? "—"}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusColor}`}>
          {row.status}
        </span>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-4 text-xs">
        <Metric
          label="Baseline"
          value={row.baseline_rate != null ? `${(row.baseline_rate).toFixed(1)}%` : "—"}
        />
        <Metric
          label="Measured"
          value={row.actual_rate != null ? `${(row.actual_rate).toFixed(1)}%` : "—"}
          note={row.measured_at ?? undefined}
        />
        <Metric
          label="Predicted lift"
          value={predicted != null ? `${predicted > 0 ? "+" : ""}${predicted.toFixed(1)}pp` : "—"}
        />
        <Metric
          label="Actual lift"
          value={actual != null ? `${actual > 0 ? "+" : ""}${actual.toFixed(1)}pp` : "pending"}
          tone={actual != null ? (actual > 0 ? "good" : "bad") : undefined}
        />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "good" | "bad";
}) {
  const color = tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-rose-700" : "text-[var(--ink)]";
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
      <p className={`mt-0.5 font-mono ${color}`}>{value}</p>
      {note && <p className="text-[10px] text-[var(--muted)]">{note}</p>}
    </div>
  );
}
