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
  const max = Math.max(...models.map((model) => values[model] ?? 0), 0.01);

  return (
    <div className="flex h-16 items-end gap-1.5">
      {models.map((modelId) => {
        const value = values[modelId] ?? 0;
        const height = max > 0 ? (value / max) * 100 : 0;
        const meta = MODEL_META[modelId];

        return (
          <div key={modelId} className="flex flex-1 flex-col items-center">
            <span className="mb-1 text-[10px] font-mono text-[var(--muted)]">
              {formatPercent(value)}
            </span>
            <div
              className="w-full rounded-t"
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-900 border-t-transparent" />
      </div>
    );
  }

  if (!currentResult) {
    return (
      <div className="py-20 text-center">
        <p className="mb-4 text-[var(--muted)]">No simulation results to compare.</p>
        <Link
          href="/simulate"
          className="btn-primary rounded-full px-5 py-3 text-sm font-semibold"
        >
          Start a test
        </Link>
      </div>
    );
  }

  const { config, brandStats, queryResults } = currentResult;
  const models = config.models;
  const allBrands = [config.targetBrand, ...config.competitors];

  const mentionRatesByBrand = allBrands.map((brand) => {
    const stat = brandStats.find((entry) => entry.brand === brand);
    const rates: Record<ModelId, number> = {} as Record<ModelId, number>;

    for (const model of models) {
      rates[model] = stat?.modelBreakdown[model]?.mentionRate ?? 0;
    }

    return { brand, isTarget: brand === config.targetBrand, rates };
  });

  const agreementData = config.queries.map((query) => {
    const brandAgreement = allBrands.map((brand) => {
      let mentioningModels = 0;

      for (const model of models) {
        const results = queryResults.filter(
          (entry) => entry.query === query && entry.model === model
        );
        const mentionedInAny = results.some((result) =>
          result.mentions.some((mention) => mention.brand === brand && mention.mentioned)
        );

        if (mentionedInAny) mentioningModels++;
      }

      return { brand, agreementRate: mentioningModels / models.length };
    });

    return { query, brandAgreement };
  });

  const avgAgreement = allBrands.map((brand) => {
    const rates = agreementData.map(
      (entry) => entry.brandAgreement.find((item) => item.brand === brand)?.agreementRate ?? 0
    );

    return {
      brand,
      avgAgreement: rates.reduce((sum, value) => sum + value, 0) / rates.length,
    };
  });

  const divergenceData = mentionRatesByBrand
    .map((item) => {
      const rates = models.map((model) => item.rates[model]);
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
    })
    .sort((a, b) => b.gap - a.gap);

  return (
    <div className="space-y-8">
      <section className="paper-panel rounded-[2.2rem] p-6">
        <p className="muted-label text-xs">Compare</p>
        <h2 className="mt-3 text-4xl text-[var(--ink)]">Where the AI tools agree or split</h2>
        <div className="mt-5 flex flex-wrap gap-4">
          {models.map((model) => {
            const meta = MODEL_META[model];
            return (
              <div key={model} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: meta.color }} />
                <span className="text-sm text-[var(--muted)]">{meta.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="paper-card overflow-hidden rounded-[1.75rem]">
        <div className="border-b border-[color:var(--line)] px-5 py-4">
          <h2 className="text-3xl text-[var(--ink)]">Brand mention rate by model</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            How often each model mentions each brand across the scenario set.
          </p>
        </div>
        <div className="space-y-6 p-5">
          {mentionRatesByBrand
            .sort(
              (a, b) =>
                Math.max(...models.map((model) => b.rates[model])) -
                Math.max(...models.map((model) => a.rates[model]))
            )
            .map((item) => (
              <div key={item.brand}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--ink)]">{item.brand}</span>
                  {item.isTarget && (
                    <span className="rounded-full border border-[color:var(--line)] bg-[rgba(255,255,255,0.5)] px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                      target
                    </span>
                  )}
                </div>
                <ComparisonBar values={item.rates} models={models} />
                <div className="mt-2 flex gap-1.5">
                  {models.map((model) => (
                    <div
                      key={model}
                      className="flex-1 text-center text-[10px] text-[var(--muted)]"
                    >
                      {MODEL_META[model].provider}
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </section>

      <section className="paper-card overflow-hidden rounded-[1.75rem]">
        <div className="border-b border-[color:var(--line)] px-5 py-4">
          <h2 className="text-3xl text-[var(--ink)]">Model divergence</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Which brands see the largest spread between their best and worst model.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--line)] text-left">
                <th className="px-4 py-3 font-medium text-[var(--muted)]">Brand</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--muted)]">Best model</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--muted)]">Best rate</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--muted)]">Worst model</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--muted)]">Worst rate</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--muted)]">Gap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--line)]">
              {divergenceData.map((row) => (
                <tr
                  key={row.brand}
                  className={row.isTarget ? "bg-[rgba(255,255,255,0.34)]" : "hover:bg-[rgba(255,255,255,0.22)]"}
                >
                  <td className="px-4 py-3 font-semibold text-[var(--ink)]">
                    {row.brand}
                    {row.isTarget && (
                      <span className="ml-2 rounded-full border border-[color:var(--line)] bg-[rgba(255,255,255,0.5)] px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                        target
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: MODEL_META[row.bestModel].color }}
                      />
                      <span className="text-xs text-[var(--ink)]">
                        {MODEL_META[row.bestModel].provider}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-xs text-[var(--ink)]">
                    {formatPercent(row.maxRate)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: MODEL_META[row.worstModel].color }}
                      />
                      <span className="text-xs text-[var(--ink)]">
                        {MODEL_META[row.worstModel].provider}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-xs text-[var(--ink)]">
                    {formatPercent(row.minRate)}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-xs font-semibold text-[var(--ink)]">
                    {formatPercent(row.gap)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="paper-card overflow-hidden rounded-[1.75rem]">
        <div className="border-b border-[color:var(--line)] px-5 py-4">
          <h2 className="text-3xl text-[var(--ink)]">Cross-model agreement</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            What share of models agree on mentioning each brand, averaged across queries.
          </p>
        </div>
        <div className="space-y-3 p-5">
          {avgAgreement
            .sort((a, b) => b.avgAgreement - a.avgAgreement)
            .map((item) => {
              const isTarget = item.brand === config.targetBrand;

              return (
                <div key={item.brand} className="flex items-center gap-3">
                  <span className={`w-28 truncate text-sm ${isTarget ? "font-semibold text-[var(--ink)]" : "text-[var(--muted)]"}`}>
                    {item.brand}
                  </span>
                  <div className="h-4 flex-1 overflow-hidden rounded-full bg-stone-200">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${item.avgAgreement * 100}%`,
                        backgroundColor: isTarget ? "#26211c" : "#7d7368",
                      }}
                    />
                  </div>
                  <span className="w-12 text-right font-mono text-xs text-[var(--muted)]">
                    {formatPercent(item.avgAgreement)}
                  </span>
                </div>
              );
            })}
        </div>
      </section>

      <div className="surface-inset rounded-[1.75rem] p-5 text-sm leading-relaxed text-[var(--ink)]">
        <strong>Why this view matters:</strong> the signal is not one answer from one model. The
        useful part is the spread between engines and which brands hold up across the full model
        basket.
      </div>
    </div>
  );
}
