"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  prepareBrands,
  scoreVisibility,
  sampleResponses,
  extractMentions,
  buildQueryResults,
  computeBrandStats,
  computeModelStats,
  engineerFeatures,
  encodeScenario,
  predictScenario,
  explainPrediction,
  sensitivityAnalysis,
  type SimulationConfig,
  type BrandStats,
  type FeatureVector,
  type Prediction,
  type Explanation,
  type SensitivityResult,
  type ModelId,
  MODEL_META,
} from "@/lib/simulation";

// ── Presets ────────────────────────────────────────────────────────────────

interface DemoPreset {
  label: string;
  icon: string;
  targetBrand: string;
  competitors: string[];
  queries: string[];
}

const PRESETS: DemoPreset[] = [
  {
    label: "Fashion & E-commerce",
    icon: "F",
    targetBrand: "Zalando",
    competitors: ["ASOS", "H&M", "About You", "Shein", "Zara"],
    queries: [
      "Best online fashion store in Europe",
      "Where to buy affordable designer clothes online",
      "Best sustainable fashion marketplace",
      "Top alternatives to Amazon for clothing",
      "Best place to buy sneakers online",
    ],
  },
  {
    label: "CRM Software",
    icon: "C",
    targetBrand: "HubSpot",
    competitors: ["Salesforce", "Pipedrive", "Zoho CRM", "Monday.com"],
    queries: [
      "What is the best CRM for small businesses?",
      "Top CRM software for sales teams",
      "Best free CRM tools in 2026",
      "CRM comparison: which should I choose?",
    ],
  },
  {
    label: "Cloud Hosting",
    icon: "H",
    targetBrand: "Vercel",
    competitors: ["Netlify", "AWS", "Cloudflare Pages", "Railway"],
    queries: [
      "Best hosting for Next.js applications",
      "Which web hosting is fastest?",
      "Best cloud hosting for developers",
      "Hosting platform comparison for startups",
    ],
  },
];

// ── GEO strategy toggles ──────────────────────────────────────────────────

interface GeoStrategy {
  id: string;
  label: string;
  description: string;
  evidence: string;
  featureChanges: Partial<FeatureVector>;
}

const GEO_STRATEGIES: GeoStrategy[] = [
  {
    id: "statistics",
    label: "Add statistics & data points",
    description: "Include concrete numbers, percentages, and data-backed claims in your content.",
    evidence: "+37% visibility (GEO paper, KDD 2024)",
    featureChanges: { statistics_density: 0.85 },
  },
  {
    id: "quotations",
    label: "Add expert quotations",
    description: "Cite industry experts, analysts, or credible reviews with direct quotes.",
    evidence: "+41% visibility (GEO paper, KDD 2024)",
    featureChanges: { quotation_count: 6 },
  },
  {
    id: "citations",
    label: "Cite credible sources",
    description: "Reference authoritative sources inline. Up to +115% for lower-ranked sites.",
    evidence: "+30% visibility (GEO paper, KDD 2024)",
    featureChanges: { citation_count: 8 },
  },
  {
    id: "freshness",
    label: "Refresh content (update to this week)",
    description: "Update your page content, timestamps, and data. 76.4% of top-cited pages were updated within 30 days.",
    evidence: "+300% AI traffic in case studies (Seer Interactive)",
    featureChanges: { source_freshness_months: 0.25 },
  },
  {
    id: "fluency",
    label: "Improve fluency & readability",
    description: "Rewrite for clarity: short sentences, active voice, logical flow. Avoid jargon walls.",
    evidence: "+28% visibility (GEO paper, KDD 2024)",
    featureChanges: { fluency_score: 0.92 },
  },
  {
    id: "thirdparty",
    label: "Get third-party mentions",
    description: "Earn mentions in roundups, reviews, and comparison articles. Third-party is 6.5x more effective than owned content.",
    evidence: "85% of AI citations from third-party sources (Profound)",
    featureChanges: { third_party_mention_count: 12 },
  },
  {
    id: "length",
    label: "Expand content to 8K+ characters",
    description: "Longer, comprehensive pages get cited more. Sweet spot is 5-10K characters.",
    evidence: "10.18 citations for 20K+ chars vs 2.39 for <500 (Profound, 680M citations)",
    featureChanges: { content_length_chars: 8500 },
  },
];

