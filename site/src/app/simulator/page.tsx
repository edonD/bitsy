"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DebugPanel } from "@/components/DebugPanel"; // DEBUG PANEL — remove this line to disable
import {
  getStatus,
  runCollection,
  runWhatIf,
  analyzeContent,
  analyzeCompetitors,
  getQueryBreakdown,
  getCitedSources,
  getTrends,
  type BrandResult,
  type CollectResponse,
  type StatusResponse,
  type ContentAnalysisResponse,
  type WhatIfResponse,
  type CompetitorAnalysisResponse,
  type QueryBreakdownResponse,
  type CitedSourcesResponse,
  type TrendsResponse,
} from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

interface BrandConfig {
  name: string;
  website: string;
  competitors: string[];
  queries: string[];
}

type Tab = "visibility" | "compete" | "simulate" | "measure";

// ── Templates ──────────────────────────────────────────────────────────────

const TEMPLATES: { label: string; config: BrandConfig }[] = [
  {
    label: "Fashion",
    config: {
      name: "Zalando", website: "https://zalando.com",
      competitors: ["ASOS", "H&M", "About You", "Shein", "Zara"],
      queries: ["Best online fashion store in Europe", "Where to buy affordable designer clothes online", "Best sustainable fashion marketplace"],
    },
  },
  {
    label: "CRM",
    config: {
      name: "HubSpot", website: "https://hubspot.com",
      competitors: ["Salesforce", "Pipedrive", "Zoho CRM", "Monday.com"],
      queries: ["Best CRM for small businesses", "Top CRM software for sales teams", "Best free CRM tools"],
    },
  },
  {
    label: "Hosting",
    config: {
      name: "Vercel", website: "https://vercel.com",
      competitors: ["Netlify", "AWS", "Cloudflare Pages", "Railway"],
      queries: ["Best hosting for Next.js", "Which web hosting is fastest", "Best cloud hosting for developers"],
    },
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function pct(n: number) { return `${n.toFixed(1)}%`; }
function signed(n: number) { return n >= 0 ? `+${n.toFixed(1)}` : n.toFixed(1); }

// Fast defaults: ~30-60 seconds per run.
// Heavy expansions (fan-out, cross-validation) are opt-in via the admin improvements page.
const COLLECTION_OPTIONS = {
  samples_per_query: 2,
  multi_generator_fanout: false,
  intent_fanout: false,
  cross_validate_extraction: false,
  cross_validate_rate: 0.5,
} as const;

const CONTENT_METRIC_KEYS = [
  "statistics_density",
  "quotation_count",
  "citation_count",
  "content_length",
  "readability_grade",
  "freshness_days",
  "heading_count",
] as const;

function Bar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const w = max > 0 ? Math.max(2, (value / max) * 100) : 2;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-right text-sm text-[var(--muted)]">{label}</span>
      <div className="relative flex-1 h-7 rounded-lg bg-[rgba(255,255,255,0.5)] overflow-hidden">
        <div className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500" style={{ width: `${w}%`, backgroundColor: color, opacity: 0.75 }} />
        <span className="relative z-10 flex items-center h-full px-3 text-xs font-semibold text-[var(--ink)]">{pct(value)}</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════

export default function SimulatorPage() {
  const [brand, setBrand] = useState<BrandConfig>({ name: "", website: "", competitors: [], queries: [] });
  const [compInput, setCompInput] = useState("");
  const [queryInput, setQueryInput] = useState("");

  const [tab, setTab] = useState<Tab>("visibility");
  const [isSetup, setIsSetup] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [collectResult, setCollectResult] = useState<CollectResponse | null>(null);
  const [lastMeasuredKey, setLastMeasuredKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<StatusResponse | null>(null);

  // Simulate tab
  const [draftContent, setDraftContent] = useState("");
  const [websiteAnalysis, setWebsiteAnalysis] = useState<ContentAnalysisResponse | null>(null);
  const [draftAnalysis, setDraftAnalysis] = useState<ContentAnalysisResponse | null>(null);
  const [analyzingContent, setAnalyzingContent] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<WhatIfResponse | null>(null);

  // Measure tab
  const [runs, setRuns] = useState<{ label: string; date: string; data: CollectResponse }[]>([]);
  const [compareA, setCompareA] = useState<number | null>(null);
  const [compareB, setCompareB] = useState<number | null>(null);

  // Compete tab
  const [competitorUrls, setCompetitorUrls] = useState<Record<string, string>>({});
  const [compAnalysis, setCompAnalysis] = useState<CompetitorAnalysisResponse | null>(null);
  const [competing, setCompeting] = useState(false);
  const [compError, setCompError] = useState<string | null>(null);
  const [queryBreakdown, setQueryBreakdownState] = useState<QueryBreakdownResponse | null>(null);
  const [citedSources, setCitedSources] = useState<CitedSourcesResponse | null>(null);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);

  useEffect(() => { getStatus().then(setBackendStatus).catch(() => null); }, []);

  // Load breakdown + sources when entering Compete tab with a collection result
  useEffect(() => {
    if (tab === "compete" && collectResult && brand.name) {
      setLoadingBreakdown(true);
      Promise.all([
        getQueryBreakdown(7).catch(() => null),
        getCitedSources(brand.name, 7).catch(() => null),
      ]).then(([qb, cs]) => {
        if (qb) setQueryBreakdownState(qb);
        if (cs) setCitedSources(cs);
      }).finally(() => setLoadingBreakdown(false));
    }
  }, [tab, collectResult, brand.name]);

  // Load trends when entering Measure tab
  useEffect(() => {
    if (tab === "measure" && brand.name) {
      getTrends(brand.name, 30).then(setTrends).catch(() => null);
    }
  }, [tab, brand.name]);

  // ── Actions ────────────────────────────────────────────────────────────

  function addComp() {
    const c = compInput.trim();
    if (c && !brand.competitors.includes(c) && c !== brand.name) {
      setBrand({ ...brand, competitors: [...brand.competitors, c] });
      setCompInput("");
    }
  }
  function addQuery() {
    const q = queryInput.trim();
    if (q && !brand.queries.includes(q)) {
      setBrand({ ...brand, queries: [...brand.queries, q] });
      setQueryInput("");
    }
  }

  const canRun = brand.name.trim() && brand.competitors.length > 0 && brand.queries.length > 0;
  const currentSetupKey = JSON.stringify({
    name: brand.name.trim(),
    website: brand.website.trim(),
    competitors: [...brand.competitors].sort(),
    queries: brand.queries,
  });
  const hasCollectedCurrentBrand =
    lastMeasuredKey === currentSetupKey &&
    (collectResult?.brands.some((b) => b.brand === brand.name && b.is_target) ?? false);

  function contentChangesFromAnalysis(data: ContentAnalysisResponse | null) {
    if (!data) return {} as Record<string, number>;

    return CONTENT_METRIC_KEYS.reduce<Record<string, number>>((acc, key) => {
      const value = data.metrics[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        acc[key] = value;
      }
      return acc;
    }, {});
  }

  async function runVisibility() {
    if (!canRun) return;
    setCollecting(true);
    setError(null);
    setDraftAnalysis(null);
    setSimulationResult(null);

    // Analyze website content in parallel with LLM collection
    if (brand.website) {
      analyzeContent({ url: brand.website })
        .then(setWebsiteAnalysis)
        .catch(() => null);
    } else {
      setWebsiteAnalysis(null);
    }

    try {
      const result = await runCollection({
        target: brand.name,
        competitors: brand.competitors,
        queries: brand.queries,
        website_url: brand.website || undefined,
        ...COLLECTION_OPTIONS,
      });
      setCollectResult(result);
      setLastMeasuredKey(currentSetupKey);
      setIsSetup(false);
      setRuns((prev) => [{ label: `Run ${prev.length + 1}`, date: new Date().toLocaleString(), data: result }, ...prev]);
      getStatus().then(setBackendStatus).catch(() => null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Collection failed");
    } finally { setCollecting(false); }
  }

  async function runSimulation() {
    if (!canRun || !draftContent.trim()) return;
    setSimulating(true);
    setError(null);
    try {
      let baseline = collectResult;
      if (!hasCollectedCurrentBrand) {
        baseline = await runCollection({
          target: brand.name,
          competitors: brand.competitors,
          queries: brand.queries,
          website_url: brand.website || undefined,
          ...COLLECTION_OPTIONS,
        });
        setCollectResult(baseline);
        setLastMeasuredKey(currentSetupKey);
        setIsSetup(false);
        setRuns((prev) => [{ label: `Run ${prev.length + 1}`, date: new Date().toLocaleString(), data: baseline! }, ...prev]);
        getStatus().then(setBackendStatus).catch(() => null);
      }

      if (brand.website && !websiteAnalysis) {
        analyzeContent({ url: brand.website })
          .then(setWebsiteAnalysis)
          .catch(() => null);
      }

      const analyzedDraft = await analyzeContent({ text: draftContent });
      setDraftAnalysis(analyzedDraft);

      const changes = contentChangesFromAnalysis(analyzedDraft);
      const result = await runWhatIf({ brand: brand.name, changes });
      setSimulationResult(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Simulation failed");
    } finally { setSimulating(false); }
  }

  function resetAll() {
    setIsSetup(true);
    setCollectResult(null);
    setLastMeasuredKey(null);
    setError(null);
    setSimulationResult(null);
    setDraftContent("");
    setWebsiteAnalysis(null);
    setDraftAnalysis(null);
    setCompAnalysis(null);
    setCompetitorUrls({});
    setQueryBreakdownState(null);
    setCitedSources(null);
    setTrends(null);
  }

  async function runCompetitorAnalysis() {
    if (!brand.name || !brand.website) {
      setCompError("Brand name and website URL required");
      return;
    }
    if (brand.competitors.length === 0) {
      setCompError("Add at least one competitor");
      return;
    }
    setCompeting(true);
    setCompError(null);
    try {
      const result = await analyzeCompetitors({
        target: { brand: brand.name, url: brand.website },
        competitors: brand.competitors.map((c) => ({
          brand: c,
          url: competitorUrls[c] || undefined,
        })),
      });
      setCompAnalysis(result);
    } catch (e) {
      setCompError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setCompeting(false);
    }
  }

  async function analyzeDraft() {
    if (!draftContent.trim()) return;
    setAnalyzingContent(true);
    try {
      const result = await analyzeContent({ text: draftContent });
      setDraftAnalysis(result);
    } catch { /* silent */ }
    finally { setAnalyzingContent(false); }
  }

  const target = collectResult?.brands.find((b) => b.is_target);
  const maxRate = collectResult ? Math.max(...collectResult.brands.map((b) => b.mention_rate), 1) : 100;
  const runA = compareA !== null ? runs[compareA]?.data : null;
  const runB = compareB !== null ? runs[compareB]?.data : null;

  // ── Content analysis display ────────────────────────────────────────────

  function ContentAnalysisPanel({ data, label }: { data: ContentAnalysisResponse; label?: string }) {
    const ratingStyles: Record<string, string> = {
      good: "bg-emerald-50 text-emerald-800 border-emerald-200",
      needs_work: "bg-amber-50 text-amber-800 border-amber-200",
      missing: "bg-rose-50 text-rose-700 border-rose-200",
    };
    const ratingLabel: Record<string, string> = { good: "Good", needs_work: "Improve", missing: "Missing" };

    return (
      <div className="paper-panel rounded-[2rem] p-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="muted-label text-xs mb-1">{label ?? "Content analysis"}</p>
            <h2 className="text-2xl text-[var(--ink)]">
              {data.overall_score.toFixed(0)}<span className="text-lg text-[var(--muted)]">/100</span>
            </h2>
          </div>
          {data.url && <p className="text-xs text-[var(--muted)] truncate max-w-[200px]">{data.url}</p>}
        </div>
        <p className="text-sm text-[var(--muted)] mb-5">{data.summary}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.features.map((f) => (
            <div key={f.name} className="paper-card rounded-[1.2rem] p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-xs font-semibold text-[var(--ink)] leading-tight">{f.label}</p>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${ratingStyles[f.rating]}`}>
                  {ratingLabel[f.rating]}
                </span>
              </div>
              <p className="text-lg font-semibold text-[var(--ink)]">
                {f.value === null || f.value === undefined ? "—" : typeof f.value === "boolean" ? (f.value ? "Yes" : "No") : String(f.value)}
              </p>
              <p className="text-[10px] text-[var(--muted)] mt-1 leading-relaxed">{f.geo_impact}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════

  return (
    <>
    <DebugPanel /> {/* DEBUG PANEL — remove this line to disable */}
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <Link href="/" className="ink-link text-sm">Back to home</Link>
          <h1 className="mt-2 text-4xl text-[var(--ink)] md:text-5xl">Engine</h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-[var(--muted)]">
            A/B test your brand in AI search. See what ChatGPT, Claude, and Gemini
            say&nbsp;&mdash; then simulate changes before you publish.
          </p>
        </div>
        {!isSetup && <button onClick={resetAll} className="btn-secondary rounded-2xl px-4 py-2 text-sm font-semibold">New analysis</button>}
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-800">
          {error}
          <span className="ml-2 text-xs text-rose-500">Backend running? <code className="font-mono">cd backend; poetry run uvicorn api.app:app --port 8000</code></span>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-8 border-b border-[color:var(--line)]">
        {([
          { id: "visibility" as Tab, label: "Visibility", desc: "Where you stand now" },
          { id: "compete" as Tab, label: "Compete", desc: "Gap analysis vs competitors" },
          { id: "simulate" as Tab, label: "Simulate", desc: "Test before publishing" },
          { id: "measure" as Tab, label: "Measure", desc: "Track over time" },
        ]).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`relative px-5 py-3.5 text-sm font-semibold transition-colors ${tab === t.id ? "text-[var(--ink)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}>
            {t.label}
            <span className="ml-1.5 hidden sm:inline text-xs font-normal text-[var(--muted)]">{t.desc}</span>
            {tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--ink)] rounded-full" />}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* VISIBILITY TAB — Setup                                        */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {tab === "visibility" && isSetup && !collecting && (
        <div className="grid gap-6 lg:grid-cols-[1fr,340px]">
          <div className="space-y-5">
            {backendStatus?.has_data && (
              <div className="paper-panel rounded-[2rem] p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">Previous data: {backendStatus.brands.join(", ")}</p>
                  <p className="text-xs text-[var(--muted)]">{backendStatus.training_sample_count} accumulated samples</p>
                </div>
                <button onClick={async () => {
                  try {
                    const res = await fetch("http://localhost:8000/api/simulations/features");
                    const data = await res.json();
                    const brands: BrandResult[] = data.features.map((f: Record<string, number | string>) => ({
                      brand: f.brand, mention_rate: f.mention_rate, avg_position: f.avg_position, top1_rate: f.top1_rate, top3_rate: f.top3_rate, positive_rate: f.positive_rate, negative_rate: f.negative_rate, net_sentiment: f.net_sentiment, is_target: f.brand === backendStatus!.brands[0],
                    }));
                    brands.sort((a, b) => b.mention_rate - a.mention_rate);
                    const tgt = backendStatus!.brands[0];
                    setBrand({ name: tgt, website: "", competitors: backendStatus!.brands.filter((b) => b !== tgt), queries: [] });
                    setCollectResult({ total_observations: 0, total_calls: 0, brands, model_metrics: { rmse: 0, r2: backendStatus!.model_r2 ?? 0, importance: {} }, training_samples_total: backendStatus!.training_sample_count, duration_seconds: 0 });
                    setIsSetup(false);
                  } catch { setError("Failed to load"); }
                }} className="btn-secondary rounded-2xl px-4 py-2 text-sm font-semibold shrink-0">Load</button>
              </div>
            )}

            <div className="paper-panel rounded-[2rem] p-6">
              <p className="muted-label text-xs mb-1">Your brand</p>
              <h2 className="text-2xl text-[var(--ink)] mb-2">Who are you?</h2>
              <p className="text-sm text-[var(--muted)] mb-5">We&apos;ll ask ChatGPT, Claude, and Gemini about your brand and see how they respond.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Brand name</label>
                  <input type="text" value={brand.name} onChange={(e) => setBrand({ ...brand, name: e.target.value })} placeholder="e.g. Zalando" className="field-input mt-2" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Website</label>
                  <input type="url" value={brand.website} onChange={(e) => setBrand({ ...brand, website: e.target.value })} placeholder="https://yoursite.com" className="field-input mt-2" />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs text-[var(--muted)] self-center mr-1">Quick fill:</span>
                {TEMPLATES.map((t) => (
                  <button key={t.label} onClick={() => setBrand(t.config)} className="surface-chip px-3 py-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] hover:border-[color:var(--line-strong)]">{t.label}</button>
                ))}
              </div>
            </div>

            <div className="paper-panel rounded-[2rem] p-6">
              <div className="flex items-end justify-between gap-4 mb-4">
                <div><p className="muted-label text-xs mb-1">Competitors</p><p className="text-sm text-[var(--muted)]">Who do you compete with for AI recommendations?</p></div>
                <span className="font-mono text-xs text-[var(--muted)]">{brand.competitors.length}</span>
              </div>
              <div className="flex gap-2">
                <input type="text" value={compInput} onChange={(e) => setCompInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addComp()} placeholder="Add a competitor" className="field-input flex-1" />
                <button onClick={addComp} className="btn-secondary rounded-2xl px-4 py-3 text-sm font-semibold">Add</button>
              </div>
              {brand.competitors.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {brand.competitors.map((c) => (
                    <span key={c} className="surface-chip inline-flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--ink)]">{c}<button onClick={() => setBrand({ ...brand, competitors: brand.competitors.filter((x) => x !== c) })} className="text-[var(--muted)] hover:text-rose-600">&times;</button></span>
                  ))}
                </div>
              )}
            </div>

            <div className="paper-panel rounded-[2rem] p-6">
              <div className="flex items-end justify-between gap-4 mb-4">
                <div><p className="muted-label text-xs mb-1">Buyer questions</p><p className="text-sm text-[var(--muted)]">What do your customers ask AI when shopping?</p></div>
                <span className="font-mono text-xs text-[var(--muted)]">{brand.queries.length}</span>
              </div>
              <div className="flex gap-2">
                <input type="text" value={queryInput} onChange={(e) => setQueryInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addQuery()} placeholder='e.g. "Best online store for sneakers"' className="field-input flex-1" />
                <button onClick={addQuery} className="btn-secondary rounded-2xl px-4 py-3 text-sm font-semibold">Add</button>
              </div>
              {brand.queries.length > 0 && (
                <div className="mt-3 space-y-2">
                  {brand.queries.map((q) => (
                    <div key={q} className="surface-inset flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-[var(--ink)]"><span className="flex-1">{q}</span><button onClick={() => setBrand({ ...brand, queries: brand.queries.filter((x) => x !== q) })} className="text-[var(--muted)] hover:text-rose-600">&times;</button></div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="paper-panel rounded-[2rem] p-6">
              <p className="muted-label text-xs mb-4">Summary</p>
              <div className="space-y-3">
                <div className="metric-card"><p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Brand</p><p className="mt-1 text-xl text-[var(--ink)]">{brand.name || "—"}</p>{brand.website && <p className="mt-1 text-xs text-[var(--muted)] truncate">{brand.website}</p>}</div>
                <div className="metric-card"><p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Competitors</p><p className="mt-1 text-2xl text-[var(--ink)]">{brand.competitors.length}</p></div>
                <div className="metric-card"><p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Questions</p><p className="mt-1 text-2xl text-[var(--ink)]">{brand.queries.length}</p></div>
                <div className="metric-card"><p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Base API calls</p><p className="mt-1 text-2xl text-[var(--ink)]">{brand.queries.length * 6}</p><p className="mt-1 text-xs text-[var(--muted)]">{brand.queries.length} &times; 3 models &times; 2 samples, before query expansion</p></div>
              </div>
              <button onClick={runVisibility} disabled={!canRun || collecting} className={`mt-6 w-full rounded-2xl px-4 py-3.5 text-sm font-semibold ${canRun && !collecting ? "btn-primary" : "cursor-not-allowed bg-[rgba(26,23,20,0.12)] text-[var(--muted)]"}`}>
                {collecting ? "Calling APIs..." : "Check my visibility"}
              </button>
              {!canRun && <p className="mt-3 text-center text-xs text-[var(--muted)]">{!brand.name.trim() ? "Enter your brand name" : brand.competitors.length === 0 ? "Add at least one competitor" : "Add at least one question"}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Collecting */}
      {tab === "visibility" && collecting && (
        <div className="paper-panel rounded-[2rem] p-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--ink)] text-[var(--paper)] text-lg font-bold mb-4 animate-pulse">B</div>
          <p className="text-lg font-semibold text-[var(--ink)]">Checking AI visibility for {brand.name}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">Asking your questions to ChatGPT, Claude, and Gemini with query fan-out and extraction checks</p>
          {brand.website && <p className="mt-1 text-xs text-[var(--muted)]">{brand.website}</p>}
        </div>
      )}

      {/* Visibility results */}
      {tab === "visibility" && !isSetup && collectResult && !collecting && target && (() => {
        const totalCalls = collectResult.total_observations / collectResult.brands.length;
        const targetMentioned = Math.round(target.mention_rate / 100 * totalCalls);
        const rateLevel = target.mention_rate >= 80 ? "strong" : target.mention_rate >= 50 ? "moderate" : target.mention_rate >= 20 ? "low" : "very low";
        const rateColor = target.mention_rate >= 80 ? "text-emerald-700" : target.mention_rate >= 50 ? "text-amber-700" : "text-rose-700";

        return (
        <div className="space-y-6">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-800">
            Real data from {collectResult.total_calls || collectResult.total_observations} API calls to ChatGPT, Claude, and Gemini
            {collectResult.duration_seconds > 0 && ` in ${collectResult.duration_seconds}s`}
          </div>

          {/* Hero: mention rate with context */}
          <div className="paper-panel rounded-[2rem] p-6">
            <div className="grid gap-6 md:grid-cols-[1fr,auto]">
              <div>
                <p className="muted-label text-xs mb-1">Your AI visibility</p>
                <p className={`text-6xl font-semibold ${rateColor}`}>{pct(target.mention_rate)}</p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                  {brand.name} was mentioned in <strong className="text-[var(--ink)]">{targetMentioned} out of {totalCalls}</strong> AI
                  responses. That&apos;s <strong className={rateColor}>{rateLevel}</strong> visibility.
                  {target.mention_rate < 50 && " Most AI models don't know your brand yet — this is your starting point."}
                  {target.mention_rate >= 80 && " AI models consistently recommend you."}
                  {target.avg_position && target.avg_position <= 2 && " When mentioned, you're in the top 2."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 self-start">
                <div className="metric-card text-center min-w-[100px]">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Position</p>
                  <p className="mt-1 text-3xl text-[var(--ink)]">{target.avg_position ? `#${target.avg_position.toFixed(1)}` : "—"}</p>
                  <p className="text-[10px] text-[var(--muted)]">when mentioned</p>
                </div>
                <div className="metric-card text-center min-w-[100px]">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Sentiment</p>
                  <p className={`mt-1 text-3xl ${target.net_sentiment > 0 ? "text-emerald-700" : target.net_sentiment < 0 ? "text-rose-700" : "text-[var(--muted)]"}`}>
                    {target.net_sentiment > 0 ? "+" : ""}{target.net_sentiment.toFixed(0)}
                  </p>
                  <p className="text-[10px] text-[var(--muted)]">net score</p>
                </div>
              </div>
            </div>
          </div>

          {/* Competitive table */}
          <div className="paper-panel rounded-[2rem] p-6">
            <p className="muted-label text-xs mb-1">Competitive landscape</p>
            <h2 className="text-2xl text-[var(--ink)] mb-2">Who gets recommended when buyers ask?</h2>
            <p className="text-sm text-[var(--muted)] mb-6">
              We asked your buyer questions to 3 AI models, 2 times each. Here&apos;s who they recommended.
            </p>

            <div className="paper-card rounded-[1.4rem] overflow-hidden">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[rgba(255,255,255,0.42)]">
                    <th className="border-b border-[color:var(--line)] px-4 py-3 text-left font-semibold text-[var(--ink)]">Brand</th>
                    <th className="border-b border-[color:var(--line)] px-4 py-3 text-right font-semibold text-[var(--ink)]">Mentioned</th>
                    <th className="border-b border-[color:var(--line)] px-4 py-3 text-left font-semibold text-[var(--ink)]">Visibility</th>
                    <th className="border-b border-[color:var(--line)] px-4 py-3 text-right font-semibold text-[var(--ink)]">Position</th>
                    <th className="border-b border-[color:var(--line)] px-4 py-3 text-right font-semibold text-[var(--ink)]">Sentiment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--line)]">
                  {collectResult.brands.map((b) => {
                    const bMentioned = Math.round(b.mention_rate / 100 * totalCalls);
                    const barW = maxRate > 0 ? (b.mention_rate / maxRate) * 100 : 0;
                    return (
                      <tr key={b.brand} className={`hover:bg-[rgba(255,255,255,0.28)] ${b.is_target ? "bg-[rgba(255,255,255,0.3)]" : ""}`}>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${b.is_target ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>{b.brand}</span>
                          {b.is_target && <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">you</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-[var(--ink)] font-semibold">{pct(b.mention_rate)}</span>
                          <span className="text-[var(--muted)] text-xs ml-1">({bMentioned}/{totalCalls})</span>
                        </td>
                        <td className="px-4 py-3 w-40">
                          <div className="h-4 rounded-full bg-[rgba(255,255,255,0.5)] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.max(3, barW)}%`,
                                backgroundColor: b.is_target ? "var(--ink)" : "rgba(114,105,92,0.3)",
                              }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-[var(--muted)]">
                          {b.avg_position ? `#${b.avg_position.toFixed(1)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            b.net_sentiment >= 50 ? "bg-emerald-50 text-emerald-700"
                            : b.net_sentiment > 0 ? "bg-emerald-50 text-emerald-600"
                            : b.net_sentiment === 0 ? "bg-gray-50 text-[var(--muted)]"
                            : "bg-rose-50 text-rose-700"
                          }`}>
                            {b.net_sentiment > 0 ? "+" : ""}{b.net_sentiment.toFixed(0)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top-1 rate insight */}
          {target.top1_rate > 0 && (
            <div className="paper-panel rounded-[2rem] p-6">
              <p className="muted-label text-xs mb-1">First-choice rate</p>
              <h2 className="text-2xl text-[var(--ink)] mb-4">
                {brand.name} is the #1 recommendation {pct(target.top1_rate)} of the time
              </h2>
              <p className="text-sm text-[var(--muted)]">
                When AI models mention {brand.name}, it&apos;s the first brand listed {pct(target.top1_rate)} of the time
                and in the top 3 in {pct(target.top3_rate)} of responses.
                Research shows position #1 gets cited 3.5x more than lower positions.
              </p>
            </div>
          )}

          {/* Content analysis from website */}
          {websiteAnalysis && websiteAnalysis.features.length > 0 && (
            <ContentAnalysisPanel data={websiteAnalysis} label="Your website content" />
          )}

          {/* Low visibility warning */}
          {target.mention_rate < 50 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
              <p className="font-semibold mb-1">Low AI visibility detected</p>
              <p className="leading-relaxed">
                {brand.name} appears in less than half of AI responses. This could mean the AI models
                don&apos;t have enough information about your brand yet, or competitors dominate these queries.
                Go to the <strong>Simulate</strong> tab to test whether new content could improve this.
              </p>
            </div>
          )}
        </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* COMPETE TAB                                                    */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {tab === "compete" && (
        <div className="space-y-6">
          {/* Setup — URL inputs for competitors */}
          <div className="paper-panel rounded-[2rem] p-6">
            <p className="muted-label text-xs mb-1">Competitor analysis</p>
            <h2 className="text-2xl text-[var(--ink)] mb-2">
              Gap analysis vs your competitors
            </h2>
            <p className="text-sm text-[var(--muted)] mb-6">
              We&apos;ll crawl your site and each competitor&apos;s site, then show
              you exactly where you&apos;re behind — grounded in real numbers, not
              generic advice.
            </p>

            {!brand.name.trim() && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800 mb-6">
                Set up your brand in the Visibility tab first.
              </div>
            )}

            {brand.name && (
              <>
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">
                    Your website
                  </p>
                  <div className="paper-card rounded-[1.2rem] p-4 flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ink)] text-xs font-bold text-[var(--paper)]">
                      {brand.name[0]?.toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--ink)]">{brand.name}</p>
                      <p className="text-xs text-[var(--muted)] truncate">{brand.website || "No URL set"}</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">
                  Competitor URLs (optional — we can still compare mention rates without crawling)
                </p>
                <div className="space-y-2">
                  {brand.competitors.map((c) => (
                    <div key={c} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 text-sm text-[var(--ink)] font-semibold truncate">{c}</span>
                      <input
                        type="url"
                        value={competitorUrls[c] || ""}
                        onChange={(e) => setCompetitorUrls({ ...competitorUrls, [c]: e.target.value })}
                        placeholder={`https://${c.toLowerCase().replace(/\s+/g, "")}.com`}
                        className="field-input flex-1"
                      />
                    </div>
                  ))}
                </div>

                {compError && (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-800">
                    {compError}
                  </div>
                )}

                <button
                  onClick={runCompetitorAnalysis}
                  disabled={competing || !brand.website}
                  className={`mt-6 rounded-2xl px-6 py-3.5 text-sm font-semibold ${
                    competing || !brand.website
                      ? "cursor-not-allowed bg-[rgba(26,23,20,0.12)] text-[var(--muted)]"
                      : "btn-primary"
                  }`}
                >
                  {competing ? "Crawling competitors..." : "Run gap analysis"}
                </button>
              </>
            )}
          </div>

          {/* Loading state */}
          {competing && (
            <div className="paper-panel rounded-[2rem] p-10 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--ink)] text-[var(--paper)] text-lg font-bold mb-4 animate-pulse">B</div>
              <p className="text-lg font-semibold text-[var(--ink)]">Crawling {brand.competitors.length + 1} websites...</p>
              <p className="mt-2 text-sm text-[var(--muted)]">Extracting GEO features from each competitor&apos;s content</p>
            </div>
          )}

          {/* Results */}
          {compAnalysis && !competing && (() => {
            const successfulCompetitors = compAnalysis.competitors.filter((c) => c.analysis);
            const failedCompetitors = compAnalysis.competitors.filter((c) => !c.analysis);

            return (
              <>
                {/* Summary */}
                <div className="paper-panel rounded-[2rem] p-6">
                  <p className="muted-label text-xs mb-1">Crawl summary</p>
                  <div className="grid gap-4 sm:grid-cols-3 mt-4">
                    <div className="metric-card">
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Target</p>
                      <p className="mt-1 text-lg text-[var(--ink)]">{compAnalysis.target.brand}</p>
                      <p className="text-xs text-[var(--muted)] truncate">{compAnalysis.target.url}</p>
                    </div>
                    <div className="metric-card">
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Crawled</p>
                      <p className="mt-1 text-3xl text-[var(--ink)]">{successfulCompetitors.length}<span className="text-lg text-[var(--muted)]">/{compAnalysis.competitors.length}</span></p>
                      <p className="text-xs text-[var(--muted)]">competitors</p>
                    </div>
                    <div className="metric-card">
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Gaps found</p>
                      <p className="mt-1 text-3xl text-rose-700">{compAnalysis.gaps.filter((g) => g.gap_direction === "behind").length}</p>
                      <p className="text-xs text-[var(--muted)]">features where you lag</p>
                    </div>
                  </div>

                  {failedCompetitors.length > 0 && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                      Could not crawl: {failedCompetitors.map((c) => `${c.brand} (${c.error})`).join(", ")}
                    </div>
                  )}
                </div>

                {/* Top recommendations with specifics */}
                {compAnalysis.recommendations.length > 0 && (
                  <div className="paper-panel rounded-[2rem] p-6">
                    <p className="muted-label text-xs mb-1">Specific actions</p>
                    <h2 className="text-2xl text-[var(--ink)] mb-2">
                      What to do, grounded in real competitor data
                    </h2>
                    <p className="text-sm text-[var(--muted)] mb-6">
                      Top {compAnalysis.recommendations.length} actions ranked by gap size and research-backed impact.
                    </p>

                    <div className="space-y-4">
                      {compAnalysis.recommendations.map((rec, i) => {
                        const priorityColor =
                          rec.priority === "high" ? "border-rose-300 bg-rose-50/50"
                          : rec.priority === "medium" ? "border-amber-300 bg-amber-50/50"
                          : "border-[color:var(--line)]";
                        const priorityBadge =
                          rec.priority === "high" ? "bg-rose-100 text-rose-800"
                          : rec.priority === "medium" ? "bg-amber-100 text-amber-800"
                          : "bg-gray-100 text-gray-700";

                        return (
                          <div key={rec.feature} className={`rounded-[1.4rem] border-2 ${priorityColor} p-5`}>
                            <div className="flex items-start gap-3 mb-3">
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ink)] text-sm font-bold text-[var(--paper)] shrink-0">
                                {i + 1}
                              </span>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-lg font-semibold text-[var(--ink)]">{rec.action}</h3>
                                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${priorityBadge}`}>
                                    {rec.priority}
                                  </span>
                                  <span className="rounded-full border border-[color:var(--line)] bg-[rgba(255,255,255,0.7)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
                                    {rec.effort} effort
                                  </span>
                                </div>
                                <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]">{rec.detail}</p>
                                <p className="mt-2 text-xs italic text-[var(--muted)]">{rec.evidence}</p>

                                {/* Gap visualization */}
                                <div className="mt-3 flex items-center gap-3">
                                  <div className="flex-1 flex items-center gap-2 text-xs">
                                    <span className="text-[var(--muted)] w-16 shrink-0">You:</span>
                                    <div className="flex-1 h-2 bg-[rgba(114,105,92,0.15)] rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-[var(--muted)] rounded-full"
                                        style={{ width: `${Math.max(2, (rec.target_value / Math.max(rec.leader_value, 1)) * 100)}%` }}
                                      />
                                    </div>
                                    <span className="font-mono text-[var(--ink)] w-12 text-right">{rec.target_value}</span>
                                  </div>
                                </div>
                                <div className="mt-1 flex items-center gap-3">
                                  <div className="flex-1 flex items-center gap-2 text-xs">
                                    <span className="text-[var(--muted)] w-16 shrink-0 truncate">{rec.leader_brand}:</span>
                                    <div className="flex-1 h-2 bg-[rgba(114,105,92,0.15)] rounded-full overflow-hidden">
                                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: "100%" }} />
                                    </div>
                                    <span className="font-mono text-[var(--ink)] w-12 text-right">{rec.leader_value}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Side-by-side feature comparison */}
                {compAnalysis.gaps.length > 0 && (
                  <div className="paper-panel rounded-[2rem] p-6">
                    <p className="muted-label text-xs mb-1">Full comparison</p>
                    <h2 className="text-2xl text-[var(--ink)] mb-6">All features side-by-side</h2>
                    <div className="paper-card rounded-[1.4rem] overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-[rgba(255,255,255,0.42)]">
                            <th className="border-b border-[color:var(--line)] px-4 py-3 text-left font-semibold text-[var(--ink)]">Feature</th>
                            <th className="border-b border-[color:var(--line)] px-4 py-3 text-right font-semibold text-[var(--ink)]">You</th>
                            <th className="border-b border-[color:var(--line)] px-4 py-3 text-right font-semibold text-[var(--ink)]">Competitors avg</th>
                            <th className="border-b border-[color:var(--line)] px-4 py-3 text-left font-semibold text-[var(--ink)]">Leader</th>
                            <th className="border-b border-[color:var(--line)] px-4 py-3 text-right font-semibold text-[var(--ink)]">Leader value</th>
                            <th className="border-b border-[color:var(--line)] px-4 py-3 text-right font-semibold text-[var(--ink)]">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[color:var(--line)]">
                          {compAnalysis.gaps.map((g) => {
                            const statusColor =
                              g.gap_direction === "behind" ? "text-rose-700"
                              : g.gap_direction === "ahead" ? "text-emerald-700"
                              : "text-[var(--muted)]";
                            const statusLabel =
                              g.gap_direction === "behind" ? `behind by ${Math.abs(g.gap).toFixed(1)}`
                              : g.gap_direction === "ahead" ? `ahead by ${Math.abs(g.gap).toFixed(1)}`
                              : g.gap_direction === "even" ? "even"
                              : "—";
                            return (
                              <tr key={g.feature} className="hover:bg-[rgba(255,255,255,0.28)]">
                                <td className="px-4 py-3 text-[var(--ink)]">{g.label}</td>
                                <td className="px-4 py-3 text-right font-mono text-[var(--ink)]">{g.target_value}</td>
                                <td className="px-4 py-3 text-right text-[var(--muted)]">{g.competitor_avg.toFixed(1)}</td>
                                <td className="px-4 py-3 text-[var(--ink)] text-xs">{g.leader_brand}</td>
                                <td className="px-4 py-3 text-right font-mono text-[var(--ink)]">{g.leader_value}</td>
                                <td className={`px-4 py-3 text-right font-semibold ${statusColor}`}>{statusLabel}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Per-model guidance */}
                <div className="paper-panel rounded-[2rem] p-6">
                  <p className="muted-label text-xs mb-1">Per-model strategy</p>
                  <h2 className="text-2xl text-[var(--ink)] mb-2">Different AI models need different tactics</h2>
                  <p className="text-sm text-[var(--muted)] mb-6">
                    Yext&apos;s 17.2M citation study: no single optimization works across all models.
                    What wins on Gemini does not win on Claude.
                  </p>
                  <div className="grid gap-4 md:grid-cols-3">
                    {Object.entries(compAnalysis.model_guidance).map(([key, g]) => {
                      const color =
                        key === "chatgpt" ? "#10a37f"
                        : key === "claude" ? "#d97706"
                        : "#4285f4";
                      return (
                        <div key={key} className="paper-card rounded-[1.4rem] p-5">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                            <p className="text-sm font-semibold text-[var(--ink)]">{g.label}</p>
                          </div>
                          <p className="text-xs text-[var(--muted)] mb-2"><strong className="text-[var(--ink)]">Mix:</strong> {g.knowledge_mix}</p>
                          <p className="text-xs text-[var(--muted)] mb-3"><strong className="text-[var(--ink)]">Prefers:</strong> {g.prefers}</p>
                          <ul className="space-y-1.5">
                            {g.actions.map((a, i) => (
                              <li key={i} className="text-xs text-[var(--muted)] flex items-start gap-2">
                                <span className="mt-1.5 inline-block h-1 w-1 flex-none rounded-full bg-[var(--ink)]" />
                                <span>{a}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            );
          })()}

          {/* Per-query breakdown (available if visibility was run) */}
          {queryBreakdown && queryBreakdown.queries.length > 0 && (
            <div className="paper-panel rounded-[2rem] p-6">
              <p className="muted-label text-xs mb-1">Per-query breakdown</p>
              <h2 className="text-2xl text-[var(--ink)] mb-2">Which queries are you winning?</h2>
              <p className="text-sm text-[var(--muted)] mb-6">
                Based on the last {queryBreakdown.days_covered} days of polling ({queryBreakdown.total_observations} observations).
              </p>
              <div className="space-y-3">
                {queryBreakdown.queries.slice(0, 10).map((q) => {
                  const targetStat = q.brands.find((b) => b.brand.toLowerCase() === brand.name.toLowerCase());
                  const targetPos = targetStat ? q.brands.findIndex((b) => b.brand.toLowerCase() === brand.name.toLowerCase()) + 1 : null;
                  const isWinning = q.winner?.toLowerCase() === brand.name.toLowerCase();

                  return (
                    <div key={q.query} className="paper-card rounded-[1.4rem] p-4">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <p className="text-sm font-medium text-[var(--ink)]">{q.query}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          {isWinning ? (
                            <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                              You win
                            </span>
                          ) : q.winner ? (
                            <span className="rounded-full bg-rose-100 text-rose-800 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                              {q.winner} wins
                            </span>
                          ) : null}
                          {targetPos && <span className="text-xs text-[var(--muted)]">Rank #{targetPos}</span>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {q.brands.slice(0, 5).map((b, i) => {
                          const isTarget = b.brand.toLowerCase() === brand.name.toLowerCase();
                          return (
                            <span
                              key={b.brand}
                              className={`rounded-full px-2.5 py-1 text-xs font-mono ${
                                isTarget
                                  ? "bg-[var(--ink)] text-[var(--paper)]"
                                  : "surface-chip text-[var(--muted)]"
                              }`}
                            >
                              #{i + 1} {b.brand} <span className="opacity-60">{b.mention_rate.toFixed(0)}%</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cited sources */}
          {citedSources && citedSources.sources.length > 0 && (
            <div className="paper-panel rounded-[2rem] p-6">
              <p className="muted-label text-xs mb-1">Sources AI models cite</p>
              <h2 className="text-2xl text-[var(--ink)] mb-2">
                When {citedSources.brand} is mentioned, which sources appear?
              </h2>
              <p className="text-sm text-[var(--muted)] mb-6">
                Domains appearing in {citedSources.total_responses_mentioning} responses where {citedSources.brand} was cited.
                These are your earned-media targets.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {citedSources.sources.slice(0, 20).map((src) => (
                  <div key={src.domain} className="paper-card rounded-[1.2rem] px-4 py-2.5 flex items-center justify-between">
                    <span className="text-sm text-[var(--ink)] truncate">{src.domain}</span>
                    <span className="text-xs text-[var(--muted)] shrink-0 ml-2">
                      {src.count}× ({src.rate.toFixed(0)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadingBreakdown && !queryBreakdown && (
            <div className="paper-panel rounded-[2rem] p-6 text-center text-sm text-[var(--muted)]">
              Loading query breakdown and cited sources...
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SIMULATE TAB                                                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {tab === "simulate" && (
        <div className="space-y-6">
          <div className="paper-panel rounded-[2rem] p-6">
            <p className="muted-label text-xs mb-1">Counterfactual forecast</p>
            <h2 className="text-2xl text-[var(--ink)] mb-2">Will this content help or hurt?</h2>
            <p className="text-sm text-[var(--muted)] mb-6">
              Paste your draft blog post, product page update, or any content you&apos;re planning
              to publish. Bitsy scores the draft on GEO levers like statistics, quotations,
              citations, readability, freshness, and structure, then forecasts how those changes
              move your next visibility state.
            </p>

            {!brand.name.trim() && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800 mb-6">
                Set up your brand in the Visibility tab first.
              </div>
            )}

            <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Your draft content</label>
            <textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              placeholder={"Paste your blog post, product page copy, or any content you're planning to publish...\n\nBitsy will extract the draft's content signals and run the surrogate forecast against your latest measured brand state."}
              rows={10}
              className="field-input mt-2 resize-y"
            />
            <p className="mt-2 text-xs text-[var(--muted)]">
              {draftContent.length.toLocaleString()} characters
              {draftContent.length > 0 && draftContent.length < 500 && " — short content may have limited impact"}
              {draftContent.length >= 5000 && draftContent.length <= 10000 && " — optimal range (5-10K chars)"}
              {draftContent.length > 10000 && " — long-form content is fine; the analyzer scores the full draft"}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={analyzeDraft} disabled={!draftContent.trim() || analyzingContent} className={`rounded-2xl px-6 py-3.5 text-sm font-semibold ${draftContent.trim() && !analyzingContent ? "btn-secondary" : "cursor-not-allowed bg-[rgba(26,23,20,0.12)] text-[var(--muted)]"}`}>
                {analyzingContent ? "Analyzing..." : "Analyze content"}
              </button>
              <button onClick={runSimulation} disabled={!canRun || !draftContent.trim() || simulating} className={`rounded-2xl px-6 py-3.5 text-sm font-semibold ${canRun && draftContent.trim() && !simulating ? "btn-primary" : "cursor-not-allowed bg-[rgba(26,23,20,0.12)] text-[var(--muted)]"}`}>
                {simulating ? "Forecasting..." : "Run forecast"}
              </button>
            </div>
          </div>

          {/* Content analysis of draft */}
          {draftAnalysis && draftAnalysis.features.length > 0 && !simulationResult && (
            <ContentAnalysisPanel data={draftAnalysis} label="Draft content analysis" />
          )}

          {simulating && (
            <div className="paper-panel rounded-[2rem] p-10 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--ink)] text-[var(--paper)] text-lg font-bold mb-4 animate-pulse">B</div>
              <p className="text-lg font-semibold text-[var(--ink)]">Forecasting impact for {brand.name}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">Refreshing baseline state if needed, analyzing the draft, then running the surrogate.</p>
            </div>
          )}

          {simulationResult && !simulating && target && (() => {
            const perModel = Object.entries(simulationResult.per_model ?? {});
            return (
              <div className="space-y-6">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-800">
                  Forecast complete. This scenario starts from your latest measured visibility and applies the draft&apos;s content signals as feature changes.
                </div>

                <div className="paper-panel rounded-[2rem] p-8 text-center">
                  <p className="muted-label text-xs mb-2">Impact on {brand.name}</p>
                  <p className={`text-6xl font-semibold ${simulationResult.lift >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{signed(simulationResult.lift)} pp</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">predicted mention rate change</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {pct(simulationResult.base_prediction)} to <strong className="text-[var(--ink)]">{pct(simulationResult.scenario_prediction)}</strong>
                    {" "}with {simulationResult.confidence} confidence.
                  </p>
                </div>

                {/* Side by side */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="paper-panel rounded-[2rem] p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(114,105,92,0.15)] text-xs font-bold text-[var(--muted)]">A</span>
                      <span className="text-sm font-semibold text-[var(--muted)]">Current measured state</span>
                    </div>
                    <p className="text-4xl text-[var(--ink)]">{pct(simulationResult.base_prediction)}</p>
                    <p className="text-sm text-[var(--muted)] mt-1">position #{target.avg_position?.toFixed(1) ?? "—"} &middot; sentiment {signed(target.net_sentiment)}</p>
                  </div>
                  <div className="paper-panel rounded-[2rem] p-6 border-2 border-[var(--ink)]">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ink)] text-xs font-bold text-[var(--paper)]">B</span>
                      <span className="text-sm font-semibold text-[var(--ink)]">With this draft published</span>
                    </div>
                    <p className="text-4xl text-[var(--ink)]">{pct(simulationResult.scenario_prediction)}</p>
                    <p className="text-sm text-[var(--muted)] mt-1">95% interval {pct(simulationResult.ci_lower)} to {pct(simulationResult.ci_upper)}</p>
                  </div>
                </div>

                {perModel.length > 0 && (
                <div className="paper-panel rounded-[2rem] p-6">
                  <p className="muted-label text-xs mb-1">Per-model forecast</p>
                  <h2 className="text-2xl text-[var(--ink)] mb-6">How each LLM is expected to move</h2>
                  <div className="paper-card rounded-[1.4rem] overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead><tr className="bg-[rgba(255,255,255,0.42)]">
                        <th className="border-b border-[color:var(--line)] px-4 py-3 text-left font-semibold text-[var(--ink)]">Model</th>
                        <th className="border-b border-[color:var(--line)] px-4 py-3 text-right font-semibold text-[var(--ink)]">Current</th>
                        <th className="border-b border-[color:var(--line)] px-4 py-3 text-right font-semibold text-[var(--ink)]">Forecast</th>
                        <th className="border-b border-[color:var(--line)] px-4 py-3 text-right font-semibold text-[var(--ink)]">Change</th>
                      </tr></thead>
                      <tbody className="divide-y divide-[color:var(--line)]">
                        {perModel.map(([model, result]) => (
                          <tr key={model} className="hover:bg-[rgba(255,255,255,0.28)]">
                            <td className="px-4 py-3 text-[var(--ink)] capitalize">{model}</td>
                            <td className="px-4 py-3 text-right text-[var(--muted)]">{pct(result.base)}</td>
                            <td className="px-4 py-3 text-right text-[var(--muted)]">{pct(result.predicted)}</td>
                            <td className={`px-4 py-3 text-right font-semibold ${result.lift > 0.1 ? "text-emerald-700" : result.lift < -0.1 ? "text-rose-700" : "text-[var(--muted)]"}`}>
                              {Math.abs(result.lift) > 0.1 ? `${signed(result.lift)} pp` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                )}

                {draftAnalysis && draftAnalysis.features.length > 0 && (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {websiteAnalysis && websiteAnalysis.features.length > 0 && (
                      <ContentAnalysisPanel data={websiteAnalysis} label="Current website content" />
                    )}
                    <ContentAnalysisPanel data={draftAnalysis} label="Draft content analysis" />
                  </div>
                )}

                {simulationResult.contributions.length > 0 && (
                  <div className="paper-panel rounded-[2rem] p-6">
                    <p className="muted-label text-xs mb-1">Why the model moved</p>
                    <h2 className="text-2xl text-[var(--ink)] mb-6">Feature-level contributions</h2>
                    <div className="space-y-3">
                      {simulationResult.contributions.map((item) => (
                        <div key={item.feature} className="paper-card rounded-[1.4rem] p-4 flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-[var(--ink)]">{item.feature}</p>
                            <p className="text-xs text-[var(--muted)]">{item.pct.toFixed(0)}% of modeled lift</p>
                          </div>
                          <p className={`text-sm font-semibold ${item.contribution >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                            {signed(item.contribution)} pp
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MEASURE TAB                                                    */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {tab === "measure" && (
        <div className="space-y-6">
          {/* Temporal expectations */}
          <div className="paper-panel rounded-[2rem] p-6">
            <p className="muted-label text-xs mb-1">Expected timelines</p>
            <h2 className="text-2xl text-[var(--ink)] mb-4">When will content changes show up?</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="paper-card rounded-[1.4rem] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-3 w-3 rounded-full bg-[#6366f1]" />
                  <p className="text-sm font-semibold text-[var(--ink)]">Perplexity (RAG)</p>
                </div>
                <p className="text-2xl text-[var(--ink)] font-semibold">2-7 days</p>
                <p className="text-xs text-[var(--muted)] mt-1">Real-time web search. New content typically indexed within 48h.</p>
              </div>
              <div className="paper-card rounded-[1.4rem] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-3 w-3 rounded-full bg-[#10a37f]" />
                  <p className="text-sm font-semibold text-[var(--ink)]">ChatGPT with browsing</p>
                </div>
                <p className="text-2xl text-[var(--ink)] font-semibold">4-14 days</p>
                <p className="text-xs text-[var(--muted)] mt-1">Triggers web search ~21% of the time. Slower index refresh.</p>
              </div>
              <div className="paper-card rounded-[1.4rem] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-3 w-3 rounded-full bg-[var(--muted)]" />
                  <p className="text-sm font-semibold text-[var(--ink)]">ChatGPT parametric</p>
                </div>
                <p className="text-2xl text-[var(--ink)] font-semibold">6-18 months</p>
                <p className="text-xs text-[var(--muted)] mt-1">Baked into training data. Only updates on next model release.</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-[var(--muted)]">
              <strong className="text-[var(--ink)]">Implication:</strong> RAG-based effects appear within a week.
              To move the parametric needle, you need earned media and third-party mentions that will be in the next training corpus — your own site content is less impactful there.
            </p>
          </div>

          {/* Timeline chart */}
          {trends && trends.timeline.length > 0 && (() => {
            const maxRate = Math.max(...trends.timeline.map((p) => p.mention_rate), 1);
            return (
              <div className="paper-panel rounded-[2rem] p-6">
                <p className="muted-label text-xs mb-1">Mention rate timeline</p>
                <h2 className="text-2xl text-[var(--ink)] mb-4">{trends.brand} over time</h2>
                <div className="flex items-end gap-1 h-32 border-b border-[color:var(--line)] pb-1">
                  {trends.timeline.map((p) => {
                    const h = (p.mention_rate / maxRate) * 100;
                    return (
                      <div key={p.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div
                          className="w-full rounded-t transition-all"
                          style={{ height: `${Math.max(2, h)}%`, backgroundColor: "var(--ink)" }}
                          title={`${p.date}: ${p.mention_rate.toFixed(1)}%`}
                        />
                        <span className="absolute -bottom-6 text-[9px] text-[var(--muted)] opacity-0 group-hover:opacity-100 whitespace-nowrap">
                          {p.date.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-[var(--muted)]">
                  <span>{trends.timeline[0]?.date}</span>
                  <span>{trends.days_of_data} days</span>
                  <span>{trends.timeline[trends.timeline.length - 1]?.date}</span>
                </div>
              </div>
            );
          })()}

          <div className="paper-panel rounded-[2rem] p-6">
            <p className="muted-label text-xs mb-1">Before/after comparison</p>
            <h2 className="text-2xl text-[var(--ink)] mb-2">Compare runs side-by-side</h2>
            <p className="text-sm text-[var(--muted)] mb-6">
              Each visibility check is saved here. Select two runs to compare &mdash; before
              and after a content update, a PR campaign, or a competitor&apos;s move.
            </p>

            {runs.length === 0 ? (
              <div className="text-center py-10"><p className="text-sm text-[var(--muted)]">No runs yet. Go to the Visibility tab and run your first check.</p></div>
            ) : (
              <>
                <div className="space-y-2 mb-6">
                  {runs.map((run, i) => {
                    const tgt = run.data.brands.find((b) => b.is_target);
                    const isA = compareA === i;
                    const isB = compareB === i;
                    return (
                      <div key={i} className={`paper-card rounded-[1.4rem] p-4 flex items-center justify-between gap-4 ${isA || isB ? "border-2 border-[var(--ink)]" : ""}`}>
                        <div>
                          <p className="text-sm font-semibold text-[var(--ink)]">{run.label}</p>
                          <p className="text-xs text-[var(--muted)]">{run.date} &middot; {run.data.total_observations} obs &middot; {tgt ? pct(tgt.mention_rate) : "—"}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setCompareA(isA ? null : i)} className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${isA ? "bg-[var(--ink)] text-[var(--paper)]" : "surface-chip text-[var(--muted)] hover:text-[var(--ink)]"}`}>A</button>
                          <button onClick={() => setCompareB(isB ? null : i)} className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${isB ? "bg-[var(--ink)] text-[var(--paper)]" : "surface-chip text-[var(--muted)] hover:text-[var(--ink)]"}`}>B</button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {runA && runB && (
                  <div className="paper-card rounded-[1.4rem] overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead><tr className="bg-[rgba(255,255,255,0.42)]">
                        <th className="border-b border-[color:var(--line)] px-4 py-3 text-left font-semibold text-[var(--ink)]">Brand</th>
                        <th className="border-b border-[color:var(--line)] px-4 py-3 text-right font-semibold text-[var(--ink)]">Run A</th>
                        <th className="border-b border-[color:var(--line)] px-4 py-3 text-right font-semibold text-[var(--ink)]">Run B</th>
                        <th className="border-b border-[color:var(--line)] px-4 py-3 text-right font-semibold text-[var(--ink)]">Change</th>
                      </tr></thead>
                      <tbody className="divide-y divide-[color:var(--line)]">
                        {runB.brands.map((bB) => {
                          const bA = runA.brands.find((x) => x.brand === bB.brand);
                          const d = bA ? bB.mention_rate - bA.mention_rate : 0;
                          return (
                            <tr key={bB.brand} className={`hover:bg-[rgba(255,255,255,0.28)] ${bB.is_target ? "font-semibold" : ""}`}>
                              <td className="px-4 py-3 text-[var(--ink)]">{bB.brand}</td>
                              <td className="px-4 py-3 text-right text-[var(--muted)]">{pct(bA?.mention_rate ?? 0)}</td>
                              <td className="px-4 py-3 text-right text-[var(--muted)]">{pct(bB.mention_rate)}</td>
                              <td className={`px-4 py-3 text-right font-semibold ${d > 0.1 ? "text-emerald-700" : d < -0.1 ? "text-rose-700" : "text-[var(--muted)]"}`}>{Math.abs(d) > 0.1 ? `${signed(d)} pp` : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-16 border-t border-[color:var(--line)] pt-8 flex justify-center gap-6">
        <Link href="/concept" className="ink-link text-sm">How it works</Link>
        <Link href="/research" className="ink-link text-sm">Research</Link>
        <Link href="/simulator/spec" className="ink-link text-sm">Technical spec</Link>
      </div>
    </div>
    </>
  );
}
