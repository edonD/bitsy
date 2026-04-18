"use client";

// ════════════════════════════════════════════════════════════════════════════
// DEV TRACE — fully transparent view of the simulation engine.
// Blocked in production by middleware (/admin/* -> /#pricing).
//
// Shows, in order, with live progress:
//   1. Queries being sent to each LLM (one card per call, loading → response)
//   2. Brand aggregation with the math
//   3. Content crawl of target URL (if given)
//   4. Feature matrix fed to the surrogate model
//   5. Model metrics + feature importance
//   6. The final output rendered on the simulator's Visibility tab
//   7. What-If simulator + recommendations for any brand
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  runCollection,
  getFeatures,
  getImportance,
  runWhatIf,
  getRecommendations,
  type BrandResult,
  type CollectResponse,
  type Recommendation,
} from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ApiLog {
  _id: string;
  _creationTime: number;
  date: string;
  query: string;
  model: string;
  sample: number;
  mode?: string;  // "memory" | "search"
  prompt_sent?: string;
  raw_response?: string;
  parsed_brands?: {
    brands_mentioned?: { brand: string; position: number; sentiment: string }[];
  };
  sources?: string[];
  status: string;
  error?: string;
}

type CallMode = "memory" | "search";

interface CallCard {
  key: string;
  query: string;
  model: string;
  sample: number;
  mode: CallMode;
  state: "pending" | "running" | "done" | "error";
  log?: ApiLog;
}

const MODEL_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
};

const MODEL_ACCENT: Record<string, string> = {
  chatgpt: "#10a37f",
  claude: "#d97706",
  gemini: "#4285f4",
};

const FEATURE_LABELS: Record<string, string> = {
  avg_position: "Avg position",
  top1_rate: "Top-1 rate",
  top3_rate: "Top-3 rate",
  position_std: "Position std",
  positive_rate: "Positive sentiment",
  negative_rate: "Negative sentiment",
  net_sentiment: "Net sentiment",
  competitor_avg_rate: "Competitor avg",
  vs_best_competitor: "Vs best competitor",
  brands_ahead: "Brands ahead",
  share_of_mentions: "Share of mentions",
  model_agreement: "Model agreement",
  model_spread: "Model spread",
  query_coverage: "Query coverage",
  statistics_density: "Statistics /1K words",
  quotation_count: "Quotations",
  citation_count: "Citations",
  content_length: "Content length",
  readability_grade: "Readability grade",
  freshness_days: "Freshness (days)",
  heading_count: "Heading count",
};

const CONTENT_FEATURES = [
  "statistics_density",
  "quotation_count",
  "citation_count",
  "content_length",
  "readability_grade",
  "freshness_days",
  "heading_count",
];

