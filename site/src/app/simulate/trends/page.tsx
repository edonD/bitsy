"use client";

import Link from "next/link";
import { useSimulation } from "@/components/SimulationProvider";
import { MODEL_META } from "@/lib/simulation-engine";

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SimulateTrendsPage() {
  const { history, currentResult, isRunning, loadFromHistory, clearHistory } =
    useSimulation();

  if (isRunning) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-900 border-t-transparent" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="mb-2 text-[var(--muted)]">No simulation history yet.</p>
        <p className="mb-4 text-sm text-[var(--muted)]">
          Run multiple scenarios to build a comparison trail.
        </p>
        <Link
          href="/simulate"
          className="btn-primary rounded-full px-5 py-3 text-sm font-semibold"
        >
          Run your first test
        </Link>
      </div>
    );
  }

  const byBrand: Record<string, typeof history> = {};
  for (const result of history) {
    const brand = result.config.targetBrand;
    if (!byBrand[brand]) byBrand[brand] = [];
    byBrand[brand].push(result);
  }

  const currentBrand = currentResult?.config.targetBrand;
  const brandHistory = currentBrand ? (byBrand[currentBrand] ?? []) : [];

  return (
    <div className="space-y-8">
      <section className="paper-panel rounded-[2.2rem] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="muted-label text-xs">Runs</p>
            <h2 className="mt-3 text-4xl text-[var(--ink)]">Saved test history</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Load old runs, compare changes, and track how your test setup evolved.
            </p>
          </div>
          <button
            onClick={clearHistory}
            className="btn-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
          >
            Clear
          </button>
        </div>
      </section>

      {currentBrand && brandHistory.length > 1 && (
        <section className="paper-card overflow-hidden rounded-[1.75rem]">
          <div className="border-b border-[color:var(--line)] px-5 py-4">
            <h2 className="text-3xl text-[var(--ink)]">Trend: {currentBrand}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Mention rate across {brandHistory.length} saved runs.
            </p>
          </div>

          <div className="space-y-4 p-5">
            {brandHistory
              .slice()
              .reverse()
              .map((result, index) => {
                const target = result.brandStats.find((brand) => brand.isTarget);
                const mentionRate = target?.mentionRate ?? 0;
                const isActive = result.id === currentResult?.id;

                return (
                  <button
                    key={result.id}
                    onClick={() => loadFromHistory(result.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${
                      isActive
                        ? "border-[color:var(--line-strong)] bg-[rgba(255,255,255,0.7)]"
                        : "border-[color:var(--line)] bg-[rgba(255,255,255,0.32)] hover:bg-[rgba(255,255,255,0.48)]"
                    }`}
                  >
                    <span className="w-6 text-center font-mono text-xs text-[var(--muted)]">
                      #{index + 1}
                    </span>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-xs text-[var(--muted)]">
                          {formatDate(result.timestamp)}
                        </span>
                        <span className="text-xs text-[var(--muted)]">
                          {result.config.queries.length} queries x {result.config.models.length} models x{" "}
                          {result.config.samplesPerQuery} samples
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 flex-1 overflow-hidden rounded-full bg-stone-200">
                          <div
                            className="h-full rounded-full bg-stone-900"
                            style={{ width: `${mentionRate * 100}%` }}
                          />
                        </div>
                        <span className="w-14 text-right font-mono text-sm font-semibold text-[var(--ink)]">
                          {formatPercent(mentionRate)}
                        </span>
                      </div>
                    </div>
                    {isActive && (
                      <span className="rounded-full border border-[color:var(--line)] bg-[rgba(255,255,255,0.64)] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                        current
                      </span>
                    )}
                  </button>
                );
              })}
          </div>

          <div className="px-5 pb-5">
            <h3 className="mb-3 text-2xl text-[var(--ink)]">Per-model trend</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--line)] text-left">
                    <th className="px-3 py-2 font-medium text-[var(--muted)]">Run</th>
                    <th className="px-3 py-2 font-medium text-[var(--muted)]">Date</th>
                    {brandHistory[0].config.models.map((model) => (
                      <th key={model} className="px-3 py-2 text-center font-medium text-[var(--muted)]">
                        <span
                          className="mr-1 inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: MODEL_META[model].color }}
                        />
                        {MODEL_META[model].provider}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center font-medium text-[var(--muted)]">Overall</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--line)]">
                  {brandHistory
                    .slice()
                    .reverse()
                    .map((result, index) => {
                      const target = result.brandStats.find((brand) => brand.isTarget);
                      const isActive = result.id === currentResult?.id;

                      return (
                        <tr
                          key={result.id}
                          className={isActive ? "bg-[rgba(255,255,255,0.34)]" : "hover:bg-[rgba(255,255,255,0.22)]"}
                        >
                          <td className="px-3 py-2 font-mono text-xs text-[var(--muted)]">
                            #{index + 1}
                          </td>
                          <td className="px-3 py-2 text-xs text-[var(--muted)]">
                            {formatDate(result.timestamp)}
                          </td>
                          {result.config.models.map((model) => {
                            const rate = target?.modelBreakdown[model]?.mentionRate ?? 0;

                            return (
                              <td key={model} className="px-3 py-2 text-center font-mono text-xs text-[var(--ink)]">
                                {formatPercent(rate)}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-center font-mono text-xs font-semibold text-[var(--ink)]">
                            {formatPercent(target?.mentionRate ?? 0)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section className="paper-card overflow-hidden rounded-[1.75rem]">
        <div className="border-b border-[color:var(--line)] px-5 py-4">
          <h2 className="text-3xl text-[var(--ink)]">All runs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--line)] text-left">
                <th className="px-4 py-3 font-medium text-[var(--muted)]">Date</th>
                <th className="px-4 py-3 font-medium text-[var(--muted)]">Target brand</th>
                <th className="px-4 py-3 font-medium text-[var(--muted)]">Competitors</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--muted)]">Queries</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--muted)]">Models</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--muted)]">SoM</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--muted)]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--line)]">
              {history.map((result) => {
                const target = result.brandStats.find((brand) => brand.isTarget);
                const isActive = result.id === currentResult?.id;

                return (
                  <tr
                    key={result.id}
                    className={isActive ? "bg-[rgba(255,255,255,0.34)]" : "hover:bg-[rgba(255,255,255,0.22)]"}
                  >
                    <td className="px-4 py-3 text-xs text-[var(--muted)]">
                      {formatDate(result.timestamp)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[var(--ink)]">
                      {result.config.targetBrand}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--muted)]">
                      {result.config.competitors.slice(0, 3).join(", ")}
                      {result.config.competitors.length > 3 &&
                        ` +${result.config.competitors.length - 3}`}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-xs text-[var(--muted)]">
                      {result.config.queries.length}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {result.config.models.map((model) => (
                          <span
                            key={model}
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: MODEL_META[model].color }}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-xs font-semibold text-[var(--ink)]">
                      {formatPercent(target?.mentionRate ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => loadFromHistory(result.id)}
                        className={`rounded-full px-3 py-1 text-xs ${
                          isActive
                            ? "border border-[color:var(--line)] bg-[rgba(255,255,255,0.64)] text-[var(--ink)]"
                            : "btn-secondary"
                        }`}
                      >
                        {isActive ? "Viewing" : "Load"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="surface-inset rounded-[1.75rem] p-5 text-sm leading-relaxed text-[var(--ink)]">
        <strong>How this works now:</strong> runs are stored locally in the browser so you can
        compare scenario changes quickly. Continuous monitoring and recalibrated confidence still
        need the live collection layer.
      </div>
    </div>
  );
}
