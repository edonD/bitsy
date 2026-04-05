"use client";

import Link from "next/link";
import { useSimulation } from "@/components/SimulationProvider";
import { MODEL_META, type ModelId } from "@/lib/simulation-engine";

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function SentimentDot({ sentiment }: { sentiment: "positive" | "neutral" | "negative" }) {
  const colors = {
    positive: "bg-green-500",
    neutral: "bg-slate-400",
    negative: "bg-red-500",
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[sentiment]}`} />;
}

function MentionBar({ rate, color }: { rate: number; color: string }) {
  return (
    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${rate * 100}%`, backgroundColor: color }}
      />
    </div>
  );
}

export default function SimulateResultsPage() {
  const { currentResult, isRunning } = useSimulation();

  if (isRunning) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 text-sm">Running simulation...</p>
        </div>
      </div>
    );
  }

  if (!currentResult) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 mb-4">No simulation results yet.</p>
        <Link
          href="/simulate"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          Set up a simulation
        </Link>
      </div>
    );
  }

  const { config, brandStats, modelStats, queryResults } = currentResult;

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-xs text-blue-600 font-medium">Your Brand</div>
          <div className="text-lg font-bold text-blue-800 mt-1">
            {config.targetBrand}
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-xs text-blue-600 font-medium">Share of Model (SoM)</div>
          <div className="text-lg font-bold text-blue-800 mt-1">
            {formatPercent(
              brandStats.find((b) => b.isTarget)?.mentionRate ?? 0
            )}
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-xs text-blue-600 font-medium">Avg Position</div>
          <div className="text-lg font-bold text-blue-800 mt-1">
            #{(brandStats.find((b) => b.isTarget)?.avgPosition ?? 0).toFixed(1)}
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-xs text-blue-600 font-medium">Total Queries</div>
          <div className="text-lg font-bold text-blue-800 mt-1">
            {queryResults.length}
          </div>
        </div>
      </div>

      {/* Brand Rankings Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Brand Visibility Rankings</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Ranked by mention rate across all models and queries (Share of Model)
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="py-3 px-4 font-medium text-slate-600 w-8">#</th>
                <th className="py-3 px-4 font-medium text-slate-600">Brand</th>
                <th className="py-3 px-4 font-medium text-slate-600 w-48">Mention Rate</th>
                <th className="py-3 px-4 font-medium text-slate-600 text-center">Avg Position</th>
                <th className="py-3 px-4 font-medium text-slate-600 text-center">Sentiment</th>
                {config.models.map((m) => (
                  <th key={m} className="py-3 px-4 font-medium text-slate-600 text-center">
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-1"
                      style={{ backgroundColor: MODEL_META[m].color }}
                    />
                    {MODEL_META[m].provider}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {brandStats.map((brand, idx) => (
                <tr
                  key={brand.brand}
                  className={`hover:bg-slate-50 ${brand.isTarget ? "bg-blue-50/50" : ""}`}
                >
                  <td className="py-3 px-4 text-slate-400 font-mono text-xs">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`font-medium ${brand.isTarget ? "text-blue-700" : "text-slate-800"}`}>
                      {brand.brand}
                    </span>
                    {brand.isTarget && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                        you
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <MentionBar
                        rate={brand.mentionRate}
                        color={brand.isTarget ? "#3b82f6" : "#94a3b8"}
                      />
                      <span className="text-xs font-mono text-slate-600 w-12 text-right">
                        {formatPercent(brand.mentionRate)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {brand.avgPosition !== null ? (
                      <span className="font-mono text-sm text-slate-700">
                        #{brand.avgPosition.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-slate-400">&mdash;</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1.5">
                      <SentimentDot sentiment="positive" />
                      <span className="text-xs text-slate-500">
                        {brand.sentimentBreakdown.positive}
                      </span>
                      <SentimentDot sentiment="neutral" />
                      <span className="text-xs text-slate-500">
                        {brand.sentimentBreakdown.neutral}
                      </span>
                      <SentimentDot sentiment="negative" />
                      <span className="text-xs text-slate-500">
                        {brand.sentimentBreakdown.negative}
                      </span>
                    </div>
                  </td>
                  {config.models.map((m) => {
                    const modelData = brand.modelBreakdown[m];
                    if (!modelData) return <td key={m} className="py-3 px-4 text-center text-slate-400">&mdash;</td>;
                    return (
                      <td key={m} className="py-3 px-4 text-center">
                        <span
                          className={`text-xs font-mono font-medium ${
                            modelData.mentionRate > 0.6
                              ? "text-green-700"
                              : modelData.mentionRate > 0.3
                              ? "text-amber-700"
                              : "text-red-700"
                          }`}
                        >
                          {formatPercent(modelData.mentionRate)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model-Level Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {config.models.map((modelId) => {
          const meta = MODEL_META[modelId];
          const stats = modelStats[modelId];
          if (!stats) return null;
          return (
            <div
              key={modelId}
              className="border rounded-lg p-4"
              style={{ borderColor: meta.color + "40" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
                <h3 className="text-sm font-semibold text-slate-800">{meta.label}</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Your brand mention rate</span>
                  <span className="font-mono font-medium text-slate-800">
                    {formatPercent(stats.targetMentionRate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Avg brands/response</span>
                  <span className="font-mono font-medium text-slate-800">
                    {stats.avgBrandsMentioned.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Expected (research)</span>
                  <span className="font-mono text-slate-500">
                    ~{meta.avgCitationsPerResponse}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sample Responses */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Sample Responses</h2>
        <div className="space-y-3">
          {config.queries.slice(0, 5).map((query) => {
            const firstResults = config.models.map((model) =>
              queryResults.find(
                (qr) => qr.query === query && qr.model === model && qr.sampleIndex === 0
              )
            );

            return (
              <div key={query} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <p className="text-sm font-medium text-slate-800">
                    &ldquo;{query}&rdquo;
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  {firstResults.map((result) => {
                    if (!result) return null;
                    const meta = MODEL_META[result.model];
                    return (
                      <div key={result.model} className="px-4 py-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: meta.color }}
                          />
                          <span className="text-xs font-medium text-slate-600">
                            {meta.label}
                          </span>
                          <span className="text-xs text-slate-400">
                            {result.totalBrandsMentioned} brands mentioned
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {result.responseSnippet}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {result.mentions
                            .filter((m) => m.mentioned)
                            .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
                            .map((mention) => (
                              <span
                                key={mention.brand}
                                className={`text-xs px-2 py-0.5 rounded-full border ${
                                  mention.brand === config.targetBrand
                                    ? "bg-blue-50 border-blue-200 text-blue-700"
                                    : "bg-slate-50 border-slate-200 text-slate-600"
                                }`}
                              >
                                <SentimentDot sentiment={mention.sentiment} />{" "}
                                #{mention.position} {mention.brand}
                              </span>
                            ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Methodology Note */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        <strong>Methodology Note:</strong> This prototype uses research-calibrated simulation
        models. ChatGPT averages ~3.5 brands/response, Perplexity ~13 (Research 2.1, 2.2).
        Real results require live API calls. The simulation accounts for 15% response variance
        (Research 2.2) and the 12% cross-model URL overlap finding. Share of Model (SoM) is
        the primary metric, consistent with industry standard (Research 2.4).
      </div>
    </div>
  );
}
