"use client";

import Link from "next/link";
import type { ModelDiagnosticsResponse } from "@/lib/api";
import { FEATURE_LABELS } from "@/app/admin/trace/constants";

function labelForFeature(feature: string): string {
  return FEATURE_LABELS[feature] || feature.replace(/_/g, " ");
}

function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

function metricTone(tone: "neutral" | "good" | "warn" | "bad"): string {
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

function getAssessment(diagnostics: ModelDiagnosticsResponse) {
  if (!diagnostics.metrics) {
    return {
      title: "No trained surrogate in memory",
      tone: "warn" as const,
      summary: "Run a collection or retrain the model first. The stored dataset can still exist even if the in-memory model is missing.",
      bullets: [
        "A fresh /collect or /train call will rebuild the surrogate from accumulated samples.",
        "Forecasts should stay disabled or clearly low confidence until a model is loaded.",
      ],
    };
  }

  const { metrics, unique_dates, temporal_pair_count } = diagnostics;
  const isWalkForward = metrics.validation_mode === "walk_forward";
  const isHoldout = metrics.validation_mode === "same_day_holdout";
  const r2Tone = getR2Tone(metrics.r2);

  if (!isWalkForward) {
    return {
      title: isHoldout ? "Current score is a shallow holdout" : "Current score is optimistic",
      tone: "warn" as const,
      summary: isHoldout
        ? "The model is using an 80/20 same-day holdout because there is not enough temporal history yet. Better than in-sample, but still not a forecast test."
        : "The model is fitting and scoring on the same rows. That is useful for a fit check, but not a strong generalization test.",
      bullets: [
        isHoldout
          ? `Validation mode is ${metrics.validation_mode}, so R2 ${metrics.r2.toFixed(3)} comes from held-out same-day brand rows.`
          : `Validation mode is ${metrics.validation_mode}, so R2 ${metrics.r2.toFixed(3)} is in-sample.`,
        unique_dates < 2
          ? "There is not enough date coverage yet to do a next-period forecast test."
          : "The dataset did not produce enough temporal pairs for walk-forward validation.",
        "Treat what-if output as directional until walk-forward validation appears.",
      ],
    };
  }

  if (r2Tone === "good") {
    return {
      title: "This is a real forecast-style evaluation",
      tone: "good" as const,
      summary: "Walk-forward validation trains on earlier dates and predicts later dates, which is the honest version of this model.",
      bullets: [
        `${temporal_pair_count} temporal brand-date pairs were available.`,
        `R2 ${metrics.r2.toFixed(3)} captures a meaningful amount of future mention-rate variance.`,
        `RMSE ${metrics.rmse.toFixed(2)}pp is the typical prediction error.`,
      ],
    };
  }

  return {
    title: "Validation is honest, but the fit is weak",
    tone: r2Tone,
    summary: "The evaluation setup is legitimate, but the model needs more coverage or cleaner features before forecasts are strong.",
    bullets: [
      `${temporal_pair_count} temporal pairs are being evaluated with walk-forward validation.`,
      `R2 ${metrics.r2.toFixed(3)} means the forecast is weak or barely beating a naive baseline.`,
      "More dates, brands, and cleaner extraction matter more here than extra tuning.",
    ],
  };
}

export function ModelDiagnosticsView({ diagnostics }: { diagnostics: ModelDiagnosticsResponse }) {
  const assessment = getAssessment(diagnostics);
  const metrics = diagnostics.metrics;
  const importance = diagnostics.importance ?? [];
  const maxImportance = Math.max(...importance.map((item) => item.importance), 0.0001);
  const isWalkForward = metrics?.validation_mode === "walk_forward";

  return (
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
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Honest read</p>
        <h2 className="mt-2 text-2xl text-[var(--ink)]">{assessment.title}</h2>
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-[var(--muted)]">{assessment.summary}</p>
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
          note={metrics ? (isWalkForward ? "Earlier dates predict later dates." : "Scored on training rows.") : "No model is loaded."}
          tone={metrics ? (isWalkForward ? "good" : "warn") : "warn"}
        />
        <MetricCard
          label="R2"
          value={metrics ? metrics.r2.toFixed(3) : "-"}
          note={isWalkForward ? "Out-of-sample future variance explained." : "Evaluation-mode score, not forecast proof."}
          tone={metrics ? getR2Tone(metrics.r2) : "warn"}
        />
        <MetricCard label="RMSE" value={metrics ? `${metrics.rmse.toFixed(2)}pp` : "-"} note={isWalkForward ? "Walk-forward prediction error." : "Evaluation-mode prediction error."} />
        <MetricCard
          label="In-sample R2"
          value={metrics ? metrics.in_sample_r2.toFixed(3) : "-"}
          note="Fit on all training rows. Diagnostic only."
          tone={metrics ? getR2Tone(metrics.in_sample_r2) : "warn"}
        />
        <MetricCard label="Samples" value={String(diagnostics.training_sample_count)} note="Stored brand-day rows." />
        <MetricCard
          label="Dates"
          value={String(diagnostics.unique_dates)}
          note={diagnostics.date_start && diagnostics.date_end ? `${diagnostics.date_start} to ${diagnostics.date_end}` : "Only one or zero usable dates."}
        />
        <MetricCard label="Features" value={String(diagnostics.feature_count)} note={diagnostics.use_content_features ? "Includes content features." : "Brand features only."} />
      </div>

      <TrainingWorkflow diagnostics={diagnostics} isWalkForward={isWalkForward} />

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <DatasetCoverage diagnostics={diagnostics} />
        <BrandCoverage diagnostics={diagnostics} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <FeatureImportance importance={importance} maxImportance={maxImportance} />
        <PerModelDiagnostics diagnostics={diagnostics} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <ModelConfig diagnostics={diagnostics} />
        <ActiveFeatures diagnostics={diagnostics} />
      </div>

      <div className="mt-12 border-t border-[color:var(--line)] pt-8 flex justify-center gap-6">
        <Link href="/admin/trace" className="ink-link text-sm">Trace</Link>
        <Link href="/admin/benchmark" className="ink-link text-sm">Benchmark</Link>
        <Link href="/admin/logs" className="ink-link text-sm">API Logs</Link>
      </div>
    </>
  );
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

function TrainingWorkflow({
  diagnostics,
  isWalkForward,
}: {
  diagnostics: ModelDiagnosticsResponse;
  isWalkForward: boolean;
}) {
  const metrics = diagnostics.metrics;

  return (
    <section className="mt-8 paper-panel rounded-[2rem] p-6">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">How training works right now</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <StepCard n={1} title="Collect brand-day rows" text={`${diagnostics.training_sample_count} rows across ${diagnostics.brand_count} brands.`} />
        <StepCard
          n={2}
          title="Build the target"
          text={metrics?.training_mode === "next_period_forecast" ? "The target is next-day mention_rate." : "The target is same-row mention_rate, so this is a fit check."}
        />
        <StepCard
          n={3}
          title="Choose features"
          text={`${diagnostics.active_feature_names.length || diagnostics.base_feature_names.length} active features cover visibility, ranking, sentiment, competition, and content signals.`}
        />
        <StepCard n={4} title="Fit XGBoost" text={`${String(diagnostics.xgb_params.n_estimators)} trees, depth ${String(diagnostics.xgb_params.max_depth)}, learning rate ${String(diagnostics.xgb_params.learning_rate)}.`} />
        <StepCard
          n={5}
          title="Score the fit"
          text={isWalkForward ? `${diagnostics.temporal_pair_count} temporal pairs support walk-forward validation.` : metrics?.validation_mode === "same_day_holdout" ? "The corpus is too shallow temporally, so scoring uses an 80/20 same-day holdout." : "The corpus is too shallow for holdout or temporal scoring, so scoring is in-sample."}
        />
        <StepCard
          n={6}
          title="Use for what-if"
          text={`Predictions are clipped to 0-100. Uncertainty uses ${metrics ? `${metrics.interval_radius.toFixed(2)}pp residual radius` : "the fitted RMSE"}.`}
        />
      </div>
    </section>
  );
}

function StepCard({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div className="paper-card rounded-[1.4rem] p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ink)] text-sm font-semibold text-[var(--paper)]">{n}</span>
        <h3 className="text-lg text-[var(--ink)]">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{text}</p>
    </div>
  );
}

function DatasetCoverage({ diagnostics }: { diagnostics: ModelDiagnosticsResponse }) {
  return (
    <section className="paper-panel rounded-[2rem] p-6">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Dataset coverage</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <MetricTile label="Temporal pairs" value={diagnostics.temporal_pair_count} note="Usable pairs after shifting each brand one day." />
        <MetricTile label="Duplicate brand-day rows" value={diagnostics.duplicate_brand_date_rows} note="Reruns deduped before temporal training." />
        <MetricTile label="Mean mention rate" value={formatPercent(diagnostics.mention_rate_summary.mean)} note={`Median ${formatPercent(diagnostics.mention_rate_summary.median)}.`} />
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
                  <td className="px-3 py-2 text-right font-mono text-[var(--muted)]">{row.rows}</td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--muted)]">{row.brands}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={3} className="px-3 py-6 text-center text-sm text-[var(--muted)]">No multi-date training history yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BrandCoverage({ diagnostics }: { diagnostics: ModelDiagnosticsResponse }) {
  return (
    <section className="paper-panel rounded-[2rem] p-6">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Brand coverage</p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">Row count skew matters. A few repeat brands can make the model look stabler than it is.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <MetricTile label="Min rows / brand" value={diagnostics.brand_row_summary.min} />
        <MetricTile label="Median rows / brand" value={diagnostics.brand_row_summary.median.toFixed(1)} />
        <MetricTile label="Max rows / brand" value={diagnostics.brand_row_summary.max} />
      </div>
      <div className="mt-4 space-y-2">
        {diagnostics.top_brands_by_rows.map((row) => (
          <div key={row.brand} className="flex items-center justify-between rounded-xl border border-[color:var(--line)] bg-white/60 px-4 py-3">
            <div>
              <p className="text-sm text-[var(--ink)]">{row.brand}</p>
              <p className="text-xs text-[var(--muted)]">{row.dates} dates</p>
            </div>
            <span className="font-mono text-sm text-[var(--muted)]">{row.rows} rows</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function MetricTile({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--line)] bg-white/60 p-4">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl text-[var(--ink)]">{value}</p>
      {note ? <p className="mt-2 text-xs text-[var(--muted)]">{note}</p> : null}
    </div>
  );
}

function FeatureImportance({
  importance,
  maxImportance,
}: {
  importance: ModelDiagnosticsResponse["importance"];
  maxImportance: number;
}) {
  return (
    <section className="paper-panel rounded-[2rem] p-6">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Feature importance</p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">XGBoost built-in importance is directional insight, not causality. What-if contribution rows use importance-weighted feature changes, not SHAP.</p>
      <div className="mt-5 space-y-2">
        {importance.length > 0 ? (
          importance.slice(0, 12).map((item, index) => (
            <div key={item.feature} className="flex items-center gap-3">
              <span className="w-7 text-right font-mono text-xs text-[var(--muted)]">{index + 1}</span>
              <span className="w-52 truncate text-sm text-[var(--ink)]">{labelForFeature(item.feature)}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[rgba(0,0,0,0.05)]">
                <div className="h-full bg-[var(--ink)]" style={{ width: `${(item.importance / maxImportance) * 100}%` }} />
              </div>
              <span className="w-16 text-right font-mono text-xs text-[var(--muted)]">{item.importance.toFixed(3)}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-[var(--muted)]">No trained importance yet.</p>
        )}
      </div>
    </section>
  );
}

function PerModelDiagnostics({ diagnostics }: { diagnostics: ModelDiagnosticsResponse }) {
  const entries = Object.entries(diagnostics.per_model_metrics);
  return (
    <section className="paper-panel rounded-[2rem] p-6">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Per-model surrogates</p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">Internal only. These are current-run per-model rows, so they are weaker than the aggregate model and should not be shown as customer-grade lift breakdowns.</p>
      <div className="mt-4 space-y-3">
        {entries.length > 0 ? entries.map(([model, values]) => (
          <div key={model} className="rounded-xl border border-[color:var(--line)] bg-white/60 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-[var(--ink)]">{model}</p>
              <span className="text-xs text-[var(--muted)]">{values.validation_mode.replace(/_/g, " ")}</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <SmallMetric label="R2" value={values.r2.toFixed(3)} tone={getR2Tone(values.r2)} />
              <SmallMetric label="RMSE" value={`${values.rmse.toFixed(2)}pp`} />
              <SmallMetric label="MAE" value={`${values.mae.toFixed(2)}pp`} />
            </div>
          </div>
        )) : <p className="text-sm text-[var(--muted)]">No per-model diagnostics are in memory right now.</p>}
      </div>
    </section>
  );
}

function SmallMetric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "good" | "warn" | "bad" }) {
  return (
    <div>
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className={`mt-1 ${metricTone(tone)}`}>{value}</p>
    </div>
  );
}

function ModelConfig({ diagnostics }: { diagnostics: ModelDiagnosticsResponse }) {
  const metrics = diagnostics.metrics;
  const rows = [
    ...Object.entries(diagnostics.xgb_params),
    ...(metrics ? [["training_mode", metrics.training_mode], ["validation_mode", metrics.validation_mode], ["target_column", metrics.target_column]] as [string, string][] : []),
  ];

  return (
    <section className="paper-panel rounded-[2rem] p-6">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Exact model config</p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-[color:var(--line)]">
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([key, value]) => (
              <tr key={key} className="border-t border-[color:var(--line)] first:border-t-0">
                <td className="px-3 py-2 text-[var(--ink)]">{key}</td>
                <td className="px-3 py-2 text-right font-mono text-[var(--muted)]">{String(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ActiveFeatures({ diagnostics }: { diagnostics: ModelDiagnosticsResponse }) {
  const activeFeatures = diagnostics.active_feature_names.length > 0 ? diagnostics.active_feature_names : diagnostics.base_feature_names;
  return (
    <section className="paper-panel rounded-[2rem] p-6">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Active feature set</p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">These are the exact columns passed into the current fitted model.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {activeFeatures.map((feature) => (
          <span key={feature} className="surface-chip px-3 py-1.5 text-sm text-[var(--ink)]">{labelForFeature(feature)}</span>
        ))}
      </div>
      {diagnostics.config ? (
        <div className="mt-5 rounded-xl border border-[color:var(--line)] bg-white/60 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Current in-memory config</p>
          <p className="mt-2 text-sm text-[var(--muted)]">Target: <span className="text-[var(--ink)]">{diagnostics.config.target || "-"}</span></p>
          <p className="mt-1 text-sm text-[var(--muted)]">Models: <span className="text-[var(--ink)]">{diagnostics.config.models?.join(", ") || "-"}</span></p>
          <p className="mt-1 text-sm text-[var(--muted)]">Queries: <span className="text-[var(--ink)]">{diagnostics.config.queries?.length ?? 0}</span></p>
          <p className="mt-1 text-sm text-[var(--muted)]">Website: <span className="text-[var(--ink)]">{diagnostics.config.website_url || "none"}</span></p>
          <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
            Content features are currently attached to the target URL only. Competitor content features are unavailable unless the competitor crawler path has populated them.
          </p>
        </div>
      ) : null}
    </section>
  );
}
