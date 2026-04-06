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
    <div className="h-3 w-full overflow-hidden rounded-full bg-stone-200">
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

  return (
    <div className="space-y-8">
      <section className="paper-panel rounded-[2.2rem] p-6">
        <p className="muted-label text-xs">Results</p>
        <h2 className="mt-3 text-4xl text-[var(--ink)]">How the test turned out</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          This is a fast read on how often your product appeared, where it showed up, and which
          AI tools were most favorable.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="surface-inset rounded-[1.5rem] p-4 text-center">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Product</div>
            <div className="mt-2 text-2xl text-[var(--ink)]">{config.targetBrand}</div>
          </div>
          <div className="surface-inset rounded-[1.5rem] p-4 text-center">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Mention rate</div>
            <div className="mt-2 text-2xl text-[var(--ink)]">
              {formatPercent(target?.mentionRate ?? 0)}
            </div>
          </div>
          <div className="surface-inset rounded-[1.5rem] p-4 text-center">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Average rank</div>
            <div className="mt-2 text-2xl text-[var(--ink)]">
              #{(target?.avgPosition ?? 0).toFixed(1)}
            </div>
          </div>
          <div className="surface-inset rounded-[1.5rem] p-4 text-center">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Responses checked</div>
            <div className="mt-2 text-2xl text-[var(--ink)]">{queryResults.length}</div>
          </div>
        </div>
      </section>

      <section className="paper-card overflow-hidden rounded-[1.75rem]">
        <div className="border-b border-[color:var(--line)] px-5 py-4">
          <h2 className="text-3xl text-[var(--ink)]">Brand ranking</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Ranked by how often each brand was mentioned across all selected questions and tools.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--line)] text-left">
                <th className="w-8 px-4 py-3 font-medium text-[var(--muted)]">#</th>
                <th className="px-4 py-3 font-medium text-[var(--muted)]">Brand</th>
                <th className="w-48 px-4 py-3 font-medium text-[var(--muted)]">Mention rate</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--muted)]">Avg position</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--muted)]">Sentiment</th>
                {config.models.map((model) => (
                  <th key={model} className="px-4 py-3 text-center font-medium text-[var(--muted)]">
                    <span
                      className="mr-1 inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: MODEL_META[model].color }}
                    />
                    {MODEL_META[model].provider}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--line)]">
              {brandStats.map((brand, index) => (
                <tr
                  key={brand.brand}
                  className={brand.isTarget ? "bg-[rgba(255,255,255,0.38)]" : "hover:bg-[rgba(255,255,255,0.28)]"}
                >
                  <td className="px-4 py-3 font-mono text-xs text-[var(--muted)]">{index + 1}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${brand.isTarget ? "text-[var(--ink)]" : "text-[var(--ink)]"}`}>
                      {brand.brand}
                    </span>
                    {brand.isTarget && (
                      <span className="ml-2 rounded-full border border-[color:var(--line)] bg-[rgba(255,255,255,0.52)] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                        target
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MentionBar
                        rate={brand.mentionRate}
                        color={brand.isTarget ? "#26211c" : "#8a8175"}
                      />
                      <span className="w-12 text-right font-mono text-xs text-[var(--muted)]">
                        {formatPercent(brand.mentionRate)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {brand.avgPosition !== null ? (
                      <span className="font-mono text-sm text-[var(--ink)]">
                        #{brand.avgPosition.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-[var(--muted)]">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <SentimentDot sentiment="positive" />
                      <span className="text-xs text-[var(--muted)]">
                        {brand.sentimentBreakdown.positive}
                      </span>
                      <SentimentDot sentiment="neutral" />
                      <span className="text-xs text-[var(--muted)]">
                        {brand.sentimentBreakdown.neutral}
                      </span>
                      <SentimentDot sentiment="negative" />
                      <span className="text-xs text-[var(--muted)]">
                        {brand.sentimentBreakdown.negative}
                      </span>
                    </div>
                  </td>
                  {config.models.map((model) => {
                    const modelData = brand.modelBreakdown[model];

                    if (!modelData) {
                      return (
                        <td key={model} className="px-4 py-3 text-center text-[var(--muted)]">
                          &mdash;
                        </td>
                      );
                    }

                    return (
                      <td key={model} className="px-4 py-3 text-center">
                        <span className="font-mono text-xs font-medium text-[var(--ink)]">
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
            <div
              key={modelId}
              className="paper-card rounded-[1.5rem] p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: meta.color }} />
                <h3 className="text-lg text-[var(--ink)]">{meta.label}</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Brand mention rate</span>
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
                  <span className="text-[var(--muted)]">Research expectation</span>
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
        </div>
        <div className="space-y-3 p-4">
          {config.queries.slice(0, 5).map((query) => {
            const firstResults = config.models.map((model) =>
              queryResults.find(
                (result) =>
                  result.query === query &&
                  result.model === model &&
                  result.sampleIndex === 0
              )
            );

            return (
              <div key={query} className="overflow-hidden rounded-2xl border border-[color:var(--line)]">
                <div className="border-b border-[color:var(--line)] bg-[rgba(255,255,255,0.24)] px-4 py-3">
                  <p className="font-mono text-sm font-semibold text-[var(--ink)]">"{query}"</p>
                </div>
                <div className="divide-y divide-[color:var(--line)]">
                  {firstResults.map((result) => {
                    if (!result) return null;
                    const meta = MODEL_META[result.model];

                    return (
                      <div key={result.model} className="px-4 py-3">
                        <div className="mb-2 flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                          <span className="text-xs font-medium text-[var(--muted)]">{meta.label}</span>
                          <span className="text-xs text-[var(--muted)]">
                            {result.totalBrandsMentioned} brands mentioned
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-[var(--muted)]">
                          {result.responseSnippet}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {result.mentions
                            .filter((mention) => mention.mentioned)
                            .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
                            .map((mention) => (
                              <span
                                key={mention.brand}
                                className={`rounded-full border px-2 py-0.5 text-xs ${
                                  mention.brand === config.targetBrand
                                    ? "border-[color:var(--line-strong)] bg-[rgba(255,255,255,0.56)] text-[var(--ink)]"
                                    : "border-[color:var(--line)] bg-[rgba(255,255,255,0.3)] text-[var(--muted)]"
                                }`}
                              >
                                <SentimentDot sentiment={mention.sentiment} /> #{mention.position}{" "}
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
        <strong>Preview mode:</strong> this forecast is best used for comparing scenario design,
        prompt coverage, and model spread. Live collection and calibrated confidence still come
        next.
      </div>
    </div>
  );
}
