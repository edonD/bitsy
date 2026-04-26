"use client";

import { useEffect, useState, type ReactNode } from "react";
import type {
  BrandResult,
  ContentAnalysisResponse,
  StatusResponse,
  WhatIfResponse,
} from "@/lib/api";
import type { BrandConfig } from "./types";
import { pct, signed } from "./format";

type SimMode = "edit" | "publish";

const MODES: { id: SimMode; label: string; note: string }[] = [
  { id: "edit", label: "Edit a page", note: "Pick a URL on your site and rewrite it." },
  { id: "publish", label: "Publish something new", note: "Score a draft before you ship it." },
];

const FEATURE_LABELS: Record<string, string> = {
  citation_count: "Citations",
  statistics_density: "Stats per 1k words",
  quotation_count: "Quotations",
  content_length: "Content length",
  readability_grade: "Readability grade",
  freshness_days: "Freshness (days)",
  heading_count: "Heading count",
};

interface SimulateSectionProps {
  brand: BrandConfig;
  canRun: boolean;
  draftContent: string;
  setDraftContent: (value: string) => void;
  simulating: boolean;
  runSimulation: () => void;
  draftAnalysis: ContentAnalysisResponse | null;
  simulationResult: WhatIfResponse | null;
  target: BrandResult | undefined;
  websiteAnalysis: ContentAnalysisResponse | null;
  fetchPageAnalysis: (url: string) => Promise<void>;
  backendStatus: StatusResponse | null;
}

