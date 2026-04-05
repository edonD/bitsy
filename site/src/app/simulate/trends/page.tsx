"use client";

import Link from "next/link";
import { useSimulation } from "@/components/SimulationProvider";
import { MODEL_META, type ModelId } from "@/lib/simulation-engine";

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
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
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 mb-2">No simulation history yet.</p>
        <p className="text-sm text-slate-400 mb-4">
          Run multiple simulations to track changes over time.
        </p>
        <Link
          href="/simulate"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          Run your first simulation
        </Link>
      </div>
    );
  }

  // Group history by target brand
  const byBrand: Record<string, typeof history> = {};
  for (const result of history) {
    const brand = result.config.targetBrand;
    if (!byBrand[brand]) byBrand[brand] = [];
    byBrand[brand].push(result);
  }

  // For the current brand, show a trend table
  const currentBrand = currentResult?.config.targetBrand;
  const brandHistory = currentBrand ? (byBrand[currentBrand] ?? []) : [];

  return (
    <div className="space-y-8">
      {/* History Overview */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          Simulation History ({history.length})
        </h2>
        <button
          onClick={clearHistory}
          className="text-xs text-red-600 hover:text-red-700 hover:underline"
        >
          Clear all history
        </button>
      </div>

      {/* Trend for current brand */}
      {currentBrand && brandHistory.length > 1 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Trend: {currentBrand}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Share of Model over {brandHistory.length} simulation runs
            </p>
          </div>

          {/* ASCII-style trend visualization */}
          <div className="p-5">
            <div className="space-y-4">
              {brandHistory
                .slice()
                .reverse()
                .map((result, idx) => {
                  const targetStat = result.brandStats.find((b) => b.isTarget);
                  const mentionRate = targetStat?.mentionRate ?? 0;
                  const isActive = result.id === currentResult?.id;

                  return (
                    <button
                      key={result.id}
                      onClick={() => loadFromHistory(result.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                        isActive
                          ? "bg-blue-50 border-blue-200"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-xs text-slate-400 w-6 text-center font-mono">
                        #{idx + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-slate-500">
                            {formatDate(result.timestamp)}
                          </span>
                          <span className="text-xs text-slate-400">
                            {result.config.queries.length} queries &times;{" "}
                            {result.config.models.length} models &times;{" "}
                            {result.config.samplesPerQuery} samples
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${mentionRate * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-mono font-semibold text-slate-800 w-14 text-right">
                            {formatPercent(mentionRate)}
                          </span>
                        </div>
                      </div>
                      {isActive && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                          current
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Per-model trend */}
          <div className="px-5 pb-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">
              Per-Model Mention Rate Trend
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="py-2 px-3 font-medium text-slate-600">Run</th>
                    <th className="py-2 px-3 font-medium text-slate-600">Date</th>
                    {brandHistory[0].config.models.map((m) => (
                      <th key={m} className="py-2 px-3 font-medium text-slate-600 text-center">
                        <span
                          className="inline-block w-2 h-2 rounded-full mr-1"
                          style={{ backgroundColor: MODEL_META[m].color }}
                        />
                        {MODEL_META[m].provider}
                      </th>
                    ))}
                    <th className="py-2 px-3 font-medium text-slate-600 text-center">
                      Overall SoM
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {brandHistory
                    .slice()
                    .reverse()
                    .map((result, idx) => {
                      const targetStat = result.brandStats.find((b) => b.isTarget);
                      const isActive = result.id === currentResult?.id;
                      return (
                        <tr
                          key={result.id}
                          className={`hover:bg-slate-50 ${isActive ? "bg-blue-50/50" : ""}`}
                        >
                          <td className="py-2 px-3 font-mono text-xs text-slate-400">
                            #{idx + 1}
                          </td>
                          <td className="py-2 px-3 text-xs text-slate-500">
                            {formatDate(result.timestamp)}
                          </td>
                          {result.config.models.map((m) => {
                            const rate =
                              targetStat?.modelBreakdown[m]?.mentionRate ?? 0;
                            return (
                              <td
                                key={m}
                                className={`py-2 px-3 text-center font-mono text-xs ${
                                  rate > 0.6
                                    ? "text-green-700"
                                    : rate > 0.3
                                    ? "text-amber-700"
                                    : "text-red-700"
                                }`}
                              >
                                {formatPercent(rate)}
                              </td>
                            );
                          })}
                          <td className="py-2 px-3 text-center font-mono text-xs font-semibold text-slate-800">
                            {formatPercent(targetStat?.mentionRate ?? 0)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* All simulation history */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">All Simulations</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="py-3 px-4 font-medium text-slate-600">Date</th>
                <th className="py-3 px-4 font-medium text-slate-600">Target Brand</th>
                <th className="py-3 px-4 font-medium text-slate-600">Competitors</th>
                <th className="py-3 px-4 font-medium text-slate-600 text-center">Queries</th>
                <th className="py-3 px-4 font-medium text-slate-600 text-center">Models</th>
                <th className="py-3 px-4 font-medium text-slate-600 text-center">SoM</th>
                <th className="py-3 px-4 font-medium text-slate-600 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {history.map((result) => {
                const targetStat = result.brandStats.find((b) => b.isTarget);
                const isActive = result.id === currentResult?.id;
                return (
                  <tr
                    key={result.id}
                    className={`hover:bg-slate-50 ${isActive ? "bg-blue-50/50" : ""}`}
                  >
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {formatDate(result.timestamp)}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {result.config.targetBrand}
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-xs">
                      {result.config.competitors.slice(0, 3).join(", ")}
                      {result.config.competitors.length > 3 &&
                        ` +${result.config.competitors.length - 3}`}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-xs text-slate-600">
                      {result.config.queries.length}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {result.config.models.map((m) => (
                          <span
                            key={m}
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: MODEL_META[m].color }}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-xs font-semibold text-slate-800">
                      {formatPercent(targetStat?.mentionRate ?? 0)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => loadFromHistory(result.id)}
                        className={`text-xs px-2.5 py-1 rounded transition-colors ${
                          isActive
                            ? "bg-blue-100 text-blue-700"
                            : "text-blue-600 hover:bg-blue-50"
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
      </div>

      {/* How Trends Work Note */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        <strong>How Trends Work:</strong> Each simulation run is saved to your browser&rsquo;s
        local storage (up to 20 runs). In a production system, this data would persist to a
        database and be polled automatically (e.g., 50x/day per Tryscope&rsquo;s approach). The
        trend view shows how your brand&rsquo;s Share of Model changes across runs, which in
        production maps to changes over time as you optimize content or as LLM training data
        updates (Research 2.1: parametric knowledge updates every 18-36 months; RAG updates
        immediately).
      </div>
    </div>
  );
}
