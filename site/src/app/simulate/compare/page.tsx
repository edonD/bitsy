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
    <div className="flex h-20 items-end gap-2">
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
              className="w-full rounded-t-[0.8rem]"
              style={{
                height: `${Math.max(height, 5)}%`,
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

  const targetRates = mentionRatesByBrand.find((item) => item.isTarget);
  const targetAgreement = avgAgreement.find((item) => item.brand === config.targetBrand);
  const targetSpread = divergenceData.find((item) => item.isTarget);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr),320px]">
        <div className="paper-panel rounded-[2.2rem] p-6 md:p-7">
          <p className="muted-label text-xs">Compare</p>
          <h2 className="mt-3 text-4xl text-[var(--ink)]">
            Model spread for {config.targetBrand}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
            {targetSpread
              ? `${MODEL_META[targetSpread.bestModel].provider} is the strongest tool for ${config.targetBrand}, while ${MODEL_META[targetSpread.worstModel].provider} is the weakest. The current spread is ${formatPercent(targetSpread.gap)}.`
              : "Review the model spread to see which engines are most favorable."}
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                Best tool
              </p>
              <p className="mt-2 text-2xl text-[var(--ink)]">
                {targetSpread ? MODEL_META[targetSpread.bestModel].provider : "-"}
              </p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                Weakest tool
              </p>
              <p className="mt-2 text-2xl text-[var(--ink)]">
                {targetSpread ? MODEL_META[targetSpread.worstModel].provider : "-"}
              </p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                Spread
              </p>
              <p className="mt-2 text-2xl text-[var(--ink)]">
                {targetSpread ? formatPercent(targetSpread.gap) : "-"}
              </p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                Agreement
              </p>
              <p className="mt-2 text-2xl text-[var(--ink)]">
                {targetAgreement ? formatPercent(targetAgreement.avgAgreement) : "-"}
              </p>
            </div>
          </div>
        </div>

        <aside className="paper-card rounded-[2rem] p-5">
          <p className="muted-label text-xs">Tools in this run</p>
          <div className="mt-4 space-y-3">
            {models.map((model) => (
              <div key={model} className="flex items-center gap-2 text-sm text-[var(--muted)]">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: MODEL_META[model].color }}
                />
                <span>{MODEL_META[model].provider}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>

      {targetRates && (
        <section className="paper-card rounded-[1.75rem] p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="muted-label text-xs">Target brand</p>
              <h2 className="mt-2 text-3xl text-[var(--ink)]">
                {config.targetBrand} by model
              </h2>
            </div>
            <span className="font-mono text-xs text-[var(--muted)]">
              {models.length} tools selected
            </span>
          </div>
          <div className="mt-5">
            <ComparisonBar values={targetRates.rates} models={models} />
            <div className="mt-3 grid gap-2 sm:grid-cols-4">
              {models.map((model) => (
                <div key={model} className="surface-inset rounded-[1rem] px-3 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: MODEL_META[model].color }}
                    />
                    <span className="text-[var(--ink)]">{MODEL_META[model].provider}</span>
                  </div>
                  <div className="mt-2 font-mono text-xs text-[var(--muted)]">
                    {formatPercent(targetRates.rates[model])}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="paper-card overflow-hidden rounded-[1.75rem]">
        <div className="border-b border-[color:var(--line)] px-5 py-4">
          <h2 className="text-3xl text-[var(--ink)]">All brands by model</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            How often each model mentions each brand across the current scenario set.
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
            Which brands see the biggest gap between their best and worst engine.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--line)] text-left">
                <th className="px-4 py-3 font-medium text-[var(--muted)]">Brand</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--muted)]">
                  Best tool
                </th>
                <th className="px-4 py-3 text-center font-medium text-[var(--muted)]">
                  Best rate
                </th>
                <th className="px-4 py-3 text-center font-medium text-[var(--muted)]">
                  Weakest tool
                </th>
                <th className="px-4 py-3 text-center font-medium text-[var(--muted)]">
                  Weakest rate
                </th>
                <th className="px-4 py-3 text-center font-medium text-[var(--muted)]">Gap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--line)]">
              {divergenceData.map((row) => (
                <tr
                  key={row.brand}
                  className={
                    row.isTarget
                      ? "bg-[rgba(255,255,255,0.34)]"
                      : "hover:bg-[rgba(255,255,255,0.22)]"
                  }
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
            What share of tools agree on mentioning each brand, averaged across queries.
          </p>
        </div>
        <div className="space-y-3 p-5">
          {avgAgreement
            .sort((a, b) => b.avgAgreement - a.avgAgreement)
            .map((item) => {
              const isTarget = item.brand === config.targetBrand;

              return (
                <div key={item.brand} className="flex items-center gap-3">
                  <span
                    className={`w-28 truncate text-sm ${
                      isTarget ? "font-semibold text-[var(--ink)]" : "text-[var(--muted)]"
                    }`}
                  >
                    {item.brand}
                  </span>
                  <div className="h-4 flex-1 overflow-hidden rounded-full bg-stone-200">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${item.avgAgreement * 100}%`,
                        backgroundColor: isTarget ? "#191612" : "#7d7368",
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
        <strong>Why this matters:</strong> the useful signal is not one answer from one model. It
        is the spread between engines and which brands hold up across the full basket.
      </div>
    </div>
  );
}
