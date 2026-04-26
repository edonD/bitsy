"use client";

// What-if simulator for a single brand: edit feature values, run /whatif,
// see predicted lift with importance-weighted feature-change attribution, and browse
// the engine's automatic recommendations for the brand.

import { useEffect, useState } from "react";
import { runWhatIf, getRecommendations, type Recommendation } from "@/lib/api";
import { FEATURE_LABELS, WHATIF_EDITABLE_FEATURES } from "../constants";
import { formatPercent, formatPoints } from "../format";
import type { WhatIfResult } from "../types";

export function WhatIfPanel({
  brand,
  brandFeatures,
}: {
  brand: string;
  brandFeatures: Record<string, number | string> | null;
}) {
  const [changes, setChanges] = useState<Record<string, number>>({});
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);

  // Reset inputs and fetch fresh recommendations whenever the focused brand changes.
  useEffect(() => {
    setChanges({});
    setResult(null);
    setError(null);
    (async () => {
      setRecsLoading(true);
      try {
        const r = await getRecommendations(brand);
        setRecs(r.recommendations);
      } catch {
        setRecs([]);
      } finally {
        setRecsLoading(false);
      }
    })();
  }, [brand]);

  async function run() {
    if (Object.keys(changes).length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const r = await runWhatIf({ brand, changes });
      setResult(r as unknown as WhatIfResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {brandFeatures && (
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            Edit features
          </p>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {WHATIF_EDITABLE_FEATURES.filter((f) => f in brandFeatures).map((f) => {
              const current = brandFeatures[f];
              const currentNum = typeof current === "number" ? current : Number(current);
              const override = changes[f];
              const isRateLike =
                f.includes("rate") ||
                f === "share_of_mentions" ||
                f === "query_coverage";
              return (
                <div
                  key={f}
                  className="flex items-center gap-2 rounded-lg bg-white/70 border border-[color:var(--line)] px-3 py-2 text-xs"
                >
                  <span
                    className="flex-1 text-[var(--ink)] truncate"
                    title={FEATURE_LABELS[f] || f}
                  >
                    {FEATURE_LABELS[f] || f}
                  </span>
                  <span className="font-mono text-[var(--muted)] w-14 text-right">
                    {currentNum.toFixed(1)}
                  </span>
                  <span className="text-[var(--muted)]">→</span>
                  <input
                    type="number"
                    step={isRateLike ? 0.05 : 1}
                    value={override ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "") {
                        setChanges((prev) => {
                          const next = { ...prev };
                          delete next[f];
                          return next;
                        });
                      } else {
                        setChanges((prev) => ({ ...prev, [f]: parseFloat(v) }));
                      }
                    }}
                    placeholder="new"
                    className="w-20 rounded border border-[color:var(--line)] bg-white px-2 py-1 text-right font-mono text-[var(--ink)] focus:border-[var(--ink)] focus:outline-none"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={run}
          disabled={Object.keys(changes).length === 0 || loading}
          className="btn-primary rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-40"
        >
          {loading ? "…" : "Simulate"}
        </button>
        <span className="text-xs text-[var(--muted)]">
          {Object.keys(changes).length} features modified
        </span>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      )}

      {result && (
        <div className="rounded-xl border border-[color:var(--line)] bg-white/60 p-5">
          <div className="grid gap-6 md:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Base</p>
              <p className="mt-1 text-2xl text-[var(--ink)] font-mono">
                {formatPercent(result.base_prediction)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Scenario
              </p>
              <p className="mt-1 text-2xl text-[var(--ink)] font-mono">
                {formatPercent(result.scenario_prediction)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Lift</p>
              <p
                className={`mt-1 text-2xl font-mono ${
                  result.lift > 0 ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {formatPoints(result.lift)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Residual interval
              </p>
              <p className="mt-2 text-sm text-[var(--muted)] font-mono">
                [{formatPercent(result.ci_lower)}, {formatPercent(result.ci_upper)}]
              </p>
            </div>
          </div>

          {result.contributions.length > 0 && (
            <div className="mt-6">
              <p className="mb-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Importance-weighted feature changes
              </p>
              <p className="mb-4 text-xs leading-relaxed text-[var(--muted)]">
                Not SHAP. Lift is allocated across changed features using feature delta times XGBoost built-in importance.
              </p>
              <div className="space-y-1.5">
                {result.contributions.map((c) => (
                  <div key={c.feature} className="flex items-center gap-3 text-xs">
                    <span className="w-40 text-[var(--ink)]">
                      {FEATURE_LABELS[c.feature] || c.feature}
                    </span>
                    <span
                      className={`w-20 text-right font-mono font-semibold ${
                        c.contribution > 0 ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {formatPoints(c.contribution)}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-[rgba(0,0,0,0.05)] overflow-hidden">
                      <div
                        className={c.contribution > 0 ? "bg-emerald-500" : "bg-rose-500"}
                        style={{
                          width: `${Math.min(100, Math.abs(c.pct))}%`,
                          height: "100%",
                        }}
                      />
                    </div>
                    <span className="w-12 text-right text-[var(--muted)]">
                      {c.pct.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!recsLoading && recs.length > 0 && (
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            Recommendations for {brand}
          </p>
          <p className="mb-4 text-sm text-[var(--muted)]">
            For each recommendation the engine runs what-if internally and returns the
            predicted lift.
          </p>
          <div className="space-y-2">
            {recs.slice(0, 6).map((r, i) => (
              <div
                key={i}
                className="rounded-xl border border-[color:var(--line)] bg-white/60 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-[var(--ink)] font-semibold">{r.action}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {FEATURE_LABELS[r.feature] || r.feature}: {r.current_value} →{" "}
                      {r.target_value} · {r.effort}
                    </p>
                  </div>
                  <p
                    className={`shrink-0 font-mono text-sm font-semibold ${
                      r.predicted_lift > 0 ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {formatPoints(r.predicted_lift)}
                  </p>
                </div>
                {r.tactics.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-[var(--muted)]">
                    {r.tactics.slice(0, 3).map((t, j) => (
                      <li key={j}>· {t}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
