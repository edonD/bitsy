"use client";

import Link from "next/link";
import { useSimulation } from "@/components/SimulationProvider";
import { MODEL_META } from "@/lib/simulation-engine";

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function SentimentDot({ sentiment }: { sentiment: "positive" | "neutral" | "negative" }) {
  const colors = {
    positive: "bg-emerald-500",
    neutral: "bg-stone-400",
    negative: "bg-rose-500",
  };

  return <span className={`inline-block h-2 w-2 rounded-full ${colors[sentiment]}`} />;
}

function MentionBar({ rate, color }: { rate: number; color: string }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-200">
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
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-stone-900 border-t-transparent" />
          <p className="text-sm text-[var(--muted)]">Running simulation...</p>
        </div>
      </div>
    );
  }

  if (!currentResult) {
    return (
      <div className="py-20 text-center">
        <p className="mb-4 text-[var(--muted)]">No simulation results yet.</p>
        <Link
          href="/simulate"
          className="btn-primary rounded-full px-5 py-3 text-sm font-semibold"
        >
          Start a test
        </Link>
      </div>
    );
  }

  const { config, brandStats, modelStats, queryResults } = currentResult;
  const target = brandStats.find((brand) => brand.isTarget);
  const leader = brandStats[0];
  const targetRank = brandStats.findIndex((brand) => brand.isTarget) + 1;
  const targetQueryHits = new Set(
    queryResults
      .filter((result) =>
        result.mentions.some(
          (mention) => mention.brand === config.targetBrand && mention.mentioned
        )
      )
      .map((result) => result.query)
  ).size;

  const modelSpread = config.models
    .map((model) => ({
      model,
      rate: target?.modelBreakdown[model]?.mentionRate ?? 0,
    }))
    .sort((a, b) => b.rate - a.rate);

  const bestModel = modelSpread[0];
  const weakestModel = modelSpread[modelSpread.length - 1];
  const gapToLeader =
    target && leader && leader.brand !== target.brand
      ? leader.mentionRate - target.mentionRate
      : 0;

  const summary =
    target && leader
      ? leader.brand === target.brand
        ? `${target.brand} leads this scenario and appears in ${formatPercent(
            target.mentionRate
          )} of sampled responses. ${MODEL_META[bestModel.model].provider} is currently the most favorable tool.`
        : `${target.brand} ranks #${targetRank} and trails ${leader.brand} by ${formatPercent(
            gapToLeader
          )}. ${MODEL_META[bestModel.model].provider} is currently the best place to gain visibility.`
      : "Review the current run, then compare engines to see where the strongest opportunities sit.";

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr),320px]">
        <div className="paper-panel rounded-[2.2rem] p-6 md:p-7">
          <p className="muted-label text-xs">Results</p>
          <h2 className="mt-3 text-4xl leading-tight text-[var(--ink)]">
            {target ? formatPercent(target.mentionRate) : "0.0%"} of responses mention{" "}
            {config.targetBrand}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
            {summary}
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Rank</p>
              <p className="mt-2 text-3xl text-[var(--ink)]">#{targetRank}</p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                Avg position
              </p>
              <p className="mt-2 text-3xl text-[var(--ink)]">
                {target?.avgPosition ? `#${target.avgPosition.toFixed(1)}` : "-"}
              </p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                Strongest tool
              </p>
              <p className="mt-2 text-3xl text-[var(--ink)]">
                {MODEL_META[bestModel.model].provider}
              </p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                Questions hit
              </p>
              <p className="mt-2 text-3xl text-[var(--ink)]">
                {targetQueryHits}/{config.queries.length}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/simulate"
              className="btn-secondary rounded-full px-5 py-3 text-sm font-semibold"
            >
              Edit test
            </Link>
            <Link
              href="/simulate/compare"
              className="btn-primary rounded-full px-5 py-3 text-sm font-semibold"
            >
              Compare tools
            </Link>
          </div>
        </div>

        <aside className="paper-card rounded-[2rem] p-5">
          <p className="muted-label text-xs">Quick take</p>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--muted)]">
            <div className="surface-inset rounded-[1.25rem] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Best current read
              </p>
              <p className="mt-2 text-[var(--ink)]">
                {MODEL_META[bestModel.model].provider} mentions {config.targetBrand} most often.
              </p>
            </div>
            <div className="surface-inset rounded-[1.25rem] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Weakest current read
              </p>
              <p className="mt-2 text-[var(--ink)]">
                {MODEL_META[weakestModel.model].provider} is the lowest-visibility tool in this run.
              </p>
            </div>
            <div className="surface-inset rounded-[1.25rem] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Sample size
              </p>
              <p className="mt-2 text-[var(--ink)]">
                {queryResults.length} responses across {config.models.length} tools and{" "}
                {config.samplesPerQuery} repeats per question.
              </p>
            </div>
          </div>
        </aside>
      </section>

      <section className="paper-card overflow-hidden rounded-[1.75rem]">
        <div className="border-b border-[color:var(--line)] px-5 py-4">
          <h2 className="text-3xl text-[var(--ink)]">Brand ranking</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Ranked by how often each brand was mentioned across the current run.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--line)] text-left">
                <th className="w-8 px-4 py-3 font-medium text-[var(--muted)]">#</th>
                <th className="px-4 py-3 font-medium text-[var(--muted)]">Brand</th>
                <th className="w-56 px-4 py-3 font-medium text-[var(--muted)]">Mention rate</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--muted)]">
                  Avg position
                </th>
                <th className="px-4 py-3 text-center font-medium text-[var(--muted)]">
                  Strongest tool
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--line)]">
              {brandStats.map((brand, index) => {
                const strongest = config.models
                  .map((model) => ({
                    model,
                    rate: brand.modelBreakdown[model]?.mentionRate ?? 0,
                  }))
                  .sort((a, b) => b.rate - a.rate)[0];

                return (
                  <tr
                    key={brand.brand}
                    className={
                      brand.isTarget
                        ? "bg-[rgba(255,255,255,0.38)]"
                        : "hover:bg-[rgba(255,255,255,0.28)]"
                    }
                  >
                    <td className="px-4 py-3 font-mono text-xs text-[var(--muted)]">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-[var(--ink)]">{brand.brand}</span>
                      {brand.isTarget && (
                        <span className="ml-2 rounded-full border border-[color:var(--line)] bg-[rgba(255,255,255,0.52)] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                          target
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <MentionBar
                          rate={brand.mentionRate}
                          color={brand.isTarget ? "#191612" : "#7b7267"}
                        />
                        <span className="w-12 text-right font-mono text-xs text-[var(--muted)]">
                          {formatPercent(brand.mentionRate)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono text-sm text-[var(--ink)]">
                        {brand.avgPosition ? `#${brand.avgPosition.toFixed(1)}` : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: MODEL_META[strongest.model].color }}
                        />
                        <span className="text-xs text-[var(--ink)]">
                          {MODEL_META[strongest.model].provider}
                        </span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="muted-label text-xs">By tool</p>
          <h2 className="mt-2 text-3xl text-[var(--ink)]">Which AI tools were strongest</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {config.models.map((modelId) => {
            const meta = MODEL_META[modelId];
            const stats = modelStats[modelId];

            if (!stats) return null;

            return (
              <div key={modelId} className="paper-card rounded-[1.5rem] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: meta.color }} />
                  <h3 className="text-lg text-[var(--ink)]">{meta.provider}</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Target mention rate</span>
                    <span className="font-mono text-[var(--ink)]">
                      {formatPercent(stats.targetMentionRate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Avg brands/response</span>
                    <span className="font-mono text-[var(--ink)]">
                      {stats.avgBrandsMentioned.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Typical citations</span>
                    <span className="font-mono text-[var(--muted)]">
                      ~{meta.avgCitationsPerResponse}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="paper-card overflow-hidden rounded-[1.75rem]">
        <div className="border-b border-[color:var(--line)] px-5 py-4">
          <h2 className="text-3xl text-[var(--ink)]">Sample responses</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            A quick read on how the answers are phrased across the first few questions.
          </p>
        </div>
        <div className="space-y-4 p-4">
          {config.queries.slice(0, 3).map((query) => {
            const firstResults = config.models.map((model) =>
              queryResults.find(
                (result) =>
                  result.query === query &&
                  result.model === model &&
                  result.sampleIndex === 0
              )
            );

            return (
              <div key={query} className="overflow-hidden rounded-[1.5rem] border border-[color:var(--line)]">
                <div className="border-b border-[color:var(--line)] bg-[rgba(255,255,255,0.24)] px-4 py-3">
                  <p className="font-mono text-sm font-semibold text-[var(--ink)]">{query}</p>
                </div>
                <div className="space-y-3 p-4">
                  {firstResults.map((result) => {
                    if (!result) return null;
                    const meta = MODEL_META[result.model];

                    return (
                      <div key={result.model} className="surface-inset rounded-[1.2rem] px-4 py-4">
                        <div className="mb-2 flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                          <span className="text-xs font-medium text-[var(--muted)]">
                            {meta.provider}
                          </span>
                          <span className="text-xs text-[var(--muted)]">
                            {result.totalBrandsMentioned} brands mentioned
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-[var(--ink)]">
                          {result.responseSnippet}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {result.mentions
                            .filter((mention) => mention.mentioned)
                            .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
                            .map((mention) => (
                              <span
                                key={mention.brand}
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
                                  mention.brand === config.targetBrand
                                    ? "border-[color:var(--line-strong)] bg-[rgba(255,255,255,0.68)] text-[var(--ink)]"
                                    : "border-[color:var(--line)] bg-[rgba(255,255,255,0.38)] text-[var(--muted)]"
                                }`}
                              >
                                <SentimentDot sentiment={mention.sentiment} />#{mention.position}{" "}
                                {mention.brand}
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
      </section>

      <div className="surface-inset rounded-[1.75rem] p-5 text-sm leading-relaxed text-[var(--ink)]">
        <strong>Preview mode:</strong> this is best used to compare scenario design and model
        spread. Live collection and calibrated confidence still come next.
      </div>
    </div>
  );
}