export function SimulateSection({
  brand,
  canRun,
  draftContent,
  setDraftContent,
  simulating,
  runSimulation,
  draftAnalysis,
  simulationResult,
  target,
  websiteAnalysis,
  fetchPageAnalysis,
  backendStatus,
}: SimulateSectionProps) {
  const [mode, setMode] = useState<SimMode>("edit");
  const [pageUrl, setPageUrl] = useState(brand.website || "");
  const [readingPage, setReadingPage] = useState(false);
  const [targetQuery, setTargetQuery] = useState(brand.queries[0] || "");

  useEffect(() => {
    if (brand.website && !pageUrl) setPageUrl(brand.website);
  }, [brand.website, pageUrl]);

  useEffect(() => {
    if (brand.queries.length && !brand.queries.includes(targetQuery)) {
      setTargetQuery(brand.queries[0]);
    }
  }, [brand.queries, targetQuery]);

  const trainedAndReady =
    Boolean(backendStatus?.model_trained) &&
    Boolean(backendStatus?.brands.includes(brand.name));
  const baselineReady = Boolean(target) || trainedAndReady;
  const hasDraft = draftContent.trim().length >= 50;
  const canForecast = canRun && baselineReady && hasDraft && !simulating;

  async function readPage() {
    if (!pageUrl.trim()) return;
    setReadingPage(true);
    try {
      await fetchPageAnalysis(pageUrl);
    } finally {
      setReadingPage(false);
    }
  }

  return (
    <div style={{ marginTop: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      <section className="panel" style={{ padding: 0, position: "relative", width: "100%", maxWidth: 720 }}>
        <div className="corner-mark">SIMULATE</div>

        <div style={{ padding: "26px 28px 18px" }}>
          <h2 className="title" style={{ fontSize: 30, margin: "0 0 6px", lineHeight: 1.1 }}>
            Will it move the needle?
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55, margin: 0, maxWidth: 560 }}>
            Score a planned change before you ship it. We extract the GEO signals from your draft,
            send them through your trained surrogate model, and forecast the lift on AI mention rate.
          </p>
        </div>

        <div className="rule" />

        <div style={{ padding: "18px 28px", display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
          {MODES.map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                style={{
                  textAlign: "left",
                  padding: "12px 14px",
                  background: active ? "var(--card)" : "transparent",
                  border: `1px solid ${active ? "var(--ink)" : "var(--line-2)"}`,
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "border-color 140ms, background 140ms",
                }}
              >
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 500,
                    color: "var(--ink)",
                    letterSpacing: "-0.012em",
                    marginBottom: 3,
                  }}
                >
                  {m.label}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{m.note}</div>
              </button>
            );
          })}
        </div>

        <div className="rule" />

        <div style={{ padding: "22px 28px 6px" }}>
          {!canRun && (
            <Notice tone="warn">
              Finish setup in Target — brand name, website, 2+ competitors, 3+ queries.
            </Notice>
          )}

          {canRun && !baselineReady && (
            <Notice tone="warn">
              Run Observe first so the surrogate has a baseline feature vector for {brand.name}.
            </Notice>
          )}

          {mode === "edit" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Field label="Which page?" hint="URL on your site">
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="field"
                    style={{ flex: 1 }}
                    value={pageUrl}
                    onChange={(e) => setPageUrl(e.target.value)}
                    placeholder="https://example.com/pricing"
                  />
                  <button
                    className="btn"
                    onClick={readPage}
                    disabled={readingPage || !pageUrl.trim()}
                    style={{ padding: "0 14px", fontSize: 12, whiteSpace: "nowrap" }}
                  >
                    {readingPage ? "Reading…" : "Read this page"}
                  </button>
                </div>
              </Field>

              {websiteAnalysis && websiteAnalysis.features.length > 0 && (
                <CurrentSnapshot data={websiteAnalysis} />
              )}

              {websiteAnalysis?.fetch_error && (
                <Notice tone="warn">Couldn&rsquo;t read that URL: {websiteAnalysis.fetch_error}</Notice>
              )}

              <Field
                label="Proposed new content"
                hint="Paste the rewritten version of this page"
              >
                <textarea
                  className="field"
                  rows={9}
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  placeholder="Paste the new copy here — body text, headings, citations, the whole thing…"
                />
              </Field>
            </div>
          )}

          {mode === "publish" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {brand.queries.length > 0 && (
                <Field label="Buyer question this should answer" hint="From your Target list">
                  <select
                    className="field"
                    value={targetQuery}
                    onChange={(e) => setTargetQuery(e.target.value)}
                  >
                    {brand.queries.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              <Field label="Draft" hint="Blog post, landing page, FAQ — anything you&rsquo;re considering">
                <textarea
                  className="field"
                  rows={11}
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  placeholder="Paste your draft here. Headings, body, citations, stats — everything that would actually ship."
                />
              </Field>
            </div>
          )}

          <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted-2)" }}>
            {draftContent.length.toLocaleString()} chars
            {draftContent.length > 0 && draftContent.length < 500 && " · short content scores low on length"}
            {draftContent.length >= 5000 && draftContent.length <= 12000 && " · solid range for long-form"}
          </div>
        </div>

        <div className="rule" style={{ marginTop: 18 }} />

        <div
          style={{
            padding: "16px 28px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <span className="micro" style={{ maxWidth: 420 }}>
            Forecast uses your trained XGBoost surrogate. Predicts overall mention rate, not per-query lift.
          </span>
          <button
            className="btn btn-primary"
            disabled={!canForecast}
            onClick={runSimulation}
            style={{ padding: "11px 20px", fontSize: 13 }}
          >
            {simulating ? "Forecasting…" : "Predict impact →"}
          </button>
        </div>
      </section>

      {simulating && (
        <section
          className="panel"
          style={{ padding: "28px", maxWidth: 720, width: "100%", textAlign: "center" }}
        >
          <div className="label" style={{ marginBottom: 6 }}>WORKING</div>
          <p style={{ fontSize: 14, color: "var(--ink)", margin: "0 0 4px" }}>
            Scoring the draft for {brand.name}
          </p>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
            Extracting features → diffing against your baseline → running the surrogate.
          </p>
        </section>
      )}

      {simulationResult && !simulating && (
        <ResultPanels
          brand={brand}
          target={target}
          mode={mode}
          targetQuery={targetQuery}
          result={simulationResult}
          draftAnalysis={draftAnalysis}
          websiteAnalysis={websiteAnalysis}
        />
      )}
    </div>
  );
}

// ── Result panels ──────────────────────────────────────────────────────────

function ResultPanels({
  brand,
  target,
  mode,
  targetQuery,
  result,
  draftAnalysis,
  websiteAnalysis,
}: {
  brand: BrandConfig;
  target: BrandResult | undefined;
  mode: SimMode;
  targetQuery: string;
  result: WhatIfResponse;
  draftAnalysis: ContentAnalysisResponse | null;
  websiteAnalysis: ContentAnalysisResponse | null;
}) {
  const lift = result.lift;
  const liftColor =
    lift > 0.3 ? "var(--moss)" : lift < -0.3 ? "var(--rust)" : "var(--ink)";
  const liftLabel = lift >= 0 ? "lift" : "drop";

  const confidenceCopy =
    result.confidence_tier === "established"
      ? "Established history — forecast-grade. Per-model breakdown shown below."
      : result.confidence_tier === "emerging"
        ? "Emerging history — directional only. Re-validate after more daily rows accumulate."
        : "Benchmark history — internal model check, not a forecast. Need more data days.";

  const perModel =
    result.confidence_tier === "established" && result.per_model
      ? Object.entries(result.per_model)
      : [];

  return (
    <>
      <section
        className="panel"
        style={{ padding: 0, position: "relative", width: "100%", maxWidth: 720 }}
      >
        <div className="corner-mark">FORECAST</div>

        <div style={{ padding: "28px 28px 16px", textAlign: "center" }}>
          <div className="label" style={{ marginBottom: 6 }}>
            {mode === "edit" ? "After publishing this rewrite" : `After publishing this draft`}
            {mode === "publish" && targetQuery && (
              <span style={{ color: "var(--muted-2)", fontWeight: 400 }}> · for &ldquo;{targetQuery}&rdquo;</span>
            )}
          </div>

          <div
            className="num"
            style={{
              fontSize: 88,
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
              color: liftColor,
              margin: "8px 0",
            }}
          >
            {signed(lift)}
            <span style={{ fontSize: 22, fontWeight: 400, marginLeft: 4, color: "var(--muted)" }}>
              pp
            </span>
          </div>

          <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 4px" }}>
            predicted {liftLabel} in mention rate for {brand.name}
          </p>
          <p style={{ fontSize: 12, color: "var(--muted-2)", margin: 0 }}>
            {pct(result.base_prediction)} → <strong style={{ color: "var(--ink)" }}>{pct(result.scenario_prediction)}</strong>
            {"  "}±{((result.ci_upper - result.ci_lower) / 2).toFixed(1)}pp
            {"  "}· {result.confidence} confidence
            {"  "}· {result.data_days} data days
          </p>
        </div>

        <div className="rule" />

        <div style={{ padding: "18px 28px" }}>
          <div className="leader-row">
            <div className="label" style={{ flex: 1 }}>BASELINE</div>
            <div className="num" style={{ fontSize: 18 }}>{pct(result.base_prediction)}</div>
          </div>
          <div className="leader-row">
            <div className="label" style={{ flex: 1 }}>FORECAST</div>
            <div className="num" style={{ fontSize: 18, color: liftColor }}>
              {pct(result.scenario_prediction)}
            </div>
          </div>
          <div className="leader-row">
            <div className="label" style={{ flex: 1 }}>RESIDUAL CI</div>
            <div className="num" style={{ fontSize: 14, color: "var(--muted)" }}>
              {pct(result.ci_lower)} – {pct(result.ci_upper)}
            </div>
          </div>
          {target?.avg_position != null && (
            <div className="leader-row">
              <div className="label" style={{ flex: 1 }}>CURRENT POSITION</div>
              <div className="num" style={{ fontSize: 14 }}>#{target.avg_position.toFixed(1)}</div>
            </div>
          )}
        </div>

        <div className="rule" />

        <div style={{ padding: "16px 28px 20px" }}>
          <p className="micro" style={{ margin: 0, lineHeight: 1.55 }}>
            {confidenceCopy} This is a directional what-if from a stochastic model — not causal proof.
          </p>
        </div>
      </section>

      {result.contributions.length > 0 && (
        <section className="panel" style={{ padding: 0, width: "100%", maxWidth: 720 }}>
          <div className="corner-mark">DRIVERS</div>
          <div style={{ padding: "26px 28px 14px" }}>
            <h3 className="title" style={{ fontSize: 22, margin: "0 0 4px", lineHeight: 1.15 }}>
              Why the model moved
            </h3>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: 0, maxWidth: 540 }}>
              Lift split across changed features by XGBoost importance × delta.
              Method: {result.contribution_method}.
            </p>
          </div>
          <div className="rule" />
          <div style={{ padding: "10px 28px 22px" }}>
            {result.contributions.map((c) => {
              const positive = c.contribution >= 0;
              const color = positive ? "var(--moss)" : "var(--rust)";
              return (
                <div key={c.feature} className="leader-row">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>
                      {FEATURE_LABELS[c.feature] ?? c.feature}
                    </div>
                    <div className="micro" style={{ marginTop: 2 }}>
                      {c.pct.toFixed(0)}% of modeled lift
                    </div>
                  </div>
                  <div
                    className="num"
                    style={{ fontSize: 16, color, fontWeight: 500 }}
                  >
                    {signed(c.contribution)} pp
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {perModel.length > 0 && (
        <section className="panel" style={{ padding: 0, width: "100%", maxWidth: 720 }}>
          <div className="corner-mark">PER MODEL</div>
          <div style={{ padding: "26px 28px 14px" }}>
            <h3 className="title" style={{ fontSize: 22, margin: "0 0 4px", lineHeight: 1.15 }}>
              How each LLM is expected to move
            </h3>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
              Per-model surrogates, gated on established history.
            </p>
          </div>
          <div className="rule" />
          <div style={{ padding: "8px 28px 18px" }}>
            {perModel.map(([model, r]) => {
              const positive = r.lift >= 0;
              const color =
                Math.abs(r.lift) < 0.1
                  ? "var(--muted)"
                  : positive
                    ? "var(--moss)"
                    : "var(--rust)";
              return (
                <div key={model} className="leader-row">
                  <div style={{ flex: 1, fontSize: 13, color: "var(--ink)", textTransform: "capitalize" }}>
                    {model}
                  </div>
                  <div className="num" style={{ fontSize: 13, color: "var(--muted)", minWidth: 60, textAlign: "right" }}>
                    {pct(r.base)}
                  </div>
                  <div className="num" style={{ fontSize: 13, color: "var(--ink)", minWidth: 60, textAlign: "right" }}>
                    {pct(r.predicted)}
                  </div>
                  <div className="num" style={{ fontSize: 13, color, minWidth: 70, textAlign: "right", fontWeight: 500 }}>
                    {Math.abs(r.lift) > 0.1 ? `${signed(r.lift)} pp` : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {(websiteAnalysis || draftAnalysis) && (
        <section className="panel" style={{ padding: 0, width: "100%", maxWidth: 720 }}>
          <div className="corner-mark">SIDE BY SIDE</div>
          <div style={{ padding: "26px 28px 14px" }}>
            <h3 className="title" style={{ fontSize: 22, margin: "0 0 4px", lineHeight: 1.15 }}>
              Content signals
            </h3>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
              {mode === "edit" ? "Current page vs. proposed rewrite." : "Your draft, scored on the GEO levers the model uses."}
            </p>
          </div>
          <div className="rule" />
          <SignalDiff before={websiteAnalysis} after={draftAnalysis} mode={mode} />
        </section>
      )}
    </>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function CurrentSnapshot({ data }: { data: ContentAnalysisResponse }) {
  const top = data.features.slice(0, 5);
  return (
    <div
      style={{
        border: "1px solid var(--line-2)",
        borderRadius: 8,
        padding: "12px 14px",
        background: "var(--card)",
      }}
    >
      <div className="label" style={{ marginBottom: 8 }}>CURRENT PAGE · SCORE {data.overall_score.toFixed(0)}/100</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
        {top.map((f) => (
          <div key={f.name} style={{ fontSize: 11.5 }}>
            <div className="micro" style={{ marginBottom: 2 }}>{f.label}</div>
            <div style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
              {formatFeatureValue(f.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SignalDiff({
  before,
  after,
  mode,
}: {
  before: ContentAnalysisResponse | null;
  after: ContentAnalysisResponse | null;
  mode: SimMode;
}) {
  const KEYS = [
    "citation_count",
    "statistics_density",
    "quotation_count",
    "content_length",
    "heading_count",
    "readability_grade",
    "freshness_days",
  ] as const;

  return (
    <div style={{ padding: "8px 28px 20px" }}>
      <div
        className="leader-row"
        style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8 }}
      >
        <div className="label" style={{ flex: 1 }}>FEATURE</div>
        {mode === "edit" && (
          <div className="label" style={{ minWidth: 90, textAlign: "right" }}>CURRENT</div>
        )}
        <div className="label" style={{ minWidth: 90, textAlign: "right" }}>
          {mode === "edit" ? "PROPOSED" : "DRAFT"}
        </div>
      </div>
      {KEYS.map((key) => {
        const beforeVal = before?.metrics[key];
        const afterVal = after?.metrics[key];
        const direction =
          typeof afterVal === "number" && typeof beforeVal === "number"
            ? afterVal > beforeVal
              ? "up"
              : afterVal < beforeVal
                ? "down"
                : "flat"
            : null;
        return (
          <div key={key} className="leader-row">
            <div style={{ flex: 1, fontSize: 13, color: "var(--ink)" }}>
              {FEATURE_LABELS[key] ?? key}
            </div>
            {mode === "edit" && (
              <div
                className="num"
                style={{ minWidth: 90, textAlign: "right", fontSize: 13, color: "var(--muted)" }}
              >
                {formatMetric(beforeVal)}
              </div>
            )}
            <div
              className="num"
              style={{
                minWidth: 90,
                textAlign: "right",
                fontSize: 13,
                color:
                  direction === "up"
                    ? "var(--moss)"
                    : direction === "down"
                      ? "var(--rust)"
                      : "var(--ink)",
                fontWeight: direction === "up" || direction === "down" ? 500 : 400,
              }}
            >
              {formatMetric(afterVal)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Notice({ children, tone }: { children: ReactNode; tone: "warn" | "info" }) {
  const color = tone === "warn" ? "var(--rust)" : "var(--ink)";
  const bg = tone === "warn" ? "var(--rust-soft, rgba(176,76,42,0.06))" : "var(--card)";
  return (
    <div
      style={{
        padding: "10px 14px",
        border: `1px solid ${color}`,
        borderRadius: 8,
        background: bg,
        fontSize: 12.5,
        color,
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
        }}
      >
        <span className="label">{label}</span>
        {hint && (
          <span
            className="micro"
            style={{ fontSize: 10 }}
            dangerouslySetInnerHTML={{ __html: hint }}
          />
        )}
      </div>
      {children}
    </label>
  );
}

function formatFeatureValue(value: number | string | boolean | null): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number") {
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toFixed(1);
  }
  return String(value);
}

function formatMetric(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  if (Number.isInteger(value)) return value.toLocaleString();
  return value.toFixed(1);
}
