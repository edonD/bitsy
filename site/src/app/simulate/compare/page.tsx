"use client";

import Link from "next/link";
import { useSimulation } from "@/components/SimulationProvider";
import { MODEL_META, type ModelId } from "@/lib/simulation-engine";

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function ComparisonBar({
  values,
  models,
}: {
  values: Record<ModelId, number>;
  models: ModelId[];
}) {
  const max = Math.max(...models.map((m) => values[m] ?? 0), 0.01);
  return (
    <div className="flex items-end gap-1.5 h-16">
      {models.map((modelId) => {
        const value = values[modelId] ?? 0;
        const height = max > 0 ? (value / max) * 100 : 0;
        const meta = MODEL_META[modelId];
        return (
          <div key={modelId} className="flex-1 flex flex-col items-center">
            <span className="text-[10px] font-mono text-slate-500 mb-0.5">
              {formatPercent(value)}
            </span>
            <div
              className="w-full rounded-t transition-all duration-500"
              style={{
                height: `${Math.max(height, 4)}%`,
                backgroundColor: meta.color,
                opacity: value > 0 ? 1 : 0.2,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function SimulateComparePage() {
  const { currentResult, isRunning } = useSimulation();

  if (isRunning) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!currentResult) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 mb-4">No simulation results to compare.</p>
        <Link
          href="/simulate"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          Run a simulation first
        </Link>
      </div>
    );
  }

  const { config, brandStats, modelStats, queryResults } = currentResult;
  const models = config.models;
  const allBrands = [config.targetBrand, ...config.competitors];

  // Per-model, per-brand mention rates
  const mentionRatesByBrand = allBrands.map((brand) => {
    const stat = brandStats.find((b) => b.brand === brand);
    const rates: Record<ModelId, number> = {} as Record<ModelId, number>;
    for (const m of models) {
      rates[m] = stat?.modelBreakdown[m]?.mentionRate ?? 0;
    }
    return { brand, isTarget: brand === config.targetBrand, rates };
  });

  // Cross-model agreement: for each query, how many models agree on mentioning each brand
  const agreementData = config.queries.map((query) => {
    const brandAgreement = allBrands.map((brand) => {
      let mentioningModels = 0;
      for (const model of models) {
        const results = queryResults.filter(
          (qr) => qr.query === query && qr.model === model
        );
        const mentionedInAny = results.some((r) =>
          r.mentions.some((m) => m.brand === brand && m.mentioned)
        );
        if (mentionedInAny) mentioningModels++;
      }
      return { brand, agreementRate: mentioningModels / models.length };
    });

    return { query, brandAgreement };
  });

  // Average agreement across all queries
  const avgAgreement = allBrands.map((brand) => {
    const rates = agreementData.map(
      (d) => d.brandAgreement.find((b) => b.brand === brand)?.agreementRate ?? 0
    );
    return {
      brand,
      avgAgreement: rates.reduce((a, b) => a + b, 0) / rates.length,
    };
  });

  // Model divergence: which brand has the biggest gap between best and worst model
  const divergenceData = mentionRatesByBrand.map((item) => {
    const rates = models.map((m) => item.rates[m]);
    const maxRate = Math.max(...rates);
    const minRate = Math.min(...rates);
    return {
      brand: item.brand,
      isTarget: item.isTarget,
      maxRate,
      minRate,
      gap: maxRate - minRate,
      bestModel: models[rates.indexOf(maxRate)],
      worstModel: models[rates.indexOf(minRate)],
    };
  });
  divergenceData.sort((a, b) => b.gap - a.gap);

  return (
    <div className="space-y-8">
      {/* Model Legend */}
      <div className="flex flex-wrap gap-4">
        {models.map((m) => {
          const meta = MODEL_META[m];
          return (
            <div key={m} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: meta.color }}
              />
              <span className="text-sm text-slate-700">{meta.label}</span>
            </div>
          );
        })}
      </div>

      {/* Side-by-side Brand Mention Rates */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Brand Mention Rate by Model
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            How often each model mentions each brand across all queries
          </p>
        </div>
        <div className="p-5 space-y-6">
          {mentionRatesByBrand
            .sort(
              (a, b) =>
                Math.max(...models.map((m) => b.rates[m])) -
                Math.max(...models.map((m) => a.rates[m]))
            )
            .map((item) => (
              <div key={item.brand}>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-sm font-medium ${
                      item.isTarget ? "text-blue-700" : "text-slate-800"
                    }`}
                  >
                    {item.brand}
                  </span>
                  {item.isTarget && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                      you
                    </span>
                  )}
                </div>
                <ComparisonBar values={item.rates} models={models} />
                <div className="flex gap-1.5 mt-1">
                  {models.map((m) => (
                    <div
                      key={m}
                      className="flex-1 text-center text-[10px] text-slate-400"
                    >
                      {MODEL_META[m].provider}
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Model Divergence Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Model Divergence</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Brands with the biggest gap between their best and worst model. Research shows only
            12% URL overlap between models (Research 2.2).
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="py-3 px-4 font-medium text-slate-600">Brand</th>
                <th className="py-3 px-4 font-medium text-slate-600 text-center">Best Model</th>
                <th className="py-3 px-4 font-medium text-slate-600 text-center">Best Rate</th>
                <th className="py-3 px-4 font-medium text-slate-600 text-center">Worst Model</th>
                <th className="py-3 px-4 font-medium text-slate-600 text-center">Worst Rate</th>
                <th className="py-3 px-4 font-medium text-slate-600 text-center">Gap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {divergenceData.map((row) => (
                <tr
                  key={row.brand}
                  className={`hover:bg-slate-50 ${row.isTarget ? "bg-blue-50/50" : ""}`}
                >
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {row.brand}
                    {row.isTarget && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                        you
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: MODEL_META[row.bestModel].color }}
                      />
                      <span className="text-xs">{MODEL_META[row.bestModel].provider}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-green-700 text-xs">
                    {formatPercent(row.maxRate)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: MODEL_META[row.worstModel].color }}
                      />
                      <span className="text-xs">{MODEL_META[row.worstModel].provider}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-red-700 text-xs">
                    {formatPercent(row.minRate)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`font-mono text-xs font-semibold ${
                        row.gap > 0.3
                          ? "text-red-600"
                          : row.gap > 0.15
                          ? "text-amber-600"
                          : "text-green-600"
                      }`}
                    >
                      {formatPercent(row.gap)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cross-Model Agreement */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Cross-Model Agreement</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            What percentage of models agree on mentioning each brand (averaged across queries)
          </p>
        </div>
        <div className="p-5 space-y-3">
          {avgAgreement
            .sort((a, b) => b.avgAgreement - a.avgAgreement)
            .map((item) => {
              const isTarget = item.brand === config.targetBrand;
              return (
                <div key={item.brand} className="flex items-center gap-3">
                  <span
                    className={`w-28 text-sm truncate ${
                      isTarget ? "font-medium text-blue-700" : "text-slate-700"
                    }`}
                  >
                    {item.brand}
                  </span>
                  <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${item.avgAgreement * 100}%`,
                        backgroundColor: isTarget ? "#3b82f6" : "#64748b",
                      }}
                    />
                  </div>
                  <span className="w-12 text-right text-xs font-mono text-slate-600">
                    {formatPercent(item.avgAgreement)}
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Key Insight */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
        <strong>Key Insight:</strong> Models disagree significantly on brand recommendations.
        Perplexity (with web search) cites ~13 brands per response while ChatGPT cites only ~3-4
        (Research 2.1). A brand invisible on ChatGPT may be prominent on Perplexity. Multi-model
        monitoring is essential — single-model tracking misses 88% of the picture (Research 2.2:
        only 12% URL overlap).
      </div>
    </div>
  );
}
