"use client";

import type { Dispatch, SetStateAction } from "react";
import type {
  CitedSourcesResponse,
  CompetitorAnalysisResponse,
  QueryBreakdownResponse,
} from "@/lib/api";
import type { BrandConfig } from "./types";

interface CompeteSectionProps {
  brand: BrandConfig;
  competitorUrls: Record<string, string>;
  setCompetitorUrls: Dispatch<SetStateAction<Record<string, string>>>;
  compAnalysis: CompetitorAnalysisResponse | null;
  competing: boolean;
  compError: string | null;
  queryBreakdown: QueryBreakdownResponse | null;
  citedSources: CitedSourcesResponse | null;
  loadingBreakdown: boolean;
  runCompetitorAnalysis: () => void;
}

export function CompeteSection({
  brand,
  competitorUrls,
  setCompetitorUrls,
  compAnalysis,
  competing,
  compError,
  queryBreakdown,
  citedSources,
  loadingBreakdown,
  runCompetitorAnalysis,
}: CompeteSectionProps) {
  return (
    <div className="space-y-6">
      <div className="paper-panel rounded-[2rem] p-6">
        <p className="muted-label text-xs mb-1">Competitor analysis</p>
        <h2 className="text-2xl text-[var(--ink)] mb-2">Gap analysis vs your competitors</h2>
        <p className="text-sm text-[var(--muted)] mb-6">
          We&apos;ll crawl your site and each competitor&apos;s site, then show you exactly where you&apos;re behind -
          grounded in real numbers, not generic advice.
        </p>

        {!brand.name.trim() && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800 mb-6">
            Set up your brand in the Visibility tab first.
          </div>
        )}

        {brand.name && (
          <>
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">Your website</p>
              <div className="paper-card rounded-[1.2rem] p-4 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ink)] text-xs font-bold text-[var(--paper)]">
                  {brand.name[0]?.toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--ink)]">{brand.name}</p>
                  <p className="text-xs text-[var(--muted)] truncate">{brand.website || "No URL set"}</p>
                </div>
              </div>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">
              Competitor URLs (optional - we can still compare mention rates without crawling)
            </p>
            <div className="space-y-2">
              {brand.competitors.map((competitor) => (
                <div key={competitor} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-sm text-[var(--ink)] font-semibold truncate">{competitor}</span>
                  <input
                    type="url"
                    value={competitorUrls[competitor] || ""}
                    onChange={(e) => setCompetitorUrls({ ...competitorUrls, [competitor]: e.target.value })}
                    placeholder={`https://${competitor.toLowerCase().replace(/\s+/g, "")}.com`}
                    className="field-input flex-1"
                  />
                </div>
              ))}
            </div>

            {compError && (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-800">
                {compError}
              </div>
            )}

            <button
              onClick={runCompetitorAnalysis}
              disabled={competing || !brand.website}
              className={`mt-6 rounded-2xl px-6 py-3.5 text-sm font-semibold ${
                competing || !brand.website
                  ? "cursor-not-allowed bg-[rgba(26,23,20,0.12)] text-[var(--muted)]"
                  : "btn-primary"
              }`}
            >
              {competing ? "Crawling competitors..." : "Run gap analysis"}
            </button>
          </>
        )}
      </div>

      {competing && (
        <div className="paper-panel rounded-[2rem] p-10 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--ink)] text-[var(--paper)] text-lg font-bold mb-4 animate-pulse">
            B
          </div>
          <p className="text-lg font-semibold text-[var(--ink)]">
            Crawling {brand.competitors.length + 1} websites...
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">Extracting GEO features from each competitor&apos;s content</p>
        </div>
      )}

      {compAnalysis && !competing && <CompetitorResults compAnalysis={compAnalysis} />}

      {queryBreakdown && queryBreakdown.queries.length > 0 && (
        <div className="paper-panel rounded-[2rem] p-6">
          <p className="muted-label text-xs mb-1">Per-query breakdown</p>
          <h2 className="text-2xl text-[var(--ink)] mb-2">Which queries are you winning?</h2>
          <p className="text-sm text-[var(--muted)] mb-6">
            Based on the last {queryBreakdown.days_covered} days of polling ({queryBreakdown.total_observations}{" "}
            observations).
          </p>
          <div className="space-y-3">
            {queryBreakdown.queries.slice(0, 10).map((query) => {
              const targetStat = query.brands.find((item) => item.brand.toLowerCase() === brand.name.toLowerCase());
              const targetPos = targetStat
                ? query.brands.findIndex((item) => item.brand.toLowerCase() === brand.name.toLowerCase()) + 1
                : null;
              const isWinning = query.winner?.toLowerCase() === brand.name.toLowerCase();

              return (
                <div key={query.query} className="paper-card rounded-[1.4rem] p-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <p className="text-sm font-medium text-[var(--ink)]">{query.query}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      {isWinning ? (
                        <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                          You win
                        </span>
                      ) : query.winner ? (
                        <span className="rounded-full bg-rose-100 text-rose-800 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                          {query.winner} wins
                        </span>
                      ) : null}
                      {targetPos && <span className="text-xs text-[var(--muted)]">Rank #{targetPos}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {query.brands.slice(0, 5).map((queryBrand, index) => {
                      const isTarget = queryBrand.brand.toLowerCase() === brand.name.toLowerCase();
                      return (
                        <span
                          key={queryBrand.brand}
                          className={`rounded-full px-2.5 py-1 text-xs font-mono ${
                            isTarget ? "bg-[var(--ink)] text-[var(--paper)]" : "surface-chip text-[var(--muted)]"
                          }`}
                        >
                          #{index + 1} {queryBrand.brand}{" "}
                          <span className="opacity-60">{queryBrand.mention_rate.toFixed(0)}%</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {citedSources && citedSources.sources.length > 0 && (
        <div className="paper-panel rounded-[2rem] p-6">
          <p className="muted-label text-xs mb-1">Sources AI models cite</p>
          <h2 className="text-2xl text-[var(--ink)] mb-2">
            When {citedSources.brand} is mentioned, which sources appear?
          </h2>
          <p className="text-sm text-[var(--muted)] mb-6">
            Domains appearing in {citedSources.total_responses_mentioning} responses where {citedSources.brand} was
            cited. These are your earned-media targets.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {citedSources.sources.slice(0, 20).map((source) => (
              <div key={source.domain} className="paper-card rounded-[1.2rem] px-4 py-2.5 flex items-center justify-between">
                <span className="text-sm text-[var(--ink)] truncate">{source.domain}</span>
                <span className="text-xs text-[var(--muted)] shrink-0 ml-2">
                  {source.count}x ({source.rate.toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loadingBreakdown && !queryBreakdown && (
        <div className="paper-panel rounded-[2rem] p-6 text-center text-sm text-[var(--muted)]">
          Loading query breakdown and cited sources...
        </div>
      )}
    </div>
  );
}

function CompetitorResults({ compAnalysis }: { compAnalysis: CompetitorAnalysisResponse }) {
  const successfulCompetitors = compAnalysis.competitors.filter((competitor) => competitor.analysis);
  const failedCompetitors = compAnalysis.competitors.filter((competitor) => !competitor.analysis);

  return (
    <>
      <div className="paper-panel rounded-[2rem] p-6">
        <p className="muted-label text-xs mb-1">Crawl summary</p>
        <div className="grid gap-4 sm:grid-cols-3 mt-4">
          <div className="metric-card">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Target</p>
            <p className="mt-1 text-lg text-[var(--ink)]">{compAnalysis.target.brand}</p>
            <p className="text-xs text-[var(--muted)] truncate">{compAnalysis.target.url}</p>
          </div>
          <div className="metric-card">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Crawled</p>
            <p className="mt-1 text-3xl text-[var(--ink)]">
              {successfulCompetitors.length}
              <span className="text-lg text-[var(--muted)]">/{compAnalysis.competitors.length}</span>
            </p>
            <p className="text-xs text-[var(--muted)]">competitors</p>
          </div>
          <div className="metric-card">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Gaps found</p>
            <p className="mt-1 text-3xl text-rose-700">
              {compAnalysis.gaps.filter((gap) => gap.gap_direction === "behind").length}
            </p>
            <p className="text-xs text-[var(--muted)]">features where you lag</p>
          </div>
        </div>

        {failedCompetitors.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Could not crawl: {failedCompetitors.map((competitor) => `${competitor.brand} (${competitor.error})`).join(", ")}
          </div>
        )}
      </div>

      {compAnalysis.recommendations.length > 0 && (
        <div className="paper-panel rounded-[2rem] p-6">
          <p className="muted-label text-xs mb-1">Specific actions</p>
          <h2 className="text-2xl text-[var(--ink)] mb-2">What to do, grounded in real competitor data</h2>
          <p className="text-sm text-[var(--muted)] mb-6">
            Top {compAnalysis.recommendations.length} actions ranked by gap size and research-backed impact.
          </p>

          <div className="space-y-4">
            {compAnalysis.recommendations.map((recommendation, index) => {
              const priorityColor =
                recommendation.priority === "high"
                  ? "border-rose-300 bg-rose-50/50"
                  : recommendation.priority === "medium"
                    ? "border-amber-300 bg-amber-50/50"
                    : "border-[color:var(--line)]";
              const priorityBadge =
                recommendation.priority === "high"
                  ? "bg-rose-100 text-rose-800"
                  : recommendation.priority === "medium"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-gray-100 text-gray-700";

              return (
                <div key={recommendation.feature} className={`rounded-[1.4rem] border-2 ${priorityColor} p-5`}>
                  <div className="flex items-start gap-3 mb-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ink)] text-sm font-bold text-[var(--paper)] shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-[var(--ink)]">{recommendation.action}</h3>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${priorityBadge}`}>
                          {recommendation.priority}
                        </span>
                        <span className="rounded-full border border-[color:var(--line)] bg-[rgba(255,255,255,0.7)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
                          {recommendation.effort} effort
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]">{recommendation.detail}</p>
                      <p className="mt-2 text-xs italic text-[var(--muted)]">{recommendation.evidence}</p>

                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1 flex items-center gap-2 text-xs">
                          <span className="text-[var(--muted)] w-16 shrink-0">You:</span>
                          <div className="flex-1 h-2 bg-[rgba(114,105,92,0.15)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--muted)] rounded-full"
                              style={{
                                width: `${Math.max(
                                  2,
                                  (recommendation.target_value / Math.max(recommendation.leader_value, 1)) * 100,
                                )}%`,
                              }}
                            />
                          </div>
                          <span className="font-mono text-[var(--ink)] w-12 text-right">{recommendation.target_value}</span>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-3">
                        <div className="flex-1 flex items-center gap-2 text-xs">
                          <span className="text-[var(--muted)] w-16 shrink-0 truncate">{recommendation.leader_brand}:</span>
                          <div className="flex-1 h-2 bg-[rgba(114,105,92,0.15)] rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: "100%" }} />
                          </div>
                          <span className="font-mono text-[var(--ink)] w-12 text-right">{recommendation.leader_value}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {compAnalysis.gaps.length > 0 && <FeatureComparison compAnalysis={compAnalysis} />}
      <ModelGuidance compAnalysis={compAnalysis} />
    </>
  );
}

function FeatureComparison({ compAnalysis }: { compAnalysis: CompetitorAnalysisResponse }) {
  return (
    <div className="paper-panel rounded-[2rem] p-6">
      <p className="muted-label text-xs mb-1">Full comparison</p>
      <h2 className="text-2xl text-[var(--ink)] mb-6">All features side-by-side</h2>
      <div className="paper-card rounded-[1.4rem] overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[rgba(255,255,255,0.42)]">
              {["Feature", "You", "Competitors avg", "Leader", "Leader value", "Status"].map((heading) => (
                <th
                  key={heading}
                  className={`border-b border-[color:var(--line)] px-4 py-3 font-semibold text-[var(--ink)] ${
                    heading === "Feature" || heading === "Leader" ? "text-left" : "text-right"
                  }`}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--line)]">
            {compAnalysis.gaps.map((gap) => {
              const statusColor =
                gap.gap_direction === "behind"
                  ? "text-rose-700"
                  : gap.gap_direction === "ahead"
                    ? "text-emerald-700"
                    : "text-[var(--muted)]";
              const statusLabel =
                gap.gap_direction === "behind"
                  ? `behind by ${Math.abs(gap.gap).toFixed(1)}`
                  : gap.gap_direction === "ahead"
                    ? `ahead by ${Math.abs(gap.gap).toFixed(1)}`
                    : gap.gap_direction === "even"
                      ? "even"
                      : "-";
              return (
                <tr key={gap.feature} className="hover:bg-[rgba(255,255,255,0.28)]">
                  <td className="px-4 py-3 text-[var(--ink)]">{gap.label}</td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--ink)]">{gap.target_value}</td>
                  <td className="px-4 py-3 text-right text-[var(--muted)]">{gap.competitor_avg.toFixed(1)}</td>
                  <td className="px-4 py-3 text-[var(--ink)] text-xs">{gap.leader_brand}</td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--ink)]">{gap.leader_value}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${statusColor}`}>{statusLabel}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModelGuidance({ compAnalysis }: { compAnalysis: CompetitorAnalysisResponse }) {
  return (
    <div className="paper-panel rounded-[2rem] p-6">
      <p className="muted-label text-xs mb-1">Per-model strategy</p>
      <h2 className="text-2xl text-[var(--ink)] mb-2">Different AI models need different tactics</h2>
      <p className="text-sm text-[var(--muted)] mb-6">
        Yext&apos;s 17.2M citation study: no single optimization works across all models. What wins on Gemini does
        not win on Claude.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(compAnalysis.model_guidance).map(([key, guidance]) => {
          const color = key === "chatgpt" ? "#10a37f" : key === "claude" ? "#d97706" : "#4285f4";
          return (
            <div key={key} className="paper-card rounded-[1.4rem] p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                <p className="text-sm font-semibold text-[var(--ink)]">{guidance.label}</p>
              </div>
              <p className="text-xs text-[var(--muted)] mb-2">
                <strong className="text-[var(--ink)]">Mix:</strong> {guidance.knowledge_mix}
              </p>
              <p className="text-xs text-[var(--muted)] mb-3">
                <strong className="text-[var(--ink)]">Prefers:</strong> {guidance.prefers}
              </p>
              <ul className="space-y-1.5">
                {guidance.actions.map((action) => (
                  <li key={action} className="text-xs text-[var(--muted)] flex items-start gap-2">
                    <span className="mt-1.5 inline-block h-1 w-1 flex-none rounded-full bg-[var(--ink)]" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
