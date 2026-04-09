"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getStatus,
  runCollection,
  runWhatIf,
  type BrandResult,
  type CollectResponse,
  type WhatIfResponse,
  type StatusResponse,
} from "@/lib/api";

// ── Brand config (what the user fills in) ──────────────────────────────────

interface BrandConfig {
  targetBrand: string;
  website: string;
  competitors: string[];
  queries: string[];
}

// Quick-fill templates so users don't start from scratch
const TEMPLATES: { label: string; config: BrandConfig }[] = [
  {
    label: "Fashion",
    config: {
      targetBrand: "Zalando",
      website: "https://zalando.com",
      competitors: ["ASOS", "H&M", "About You", "Shein", "Zara"],
      queries: [
        "Best online fashion store in Europe",
        "Where to buy affordable designer clothes online",
        "Best sustainable fashion marketplace",
      ],
    },
  },
  {
    label: "CRM",
    config: {
      targetBrand: "HubSpot",
      website: "https://hubspot.com",
      competitors: ["Salesforce", "Pipedrive", "Zoho CRM", "Monday.com"],
      queries: [
        "Best CRM for small businesses",
        "Top CRM software for sales teams",
        "Best free CRM tools",
      ],
    },
  },
  {
    label: "Hosting",
    config: {
      targetBrand: "Vercel",
      website: "https://vercel.com",
      competitors: ["Netlify", "AWS", "Cloudflare Pages", "Railway"],
      queries: [
        "Best hosting for Next.js",
        "Which web hosting is fastest",
        "Best cloud hosting for developers",
      ],
    },
  },
];

// ── GEO strategy toggles (mapped to real feature names) ────────────────────

interface GeoStrategy {
  id: string;
  label: string;
  description: string;
  evidence: string;
  featureChanges: Record<string, number>;
}

const GEO_STRATEGIES: GeoStrategy[] = [
  {
    id: "sentiment",
    label: "Improve brand sentiment",
    description: "Get more positive reviews, fix negative mentions, earn favorable analyst coverage.",
    evidence: "positive_rate is #1 feature by importance (40.8%)",
    featureChanges: { positive_rate: 95, negative_rate: 2, net_sentiment: 90 },
  },
  {
    id: "position",
    label: "Improve ranking position",
    description: "Get cited earlier in AI responses. Position #1-2 gets 3.5x more clicks than position #5+.",
    evidence: "Profound: rank #1 cited 3.5x more than top-20",
    featureChanges: { avg_position: 1.5, top1_rate: 75, top3_rate: 95, position_std: 0.3 },
  },
  {
    id: "coverage",
    label: "Cover more query types",
    description: "Appear in informational, comparison, and transactional queries — not just one type.",
    evidence: "1/3 of citations from fan-out queries (Profound)",
    featureChanges: { query_coverage: 100 },
  },
  {
    id: "models",
    label: "Get all AI models to agree",
    description: "Optimize for ChatGPT, Claude, AND Gemini — not just one. 62% of brands disagree across platforms.",
    evidence: "CMU LLM Whisperer: 62% cross-model disagreement",
    featureChanges: { model_agreement: 100, model_spread: 0 },
  },
  {
    id: "compete",
    label: "Close the competitor gap",
    description: "When competitors' rates rise, yours falls. Proactively outpace them.",
    evidence: "Substitution effect: absent brands get replaced (Research 2.1)",
    featureChanges: { vs_best_competitor: 1.3, brands_ahead: 0 },
  },
];

// ── Phases ──────────────────────────────────────────────────────────────────

type Phase = "pick" | "collecting" | "baseline" | "simulate";

function pct(n: number) { return `${n.toFixed(1)}%`; }
function signed(n: number) { return n >= 0 ? `+${n.toFixed(1)}` : n.toFixed(1); }

// ── Bar component ───────────────────────────────────────────────────────────

