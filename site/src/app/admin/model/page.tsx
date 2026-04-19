"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getModelDiagnostics,
  type ModelDiagnosticsResponse,
} from "@/lib/api";
import { FEATURE_LABELS } from "@/app/admin/trace/constants";

function labelForFeature(feature: string): string {
  return FEATURE_LABELS[feature] || feature.replace(/_/g, " ");
}

function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

function metricTone(
  tone: "neutral" | "good" | "warn" | "bad"
): string {
  switch (tone) {
    case "good":
      return "text-emerald-700";
    case "warn":
      return "text-amber-700";
    case "bad":
      return "text-rose-700";
    default:
      return "text-[var(--ink)]";
  }
}

function getR2Tone(r2: number): "good" | "warn" | "bad" {
  if (r2 >= 0.7) return "good";
  if (r2 >= 0.3) return "warn";
  return "bad";
}

function getAssessment(diagnostics: ModelDiagnosticsResponse | null) {
  if (!diagnostics?.metrics) {
    return {
      title: "No trained surrogate in memory",
      tone: "warn" as const,
      summary:
        "Run a collection or retrain the model first. Without a loaded surrogate there is nothing honest to evaluate.",
      bullets: [
        "The dataset can still exist in Convex even if the in-memory model is missing.",
        "A fresh /collect or /train call will rebuild the surrogate from all accumulated training samples.",
      ],
    };
  }

  const { metrics, unique_dates, temporal_pair_count } = diagnostics;
  const isWalkForward = metrics.validation_mode === "walk_forward";
  const r2Tone = getR2Tone(metrics.r2);

  if (!isWalkForward) {
    return {
      title: "Current score is optimistic",
      tone: "warn" as const,
      summary:
        "The model is fitting and scoring on the same rows. That is useful for sanity-checking whether the features can explain the current dataset, but it is not a strong generalization test.",
      bullets: [
        `Validation mode is ${metrics.validation_mode}, so the displayed R² ${metrics.r2.toFixed(
          3
        )} is in-sample.`,
        unique_dates < 2
          ? "There is not enough date coverage yet to do a real next-period forecast test."
          : "The dataset did not produce enough temporal training pairs to switch into walk-forward validation.",
        "Treat the model as directional until the page shows walk-forward validation on multiple dates.",
      ],
    };
  }

  if (r2Tone === "good") {
    return {
      title: "This is a real forecast-style evaluation",
      tone: "good" as const,
      summary:
        "The surrogate is being evaluated with walk-forward validation: train on earlier dates, predict later dates. That is the honest version of this model.",
      bullets: [
        `${temporal_pair_count} temporal brand-date pairs were available for next-period prediction.`,
        `R² ${metrics.r2.toFixed(3)} means the model is capturing a meaningful amount of variance in future mention rate.`,
        `RMSE ${metrics.rmse.toFixed(2)}pp is the typical size of the prediction error in percentage points.`,
      ],
    };
  }

  return {
    title: "Validation is honest, but the fit is still weak",
    tone: r2Tone,
    summary:
      "The evaluation setup is now legitimate, but the model still needs more coverage or cleaner features before its forecasts are strong.",
    bullets: [
      `${temporal_pair_count} temporal pairs are being evaluated with walk-forward validation.`,
      `R² ${metrics.r2.toFixed(3)} is the current fit level; negative or low values mean the forecast is barely beating or failing to beat a naive baseline.`,
      "More dates, more brands, and less noisy extraction should matter more here than more model tuning.",
    ],
  };
}

