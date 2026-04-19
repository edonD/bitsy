"use client";

// ════════════════════════════════════════════════════════════════════════════
// DEV TRACE — fully transparent view of the simulation engine.
// Blocked in production by middleware (/admin/* -> /#pricing).
//
// This file is the orchestrator. Everything with serious markup lives in
// ./components; pure helpers are in ./types, ./constants, ./format, ./logic.
//
// Pipeline shown on screen, in order:
//   1. Inputs (target, competitors, queries, modes)
//   2. Status hero with progress
//   3. Queries sent to LLMs — one card per call, live polling
//   4. Brand aggregation
//   5. Content features (if a target URL was crawled)
//   6. Feature matrix fed to the surrogate model
//   7. Surrogate model metrics + feature importance
//   8. What the user sees (final output table)
//   9. What-if simulator + recommendations
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  runCollection,
  getFeatures,
  getImportance,
  type CollectResponse,
} from "@/lib/api";

import { API, MODELS } from "./constants";
import type { ApiLog, CallCard, CallMode, TraceFeatureRow } from "./types";
import { updateCardsFromLogs } from "./logic";
import { AmbientBlobs, TraceAnimations } from "./components/Animations";
import { StatusOrb, StepDot } from "./components/Progress";
import { InputField, ModeToggle } from "./components/Inputs";
import { QueryBlock } from "./components/CallCard";
import {
  AggregateTable,
  ContentFeatures,
  FeatureMatrix,
  ImportanceBars,
  OutputTable,
} from "./components/Tables";
import { WhatIfPanel } from "./components/WhatIfPanel";

export default function TracePage() {
  // ── Inputs ──────────────────────────────────────────────────────────────
  // Defaulted to Bitsy's own category (AI search visibility / GEO) so
  // "Run trace" is a one-click sanity check of our own coverage.
  const [target, setTarget] = useState("Bitsy");
  const [competitors, setCompetitors] = useState(
    "Profound, Peec AI, Otterly.AI, AthenaHQ"
  );
  const [queries, setQueries] = useState(
    "Best AI search visibility tool\nHow to rank higher in ChatGPT answers\nBest GEO tools for brands"
  );
  const [websiteUrl, setWebsiteUrl] = useState("https://aisplash.me");
  const [samples, setSamples] = useState(2);
  const [enableMemory, setEnableMemory] = useState(true);
  const [enableSearch, setEnableSearch] = useState(true);

  // ── Run state ──────────────────────────────────────────────────────────
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [cards, setCards] = useState<CallCard[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);

  // ── Results ────────────────────────────────────────────────────────────
  const [collectResponse, setCollectResponse] = useState<CollectResponse | null>(null);
  const [features, setFeatures] = useState<TraceFeatureRow[]>([]);
  const [importance, setImportance] = useState<Record<string, number>>({});
  const [r2, setR2] = useState<number | null>(null);
  const [focusBrand, setFocusBrand] = useState<string | null>(null);

  // ── Polling timers ─────────────────────────────────────────────────────
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────
  const queryList = queries.split("\n").map((s) => s.trim()).filter(Boolean);
  const competitorList = competitors
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const trackedBrandList = [target, ...competitorList];
  const activeModes: CallMode[] = [
    ...(enableMemory ? (["memory"] as CallMode[]) : []),
    ...(enableSearch ? (["search"] as CallMode[]) : []),
  ];
  const totalCalls =
    queryList.length * MODELS.length * samples * Math.max(activeModes.length, 1);

  const doneCount = cards.filter(
    (c) => c.state === "done" || c.state === "error"
  ).length;
  const errorCount = cards.filter((c) => c.state === "error").length;
  const progress =
    cards.length > 0 ? Math.round((doneCount / cards.length) * 100) : 0;

  const cardsByQuery = new Map<string, CallCard[]>();
  for (const c of cards) {
    const list = cardsByQuery.get(c.query) ?? [];
    list.push(c);
    cardsByQuery.set(c.query, list);
  }

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
    const modesToRun: CallMode[] =
      activeModes.length > 0 ? activeModes : (["memory"] as CallMode[]);
    const initialCards: CallCard[] = [];
    for (const query of queryList) {
      for (const model of MODELS) {
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
      models: [...MODELS],
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

      try {
        const fx = await getFeatures();
        setFeatures(fx.features as TraceFeatureRow[]);
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

  return (
    <div className="min-h-screen bg-[var(--paper)] relative overflow-hidden">
      <TraceAnimations />
      <AmbientBlobs running={running} />

      <div className="mx-auto max-w-5xl px-6 py-10 relative z-10">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/simulator" className="ink-link text-sm">
              ← back to engine
            </Link>
            <h1 className="mt-2 text-4xl text-[var(--ink)] md:text-5xl">Engine trace</h1>
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

        {/* 1 · Inputs */}
        <section className="paper-panel rounded-[1.6rem] p-6 mb-6">
          <div className="mb-4 flex items-center gap-2">
            <StepDot n={1} />
            <h2 className="text-lg text-[var(--ink)]">Inputs</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <InputField label="Target brand" value={target} onChange={setTarget} />
            <InputField
              label="Target website (optional)"
              value={websiteUrl}
              onChange={setWebsiteUrl}
              placeholder="https://..."
            />
            <div className="md:col-span-2">
              <InputField
                label="Competitors (comma-separated)"
                value={competitors}
                onChange={setCompetitors}
              />
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
              {queryList.length} queries × {MODELS.length} models × {samples} samples ×{" "}
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

        {/* Status hero — big animated orb while running */}
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
              Each question is sent to ChatGPT, Claude, and Gemini — {samples}× each. Click
              any call to see the exact prompt, the raw response, and the brands extracted.
            </p>
            <div className="space-y-5">
              {Array.from(cardsByQuery.entries()).map(([query, queryCards]) => (
                <QueryBlock
                  key={query}
                  query={query}
                  cards={queryCards}
                  trackedBrands={trackedBrandList}
                />
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
              Crawled{" "}
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ink-link"
              >
                {websiteUrl}
              </a>{" "}
              and extracted these 7 features. They only attach to the target&apos;s feature
              vector (competitors stay at 0 because we don&apos;t crawl their sites in a
              standard run).
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
              These rows are fed to the XGBoost surrogate as training samples. The diagnostic
              columns on the left explain counts, reliability, and gaps; the grouped feature
              columns are the actual surrogate inputs. `Mention rate` uses total responses as
              its denominator, while `share of tracked mentions` uses the total extracted
              tracked-brand mentions across all responses.
            </p>
            <FeatureMatrix
              features={features}
              cards={cards}
              target={target}
              importance={importance}
            />
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
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                  Features ranked
                </p>
                <p className="mt-1 text-3xl text-[var(--ink)]">
                  {Object.keys(importance).length}
                </p>
              </div>
            </div>
            <p className="mb-4 text-sm text-[var(--muted)]">
              Feature importance — how much each feature explains mention-rate variance.
            </p>
            <ImportanceBars importance={importance} />
            {r2 < 0 && (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                Negative R² means the model predicts worse than the mean. Run more queries
                across more brands to get a real signal — the surrogate needs breadth to learn.
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
