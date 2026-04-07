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
  const uniqueBrands = Object.keys(byBrand).length;
  const latestResult = history[0];
  const currentTarget = currentResult?.brandStats.find((brand) => brand.isTarget);
  const bestBrandRun = brandHistory.reduce<number>(
    (best, result) =>
      Math.max(best, result.brandStats.find((brand) => brand.isTarget)?.mentionRate ?? 0),
    0
  );

  return (
    <div className="space-y-8">
      <section className="paper-panel rounded-[2.2rem] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="muted-label text-xs">Runs</p>
            <h2 className="mt-3 text-4xl text-[var(--ink)]">Saved test history</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
              Reopen older runs, compare changes, and keep track of how your scenario evolves.
            </p>
          </div>
          <button
            onClick={clearHistory}
            className="btn-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
          >
            Clear history
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <div className="metric-card">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Total runs</p>
            <p className="mt-2 text-3xl text-[var(--ink)]">{history.length}</p>
          </div>
          <div className="metric-card">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              Brands tested
            </p>
            <p className="mt-2 text-3xl text-[var(--ink)]">{uniqueBrands}</p>
          </div>
          <div className="metric-card">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              Current rate
            </p>
            <p className="mt-2 text-3xl text-[var(--ink)]">
              {currentTarget ? formatPercent(currentTarget.mentionRate) : "-"}
            </p>
          </div>
          <div className="metric-card">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              Latest run
            </p>
            <p className="mt-2 text-lg text-[var(--ink)]">{formatDate(latestResult.timestamp)}</p>
          </div>
        </div>
      </section>

      {currentBrand && brandHistory.length > 0 && (
        <section className="paper-card rounded-[1.75rem] p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="muted-label text-xs">Current brand</p>
              <h2 className="mt-2 text-3xl text-[var(--ink)]">History for {currentBrand}</h2>
            </div>
            <span className="font-mono text-xs text-[var(--muted)]">
              Best saved rate {formatPercent(bestBrandRun)}
            </span>
          </div>

          <div className="mt-5 space-y-3">
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
                    className={`flex w-full items-center gap-3 rounded-[1.3rem] border p-4 text-left ${
                      isActive
                        ? "border-[color:var(--line-strong)] bg-[rgba(255,255,255,0.72)]"
                        : "border-[color:var(--line)] bg-[rgba(255,255,255,0.36)] hover:bg-[rgba(255,255,255,0.5)]"
                    }`}
                  >
                    <span className="w-8 text-center font-mono text-xs text-[var(--muted)]">
                      #{index + 1}
                    </span>
                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                        <span>{formatDate(result.timestamp)}</span>
                        <span>
                          {result.config.queries.length} queries x {result.config.models.length} models x{" "}
                          {result.config.samplesPerQuery} samples
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
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
        </section>
      )}

      {currentBrand && brandHistory.length > 1 && (
        <section className="paper-card overflow-hidden rounded-[1.75rem]">
          <div className="border-b border-[color:var(--line)] px-5 py-4">
            <h2 className="text-3xl text-[var(--ink)]">Per-model history</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              How each selected tool changed across saved runs for {currentBrand}.
            </p>
          </div>
          <div className="overflow-x-auto p-5 pt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--line)] text-left">
                  <th className="px-3 py-2 font-medium text-[var(--muted)]">Run</th>
                  <th className="px-3 py-2 font-medium text-[var(--muted)]">Date</th>
                  {brandHistory[0].config.models.map((model) => (
                    <th
                      key={model}
                      className="px-3 py-2 text-center font-medium text-[var(--muted)]"
                    >
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
                        className={
                          isActive
                            ? "bg-[rgba(255,255,255,0.34)]"
                            : "hover:bg-[rgba(255,255,255,0.22)]"
                        }
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
                            <td
                              key={model}
                              className="px-3 py-2 text-center font-mono text-xs text-[var(--ink)]"
                            >
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
                    className={
                      isActive
                        ? "bg-[rgba(255,255,255,0.34)]"
                        : "hover:bg-[rgba(255,255,255,0.22)]"
                    }
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