export default function TracePage() {
  // Inputs
  const [target, setTarget] = useState("HubSpot");
  const [competitors, setCompetitors] = useState("Salesforce, Pipedrive, Zoho CRM");
  const [queries, setQueries] = useState("Best CRM for small business\nTop CRM for sales teams");
  const [websiteUrl, setWebsiteUrl] = useState("https://www.hubspot.com");
  const [samples, setSamples] = useState(2);
  const [enableMemory, setEnableMemory] = useState(true);
  const [enableSearch, setEnableSearch] = useState(true);

  // Run state
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [cards, setCards] = useState<CallCard[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Results
  const [collectResponse, setCollectResponse] = useState<CollectResponse | null>(null);
  const [features, setFeatures] = useState<Record<string, number | string>[]>([]);
  const [importance, setImportance] = useState<Record<string, number>>({});
  const [r2, setR2] = useState<number | null>(null);
  const [focusBrand, setFocusBrand] = useState<string | null>(null);

  // Polling
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const queryList = queries.split("\n").map((s) => s.trim()).filter(Boolean);
  const competitorList = competitors.split(",").map((s) => s.trim()).filter(Boolean);
  const activeModes: CallMode[] = [
    ...(enableMemory ? (["memory"] as CallMode[]) : []),
    ...(enableSearch ? (["search"] as CallMode[]) : []),
  ];
  const totalCalls = queryList.length * 3 * samples * Math.max(activeModes.length, 1);

  async function runTrace() {
    if (running) return;
    if (queryList.length === 0) {
      setRunError("Add at least one query.");
      return;
    }

    setRunning(true);
    setRunError(null);
    setCollectResponse(null);
    setFeatures([]);
    setImportance({});
    setR2(null);
    setFocusBrand(null);

    // Build the expected cards up-front so the UI shows spinners immediately.
    // The backend runs calls through a thread pool (max 10 in parallel), so
    // many of these really are in flight at once.
    const modesToRun: CallMode[] =
      activeModes.length > 0 ? activeModes : (["memory"] as CallMode[]);
    const initialCards: CallCard[] = [];
    for (const query of queryList) {
      for (const model of ["chatgpt", "claude", "gemini"]) {
        for (let s = 0; s < samples; s++) {
          for (const mode of modesToRun) {
            initialCards.push({
              key: `${query}|${model}|${s}|${mode}`,
              query,
              model,
              sample: s,
              mode,
              state: "running",
            });
          }
        }
      }
    }
    setCards(initialCards);

    const started = Date.now();
    setStartedAt(started);
    setElapsedMs(0);
    tickRef.current = setInterval(() => setElapsedMs(Date.now() - started), 250);

    // Poll /logs aggressively while the run is in flight. The backend
    // parallelizes LLM calls in a thread pool and writes each log to Convex
    // the moment its call finishes, so fast polling surfaces results live.
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/simulations/logs?limit=200`);
        const data = await res.json();
        const logs: ApiLog[] = data.logs ?? [];
        setCards((prev) => updateCardsFromLogs(prev, logs, started));
      } catch {
        // ignore — poll will retry
      }
    }, 600);

    const body = {
      target,
      competitors: competitorList,
      queries: queryList,
      website_url: websiteUrl || undefined,
      models: ["chatgpt", "claude", "gemini"],
      samples_per_query: samples,
      fan_out: false, // trace page shows exactly the queries you typed
      enable_memory: enableMemory,
      enable_search: enableSearch,
      multi_generator_fanout: false,
      intent_fanout: false,
      cross_validate_extraction: false,
    };

    try {
      const resp = await runCollection(body);
      setCollectResponse(resp);

      // One final poll to catch any straggler logs
      try {
        const res = await fetch(`${API}/api/simulations/logs?limit=200`);
        const data = await res.json();
        const logs: ApiLog[] = data.logs ?? [];
        setCards((prev) => updateCardsFromLogs(prev, logs, started));
      } catch {}

      // Fetch features + importance
      try {
        const fx = await getFeatures();
        setFeatures(fx.features as Record<string, number | string>[]);
      } catch {}
      try {
        const imp = await getImportance();
        setImportance(imp.importance);
        setR2(imp.r2);
      } catch {}
    } catch (e) {
      setRunError(e instanceof Error ? e.message : String(e));
    } finally {
      if (pollRef.current) clearInterval(pollRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
      pollRef.current = null;
      tickRef.current = null;
      setRunning(false);
    }
  }

  const doneCount = cards.filter((c) => c.state === "done" || c.state === "error").length;
  const errorCount = cards.filter((c) => c.state === "error").length;
  const progress = cards.length > 0 ? Math.round((doneCount / cards.length) * 100) : 0;

  // Group cards by query for display
  const cardsByQuery = new Map<string, CallCard[]>();
  for (const c of cards) {
    const list = cardsByQuery.get(c.query) ?? [];
    list.push(c);
    cardsByQuery.set(c.query, list);
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] relative overflow-hidden">
      {/* Cool animations only used while work is in flight */}
      <style jsx global>{`
        @keyframes orbSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orbPulse {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes shimmerSweep {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes dotPulse {
          0%, 100% { transform: scale(1); opacity: 0.95; }
          50%      { transform: scale(1.15); opacity: 1; }
        }
        @keyframes ringPulse {
          0%   { box-shadow: 0 0 0 0 rgba(16,163,127,0.6); }
          80%  { box-shadow: 0 0 0 10px rgba(16,163,127,0); }
          100% { box-shadow: 0 0 0 0 rgba(16,163,127,0); }
        }
        .trace-ring-pulse {
          animation: ringPulse 1.6s ease-out infinite;
        }
        @keyframes thinkDots {
          0%, 20%  { content: ""; }
          40%      { content: "."; }
          60%      { content: ".."; }
          80%, 100% { content: "..."; }
        }
        @keyframes checkPop {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.25); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes ambientBlobA {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%      { transform: translate(40px, -20px) scale(1.1); }
          66%      { transform: translate(-30px, 25px) scale(0.95); }
        }
        @keyframes ambientBlobB {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(-50px, 30px) scale(1.15); }
        }
        .trace-shimmer {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(16, 163, 127, 0.08) 40%,
            rgba(16, 163, 127, 0.16) 50%,
            rgba(16, 163, 127, 0.08) 60%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: shimmerSweep 1.8s ease-in-out infinite;
        }
        .trace-thinking::after {
          content: "";
          display: inline-block;
          animation: thinkDots 1.4s steps(4) infinite;
          min-width: 1.2em;
          text-align: left;
        }
        .trace-dot-pulse {
          animation: dotPulse 1.4s ease-in-out infinite;
        }
        .trace-check {
          animation: checkPop 0.4s cubic-bezier(0.22, 1.2, 0.36, 1) both;
        }
        .trace-ambient-a {
          animation: ambientBlobA 14s ease-in-out infinite;
        }
        .trace-ambient-b {
          animation: ambientBlobB 18s ease-in-out infinite;
        }
      `}</style>

      {/* Ambient background blobs that drift while analysis runs.
          They fade out when idle so the page stays calm at rest. */}
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${
          running ? "opacity-60" : "opacity-0"
        }`}
        aria-hidden="true"
      >
        <div
          className="trace-ambient-a absolute -top-32 -right-32 h-[420px] w-[420px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle at 30% 30%, rgba(16,163,127,0.35), transparent 60%)" }}
        />
        <div
          className="trace-ambient-b absolute top-1/3 -left-40 h-[380px] w-[380px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle at 60% 40%, rgba(66,133,244,0.28), transparent 60%)" }}
        />
        <div
          className="trace-ambient-a absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle at 50% 50%, rgba(217,119,6,0.22), transparent 60%)" }}
        />
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10 relative z-10">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/simulator" className="ink-link text-sm">
              ← back to engine
            </Link>
            <h1 className="mt-2 text-4xl text-[var(--ink)] md:text-5xl">
              Engine trace
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
              Every step the engine takes, visible. See the queries sent to each LLM, the raw
              responses, how brands get aggregated, and exactly what the simulator shows the user.
            </p>
          </div>
          <div className="text-right text-xs text-[var(--muted)]">
            <div className="font-mono">{API}</div>
            <div>Dev-only. Blocked in production.</div>
          </div>
        </div>

        {/* Inputs */}
        <section className="paper-panel rounded-[1.6rem] p-6 mb-6">
          <div className="mb-4 flex items-center gap-2">
            <StepDot n={1} />
            <h2 className="text-lg text-[var(--ink)]">Inputs</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <InputField label="Target brand" value={target} onChange={setTarget} />
            <InputField label="Target website (optional)" value={websiteUrl} onChange={setWebsiteUrl} placeholder="https://..." />
            <div className="md:col-span-2">
              <InputField label="Competitors (comma-separated)" value={competitors} onChange={setCompetitors} />
            </div>
            <div className="md:col-span-2">
              <label className="block">
                <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                  Queries (one per line)
                </span>
                <textarea
                  value={queries}
                  onChange={(e) => setQueries(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-[color:var(--line)] bg-white/60 px-4 py-3 text-sm text-[var(--ink)] focus:border-[var(--ink)] focus:outline-none"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Samples per query
              </span>
              <input
                type="number"
                min={1}
                max={5}
                value={samples}
                onChange={(e) => setSamples(parseInt(e.target.value, 10) || 2)}
                className="mt-1 w-28 rounded-xl border border-[color:var(--line)] bg-white/60 px-4 py-3 text-sm text-[var(--ink)]"
              />
            </label>
            <div className="md:col-span-2">
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Modes
              </span>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <ModeToggle
                  active={enableMemory}
                  onToggle={() => setEnableMemory((v) => !v)}
                  label="Memory"
                  hint="Model answers from training data only — what's baked into weights."
                />
                <ModeToggle
                  active={enableSearch}
                  onToggle={() => setEnableSearch((v) => !v)}
                  label="Search"
                  hint="Model browses the web (OpenAI web_search, Claude web_search, Gemini grounding). Slower, but reflects what real users see."
                />
              </div>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs text-[var(--muted)]">
              {queryList.length} queries × 3 models × {samples} samples ×{" "}
              {Math.max(activeModes.length, 1)} mode
              {Math.max(activeModes.length, 1) > 1 ? "s" : ""} ={" "}
              <span className="text-[var(--ink)] font-semibold">{totalCalls} API calls</span>
            </p>
            <button
              onClick={runTrace}
              disabled={running}
              className="btn-primary rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {running ? "running…" : "Run trace"}
            </button>
          </div>
          {runError && (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {runError}
            </p>
          )}
        </section>

        {/* Status hero — big animated orb while running, subtle summary when done */}
        {cards.length > 0 && (
          <div className="mb-6 paper-panel rounded-[1.6rem] p-6 flex items-center gap-6">
            <StatusOrb
              progress={progress}
              running={running}
              inFlight={cards.some((c) => c.state === "running")}
            />
            <div className="flex-1">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-3xl text-[var(--ink)] font-semibold tabular-nums">
                  {doneCount}
                  <span className="text-[var(--muted)] font-normal">/{cards.length}</span>
                </span>
                <span className="text-sm text-[var(--muted)]">
                  {running ? "LLM calls in flight" : "calls complete"}
                </span>
                {errorCount > 0 && (
                  <span className="text-sm text-rose-700 font-semibold">
                    {errorCount} failed
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-[var(--muted)] font-mono">
                {Math.round(elapsedMs / 1000)}s elapsed
              </p>
              {/* Thinner, glowing progress rail */}
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(0,0,0,0.05)]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                    background: running
                      ? "linear-gradient(90deg, #10a37f, #4285f4, #d97706)"
                      : "var(--ink)",
                    backgroundSize: "200% 100%",
                    animation: running ? "shimmerSweep 2.2s linear infinite" : undefined,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 2 · Queries + responses */}
        {cards.length > 0 && (
          <section className="paper-panel rounded-[1.6rem] p-6 mb-6">
            <div className="mb-4 flex items-center gap-2">
              <StepDot n={2} />
              <h2 className="text-lg text-[var(--ink)]">Queries sent to LLMs</h2>
            </div>
            <p className="mb-5 text-sm text-[var(--muted)]">
              Each question is sent to ChatGPT, Claude, and Gemini — {samples}× each.
              Click any call to see the exact prompt, the raw response, and the brands extracted.
            </p>
            <div className="space-y-5">
              {Array.from(cardsByQuery.entries()).map(([query, queryCards]) => (
                <QueryBlock key={query} query={query} cards={queryCards} />
              ))}
            </div>
          </section>
        )}

        {/* 3 · Aggregate */}
        {collectResponse && (
          <section className="paper-panel rounded-[1.6rem] p-6 mb-6">
            <div className="mb-4 flex items-center gap-2">
              <StepDot n={3} />
              <h2 className="text-lg text-[var(--ink)]">Brand aggregation</h2>
            </div>
            <p className="mb-4 text-sm text-[var(--muted)]">
              Every LLM response above gets scanned for tracked brands. For each brand we count
              how many samples mentioned it and average the position and sentiment.
            </p>
            <AggregateTable brands={collectResponse.brands} cards={cards} />
          </section>
        )}

        {/* 4 · Content */}
        {websiteUrl && features.length > 0 && (
          <section className="paper-panel rounded-[1.6rem] p-6 mb-6">
            <div className="mb-4 flex items-center gap-2">
              <StepDot n={4} />
              <h2 className="text-lg text-[var(--ink)]">Content features — {target}</h2>
            </div>
            <p className="mb-4 text-sm text-[var(--muted)]">
              Crawled <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="ink-link">{websiteUrl}</a> and
              extracted these 7 features. They only attach to the target&apos;s feature vector
              (competitors stay at 0 because we don&apos;t crawl their sites in a standard run).
            </p>
            <ContentFeatures features={features} target={target} />
          </section>
        )}

        {/* 5 · Feature matrix */}
        {features.length > 0 && (
          <section className="paper-panel rounded-[1.6rem] p-6 mb-6">
            <div className="mb-4 flex items-center gap-2">
              <StepDot n={5} />
              <h2 className="text-lg text-[var(--ink)]">Feature matrix</h2>
            </div>
            <p className="mb-4 text-sm text-[var(--muted)]">
              Each brand becomes a {Object.keys(features[0]).length - 1}-dimensional vector.
              These rows are fed to the XGBoost surrogate as training samples.
            </p>
            <FeatureMatrix features={features} />
          </section>
        )}

        {/* 6 · Model */}
        {r2 !== null && (
          <section className="paper-panel rounded-[1.6rem] p-6 mb-6">
            <div className="mb-4 flex items-center gap-2">
              <StepDot n={6} />
              <h2 className="text-lg text-[var(--ink)]">Surrogate model</h2>
            </div>
            <div className="flex flex-wrap items-center gap-6 mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">R²</p>
                <p className="mt-1 text-3xl text-[var(--ink)]">{r2.toFixed(3)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Features ranked</p>
                <p className="mt-1 text-3xl text-[var(--ink)]">{Object.keys(importance).length}</p>
              </div>
            </div>
            <p className="mb-4 text-sm text-[var(--muted)]">
              Feature importance — how much each feature explains mention-rate variance.
            </p>
            <ImportanceBars importance={importance} />
            {r2 < 0 && (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                Negative R² means the model predicts worse than the mean. Run more queries across more
                brands to get a real signal — the surrogate needs breadth to learn.
              </p>
            )}
          </section>
        )}

        {/* 7 · Output */}
        {collectResponse && (
          <section className="paper-panel rounded-[1.6rem] p-6 mb-6">
            <div className="mb-4 flex items-center gap-2">
              <StepDot n={7} />
              <h2 className="text-lg text-[var(--ink)]">What the user sees</h2>
            </div>
            <p className="mb-4 text-sm text-[var(--muted)]">
              The exact rows rendered in the simulator&apos;s Visibility tab. Click a brand to
              open the what-if simulator.
            </p>
            <OutputTable
              brands={collectResponse.brands}
              onPick={(b) => setFocusBrand(b)}
              picked={focusBrand}
            />
          </section>
        )}

        {/* 8 · What-If */}
        {focusBrand && features.length > 0 && (
          <section className="paper-panel rounded-[1.6rem] p-6 mb-10">
            <div className="mb-4 flex items-center gap-2">
              <StepDot n={8} />
              <h2 className="text-lg text-[var(--ink)]">What-if · {focusBrand}</h2>
            </div>
            <WhatIfPanel
              brand={focusBrand}
              brandFeatures={features.find((f) => f.brand === focusBrand) ?? null}
            />
          </section>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function updateCardsFromLogs(cards: CallCard[], logs: ApiLog[], startedAt: number): CallCard[] {
  const fresh = logs.filter((l) => l._creationTime >= startedAt - 500);
  const byKey = new Map<string, ApiLog>();
  for (const l of fresh) {
    const mode = l.mode || "memory";
    const key = `${l.query}|${l.model}|${l.sample}|${mode}`;
    // Keep the newest log per key
    const existing = byKey.get(key);
    if (!existing || l._creationTime > existing._creationTime) {
      byKey.set(key, l);
    }
  }
  return cards.map((c) => {
    const log = byKey.get(c.key);
    if (!log) return c;
    const state: CallCard["state"] = log.status === "error" ? "error" : "done";
    return { ...c, state, log };
  });
}

// ─── Reusable UI ────────────────────────────────────────────────────────────

function StepDot({ n }: { n: number }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-xs font-semibold text-[var(--paper)]">
      {n}
    </span>
  );
}

// Animated orb shown while a trace is running. When idle, it becomes a
// still check mark. Three rotating conic-gradient rings give the spinning
// glow; a pulsing inner dot carries the "live" feel.
function StatusOrb({
  progress,
  running,
  inFlight,
}: {
  progress: number;
  running: boolean;
  inFlight: boolean;
}) {
  const size = 88;
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      aria-label={running ? "analysis in progress" : "analysis complete"}
    >
      {/* Outer rotating ring — brand triad colors in a conic gradient */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, #10a37f, #4285f4, #d97706, #10a37f)",
          animation: running ? "orbSpin 3.2s linear infinite" : undefined,
          opacity: running ? 1 : 0.25,
          transition: "opacity 0.6s ease",
        }}
      />
      {/* Inner mask so the ring looks hollow */}
      <div
        className="absolute rounded-full bg-[var(--paper)]"
        style={{ inset: 4 }}
      />
      {/* Gentle pulsing halo */}
      {running && (
        <div
          className="absolute rounded-full"
          style={{
            inset: -6,
            background:
              "radial-gradient(circle, rgba(16,163,127,0.28), transparent 70%)",
            animation: "orbPulse 2.4s ease-in-out infinite",
          }}
          aria-hidden="true"
        />
      )}
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {running ? (
          <div className="flex flex-col items-center">
            <div
              className="h-2.5 w-2.5 rounded-full trace-dot-pulse"
              style={{
                color: inFlight ? "#10a37f" : "#4285f4",
                backgroundColor: "currentColor",
              }}
            />
            <span className="mt-1 text-[10px] font-bold tabular-nums text-[var(--ink)]">
              {progress}%
            </span>
          </div>
        ) : progress === 100 ? (
          <svg
            className="trace-check"
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "#10a37f" }}
          >
            <path d="M6 14l5 5 11-11" />
          </svg>
        ) : (
          <span className="text-[10px] font-bold text-[var(--muted)] tabular-nums">
            {progress}%
          </span>
        )}
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-[color:var(--line)] bg-white/60 px-4 py-3 text-sm text-[var(--ink)] focus:border-[var(--ink)] focus:outline-none"
      />
    </label>
  );
}

function ModeToggle({
  active,
  onToggle,
  label,
  hint,
}: {
  active: boolean;
  onToggle: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`text-left rounded-xl border px-4 py-3 transition-all ${
        active
          ? "border-[var(--ink)] bg-white/80"
          : "border-[color:var(--line)] bg-white/40 opacity-60"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--ink)]">{label}</span>
        <span
          className={`h-4 w-4 rounded-full border ${
            active
              ? "bg-[var(--ink)] border-[var(--ink)]"
              : "bg-transparent border-[color:var(--line)]"
          }`}
        />
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">{hint}</p>
    </button>
  );
}

// ─── Query block with cards ─────────────────────────────────────────────────

function QueryBlock({ query, cards }: { query: string; cards: CallCard[] }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <span className="text-sm text-[var(--ink)] font-semibold">{query}</span>
        <span className="text-xs text-[var(--muted)]">
          {cards.filter((c) => c.state === "done" || c.state === "error").length}/{cards.length} done
        </span>
      </div>
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <CallCardView key={c.key} card={c} />
        ))}
      </div>
    </div>
  );
}

function CallCardView({ card }: { card: CallCard }) {
  const [open, setOpen] = useState(false);
  const mentioned = card.log?.parsed_brands?.brands_mentioned ?? [];
  const sources = card.log?.sources ?? [];
  const accent = MODEL_ACCENT[card.model] || "#555";
  const isSearch = card.mode === "search";
  const isRunning = card.state === "running";
  const isDone = card.state === "done";

  const statusNode =
    card.state === "pending" ? (
      <span className="text-xs text-[var(--muted)]">waiting…</span>
    ) : isRunning ? (
      <RunningBadge isSearch={isSearch} />
    ) : card.state === "error" ? (
      <span className="text-xs font-semibold text-rose-700">failed</span>
    ) : (
      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
        <svg
          className="trace-check"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2.5 6.2l2.4 2.4 5-5" />
        </svg>
        {mentioned.length} brands
      </span>
    );

  const borderColor = isDone
    ? "border-emerald-100"
    : card.state === "error"
    ? "border-rose-200"
    : isRunning
    ? "border-[color:var(--line)]"
    : "border-[color:var(--line)]";

  return (
    <div
      className={`relative rounded-xl border ${borderColor} bg-white/70 transition-all overflow-hidden`}
    >
      {/* Shimmering overlay while the call is in flight */}
      {isRunning && (
        <div
          className="trace-shimmer pointer-events-none absolute inset-0 rounded-xl"
          aria-hidden="true"
        />
      )}
      <button
        onClick={() => isDone || card.state === "error" ? setOpen(!open) : undefined}
        className="relative w-full text-left px-4 py-3 flex items-center gap-3"
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
            isRunning ? "trace-ring-pulse" : ""
          }`}
          style={{ backgroundColor: accent, color: "#fff" }}
        >
          {card.model === "chatgpt" ? "G" : card.model === "claude" ? "C" : "Ge"}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--ink)] font-medium flex items-center gap-2">
            <span>{MODEL_LABELS[card.model]}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase ${
                isSearch
                  ? "bg-blue-100 text-blue-800"
                  : "bg-[rgba(0,0,0,0.06)] text-[var(--muted)]"
              }`}
            >
              {isSearch ? "search" : "memory"}
            </span>
            <span className="text-[11px] text-[var(--muted)] font-normal">
              sample {card.sample + 1}
            </span>
          </p>
          {card.state === "pending" && (
            <p className="text-xs text-[var(--muted)] italic">waiting for a worker…</p>
          )}
          {isRunning && (
            <p className="text-xs text-[var(--muted)] italic">
              <span>{isSearch ? "searching the web" : "thinking"}</span>
              <span className="trace-thinking" />
            </p>
          )}
          {card.state === "done" && mentioned.length > 0 && (
            <p className="text-xs text-[var(--muted)] truncate">
              #1 {mentioned[0].brand}
              {mentioned.length > 1 && `, +${mentioned.length - 1} more`}
              {isSearch && sources.length > 0 && (
                <span className="ml-2 text-[10px] text-blue-700">
                  · {sources.length} sources
                </span>
              )}
            </p>
          )}
          {card.state === "done" && mentioned.length === 0 && (
            <p className="text-xs text-[var(--muted)] italic">no tracked brands</p>
          )}
          {card.state === "error" && (
            <p className="text-xs text-rose-600 truncate">{card.log?.error || "error"}</p>
          )}
        </div>
        {statusNode}
      </button>

      {open && card.log && (
        <div className="border-t border-[color:var(--line)] px-4 py-3 space-y-3 bg-white/40">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1">
              Prompt sent
            </p>
            <pre className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3 text-[11px] leading-relaxed text-[var(--ink)] overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
              {card.log.prompt_sent}
            </pre>
          </div>
          {card.log.raw_response && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1">
                Raw LLM response
              </p>
              <pre className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3 text-[11px] leading-relaxed text-[var(--ink)] overflow-x-auto whitespace-pre-wrap max-h-56 overflow-y-auto">
                {card.log.raw_response}
              </pre>
            </div>
          )}
          {mentioned.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1">
                Parsed brands ({mentioned.length})
              </p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {mentioned.map((m) => (
                  <div
                    key={m.brand}
                    className="flex items-center justify-between rounded-lg bg-white/80 border border-[color:var(--line)] px-3 py-1.5 text-xs"
                  >
                    <span className="text-[var(--ink)] font-medium">
                      #{m.position} {m.brand}
                    </span>
                    <span
                      className={
                        m.sentiment === "positive"
                          ? "text-emerald-700 font-semibold"
                          : m.sentiment === "negative"
                          ? "text-rose-700 font-semibold"
                          : "text-[var(--muted)]"
                      }
                    >
                      {m.sentiment}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {sources.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1">
                Cited sources ({sources.length})
              </p>
              <ul className="space-y-1">
                {sources.slice(0, 10).map((url, i) => (
                  <li key={i} className="text-[11px] truncate">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 hover:underline break-all"
                    >
                      {url}
                    </a>
                  </li>
                ))}
                {sources.length > 10 && (
                  <li className="text-[10px] text-[var(--muted)]">
                    +{sources.length - 10} more
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--ink)] border-t-transparent" />
  );
}

// Used in the corner of a running card — three pulsing bars that look like
// a mini audio waveform. Recolored when the mode is search.
function RunningBadge({ isSearch }: { isSearch: boolean }) {
  const color = isSearch ? "#4285f4" : "#10a37f";
  return (
    <span className="flex items-center gap-[2px] shrink-0">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block rounded-full"
          style={{
            width: 3,
            height: 10,
            backgroundColor: color,
            animation: `dotPulse 1s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </span>
  );
}

