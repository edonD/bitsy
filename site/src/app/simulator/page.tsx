"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getStatus,
  runCollection,
  type BrandResult,
  type CollectResponse,
  type StatusResponse,
} from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

interface BrandConfig {
  name: string;
  website: string;
  competitors: string[];
  queries: string[];
}

type Tab = "visibility" | "simulate" | "measure";

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
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<StatusResponse | null>(null);

  // Simulate tab
  const [draftContent, setDraftContent] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [simBaseline, setSimBaseline] = useState<CollectResponse | null>(null);
  const [simWithContent, setSimWithContent] = useState<CollectResponse | null>(null);

  // Measure tab
  const [runs, setRuns] = useState<{ label: string; date: string; data: CollectResponse }[]>([]);
  const [compareA, setCompareA] = useState<number | null>(null);
  const [compareB, setCompareB] = useState<number | null>(null);

  useEffect(() => { getStatus().then(setBackendStatus).catch(() => null); }, []);

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

  async function runVisibility() {
    if (!canRun) return;
    setCollecting(true);
    setError(null);
    try {
      const result = await runCollection({ target: brand.name, competitors: brand.competitors, queries: brand.queries, samples_per_query: 2 });
      setCollectResult(result);
      setIsSetup(false);
      setRuns((prev) => [{ label: `Run ${prev.length + 1}`, date: new Date().toLocaleString(), data: result }, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Collection failed");
    } finally { setCollecting(false); }
  }

  async function runSimulation() {
    if (!canRun || !draftContent.trim()) return;
    setSimulating(true);
    setError(null);
    try {
      const baseline = await runCollection({ target: brand.name, competitors: brand.competitors, queries: brand.queries, samples_per_query: 2 });
      setSimBaseline(baseline);
      const contentQueries = brand.queries.map((q) => `Context: ${draftContent.slice(0, 2000)}\n\nQuestion: ${q}`);
      const withContent = await runCollection({ target: brand.name, competitors: brand.competitors, queries: contentQueries, samples_per_query: 2 });
      setSimWithContent(withContent);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Simulation failed");
    } finally { setSimulating(false); }
  }

  function resetAll() { setIsSetup(true); setCollectResult(null); setError(null); setSimBaseline(null); setSimWithContent(null); setDraftContent(""); }

  const target = collectResult?.brands.find((b) => b.is_target);
  const maxRate = collectResult ? Math.max(...collectResult.brands.map((b) => b.mention_rate), 1) : 100;
  const runA = compareA !== null ? runs[compareA]?.data : null;
  const runB = compareB !== null ? runs[compareB]?.data : null;

  // ════════════════════════════════════════════════════════════════════════

  return (
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
          <span className="ml-2 text-xs text-rose-500">Backend running? <code className="font-mono">uvicorn api.app:app --port 8000</code></span>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-8 border-b border-[color:var(--line)]">
        {([
          { id: "visibility" as Tab, label: "Visibility", desc: "Where you stand now" },
          { id: "simulate" as Tab, label: "Simulate", desc: "Test before publishing" },
          { id: "measure" as Tab, label: "Measure", desc: "Compare runs" },
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
                <div className="metric-card"><p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">API calls</p><p className="mt-1 text-2xl text-[var(--ink)]">{brand.queries.length * 6}</p><p className="mt-1 text-xs text-[var(--muted)]">{brand.queries.length} &times; 3 models &times; 2 samples</p></div>
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
          <p className="mt-2 text-sm text-[var(--muted)]">Asking {brand.queries.length} questions to ChatGPT, Claude, and Gemini</p>
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
      {/* SIMULATE TAB                                                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {tab === "simulate" && (
        <div className="space-y-6">
          <div className="paper-panel rounded-[2rem] p-6">
            <p className="muted-label text-xs mb-1">Pre-publish test</p>
            <h2 className="text-2xl text-[var(--ink)] mb-2">Will this content help or hurt?</h2>
            <p className="text-sm text-[var(--muted)] mb-6">
              Paste your draft blog post, product page update, or any content you&apos;re planning
              to publish. We&apos;ll run your buyer questions twice &mdash; once without the content
              (baseline) and once with it injected as retrieval context &mdash; and show you the difference.
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
              placeholder={"Paste your blog post, product page copy, or any content you're planning to publish...\n\nThe system will inject this as retrieval context when asking AI models your buyer questions, simulating what happens when the content is indexed."}
              rows={10}
              className="field-input mt-2 resize-y"
            />
            <p className="mt-2 text-xs text-[var(--muted)]">
              {draftContent.length.toLocaleString()} characters
              {draftContent.length > 0 && draftContent.length < 500 && " — short content may have limited impact"}
              {draftContent.length >= 5000 && draftContent.length <= 10000 && " — optimal range (5-10K chars)"}
              {draftContent.length > 10000 && " — first 2,000 characters used for context injection"}
            </p>

            <button onClick={runSimulation} disabled={!canRun || !draftContent.trim() || simulating} className={`mt-6 rounded-2xl px-6 py-3.5 text-sm font-semibold ${canRun && draftContent.trim() && !simulating ? "btn-primary" : "cursor-not-allowed bg-[rgba(26,23,20,0.12)] text-[var(--muted)]"}`}>
              {simulating ? "Running A/B test..." : "Test this content"}
            </button>
          </div>

          {simulating && (
            <div className="paper-panel rounded-[2rem] p-10 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--ink)] text-[var(--paper)] text-lg font-bold mb-4 animate-pulse">B</div>
              <p className="text-lg font-semibold text-[var(--ink)]">Running A/B test for {brand.name}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">Run A: baseline &rarr; Run B: with your draft as retrieval context</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{brand.queries.length * 6 * 2} total API calls</p>
            </div>
          )}

          {simBaseline && simWithContent && !simulating && (() => {
            const baseTarget = simBaseline.brands.find((b) => b.is_target);
            const withTarget = simWithContent.brands.find((b) => b.is_target);
            const rateDelta = baseTarget && withTarget ? withTarget.mention_rate - baseTarget.mention_rate : 0;
            const sentDelta = baseTarget && withTarget ? withTarget.net_sentiment - baseTarget.net_sentiment : 0;
            return (
              <div className="space-y-6">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-800">
                  A/B test complete. Baseline vs content-injected across {brand.queries.length} questions &times; 3 models.
                </div>

                {/* Big delta */}
                <div className="paper-panel rounded-[2rem] p-8 text-center">
                  <p className="muted-label text-xs mb-2">Impact on {brand.name}</p>
                  <p className={`text-6xl font-semibold ${rateDelta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{signed(rateDelta)} pp</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">mention rate change</p>
                  {Math.abs(sentDelta) > 0.1 && <p className={`mt-1 text-sm ${sentDelta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>Sentiment: {signed(sentDelta)} pp</p>}
                </div>

                {/* Side by side */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="paper-panel rounded-[2rem] p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(114,105,92,0.15)] text-xs font-bold text-[var(--muted)]">A</span>
                      <span className="text-sm font-semibold text-[var(--muted)]">Without your content</span>
                    </div>
                    {baseTarget && <><p className="text-4xl text-[var(--ink)]">{pct(baseTarget.mention_rate)}</p><p className="text-sm text-[var(--muted)] mt-1">position #{baseTarget.avg_position?.toFixed(1) ?? "—"} &middot; sentiment {signed(baseTarget.net_sentiment)}</p></>}
                  </div>
                  <div className="paper-panel rounded-[2rem] p-6 border-2 border-[var(--ink)]">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ink)] text-xs font-bold text-[var(--paper)]">B</span>
                      <span className="text-sm font-semibold text-[var(--ink)]">With your content</span>
                    </div>
                    {withTarget && <><p className="text-4xl text-[var(--ink)]">{pct(withTarget.mention_rate)}</p><p className="text-sm text-[var(--muted)] mt-1">position #{withTarget.avg_position?.toFixed(1) ?? "—"} &middot; sentiment {signed(withTarget.net_sentiment)}</p></>}
                  </div>
                </div>

                {/* Full table */}
                <div className="paper-panel rounded-[2rem] p-6">
                  <p className="muted-label text-xs mb-1">All brands</p>
                  <h2 className="text-2xl text-[var(--ink)] mb-6">How your content changes the landscape</h2>
                  <div className="paper-card rounded-[1.4rem] overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead><tr className="bg-[rgba(255,255,255,0.42)]">
                        <th className="border-b border-[color:var(--line)] px-4 py-3 text-left font-semibold text-[var(--ink)]">Brand</th>
                        <th className="border-b border-[color:var(--line)] px-4 py-3 text-right font-semibold text-[var(--ink)]">Without</th>
                        <th className="border-b border-[color:var(--line)] px-4 py-3 text-right font-semibold text-[var(--ink)]">With content</th>
                        <th className="border-b border-[color:var(--line)] px-4 py-3 text-right font-semibold text-[var(--ink)]">Change</th>
                      </tr></thead>
                      <tbody className="divide-y divide-[color:var(--line)]">
                        {simWithContent.brands.map((bW) => {
                          const bA = simBaseline.brands.find((x) => x.brand === bW.brand);
                          const d = bA ? bW.mention_rate - bA.mention_rate : 0;
                          return (
                            <tr key={bW.brand} className={`hover:bg-[rgba(255,255,255,0.28)] ${bW.is_target ? "font-semibold" : ""}`}>
                              <td className="px-4 py-3 text-[var(--ink)]">{bW.brand}{bW.is_target ? " *" : ""}</td>
                              <td className="px-4 py-3 text-right text-[var(--muted)]">{pct(bA?.mention_rate ?? 0)}</td>
                              <td className="px-4 py-3 text-right text-[var(--muted)]">{pct(bW.mention_rate)}</td>
                              <td className={`px-4 py-3 text-right font-semibold ${d > 0.1 ? "text-emerald-700" : d < -0.1 ? "text-rose-700" : "text-[var(--muted)]"}`}>{Math.abs(d) > 0.1 ? `${signed(d)} pp` : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
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
          <div className="paper-panel rounded-[2rem] p-6">
            <p className="muted-label text-xs mb-1">A/B comparison</p>
            <h2 className="text-2xl text-[var(--ink)] mb-2">Compare runs over time</h2>
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
  );
}
