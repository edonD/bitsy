"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CompeteSection } from "@/components/simulator/CompeteSection";
import { ExecuteSection } from "@/components/simulator/ExecuteSection";
import { MeasureSection } from "@/components/simulator/MeasureSection";
import { SimulateSection } from "@/components/simulator/SimulateSection";
import { TargetSection } from "@/components/simulator/TargetSection";
import { VerifySection } from "@/components/simulator/VerifySection";
import { VisibilitySection } from "@/components/simulator/VisibilitySection";
import {
  COLLECTION_OPTIONS,
  CONTENT_METRIC_KEYS,
  TABS,
  TARGET_MODE_OPTIONS,
  TEMPLATES,
} from "@/components/simulator/config";
import type { BrandConfig, SimulatorTab, StoredRun, TargetMode } from "@/components/simulator/types";
import {
  analyzeCompetitors,
  analyzeContent,
  getCitedSources,
  getFeatures,
  getQueryBreakdown,
  getStatus,
  getTrends,
  runCollection,
  runWhatIf,
  type BrandResult,
  type CollectResponse,
  type CompetitorAnalysisResponse,
  type ContentAnalysisResponse,
  type CitedSourcesResponse,
  type QueryBreakdownResponse,
  type StatusResponse,
  type TrendsResponse,
  type WhatIfResponse,
} from "@/lib/api";