// ── Phases ──────────────────────────────────────────────────────────────────

type Phase = "pick" | "baseline" | "simulate";

// ── Helpers ─────────────────────────────────────────────────────────────────

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function signed(n: number) {
  const s = n.toFixed(1);
  return n >= 0 ? `+${s}` : s;
}

const MODEL_ORDER: ModelId[] = ["chatgpt", "claude", "gemini", "perplexity"];

// ── Bar component ───────────────────────────────────────────────────────────

function Bar({ value, max, color, label, sub }: {
  value: number;
  max: number;
  color: string;
  label: string;
  sub?: string;
}) {
  const width = max > 0 ? Math.max(2, (value / max) * 100) : 2;
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-right text-sm text-[var(--muted)]">{label}</span>
      <div className="relative flex-1 h-7 rounded-lg bg-[rgba(255,255,255,0.5)] overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500"
          style={{ width: `${width}%`, backgroundColor: color, opacity: 0.75 }}
        />
        <span className="relative z-10 flex items-center h-full px-3 text-xs font-semibold text-[var(--ink)]">
          {sub ?? pct(value)}
        </span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Page
// ════════════════════════════════════════════════════════════════════════════

export default function SimulatorPage() {
  const [phase, setPhase] = useState<Phase>("pick");
  const [preset, setPreset] = useState<DemoPreset | null>(null);
  const [activeStrategies, setActiveStrategies] = useState<Set<string>>(new Set());

  // ── Run baseline (stages 1-8) ────────────────────────────────────────────

  const baseline = useMemo(() => {
    if (!preset) return null;

    const config: SimulationConfig = {
      targetBrand: preset.targetBrand,
      competitors: preset.competitors,
      queries: preset.queries,
      models: [...MODEL_ORDER],
      samplesPerQuery: 5,
    };

    const brands = prepareBrands(config);
    const scores = scoreVisibility(brands, config.models);
    const samples = sampleResponses(scores, config);
    const allNames = brands.map((b) => b.name);
    const mentionsPerSample = samples.map((s) => extractMentions(s, allNames));
    const queryResults = buildQueryResults(samples, mentionsPerSample);
    const brandStats = computeBrandStats(queryResults, config);
    const modelStats = computeModelStats(queryResults, config);
    const features = engineerFeatures(brandStats, modelStats, config);

    return { config, brandStats, modelStats, features };
  }, [preset]);

  // ── Run what-if (stages 9-12) ────────────────────────────────────────────

  const whatIf = useMemo(() => {
    if (!baseline || activeStrategies.size === 0) return null;

    let merged: Partial<FeatureVector> = {};
    for (const id of activeStrategies) {
      const strat = GEO_STRATEGIES.find((s) => s.id === id);
      if (strat) merged = { ...merged, ...strat.featureChanges };
    }

    const scenario = encodeScenario(baseline.features, merged);
    const prediction = predictScenario(baseline.features, scenario);
    const explanation = explainPrediction(baseline.features, scenario, prediction);

    // sensitivity for top 3 changed features
    const changedFeatures = explanation.contributions
      .slice(0, 3)
      .map((c) => c.feature as keyof FeatureVector);
    const sensitivity = sensitivityAnalysis(baseline.features, changedFeatures);

    return { prediction, explanation, sensitivity, scenario };
  }, [baseline, activeStrategies]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function pickPreset(p: DemoPreset) {
    setPreset(p);
    setActiveStrategies(new Set());
    setPhase("baseline");
  }

  function goSimulate() {
    setPhase("simulate");
  }

  function toggleStrategy(id: string) {
    setActiveStrategies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function reset() {
    setPhase("pick");
    setPreset(null);
    setActiveStrategies(new Set());
  }

  // ── Target brand stats helper ────────────────────────────────────────────

  const target: BrandStats | undefined = baseline?.brandStats.find((b) => b.isTarget);
  const maxRate = baseline ? Math.max(...baseline.brandStats.map((b) => b.mentionRate)) : 1;

  // ════════════════════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════════════════════

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
        <div>
          <Link href="/" className="ink-link text-sm">Back to home</Link>
          <h1 className="mt-2 text-4xl text-[var(--ink)] md:text-5xl">Simulator</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
            See your AI visibility baseline, then simulate content changes and
            see predicted impact — instantly.
          </p>
        </div>
        {phase !== "pick" && (
          <button onClick={reset} className="btn-secondary rounded-2xl px-4 py-2 text-sm font-semibold">
            Start over
          </button>
        )}
      </div>

      {/* ── Phase pills ─────────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-8">
        {(["pick", "baseline", "simulate"] as Phase[]).map((p, i) => {
          const labels = ["1 — Choose brand", "2 — Current visibility", "3 — Simulate changes"];
          const isActive = p === phase;
          const isPast =
            (p === "pick" && phase !== "pick") ||
            (p === "baseline" && phase === "simulate");
          return (
            <button
              key={p}
              onClick={() => {
                if (isPast) setPhase(p);
              }}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-[var(--ink)] text-[var(--paper)]"
                  : isPast
                    ? "surface-chip text-[var(--ink)] cursor-pointer hover:border-[color:var(--line-strong)]"
                    : "surface-chip text-[var(--muted)] opacity-50 cursor-default"
              }`}
            >
              {labels[i]}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PHASE 1: Pick brand                                               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {phase === "pick" && (
        <div className="grid gap-4 md:grid-cols-3">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => pickPreset(p)}
              className="paper-panel rounded-[2rem] p-6 text-left hover:-translate-y-1 hover:border-[color:var(--line-strong)] group"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ink)] text-lg font-bold text-[var(--paper)]">
                  {p.icon}
                </span>
                <span className="text-lg font-semibold text-[var(--ink)]">{p.label}</span>
              </div>
              <p className="text-sm text-[var(--muted)] leading-relaxed mb-3">
                <span className="font-semibold text-[var(--ink)]">{p.targetBrand}</span>
                {" vs "}
                {p.competitors.join(", ")}
              </p>
              <p className="text-xs text-[var(--muted)]">
                {p.queries.length} buyer questions &middot; 4 AI models &middot; 5 samples each
              </p>
              <span className="mt-4 inline-block text-xs font-semibold text-[var(--muted)] group-hover:text-[var(--ink)] transition-colors">
                Run baseline &rarr;
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PHASE 2: Baseline visibility                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {phase === "baseline" && baseline && target && (
        <div className="space-y-6">
          {/* Hero metrics */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Overall mention rate</p>
              <p className="mt-2 text-4xl text-[var(--ink)]">{pct(target.mentionRate)}</p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Avg position</p>
              <p className="mt-2 text-4xl text-[var(--ink)]">
                {target.avgPosition ? `#${target.avgPosition.toFixed(1)}` : "—"}
              </p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Positive sentiment</p>
              <p className="mt-2 text-4xl text-[var(--ink)]">
                {target.sentimentBreakdown.positive + target.sentimentBreakdown.neutral + target.sentimentBreakdown.negative > 0
                  ? `${Math.round((target.sentimentBreakdown.positive / (target.sentimentBreakdown.positive + target.sentimentBreakdown.neutral + target.sentimentBreakdown.negative)) * 100)}%`
                  : "—"}
              </p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Rank</p>
              <p className="mt-2 text-4xl text-[var(--ink)]">
                #{baseline.brandStats.findIndex((b) => b.isTarget) + 1}
                <span className="text-lg text-[var(--muted)]"> of {baseline.brandStats.length}</span>
              </p>
            </div>
          </div>

          {/* Brand comparison bars */}
          <div className="paper-panel rounded-[2rem] p-6">
            <p className="muted-label text-xs mb-1">Competitive landscape</p>
            <h2 className="text-2xl text-[var(--ink)] mb-6">
              Who gets mentioned when buyers ask?
            </h2>
            <div className="space-y-2.5">
              {baseline.brandStats.map((b) => (
                <Bar
                  key={b.brand}
                  value={b.mentionRate}
                  max={maxRate}
                  color={b.isTarget ? "var(--ink)" : "rgba(114,105,92,0.35)"}
                  label={b.brand}
                />
              ))}
            </div>
          </div>

          {/* Per-model breakdown */}
          <div className="paper-panel rounded-[2rem] p-6">
            <p className="muted-label text-xs mb-1">Per-model visibility</p>
            <h2 className="text-2xl text-[var(--ink)] mb-6">
              How each AI model treats {preset?.targetBrand}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {MODEL_ORDER.map((modelId) => {
                const meta = MODEL_META[modelId];
                const modelData = target.modelBreakdown[modelId];
                if (!modelData) return null;
                return (
                  <div key={modelId} className="paper-card rounded-[1.4rem] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: meta.color }} />
                      <span className="text-sm font-semibold text-[var(--ink)]">{meta.provider}</span>
                    </div>
                    <div className="text-3xl text-[var(--ink)] mb-1">{pct(modelData.mentionRate)}</div>
                    <div className="text-xs text-[var(--muted)]">
                      mention rate
                    </div>
                    <div className="mt-2 text-sm text-[var(--muted)]">
                      {modelData.avgPosition
                        ? `Avg position #${modelData.avgPosition.toFixed(1)}`
                        : "Not mentioned"}
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-[rgba(255,255,255,0.5)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${modelData.mentionRate * 100}%`,
                          backgroundColor: meta.color,
                          opacity: 0.7,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Feature snapshot */}
          <div className="paper-panel rounded-[2rem] p-6">
            <p className="muted-label text-xs mb-1">Current content signals</p>
            <h2 className="text-2xl text-[var(--ink)] mb-2">
              What the surrogate model sees
            </h2>
            <p className="text-sm text-[var(--muted)] mb-6 max-w-2xl">
              These are the features the simulator uses to predict mention rates.
              In production, they come from daily API observations and content analysis.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {([
                ["Source freshness", `${baseline.features.source_freshness_months.toFixed(1)} months`, "Time since last content update"],
                ["Authority sources", `${baseline.features.high_authority_source_count}`, "High-authority sites citing you"],
                ["Statistics density", `${(baseline.features.statistics_density * 100).toFixed(0)}%`, "Proportion of data-backed claims"],
                ["Quotations", `${baseline.features.quotation_count}`, "Expert quotes in content"],
                ["Third-party mentions", `${baseline.features.third_party_mention_count}`, "Roundups, reviews, comparisons"],
                ["Content length", `${(baseline.features.content_length_chars / 1000).toFixed(1)}K chars`, "Total content length"],
                ["Fluency score", `${(baseline.features.fluency_score * 100).toFixed(0)}%`, "Readability assessment"],
                ["Parametric vs RAG", `${(baseline.features.parametric_pct * 100).toFixed(0)}/${(baseline.features.rag_pct * 100).toFixed(0)}`, "Knowledge source split"],
                ["Competitor pressure", baseline.features.competitor_gaining ? "Rising" : "Stable", "Are competitors gaining?"],
              ] as [string, string, string][]).map(([label, value, hint]) => (
                <div key={label} className="paper-card rounded-[1.2rem] px-4 py-3">
                  <div className="text-lg font-semibold text-[var(--ink)]">{value}</div>
                  <div className="text-sm text-[var(--ink)]">{label}</div>
                  <div className="text-xs text-[var(--muted)]">{hint}</div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="flex justify-center pt-2">
            <button
              onClick={goSimulate}
              className="btn-primary rounded-2xl px-8 py-4 text-base font-semibold"
            >
              Now simulate changes &rarr;
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PHASE 3: Simulate changes                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {phase === "simulate" && baseline && target && (
        <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
          {/* Left: strategy toggles */}
          <div className="space-y-4">
            <div className="paper-panel rounded-[2rem] p-6">
              <p className="muted-label text-xs mb-1">What-if scenarios</p>
              <h2 className="text-2xl text-[var(--ink)] mb-2">
                What changes could {preset?.targetBrand} make?
              </h2>
              <p className="text-sm text-[var(--muted)] mb-6">
                Toggle strategies on/off. Each one changes specific content features.
                The prediction updates instantly.
              </p>

              <div className="space-y-3">
                {GEO_STRATEGIES.map((strat) => {
                  const isOn = activeStrategies.has(strat.id);
                  return (
                    <button
                      key={strat.id}
                      onClick={() => toggleStrategy(strat.id)}
                      className={`w-full text-left rounded-[1.4rem] border p-4 transition-all ${
                        isOn
                          ? "border-[var(--ink)] bg-[rgba(25,22,18,0.05)]"
                          : "border-[color:var(--line-strong)] bg-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.9)]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold transition-all ${
                          isOn
                            ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]"
                            : "border-[color:var(--line-strong)] bg-white text-transparent"
                        }`}>
                          {isOn ? "\u2713" : ""}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-[var(--ink)]">{strat.label}</div>
                          <div className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{strat.description}</div>
                          <div className="mt-1.5 inline-block rounded-full bg-[rgba(255,255,255,0.7)] border border-[color:var(--line)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
                            {strat.evidence}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: live prediction */}
          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            {/* Prediction card */}
            <div className="paper-panel rounded-[2rem] p-6">
              <p className="muted-label text-xs mb-4">Predicted impact</p>

              {!whatIf ? (
                <div className="text-center py-8">
                  <p className="text-3xl text-[var(--muted)] opacity-40">?</p>
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    Toggle a strategy to see the prediction
                  </p>
                </div>
              ) : (
                <>
                  {/* Lift */}
                  <div className="text-center mb-6">
                    <div className={`text-5xl font-semibold ${
                      whatIf.prediction.lift >= 0 ? "text-emerald-700" : "text-rose-700"
                    }`}>
                      {signed(whatIf.prediction.liftPct)}%
                    </div>
                    <div className="mt-1 text-sm text-[var(--muted)]">predicted lift in mention rate</div>
                  </div>

                  {/* Before / after */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="metric-card text-center">
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Now</p>
                      <p className="mt-1 text-2xl text-[var(--ink)]">
                        {whatIf.prediction.baseMentionRate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="metric-card text-center">
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">After</p>
                      <p className={`mt-1 text-2xl ${
                        whatIf.prediction.lift >= 0 ? "text-emerald-700" : "text-rose-700"
                      }`}>
                        {whatIf.prediction.scenarioMentionRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Confidence interval */}
                  <div className="paper-card rounded-[1.2rem] px-4 py-3 mb-4">
                    <div className="flex justify-between text-xs text-[var(--muted)]">
                      <span>{whatIf.prediction.confidenceLower.toFixed(1)}%</span>
                      <span className="font-semibold">95% confidence interval</span>
                      <span>{whatIf.prediction.confidenceUpper.toFixed(1)}%</span>
                    </div>
                    <div className="mt-2 relative h-3 rounded-full bg-[rgba(255,255,255,0.5)] overflow-hidden">
                      {/* CI range */}
                      <div
                        className="absolute inset-y-0 rounded-full bg-emerald-200"
                        style={{
                          left: `${whatIf.prediction.confidenceLower}%`,
                          width: `${Math.max(1, whatIf.prediction.confidenceUpper - whatIf.prediction.confidenceLower)}%`,
                        }}
                      />
                      {/* Point estimate */}
                      <div
                        className="absolute top-0 bottom-0 w-1 rounded-full bg-emerald-700"
                        style={{ left: `${whatIf.prediction.scenarioMentionRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Confidence badge */}
                  <div className="text-center mb-2">
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                      whatIf.prediction.confidence === "high"
                        ? "bg-emerald-100 text-emerald-800"
                        : whatIf.prediction.confidence === "medium"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-gray-100 text-gray-600"
                    }`}>
                      {whatIf.prediction.confidence} confidence
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Explanation card (SHAP) */}
            {whatIf && whatIf.explanation.contributions.length > 0 && (
              <div className="paper-panel rounded-[2rem] p-6">
                <p className="muted-label text-xs mb-4">Why this prediction</p>
                <div className="space-y-2.5">
                  {whatIf.explanation.contributions.map((c) => {
                    const isPositive = c.contribution >= 0;
                    const maxContrib = Math.max(
                      ...whatIf.explanation.contributions.map((x) => Math.abs(x.contribution))
                    );
                    const barWidth = maxContrib > 0 ? (Math.abs(c.contribution) / maxContrib) * 100 : 0;

                    return (
                      <div key={c.feature}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[var(--ink)] font-medium">
                            {c.feature.replace(/_/g, " ")}
                          </span>
                          <span className={isPositive ? "text-emerald-700" : "text-rose-700"}>
                            {signed(c.contribution)} ({c.pct.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-[rgba(255,255,255,0.5)] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isPositive ? "bg-emerald-400" : "bg-rose-400"
                            }`}
                            style={{ width: `${Math.max(2, barWidth)}%`, opacity: 0.7 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sensitivity card */}
            {whatIf && whatIf.sensitivity && (
              <div className="paper-panel rounded-[2rem] p-6">
                <p className="muted-label text-xs mb-1">Diminishing returns</p>
                <p className="text-sm text-[var(--muted)] mb-4">
                  How much more of each change still helps?
                </p>
                <div className="space-y-4">
                  {Object.entries(whatIf.sensitivity).map(([feat, points]) => {
                    const minP = Math.min(...points.map((p) => p.predictedRate));
                    const maxP = Math.max(...points.map((p) => p.predictedRate));
                    const range = maxP - minP || 1;

                    return (
                      <div key={feat}>
                        <div className="text-xs font-medium text-[var(--ink)] mb-2">
                          {feat.replace(/_/g, " ")}
                        </div>
                        <div className="flex items-end gap-px h-10">
                          {points.map((p, i) => {
                            const height = ((p.predictedRate - minP) / range) * 100;
                            const isCurrent = p.multiplier === 1.0;
                            return (
                              <div
                                key={i}
                                className="flex-1 rounded-t transition-all"
                                style={{
                                  height: `${Math.max(4, height)}%`,
                                  backgroundColor: isCurrent
                                    ? "var(--ink)"
                                    : "rgba(114,105,92,0.25)",
                                }}
                                title={`${p.multiplier}x → ${p.predictedRate.toFixed(1)}%`}
                              />
                            );
                          })}
                        </div>
                        <div className="flex justify-between text-[10px] text-[var(--muted)] mt-1">
                          <span>0.25x</span>
                          <span>1x (now)</span>
                          <span>2x</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer link to spec */}
      <div className="mt-16 border-t border-[color:var(--line)] pt-8 text-center">
        <Link href="/simulator/spec" className="ink-link text-sm">
          Read the technical specification &rarr;
        </Link>
      </div>
    </div>
  );
}