function Bar({ value, max, color, label }: {
  value: number; max: number; color: string; label: string;
}) {
  const width = max > 0 ? Math.max(2, (value / max) * 100) : 2;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-right text-sm text-[var(--muted)]">{label}</span>
      <div className="relative flex-1 h-7 rounded-lg bg-[rgba(255,255,255,0.5)] overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500"
          style={{ width: `${width}%`, backgroundColor: color, opacity: 0.75 }}
        />
        <span className="relative z-10 flex items-center h-full px-3 text-xs font-semibold text-[var(--ink)]">
          {pct(value)}
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
  const [brandConfig, setBrandConfig] = useState<BrandConfig>({
    targetBrand: "",
    website: "",
    competitors: [],
    queries: [],
  });
  const [collectResult, setCollectResult] = useState<CollectResponse | null>(null);
  const [whatIfResult, setWhatIfResult] = useState<WhatIfResponse | null>(null);
  const [activeStrategies, setActiveStrategies] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");
  const [backendStatus, setBackendStatus] = useState<StatusResponse | null>(null);

  // Form inputs
  const [compInput, setCompInput] = useState("");
  const [queryInput, setQueryInput] = useState("");

  useEffect(() => {
    getStatus()
      .then(setBackendStatus)
      .catch(() => setBackendStatus(null));
  }, []);

  // ── Run collection ───────────────────────────────────────────────────────

  async function startCollection() {
    if (!brandConfig.targetBrand || brandConfig.competitors.length === 0 || brandConfig.queries.length === 0) return;

    setActiveStrategies(new Set());
    setWhatIfResult(null);
    setError(null);
    setPhase("collecting");
    setProgress("Calling ChatGPT, Claude, and Gemini...");

    try {
      const result = await runCollection({
        target: brandConfig.targetBrand,
        competitors: brandConfig.competitors,
        queries: brandConfig.queries,
        samples_per_query: 2,
      });
      setCollectResult(result);
      setPhase("baseline");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Collection failed");
      setPhase("pick");
    }
  }

  async function useExistingData() {
    if (!backendStatus?.brands.length) return;

    // Figure out target from existing data
    const existingTarget = backendStatus.target ?? backendStatus.brands[0];
    setBrandConfig({
      targetBrand: existingTarget,
      website: "",
      competitors: backendStatus.brands.filter((b) => b !== existingTarget),
      queries: [],
    });

    try {
      const res = await fetch("http://localhost:8000/api/simulations/features");
      const data = await res.json();
      const brands: BrandResult[] = data.features.map((f: Record<string, number | string>) => ({
        brand: f.brand,
        mention_rate: f.mention_rate,
        avg_position: f.avg_position,
        top1_rate: f.top1_rate,
        top3_rate: f.top3_rate,
        positive_rate: f.positive_rate,
        negative_rate: f.negative_rate,
        net_sentiment: f.net_sentiment,
        is_target: f.brand === existingTarget,
      }));
      brands.sort((a, b) => b.mention_rate - a.mention_rate);

      setCollectResult({
        total_observations: backendStatus.observation_count,
        total_calls: 0,
        brands,
        model_metrics: { rmse: 0, r2: backendStatus.model_r2 ?? 0, importance: {} },
        training_samples_total: backendStatus.training_sample_count,
        duration_seconds: 0,
      });
      setPhase("baseline");
    } catch {
      setError("Failed to load existing data");
    }
  }

  // ── Run what-if ──────────────────────────────────────────────────────────

  async function runWhatIfForStrategies(strategies: Set<string>) {
    if (!brandConfig.targetBrand || strategies.size === 0) {
      setWhatIfResult(null);
      return;
    }

    let merged: Record<string, number> = {};
    for (const id of strategies) {
      const strat = GEO_STRATEGIES.find((s) => s.id === id);
      if (strat) merged = { ...merged, ...strat.featureChanges };
    }

    try {
      const result = await runWhatIf({ brand: brandConfig.targetBrand, changes: merged });
      setWhatIfResult(result);
    } catch (e) {
      console.error("What-if error:", e);
    }
  }

  function toggleStrategy(id: string) {
    setActiveStrategies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      runWhatIfForStrategies(next);
      return next;
    });
  }

  function applyTemplate(config: BrandConfig) {
    setBrandConfig(config);
  }

  function addCompetitor() {
    const name = compInput.trim();
    if (name && !brandConfig.competitors.includes(name) && name !== brandConfig.targetBrand) {
      setBrandConfig({ ...brandConfig, competitors: [...brandConfig.competitors, name] });
      setCompInput("");
    }
  }

  function addQuery() {
    const q = queryInput.trim();
    if (q && !brandConfig.queries.includes(q)) {
      setBrandConfig({ ...brandConfig, queries: [...brandConfig.queries, q] });
      setQueryInput("");
    }
  }

  function reset() {
    setPhase("pick");
    setBrandConfig({ targetBrand: "", website: "", competitors: [], queries: [] });
    setCollectResult(null);
    setWhatIfResult(null);
    setActiveStrategies(new Set());
    setError(null);
    setCompInput("");
    setQueryInput("");
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const target = collectResult?.brands.find((b) => b.is_target);
  const maxRate = collectResult ? Math.max(...collectResult.brands.map((b) => b.mention_rate)) : 100;
  const canRun = brandConfig.targetBrand.trim().length > 0
    && brandConfig.competitors.length > 0
    && brandConfig.queries.length > 0;

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
            Check how AI search engines see your brand. Simulate changes, see what improves your visibility.
          </p>
        </div>
        {phase !== "pick" && (
          <button onClick={reset} className="btn-secondary rounded-2xl px-4 py-2 text-sm font-semibold">
            Start over
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-800">
          {error}
          <span className="ml-2 text-xs text-rose-500">
            Is the backend running? <code>cd backend && python -m uvicorn api.app:app --port 8000</code>
          </span>
        </div>
      )}

      {/* Phase pills */}
      <div className="flex gap-2 mb-8">
        {(["pick", "baseline", "simulate"] as Phase[]).map((p, i) => {
          const labels = ["1 — Your brand", "2 — Current visibility", "3 — Simulate changes"];
          const isActive = p === phase || (p === "pick" && phase === "collecting");
          const isPast =
            (p === "pick" && (phase === "baseline" || phase === "simulate")) ||
            (p === "baseline" && phase === "simulate");
          return (
            <button
              key={p}
              onClick={() => { if (isPast) setPhase(p); }}
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
      {/* PHASE: Pick brand                                                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {phase === "pick" && (
        <div className="grid gap-6 lg:grid-cols-[1fr,340px]">
          {/* Left: brand entry form */}
          <div className="space-y-5">
            {/* Existing data banner */}
            {backendStatus?.has_data && (
              <div className="paper-panel rounded-[2rem] p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    Previous run: {backendStatus.brands.join(", ")} ({backendStatus.training_sample_count} samples)
                  </p>
                  <p className="text-xs text-[var(--muted)]">Model R2 = {backendStatus.model_r2?.toFixed(4)}</p>
                </div>
                <button onClick={useExistingData} className="btn-secondary rounded-2xl px-4 py-2 text-sm font-semibold shrink-0">
                  Load this
                </button>
              </div>
            )}

            {/* Brand name + website */}
            <div className="paper-panel rounded-[2rem] p-6">
              <p className="muted-label text-xs mb-1">Your brand</p>
              <h2 className="text-2xl text-[var(--ink)] mb-2">Who are you?</h2>
              <p className="text-sm text-[var(--muted)] mb-5">
                We&apos;ll ask ChatGPT, Claude, and Gemini about your brand and see how they respond.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Brand name</label>
                  <input
                    type="text"
                    value={brandConfig.targetBrand}
                    onChange={(e) => setBrandConfig({ ...brandConfig, targetBrand: e.target.value })}
                    placeholder="e.g. Zalando"
                    className="field-input mt-2"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Website</label>
                  <input
                    type="url"
                    value={brandConfig.website}
                    onChange={(e) => setBrandConfig({ ...brandConfig, website: e.target.value })}
                    placeholder="https://yoursite.com"
                    className="field-input mt-2"
                  />
                </div>
              </div>

              {/* Quick fill templates */}
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs text-[var(--muted)] self-center mr-1">Quick fill:</span>
                {TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => applyTemplate(t.config)}
                    className="surface-chip px-3 py-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] hover:border-[color:var(--line-strong)]"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Competitors */}
            <div className="paper-panel rounded-[2rem] p-6">
              <div className="flex items-end justify-between gap-4 mb-4">
                <div>
                  <p className="muted-label text-xs mb-1">Competitors</p>
                  <p className="text-sm text-[var(--muted)]">Who do you compete with for AI recommendations?</p>
                </div>
                <span className="font-mono text-xs text-[var(--muted)]">{brandConfig.competitors.length} added</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={compInput}
                  onChange={(e) => setCompInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCompetitor()}
                  placeholder="Add a competitor"
                  className="field-input flex-1"
                />
                <button onClick={addCompetitor} className="btn-secondary rounded-2xl px-4 py-3 text-sm font-semibold">
                  Add
                </button>
              </div>

              {brandConfig.competitors.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {brandConfig.competitors.map((c) => (
                    <span key={c} className="surface-chip inline-flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--ink)]">
                      {c}
                      <button
                        onClick={() => setBrandConfig({ ...brandConfig, competitors: brandConfig.competitors.filter((x) => x !== c) })}
                        className="text-[var(--muted)] hover:text-rose-600"
                      >&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Buyer questions */}
            <div className="paper-panel rounded-[2rem] p-6">
              <div className="flex items-end justify-between gap-4 mb-4">
                <div>
                  <p className="muted-label text-xs mb-1">Buyer questions</p>
                  <p className="text-sm text-[var(--muted)]">What do your customers ask AI when they&apos;re shopping?</p>
                </div>
                <span className="font-mono text-xs text-[var(--muted)]">{brandConfig.queries.length} added</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addQuery()}
                  placeholder='e.g. "Best online store for sneakers"'
                  className="field-input flex-1"
                />
                <button onClick={addQuery} className="btn-secondary rounded-2xl px-4 py-3 text-sm font-semibold">
                  Add
                </button>
              </div>

              {brandConfig.queries.length > 0 && (
                <div className="mt-3 space-y-2">
                  {brandConfig.queries.map((q) => (
                    <div key={q} className="surface-inset flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-[var(--ink)]">
                      <span className="flex-1">{q}</span>
                      <button
                        onClick={() => setBrandConfig({ ...brandConfig, queries: brandConfig.queries.filter((x) => x !== q) })}
                        className="text-[var(--muted)] hover:text-rose-600"
                      >&times;</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: summary + run button */}
          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="paper-panel rounded-[2rem] p-6">
              <p className="muted-label text-xs mb-4">Summary</p>

              <div className="space-y-3">
                <div className="metric-card">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Brand</p>
                  <p className="mt-1 text-xl text-[var(--ink)]">{brandConfig.targetBrand || "—"}</p>
                  {brandConfig.website && (
                    <p className="mt-1 text-xs text-[var(--muted)] truncate">{brandConfig.website}</p>
                  )}
                </div>
                <div className="metric-card">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Competitors</p>
                  <p className="mt-1 text-2xl text-[var(--ink)]">{brandConfig.competitors.length}</p>
                </div>
                <div className="metric-card">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Questions</p>
                  <p className="mt-1 text-2xl text-[var(--ink)]">{brandConfig.queries.length}</p>
                </div>
                <div className="metric-card">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">API calls</p>
                  <p className="mt-1 text-2xl text-[var(--ink)]">{brandConfig.queries.length * 3 * 2}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {brandConfig.queries.length} questions &times; 3 models &times; 2 samples
                  </p>
                </div>
              </div>

              <button
                onClick={startCollection}
                disabled={!canRun}
                className={`mt-6 w-full rounded-2xl px-4 py-3.5 text-sm font-semibold ${
                  canRun
                    ? "btn-primary"
                    : "cursor-not-allowed bg-[rgba(26,23,20,0.12)] text-[var(--muted)]"
                }`}
              >
                Check my visibility
              </button>

              {!canRun && (
                <p className="mt-3 text-center text-xs text-[var(--muted)]">
                  {!brandConfig.targetBrand.trim()
                    ? "Enter your brand name"
                    : brandConfig.competitors.length === 0
                      ? "Add at least one competitor"
                      : "Add at least one buyer question"}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PHASE: Collecting (loading state)                                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {phase === "collecting" && (
        <div className="paper-panel rounded-[2rem] p-12 text-center">
          <div className="text-4xl mb-4 animate-pulse">...</div>
          <p className="text-lg font-semibold text-[var(--ink)]">
            Checking AI visibility for {brandConfig.targetBrand}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Asking {brandConfig.queries.length} questions to ChatGPT, Claude, and Gemini ({brandConfig.queries.length * 6} API calls)
          </p>
          {brandConfig.website && (
            <p className="mt-1 text-xs text-[var(--muted)]">{brandConfig.website}</p>
          )}
          <p className="mt-4 text-xs text-[var(--muted)]">{progress}</p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PHASE: Baseline visibility (REAL DATA)                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {phase === "baseline" && collectResult && target && (
        <div className="space-y-6">
          {/* Source banner */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-800">
            Real data: {collectResult.total_observations} observations from {collectResult.total_calls || "previous"} API calls
            {collectResult.duration_seconds > 0 && ` in ${collectResult.duration_seconds}s`}
          </div>

          {/* Hero metrics */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Mention rate</p>
              <p className="mt-2 text-4xl text-[var(--ink)]">{pct(target.mention_rate)}</p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Avg position</p>
              <p className="mt-2 text-4xl text-[var(--ink)]">
                {target.avg_position ? `#${target.avg_position.toFixed(1)}` : "—"}
              </p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Positive sentiment</p>
              <p className="mt-2 text-4xl text-[var(--ink)]">{pct(target.positive_rate)}</p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Net sentiment</p>
              <p className={`mt-2 text-4xl ${target.net_sentiment >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {signed(target.net_sentiment)}
              </p>
            </div>
          </div>

          {/* Brand comparison */}
          <div className="paper-panel rounded-[2rem] p-6">
            <p className="muted-label text-xs mb-1">Competitive landscape</p>
            <h2 className="text-2xl text-[var(--ink)] mb-6">
              Who gets mentioned when buyers ask?
            </h2>
            <div className="space-y-2.5">
              {collectResult.brands.map((b) => (
                <Bar
                  key={b.brand}
                  value={b.mention_rate}
                  max={maxRate}
                  color={b.is_target ? "var(--ink)" : "rgba(114,105,92,0.35)"}
                  label={b.brand}
                />
              ))}
            </div>
          </div>

          {/* Sentiment comparison */}
          <div className="paper-panel rounded-[2rem] p-6">
            <p className="muted-label text-xs mb-1">Sentiment analysis</p>
            <h2 className="text-2xl text-[var(--ink)] mb-6">How AI models feel about each brand</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {collectResult.brands.map((b) => (
                <div key={b.brand} className="paper-card rounded-[1.4rem] p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-sm font-semibold ${b.is_target ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>
                      {b.brand}
                    </span>
                    <span className={`text-xs font-bold ${b.net_sentiment >= 50 ? "text-emerald-700" : b.net_sentiment >= 0 ? "text-amber-700" : "text-rose-700"}`}>
                      {signed(b.net_sentiment)}
                    </span>
                  </div>
                  <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 rounded-l-full" style={{ width: `${b.positive_rate}%`, opacity: 0.7 }} />
                    <div className="bg-gray-300" style={{ width: `${100 - b.positive_rate - b.negative_rate}%`, opacity: 0.5 }} />
                    <div className="bg-rose-400 rounded-r-full" style={{ width: `${b.negative_rate}%`, opacity: 0.7 }} />
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] text-[var(--muted)]">
                    <span>+{b.positive_rate.toFixed(0)}%</span>
                    <span>-{b.negative_rate.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <button
              onClick={() => setPhase("simulate")}
              className="btn-primary rounded-2xl px-8 py-4 text-base font-semibold"
            >
              Now simulate changes &rarr;
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PHASE: Simulate changes (REAL XGBoost)                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {phase === "simulate" && collectResult && target && (
        <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
          {/* Left: strategy toggles */}
          <div className="space-y-4">
            <div className="paper-panel rounded-[2rem] p-6">
              <p className="muted-label text-xs mb-1">What-if scenarios</p>
              <h2 className="text-2xl text-[var(--ink)] mb-2">
                What changes could {brandConfig.targetBrand} make?
              </h2>
              <p className="text-sm text-[var(--muted)] mb-6">
                Each toggle sends real feature changes to the XGBoost surrogate model.
                Predictions update live.
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
                          <div className="mt-1 text-[10px] text-[var(--muted)] font-mono">
                            {Object.entries(strat.featureChanges).map(([k, v]) => `${k}=${v}`).join(", ")}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: live prediction from real XGBoost */}
          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="paper-panel rounded-[2rem] p-6">
              <p className="muted-label text-xs mb-4">XGBoost prediction</p>

              {!whatIfResult ? (
                <div className="text-center py-8">
                  <p className="text-3xl text-[var(--muted)] opacity-40">?</p>
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    Toggle a strategy to query the surrogate model
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <div className={`text-5xl font-semibold ${
                      whatIfResult.lift >= 0 ? "text-emerald-700" : "text-rose-700"
                    }`}>
                      {signed(whatIfResult.lift_pct)}%
                    </div>
                    <div className="mt-1 text-sm text-[var(--muted)]">predicted lift</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="metric-card text-center">
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Now</p>
                      <p className="mt-1 text-2xl text-[var(--ink)]">{whatIfResult.base_prediction.toFixed(1)}%</p>
                    </div>
                    <div className="metric-card text-center">
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">After</p>
                      <p className={`mt-1 text-2xl ${whatIfResult.lift >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        {whatIfResult.scenario_prediction.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* CI */}
                  <div className="paper-card rounded-[1.2rem] px-4 py-3 mb-4">
                    <div className="flex justify-between text-xs text-[var(--muted)]">
                      <span>{whatIfResult.ci_lower.toFixed(1)}%</span>
                      <span className="font-semibold">95% confidence</span>
                      <span>{whatIfResult.ci_upper.toFixed(1)}%</span>
                    </div>
                    <div className="mt-2 relative h-3 rounded-full bg-[rgba(255,255,255,0.5)] overflow-hidden">
                      <div
                        className="absolute inset-y-0 rounded-full bg-emerald-200"
                        style={{
                          left: `${whatIfResult.ci_lower}%`,
                          width: `${Math.max(1, whatIfResult.ci_upper - whatIfResult.ci_lower)}%`,
                        }}
                      />
                      <div
                        className="absolute top-0 bottom-0 w-1 rounded-full bg-emerald-700"
                        style={{ left: `${Math.min(99, whatIfResult.scenario_prediction)}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-center mb-2">
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                      whatIfResult.confidence === "high" ? "bg-emerald-100 text-emerald-800"
                        : whatIfResult.confidence === "medium" ? "bg-amber-100 text-amber-800"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {whatIfResult.confidence} confidence
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Contributions */}
            {whatIfResult && whatIfResult.contributions.length > 0 && (
              <div className="paper-panel rounded-[2rem] p-6">
                <p className="muted-label text-xs mb-4">Feature contributions</p>
                <div className="space-y-2.5">
                  {whatIfResult.contributions.map((c) => {
                    const maxC = Math.max(...whatIfResult.contributions.map((x) => Math.abs(x.contribution)));
                    const barW = maxC > 0 ? (Math.abs(c.contribution) / maxC) * 100 : 0;
                    return (
                      <div key={c.feature}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[var(--ink)] font-medium">{c.feature.replace(/_/g, " ")}</span>
                          <span className={c.contribution >= 0 ? "text-emerald-700" : "text-rose-700"}>
                            {signed(c.contribution)} ({c.pct.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-[rgba(255,255,255,0.5)] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              c.contribution >= 0 ? "bg-emerald-400" : "bg-rose-400"
                            }`}
                            style={{ width: `${Math.max(2, barW)}%`, opacity: 0.7 }}
                          />
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

      {/* Footer */}
      <div className="mt-16 border-t border-[color:var(--line)] pt-8 text-center">
        <Link href="/simulator/spec" className="ink-link text-sm">
          Read the technical specification &rarr;
        </Link>
      </div>
    </div>
  );
}
