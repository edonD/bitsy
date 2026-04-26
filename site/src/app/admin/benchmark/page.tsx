"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/config";

interface BenchmarkStatus {
  verticals: number;
  brands: number;
  queries: number;
  prompt_version: string;
  latest_run: { date: string; r2_score: number; rmse: number; num_samples: number } | null;
  vertical_names: string[];
}

export default function BenchmarkPage() {
  const [status, setStatus] = useState<BenchmarkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    apiFetch("/api/simulations/benchmark/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  async function triggerRun() {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await apiFetch("/api/simulations/benchmark/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: "null" });
      const data = await res.json();
      setRunResult(data);
      // Refresh status
      const s = await apiFetch("/api/simulations/benchmark/status").then((r) => r.json());
      setStatus(s);
    } catch (e) {
      setRunResult({ error: e instanceof Error ? e.message : "Failed" });
    } finally { setRunning(false); }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/simulator" className="ink-link text-sm">Back to engine</Link>
      <h1 className="mt-2 text-4xl text-[var(--ink)] md:text-5xl">Benchmark Panel</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
        A stable corpus of public brands collected daily to seed the surrogate model.
        This is the foundation — it provides the prior for cold-start predictions and the
        baseline for drift detection.
      </p>

      {loading && <div className="mt-8 paper-panel rounded-[2rem] p-10 text-center text-sm text-[var(--muted)]">Loading...</div>}

      {!loading && status && (
        <>
          {/* Stats */}
          <div className="mt-8 grid gap-4 sm:grid-cols-4">
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Verticals</p>
              <p className="mt-1 text-3xl text-[var(--ink)]">{status.verticals}</p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Brands</p>
              <p className="mt-1 text-3xl text-[var(--ink)]">{status.brands}</p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Queries</p>
              <p className="mt-1 text-3xl text-[var(--ink)]">{status.queries}</p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Prompt version</p>
              <p className="mt-1 text-lg font-mono text-[var(--ink)]">{status.prompt_version}</p>
            </div>
          </div>

          {/* Latest run */}
          {status.latest_run && (
            <div className="mt-6 paper-panel rounded-[2rem] p-6">
              <p className="muted-label text-xs mb-2">Latest training run</p>
              <div className="grid gap-4 sm:grid-cols-4">
                <div><p className="text-xs text-[var(--muted)]">Date</p><p className="text-lg text-[var(--ink)]">{status.latest_run.date}</p></div>
                <div><p className="text-xs text-[var(--muted)]">R2 Score</p><p className="text-lg text-[var(--ink)]">{status.latest_run.r2_score.toFixed(4)}</p></div>
                <div><p className="text-xs text-[var(--muted)]">RMSE</p><p className="text-lg text-[var(--ink)]">{status.latest_run.rmse.toFixed(2)}</p></div>
                <div><p className="text-xs text-[var(--muted)]">Training samples</p><p className="text-lg text-[var(--ink)]">{status.latest_run.num_samples}</p></div>
              </div>
            </div>
          )}

          {/* Verticals */}
          <div className="mt-6 paper-panel rounded-[2rem] p-6">
            <p className="muted-label text-xs mb-4">Benchmark verticals</p>
            <div className="flex flex-wrap gap-2">
              {status.vertical_names.map((v) => (
                <span key={v} className="surface-chip px-3 py-1.5 text-sm text-[var(--ink)]">
                  {v.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>

          {/* Run button */}
          <div className="mt-6 paper-panel rounded-[2rem] p-6">
            <p className="muted-label text-xs mb-2">Manual trigger</p>
            <p className="text-sm text-[var(--muted)] mb-4">
              Run the full benchmark panel now. This makes ~300 API calls across 10 verticals
              and takes 5-10 minutes. Cost: ~$0.05.
            </p>
            <button
              onClick={triggerRun}
              disabled={running}
              className={`rounded-2xl px-6 py-3.5 text-sm font-semibold ${running ? "cursor-not-allowed bg-[rgba(26,23,20,0.12)] text-[var(--muted)]" : "btn-primary"}`}
            >
              {running ? "Running benchmark..." : "Run daily benchmark now"}
            </button>
          </div>

          {/* Run result */}
          {runResult && (
            <div className="mt-4 paper-card rounded-[1.4rem] p-5">
              <p className="muted-label text-xs mb-2">Run result</p>
              <pre className="text-xs font-mono text-[var(--ink)] whitespace-pre-wrap">
                {JSON.stringify(runResult, null, 2)}
              </pre>
            </div>
          )}
        </>
      )}

      <div className="mt-12 border-t border-[color:var(--line)] pt-8 flex justify-center gap-6">
        <Link href="/simulator" className="ink-link text-sm">Engine</Link>
        <Link href="/admin/model" className="ink-link text-sm">Model</Link>
        <Link href="/admin/logs" className="ink-link text-sm">API Logs</Link>
        <Link href="/admin/improvements" className="ink-link text-sm">Improvements</Link>
      </div>
    </div>
  );
}