function MetricCard({
  label,
  value,
  note,
  tone = "neutral",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  return (
    <div className="metric-card">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className={`mt-1 text-3xl ${metricTone(tone)}`}>{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{note}</p>
    </div>
  );
}

function StepCard({
  n,
  title,
  text,
}: {
  n: number;
  title: string;
  text: string;
}) {
  return (
    <div className="paper-card rounded-[1.4rem] p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ink)] text-sm font-semibold text-[var(--paper)]">
          {n}
        </span>
        <h3 className="text-lg text-[var(--ink)]">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{text}</p>
    </div>
  );
}

export default function ModelPage() {
  const [diagnostics, setDiagnostics] = useState<ModelDiagnosticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getModelDiagnostics()
      .then((data) => {
        setDiagnostics(data);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load model diagnostics");
      })
      .finally(() => setLoading(false));
  }, []);

  const assessment = useMemo(() => getAssessment(diagnostics), [diagnostics]);
  const metrics = diagnostics?.metrics;
  const importance = diagnostics?.importance ?? [];
  const maxImportance = Math.max(...importance.map((item) => item.importance), 0.0001);
  const isWalkForward = metrics?.validation_mode === "walk_forward";

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex gap-4 text-sm">
            <Link href="/simulator" className="ink-link">
              Back to engine
            </Link>
            <Link href="/admin/trace" className="ink-link">
              Trace
            </Link>
          </div>
          <h1 className="mt-2 text-4xl text-[var(--ink)] md:text-5xl">Surrogate model</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--muted)]">
            A plain-language page for the current XGBoost surrogate: what rows it trains on,
            what it predicts, how it is scored, and whether the score is actually trustworthy.
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            getModelDiagnostics()
              .then((data) => {
                setDiagnostics(data);
                setError(null);
              })
              .catch((err) => {
                setError(
                  err instanceof Error ? err.message : "Failed to refresh model diagnostics"
                );
              })
              .finally(() => setLoading(false));
          }}
          className="btn-secondary rounded-2xl px-4 py-2 text-sm font-semibold"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="mt-8 paper-panel rounded-[2rem] p-10 text-center text-sm text-[var(--muted)]">
          Loading model diagnostics...
        </div>
      ) : error ? (
        <div className="mt-8 rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
          {error}
        </div>
      ) : diagnostics ? (
        <>
          <div
            className={`mt-8 rounded-[2rem] border p-6 ${
              assessment.tone === "good"
                ? "border-emerald-200 bg-emerald-50"
                : assessment.tone === "bad"
                ? "border-rose-200 bg-rose-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
              Honest read
            </p>
            <h2 className="mt-2 text-2xl text-[var(--ink)]">{assessment.title}</h2>
            <p className="mt-2 max-w-4xl text-sm leading-relaxed text-[var(--muted)]">
              {assessment.summary}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
              {assessment.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <MetricCard
              label="Validation"
              value={metrics ? metrics.validation_mode.replace(/_/g, " ") : "none"}
              note={
                metrics
                  ? isWalkForward
                    ? "Trained on earlier dates and scored on later dates."
                    : "Scored on the same rows it trained on."
                  : "No model is loaded."
              }
              tone={metrics ? (isWalkForward ? "good" : "warn") : "warn"}
            />
            <MetricCard
              label="R²"
              value={metrics ? metrics.r2.toFixed(3) : "—"}
              note="How much variance in mention rate the model explains."
              tone={metrics ? getR2Tone(metrics.r2) : "warn"}
            />
            <MetricCard
              label="RMSE"
              value={metrics ? `${metrics.rmse.toFixed(2)}pp` : "—"}
              note="Typical prediction error in percentage points."
              tone={metrics ? "neutral" : "warn"}
            />
            <MetricCard
              label="Samples"
              value={String(diagnostics.training_sample_count)}
              note="All accumulated brand-day rows stored in Convex."
            />
            <MetricCard
              label="Dates"
              value={String(diagnostics.unique_dates)}
              note={
                diagnostics.date_start && diagnostics.date_end
                  ? `${diagnostics.date_start} to ${diagnostics.date_end}`
                  : "Only one or zero usable dates so far."
              }
            />
            <MetricCard
              label="Features"
              value={String(diagnostics.feature_count)}
              note={
                diagnostics.use_content_features
                  ? "Includes crawl-derived content features when available."
                  : "Only brand-mention features are active."
              }
            />
          </div>

          <section className="mt-8 paper-panel rounded-[2rem] p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
              How training works right now
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              <StepCard
                n={1}
                title="Collect brand-day rows"
                text={`Each collection run writes one row per tracked brand for that day. Right now the corpus has ${diagnostics.training_sample_count} rows across ${diagnostics.brand_count} brands.`}
              />
              <StepCard
                n={2}
                title="Build the target"
                text={
                  metrics?.training_mode === "next_period_forecast"
                    ? `The target is the next day's mention_rate. The current day's mention_rate is copied into ${metrics.lag_feature_enabled ? "a lag feature" : "the row"} so the model can forecast forward.`
                    : "There is not enough temporal history yet, so the target is the same row's mention_rate. This is a fit check, not a true forecast."
                }
              />
              <StepCard
                n={3}
                title="Choose features"
                text={`The model sees ${diagnostics.active_feature_names.length || diagnostics.base_feature_names.length} active features: visibility, ranking, sentiment, competition, and ${
                  diagnostics.use_content_features ? "target content signals." : "no crawl features yet."
                }`}
              />
              <StepCard
                n={4}
                title="Fit one XGBoost regressor"
                text={`We train a single XGBRegressor with ${String(
                  diagnostics.xgb_params.n_estimators
                )} trees, max_depth ${String(
                  diagnostics.xgb_params.max_depth
                )}, learning_rate ${String(
                  diagnostics.xgb_params.learning_rate
                )}, subsample ${String(
                  diagnostics.xgb_params.subsample
                )}, and colsample_bytree ${String(
                  diagnostics.xgb_params.colsample_bytree
                )}.`}
              />
              <StepCard
                n={5}
                title="Score the fit"
                text={
                  isWalkForward
                    ? `Because there are ${diagnostics.unique_dates} usable dates and ${diagnostics.temporal_pair_count} temporal pairs, the model is scored with walk-forward validation.`
                    : "Because the corpus is still too shallow temporally, the model is scored in-sample on the same rows it was trained on."
                }
              />
              <StepCard
                n={6}
                title="Use it for what-if simulation"
                text={`Predictions are clipped to 0-100 mention rate. Uncertainty currently comes from ${
                  metrics ? `${metrics.interval_radius.toFixed(2)}pp residual radius` : "the fitted RMSE"
                }, and what-if contributions are apportioned using feature importance weights.`}
              />
            </div>
          </section>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
            <section className="paper-panel rounded-[2rem] p-6">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Dataset coverage
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-[color:var(--line)] bg-white/60 p-4">
                  <p className="text-xs text-[var(--muted)]">Temporal pairs</p>
                  <p className="mt-1 text-2xl text-[var(--ink)]">
                    {diagnostics.temporal_pair_count}
                  </p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Usable brand-date pairs after shifting each brand forward one day.
                  </p>
                </div>
                <div className="rounded-xl border border-[color:var(--line)] bg-white/60 p-4">
                  <p className="text-xs text-[var(--muted)]">Duplicate brand-day rows</p>
                  <p className="mt-1 text-2xl text-[var(--ink)]">
                    {diagnostics.duplicate_brand_date_rows}
                  </p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Older reruns that get deduplicated before temporal training.
                  </p>
                </div>
                <div className="rounded-xl border border-[color:var(--line)] bg-white/60 p-4">
                  <p className="text-xs text-[var(--muted)]">Mention-rate spread</p>
                  <p className="mt-1 text-2xl text-[var(--ink)]">
                    {formatPercent(diagnostics.mention_rate_summary.mean)}
                  </p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Mean row label. Median {formatPercent(diagnostics.mention_rate_summary.median)}
                    , range {formatPercent(diagnostics.mention_rate_summary.min)} to{" "}
                    {formatPercent(diagnostics.mention_rate_summary.max)}.
                  </p>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto rounded-xl border border-[color:var(--line)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/60 text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-right">Rows</th>
                      <th className="px-3 py-2 text-right">Brands</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diagnostics.rows_by_date.length > 0 ? (
                      diagnostics.rows_by_date.map((row) => (
                        <tr key={row.date} className="border-t border-[color:var(--line)]">
                          <td className="px-3 py-2 text-[var(--ink)]">{row.date}</td>
                          <td className="px-3 py-2 text-right font-mono text-[var(--muted)]">
                            {row.rows}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-[var(--muted)]">
                            {row.brands}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-3 py-6 text-center text-sm text-[var(--muted)]"
                        >
                          No multi-date training history yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="paper-panel rounded-[2rem] p-6">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Brand coverage
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                Row count skew matters. If only a few brands appear across many dates, the model
                can look stable while still learning a narrow world.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-[color:var(--line)] bg-white/60 p-4">
                  <p className="text-xs text-[var(--muted)]">Min rows / brand</p>
                  <p className="mt-1 text-2xl text-[var(--ink)]">
                    {diagnostics.brand_row_summary.min}
                  </p>
                </div>
                <div className="rounded-xl border border-[color:var(--line)] bg-white/60 p-4">
                  <p className="text-xs text-[var(--muted)]">Median rows / brand</p>
                  <p className="mt-1 text-2xl text-[var(--ink)]">
                    {diagnostics.brand_row_summary.median.toFixed(1)}
                  </p>
                </div>
                <div className="rounded-xl border border-[color:var(--line)] bg-white/60 p-4">
                  <p className="text-xs text-[var(--muted)]">Max rows / brand</p>
                  <p className="mt-1 text-2xl text-[var(--ink)]">
                    {diagnostics.brand_row_summary.max}
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {diagnostics.top_brands_by_rows.map((row) => (
                  <div
                    key={row.brand}
                    className="flex items-center justify-between rounded-xl border border-[color:var(--line)] bg-white/60 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm text-[var(--ink)]">{row.brand}</p>
                      <p className="text-xs text-[var(--muted)]">{row.dates} dates</p>
                    </div>
                    <span className="font-mono text-sm text-[var(--muted)]">{row.rows} rows</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
            <section className="paper-panel rounded-[2rem] p-6">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Feature importance
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                This is XGBoost built-in feature importance on the currently fitted aggregate
                model. It is useful for directional insight, but it is not SHAP and it does not
                prove causality.
              </p>
              <div className="mt-5 space-y-2">
                {importance.length > 0 ? (
                  importance.slice(0, 12).map((item, index) => (
                    <div key={item.feature} className="flex items-center gap-3">
                      <span className="w-7 text-right font-mono text-xs text-[var(--muted)]">
                        {index + 1}
                      </span>
                      <span className="w-52 truncate text-sm text-[var(--ink)]">
                        {labelForFeature(item.feature)}
                      </span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[rgba(0,0,0,0.05)]">
                        <div
                          className="h-full bg-[var(--ink)]"
                          style={{ width: `${(item.importance / maxImportance) * 100}%` }}
                        />
                      </div>
                      <span className="w-16 text-right font-mono text-xs text-[var(--muted)]">
                        {item.importance.toFixed(3)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--muted)]">No trained importance yet.</p>
                )}
              </div>
            </section>

            <section className="paper-panel rounded-[2rem] p-6">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Per-model surrogates
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                These are trained only from the current run&apos;s per-model rows, not the full
                historical corpus. They are always in-sample today, so they are much weaker than
                the aggregate model.
              </p>
              <div className="mt-4 space-y-3">
                {Object.entries(diagnostics.per_model_metrics).length > 0 ? (
                  Object.entries(diagnostics.per_model_metrics).map(([model, values]) => (
                    <div
                      key={model}
                      className="rounded-xl border border-[color:var(--line)] bg-white/60 p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold text-[var(--ink)]">{model}</p>
                        <span className="text-xs text-[var(--muted)]">
                          {values.validation_mode.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-[var(--muted)]">R²</p>
                          <p className={`mt-1 ${metricTone(getR2Tone(values.r2))}`}>
                            {values.r2.toFixed(3)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--muted)]">RMSE</p>
                          <p className="mt-1 text-[var(--ink)]">{values.rmse.toFixed(2)}pp</p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--muted)]">MAE</p>
                          <p className="mt-1 text-[var(--ink)]">{values.mae.toFixed(2)}pp</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--muted)]">
                    No per-model diagnostics are in memory right now. Run a fresh collection to
                    repopulate them.
                  </p>
                )}
              </div>
            </section>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_1.1fr]">
            <section className="paper-panel rounded-[2rem] p-6">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Exact model config
              </p>
              <div className="mt-4 overflow-x-auto rounded-xl border border-[color:var(--line)]">
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(diagnostics.xgb_params).map(([key, value]) => (
                      <tr key={key} className="border-t border-[color:var(--line)] first:border-t-0">
                        <td className="px-3 py-2 text-[var(--ink)]">{key}</td>
                        <td className="px-3 py-2 text-right font-mono text-[var(--muted)]">
                          {String(value)}
                        </td>
                      </tr>
                    ))}
                    {metrics ? (
                      <>
                        <tr className="border-t border-[color:var(--line)]">
                          <td className="px-3 py-2 text-[var(--ink)]">training_mode</td>
                          <td className="px-3 py-2 text-right font-mono text-[var(--muted)]">
                            {metrics.training_mode}
                          </td>
                        </tr>
                        <tr className="border-t border-[color:var(--line)]">
                          <td className="px-3 py-2 text-[var(--ink)]">validation_mode</td>
                          <td className="px-3 py-2 text-right font-mono text-[var(--muted)]">
                            {metrics.validation_mode}
                          </td>
                        </tr>
                        <tr className="border-t border-[color:var(--line)]">
                          <td className="px-3 py-2 text-[var(--ink)]">target_column</td>
                          <td className="px-3 py-2 text-right font-mono text-[var(--muted)]">
                            {metrics.target_column}
                          </td>
                        </tr>
                      </>
                    ) : null}
                  </tbody>
                </table>
              </div>
              {diagnostics.latest_training_run ? (
                <div className="mt-4 rounded-xl border border-[color:var(--line)] bg-white/60 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                    Latest stored training run
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-[var(--muted)]">Date</p>
                      <p className="mt-1 text-[var(--ink)]">
                        {diagnostics.latest_training_run.date || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted)]">Stored R²</p>
                      <p className="mt-1 text-[var(--ink)]">
                        {diagnostics.latest_training_run.r2_score?.toFixed(3) ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted)]">Stored RMSE</p>
                      <p className="mt-1 text-[var(--ink)]">
                        {diagnostics.latest_training_run.rmse?.toFixed(2) ?? "—"}pp
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted)]">Stored samples</p>
                      <p className="mt-1 text-[var(--ink)]">
                        {diagnostics.latest_training_run.num_samples ?? "—"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="paper-panel rounded-[2rem] p-6">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Active feature set
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                These are the exact columns passed into the current fitted model. If walk-forward
                mode is active, the lag feature appears here too.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(diagnostics.active_feature_names.length > 0
                  ? diagnostics.active_feature_names
                  : diagnostics.base_feature_names
                ).map((feature) => (
                  <span
                    key={feature}
                    className="surface-chip px-3 py-1.5 text-sm text-[var(--ink)]"
                  >
                    {labelForFeature(feature)}
                  </span>
                ))}
              </div>
              {diagnostics.config ? (
                <div className="mt-5 rounded-xl border border-[color:var(--line)] bg-white/60 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                    Current in-memory config
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    Target:{" "}
                    <span className="text-[var(--ink)]">{diagnostics.config.target || "—"}</span>
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Models:{" "}
                    <span className="text-[var(--ink)]">
                      {diagnostics.config.models?.join(", ") || "—"}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Queries:{" "}
                    <span className="text-[var(--ink)]">
                      {diagnostics.config.queries?.length ?? 0}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Website:{" "}
                    <span className="text-[var(--ink)]">
                      {diagnostics.config.website_url || "none"}
                    </span>
                  </p>
                </div>
              ) : null}
            </section>
          </div>

          <div className="mt-12 border-t border-[color:var(--line)] pt-8 flex justify-center gap-6">
            <Link href="/admin/trace" className="ink-link text-sm">
              Trace
            </Link>
            <Link href="/admin/benchmark" className="ink-link text-sm">
              Benchmark
            </Link>
            <Link href="/admin/logs" className="ink-link text-sm">
              API Logs
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