export default function SimulatorPage() {
  const [brand, setBrand] = useState<BrandConfig>({ name: "", description: "", website: "", competitors: [], queries: [] });

  const [tab, setTab] = useState<SimulatorTab>("target");
  const [collectionMode, setCollectionMode] = useState<TargetMode>("balanced");
  const [isSetup, setIsSetup] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [collectResult, setCollectResult] = useState<CollectResponse | null>(null);
  const [lastMeasuredKey, setLastMeasuredKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<StatusResponse | null>(null);

  const [draftContent, setDraftContent] = useState("");
  const [websiteAnalysis, setWebsiteAnalysis] = useState<ContentAnalysisResponse | null>(null);
  const [draftAnalysis, setDraftAnalysis] = useState<ContentAnalysisResponse | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<WhatIfResponse | null>(null);

  const [runs, setRuns] = useState<StoredRun[]>([]);
  const [compareA, setCompareA] = useState<number | null>(null);
  const [compareB, setCompareB] = useState<number | null>(null);

  const [competitorUrls, setCompetitorUrls] = useState<Record<string, string>>({});
  const [compAnalysis, setCompAnalysis] = useState<CompetitorAnalysisResponse | null>(null);
  const [competing, setCompeting] = useState(false);
  const [compError, setCompError] = useState<string | null>(null);
  const [queryBreakdown, setQueryBreakdownState] = useState<QueryBreakdownResponse | null>(null);
  const [citedSources, setCitedSources] = useState<CitedSourcesResponse | null>(null);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);

  useEffect(() => {
    getStatus().then(setBackendStatus).catch(() => null);
  }, []);

  useEffect(() => {
    if (tab !== "compete" || !collectResult || !brand.name) return;

    setLoadingBreakdown(true);
    Promise.all([
      getQueryBreakdown(7).catch(() => null),
      getCitedSources(brand.name, 7).catch(() => null),
    ])
      .then(([breakdown, sources]) => {
        if (breakdown) setQueryBreakdownState(breakdown);
        if (sources) setCitedSources(sources);
      })
      .finally(() => setLoadingBreakdown(false));
  }, [tab, collectResult, brand.name]);

  useEffect(() => {
    if (tab === "measure" && brand.name) {
      getTrends(brand.name, 30).then(setTrends).catch(() => null);
    }
  }, [tab, brand.name]);

  const canRun = Boolean(
    brand.name.trim() &&
      brand.website.trim().startsWith("http") &&
      brand.competitors.length >= 2 &&
      brand.queries.length >= 3,
  );
  const currentSetupKey = JSON.stringify({
    name: brand.name.trim(),
    website: brand.website.trim(),
    competitors: [...brand.competitors].sort(),
    queries: brand.queries,
  });
  const hasCollectedCurrentBrand =
    lastMeasuredKey === currentSetupKey &&
    (collectResult?.brands.some((resultBrand) => resultBrand.brand === brand.name && resultBrand.is_target) ?? false);
  const target = collectResult?.brands.find((resultBrand) => resultBrand.is_target);

  function saveRun(data: CollectResponse) {
    setRuns((prev) => [{ label: `Run ${prev.length + 1}`, date: new Date().toLocaleString(), data }, ...prev]);
  }

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

  async function loadPreviousData() {
    if (!backendStatus?.brands.length) return;

    try {
      const data = await getFeatures();
      const brands: BrandResult[] = data.features.map((feature) => {
        const num = (key: string) => Number(feature[key] ?? 0);
        const featureBrand = String(feature.brand);
        return {
          brand: featureBrand,
          mention_rate: num("mention_rate"),
          avg_position: num("avg_position"),
          top1_rate: num("top1_rate"),
          top3_rate: num("top3_rate"),
          positive_rate: num("positive_rate"),
          negative_rate: num("negative_rate"),
          net_sentiment: num("net_sentiment"),
          is_target: featureBrand === backendStatus.brands[0],
        };
      });
      brands.sort((a, b) => b.mention_rate - a.mention_rate);

      const targetBrand = backendStatus.brands[0];
      setBrand({
        name: targetBrand,
        description: "",
        website: "",
        competitors: backendStatus.brands.filter((savedBrand) => savedBrand !== targetBrand),
        queries: [],
      });
      setCollectResult({
        total_observations: 0,
        total_calls: 0,
        brands,
        model_metrics: { rmse: 0, r2: backendStatus.model_r2 ?? 0, importance: {} },
        training_samples_total: backendStatus.training_sample_count,
        duration_seconds: 0,
      });
      setIsSetup(false);
      setTab("observe");
    } catch {
      setError("Failed to load previous data");
    }
  }

  async function runVisibility() {
    if (!canRun) return;

    setCollecting(true);
    setTab("observe");
    setError(null);
    setDraftAnalysis(null);
    setSimulationResult(null);

    if (brand.website) {
      analyzeContent({ url: brand.website }).then(setWebsiteAnalysis).catch(() => null);
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
        ...TARGET_MODE_OPTIONS[collectionMode],
      });
      setCollectResult(result);
      setLastMeasuredKey(currentSetupKey);
      setIsSetup(false);
      saveRun(result);
      getStatus().then(setBackendStatus).catch(() => null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Collection failed");
    } finally {
      setCollecting(false);
    }
  }

  async function runSimulation() {
    if (!canRun || !draftContent.trim()) return;

    setSimulating(true);
    setError(null);

    try {
      if (!hasCollectedCurrentBrand) {
        const baseline = await runCollection({
          target: brand.name,
          competitors: brand.competitors,
          queries: brand.queries,
          website_url: brand.website || undefined,
          ...COLLECTION_OPTIONS,
          ...TARGET_MODE_OPTIONS[collectionMode],
        });
        setCollectResult(baseline);
        setLastMeasuredKey(currentSetupKey);
        setIsSetup(false);
        saveRun(baseline);
        getStatus().then(setBackendStatus).catch(() => null);
      }

      if (brand.website && !websiteAnalysis) {
        analyzeContent({ url: brand.website }).then(setWebsiteAnalysis).catch(() => null);
      }

      const analyzedDraft = await analyzeContent({ text: draftContent });
      setDraftAnalysis(analyzedDraft);
      const result = await runWhatIf({ brand: brand.name, changes: contentChangesFromAnalysis(analyzedDraft) });
      setSimulationResult(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Simulation failed");
    } finally {
      setSimulating(false);
    }
  }

  function resetAll() {
    setTab("target");
    setCollectionMode("balanced");
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
        competitors: brand.competitors.map((competitor) => ({
          brand: competitor,
          url: competitorUrls[competitor] || undefined,
        })),
      });
      setCompAnalysis(result);
    } catch (e) {
      setCompError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setCompeting(false);
    }
  }

  async function fetchPageAnalysis(url: string) {
    if (!url.trim()) return;
    try {
      const result = await analyzeContent({ url });
      setWebsiteAnalysis(result);
    } catch {
      setWebsiteAnalysis(null);
    }
  }

  const runStateLabel = collecting
    ? "running…"
    : collectResult
      ? "estimate ready"
      : "idle";
  const runDotClass = collecting ? "running" : collectResult ? "complete" : "";

  return (
    <div className="engine-shell engine-page-shell">
      <div className="engine-chrome">
        <div className="engine-container engine-chrome-inner">
          <header className="workspace-header">
            <div className="workspace-brandbar">
              <h1 className="workspace-title">
                {brand.name || "Bitsy"} <span>/ visibility</span>
              </h1>
              <span className="workspace-sep" />
              <div className="run-pill">
                <span className={`run-dot ${runDotClass}`} />
                {runStateLabel}
              </div>
              <span className="workspace-meta">RUN · {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}</span>
            </div>

            <div className="workspace-actions">
              <span className="workspace-meta">{collectionMode.toUpperCase()} · {Math.max(brand.queries.length, 1) * 6} CALLS</span>
              <Link href="/" className="btn" style={{ padding: "7px 13px", fontSize: 12 }}>
                Home
              </Link>
              {!isSetup && (
                <button onClick={resetAll} className="btn btn-primary" style={{ padding: "7px 14px", fontSize: 12 }}>
                  New run
                </button>
              )}
            </div>
          </header>

          <div className="rule" />

          <div className="engine-tabbar">
            <div className="tab-row" role="tablist" aria-label="Engine workflow">
              {TABS.map((item, index) => (
                <button
                  key={item.id}
                  className="tab"
                  data-active={tab === item.id}
                  onClick={() => setTab(item.id)}
                  role="tab"
                  aria-selected={tab === item.id}
                >
                  <span className="tab-key">{index + 1}</span>
                  <span className="tab-label">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="engine-container engine-main">
        <div className="engine-page-inner">

      {error && (
        <div style={{
          marginBottom: 18,
          padding: "10px 16px",
          border: "1px solid var(--rust)",
          background: "var(--rust-soft)",
          borderRadius: 8,
          fontSize: 12.5,
          color: "var(--rust)",
        }}>
          {error}
          <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.8 }}>
            Backend running? <code className="mono">cd backend; poetry run uvicorn api.app:app --port 8000</code>
          </span>
        </div>
      )}

      {tab === "target" && (
        <TargetSection
          brand={brand}
          setBrand={setBrand}
          templates={TEMPLATES}
          backendStatus={backendStatus}
          collectionMode={collectionMode}
          setCollectionMode={setCollectionMode}
          canRun={canRun}
          collecting={collecting}
          loadPreviousData={loadPreviousData}
          runVisibility={runVisibility}
        />
      )}

      {tab === "observe" &&
        (collectResult || collecting ? (
          <VisibilitySection
            collecting={collecting}
            brand={brand}
            collectResult={collectResult}
            target={target}
            websiteAnalysis={websiteAnalysis}
          />
        ) : (
          <div style={{ marginTop: 24, display: "flex", justifyContent: "center" }}>
            <section
              className="panel"
              style={{ padding: "40px 28px", position: "relative", textAlign: "center", maxWidth: 720, width: "100%" }}
            >
              <div className="corner-mark">OBSERVE</div>
              <div className="label" style={{ marginBottom: 6 }}>Waiting on target</div>
              <h2 className="title" style={{ fontSize: 22, margin: "0 0 6px" }}>Set the target first</h2>
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55, margin: "0 auto 18px", maxWidth: 480 }}>
                Observe needs a market frame before it can call the models. Add your brand, website, competitors,
                and buyer questions in Target.
              </p>
              <button
                onClick={() => setTab("target")}
                className="btn btn-primary"
                style={{ padding: "10px 18px", fontSize: 13 }}
              >
                Go to Target →
              </button>
            </section>
          </div>
        ))}

      {tab === "compete" && (
        <CompeteSection
          brand={brand}
          competitorUrls={competitorUrls}
          setCompetitorUrls={setCompetitorUrls}
          compAnalysis={compAnalysis}
          competing={competing}
          compError={compError}
          queryBreakdown={queryBreakdown}
          citedSources={citedSources}
          loadingBreakdown={loadingBreakdown}
          runCompetitorAnalysis={runCompetitorAnalysis}
        />
      )}

      {tab === "simulate" && (
        <SimulateSection
          brand={brand}
          canRun={canRun}
          draftContent={draftContent}
          setDraftContent={setDraftContent}
          simulating={simulating}
          runSimulation={runSimulation}
          draftAnalysis={draftAnalysis}
          simulationResult={simulationResult}
          target={target}
          websiteAnalysis={websiteAnalysis}
          fetchPageAnalysis={fetchPageAnalysis}
          backendStatus={backendStatus}
        />
      )}

      {tab === "execute" && (
        <ExecuteSection brand={brand} compAnalysis={compAnalysis} />
      )}

      {tab === "verify" && (
        <VerifySection brand={brand} />
      )}

      {tab === "measure" && (
        <MeasureSection
          runs={runs}
          compareA={compareA}
          compareB={compareB}
          setCompareA={setCompareA}
          setCompareB={setCompareB}
          trends={trends}
        />
      )}

        </div>

        <div className="rule engine-footer-rule" />
        <p className="engine-footer mono">
          Prototype · Local deterministic estimates. Production wires Target/Observe/Simulate/Execute/Verify to real APIs.
        </p>
        <div style={{ marginTop: 18, display: "flex", justifyContent: "center", gap: 24 }}>
          <Link href="/concept" className="mono" style={{ fontSize: 11, color: "var(--muted-2)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            How it works
          </Link>
          <Link href="/research" className="mono" style={{ fontSize: 11, color: "var(--muted-2)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Research
          </Link>
          <Link href="/simulator/spec" className="mono" style={{ fontSize: 11, color: "var(--muted-2)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Technical spec
          </Link>
        </div>
      </main>
    </div>
  );
}