// ─── Aggregation table ──────────────────────────────────────────────────────

function AggregateTable({ brands, cards }: { brands: BrandResult[]; cards: CallCard[] }) {
  // Count mentions per brand from cards
  const completed = cards.filter((c) => c.state === "done");
  const mentionCounts: Record<string, { seen: number; total: number }> = {};
  for (const b of brands) mentionCounts[b.brand] = { seen: 0, total: completed.length };

  for (const c of completed) {
    const mentioned = c.log?.parsed_brands?.brands_mentioned ?? [];
    const lowered = new Set(mentioned.map((m) => m.brand.toLowerCase()));
    for (const b of brands) {
      if (lowered.has(b.brand.toLowerCase())) {
        mentionCounts[b.brand].seen += 1;
      }
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
            <th className="text-left py-2 pr-3">Brand</th>
            <th className="text-right py-2 px-3">Counted</th>
            <th className="text-right py-2 px-3">Mention rate</th>
            <th className="text-right py-2 px-3">Avg position</th>
            <th className="text-right py-2 px-3">Top-1</th>
            <th className="text-right py-2 pl-3">Sentiment</th>
          </tr>
        </thead>
        <tbody>
          {brands.map((b) => {
            const c = mentionCounts[b.brand];
            return (
              <tr
                key={b.brand}
                className={`border-t border-[color:var(--line)] ${
                  b.is_target ? "bg-emerald-50/40" : ""
                }`}
              >
                <td className="py-2.5 pr-3">
                  <span className="text-[var(--ink)] font-semibold">{b.brand}</span>
                  {b.is_target && (
                    <span className="ml-2 rounded-full bg-[var(--ink)] px-2 py-0.5 text-[10px] font-semibold text-[var(--paper)]">
                      target
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-[var(--muted)]">
                  {c?.seen ?? 0}/{c?.total ?? 0}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-[var(--ink)]">
                  {(b.mention_rate * 100).toFixed(1)}%
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-[var(--muted)]">
                  {b.avg_position?.toFixed(1) ?? "—"}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-[var(--muted)]">
                  {(b.top1_rate * 100).toFixed(0)}%
                </td>
                <td className="py-2.5 pl-3 text-right font-mono">
                  <span
                    className={
                      b.net_sentiment > 0.1
                        ? "text-emerald-700"
                        : b.net_sentiment < -0.1
                        ? "text-rose-700"
                        : "text-[var(--muted)]"
                    }
                  >
                    {b.net_sentiment.toFixed(2)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-[var(--muted)]">
        mention_rate = seen / total samples · avg_position = mean across samples where the brand was mentioned
      </p>
    </div>
  );
}

// ─── Content features ───────────────────────────────────────────────────────

function ContentFeatures({
  features,
  target,
}: {
  features: Record<string, number | string>[];
  target: string;
}) {
  const row = features.find((f) => f.brand === target);
  if (!row) return <p className="text-sm text-[var(--muted)]">No data for target.</p>;
  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
      {CONTENT_FEATURES.map((k) => {
        const v = row[k];
        return (
          <div key={k} className="metric-card">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
              {FEATURE_LABELS[k] || k}
            </p>
            <p className="mt-1 text-2xl text-[var(--ink)] font-mono">
              {typeof v === "number" ? v.toFixed(1) : String(v ?? "—")}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Feature matrix ─────────────────────────────────────────────────────────

function FeatureMatrix({ features }: { features: Record<string, number | string>[] }) {
  if (features.length === 0) return null;
  const cols = Object.keys(features[0]).filter((k) => k !== "brand");
  return (
    <div className="overflow-x-auto rounded-xl border border-[color:var(--line)]">
      <table className="text-xs">
        <thead>
          <tr className="bg-white/60 text-[var(--muted)]">
            <th className="sticky left-0 bg-white/90 px-3 py-2 text-left font-semibold">
              brand
            </th>
            {cols.map((c) => (
              <th
                key={c}
                className="px-3 py-2 text-right font-normal whitespace-nowrap"
                title={FEATURE_LABELS[c] || c}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((row) => (
            <tr key={String(row.brand)} className="border-t border-[color:var(--line)]">
              <td className="sticky left-0 bg-[var(--paper)] px-3 py-2 font-semibold text-[var(--ink)]">
                {String(row.brand)}
              </td>
              {cols.map((c) => {
                const v = row[c];
                return (
                  <td key={c} className="px-3 py-2 text-right font-mono text-[var(--muted)]">
                    {typeof v === "number" ? v.toFixed(2) : String(v ?? "—")}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Importance bars ────────────────────────────────────────────────────────

function ImportanceBars({ importance }: { importance: Record<string, number> }) {
  const entries = Object.entries(importance).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, v]) => v), 0.0001);
  return (
    <div className="space-y-1.5">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-center gap-3">
          <span className="w-48 text-sm text-[var(--ink)] truncate">
            {FEATURE_LABELS[k] || k}
          </span>
          <div className="flex-1 h-2.5 rounded-full bg-[rgba(0,0,0,0.05)] overflow-hidden">
            <div
              className="h-full bg-[var(--ink)]"
              style={{ width: `${(v / max) * 100}%` }}
            />
          </div>
          <span className="w-16 text-right font-mono text-xs text-[var(--muted)]">
            {v.toFixed(3)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Output (what the user sees) ────────────────────────────────────────────

function OutputTable({
  brands,
  onPick,
  picked,
}: {
  brands: BrandResult[];
  onPick: (b: string) => void;
  picked: string | null;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
            <th className="text-left py-2 pr-3">Brand</th>
            <th className="text-right py-2 px-3">Mention rate</th>
            <th className="text-right py-2 px-3">Top-1</th>
            <th className="text-right py-2 px-3">Top-3</th>
            <th className="text-right py-2 px-3">Avg position</th>
            <th className="text-right py-2 px-3">Sentiment</th>
            <th className="py-2 pl-3"></th>
          </tr>
        </thead>
        <tbody>
          {brands.map((b) => (
            <tr
              key={b.brand}
              className={`border-t border-[color:var(--line)] ${
                b.is_target ? "bg-emerald-50/40" : ""
              } ${picked === b.brand ? "ring-1 ring-[var(--ink)] ring-inset" : ""}`}
            >
              <td className="py-2.5 pr-3">
                <span className="text-[var(--ink)] font-semibold">{b.brand}</span>
                {b.is_target && (
                  <span className="ml-2 rounded-full bg-[var(--ink)] px-2 py-0.5 text-[10px] font-semibold text-[var(--paper)]">
                    target
                  </span>
                )}
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-[var(--ink)]">
                {(b.mention_rate * 100).toFixed(1)}%
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-[var(--muted)]">
                {(b.top1_rate * 100).toFixed(0)}%
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-[var(--muted)]">
                {(b.top3_rate * 100).toFixed(0)}%
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-[var(--muted)]">
                {b.avg_position?.toFixed(1) ?? "—"}
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-[var(--muted)]">
                {b.net_sentiment.toFixed(2)}
              </td>
              <td className="py-2.5 pl-3 text-right">
                <button
                  onClick={() => onPick(b.brand)}
                  className="rounded-full border border-[color:var(--line)] px-3 py-1 text-xs text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--ink)] transition-colors"
                >
                  what-if →
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── What-if ────────────────────────────────────────────────────────────────

interface WhatIfResult {
  base_prediction: number;
  scenario_prediction: number;
  lift: number;
  lift_pct: number;
  ci_lower: number;
  ci_upper: number;
  contributions: { feature: string; contribution: number; pct: number }[];
  per_model?: Record<string, { lift: number; lift_pct: number; base: number; predicted: number }>;
}

function WhatIfPanel({
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

  const editable = [
    "statistics_density",
    "quotation_count",
    "citation_count",
    "content_length",
    "readability_grade",
    "freshness_days",
    "heading_count",
    "share_of_mentions",
    "query_coverage",
    "positive_rate",
  ];

  return (
    <div className="space-y-6">
      {brandFeatures && (
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            Edit features
          </p>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {editable
              .filter((f) => f in brandFeatures)
              .map((f) => {
                const current = brandFeatures[f];
                const currentNum = typeof current === "number" ? current : Number(current);
                const override = changes[f];
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
                      step={f.includes("rate") || f === "share_of_mentions" || f === "query_coverage" ? 0.05 : 1}
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
                {(result.base_prediction * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Scenario</p>
              <p className="mt-1 text-2xl text-[var(--ink)] font-mono">
                {(result.scenario_prediction * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Lift</p>
              <p
                className={`mt-1 text-2xl font-mono ${
                  result.lift > 0 ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {result.lift > 0 ? "+" : ""}
                {(result.lift * 100).toFixed(2)}pp
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">95% CI</p>
              <p className="mt-2 text-sm text-[var(--muted)] font-mono">
                [{(result.ci_lower * 100).toFixed(1)}%,{" "}
                {(result.ci_upper * 100).toFixed(1)}%]
              </p>
            </div>
          </div>

          {result.contributions.length > 0 && (
            <div className="mt-6">
              <p className="mb-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Feature contributions
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
                      {c.contribution > 0 ? "+" : ""}
                      {(c.contribution * 100).toFixed(2)}pp
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
            For each recommendation the engine runs what-if internally and returns the predicted lift.
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
                    {r.predicted_lift > 0 ? "+" : ""}
                    {(r.predicted_lift * 100).toFixed(2)}pp
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
