"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getModelDiagnostics, type ModelDiagnosticsResponse } from "@/lib/api";
import { ModelDiagnosticsView } from "./ModelDiagnosticsView";

export default function ModelPage() {
  const [diagnostics, setDiagnostics] = useState<ModelDiagnosticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    setLoading(true);
    getModelDiagnostics()
      .then((data) => {
        setDiagnostics(data);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load model diagnostics");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex gap-4 text-sm">
            <Link href="/simulator" className="ink-link">Back to engine</Link>
            <Link href="/admin/trace" className="ink-link">Trace</Link>
          </div>
          <h1 className="mt-2 text-4xl text-[var(--ink)] md:text-5xl">Surrogate model</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--muted)]">
            A plain-language page for the current XGBoost surrogate: what rows it trains on,
            what it predicts, how it is scored, and whether the score is trustworthy.
          </p>
        </div>
        <button onClick={refresh} className="btn-secondary rounded-2xl px-4 py-2 text-sm font-semibold">
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="mt-8 paper-panel rounded-[2rem] p-10 text-center text-sm text-[var(--muted)]">
          Loading model diagnostics...
        </div>
      ) : error ? (
        <div className="mt-8 rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
          {error}
        </div>
      ) : diagnostics ? (
        <ModelDiagnosticsView diagnostics={diagnostics} />
      ) : null}
    </div>
  );
}
