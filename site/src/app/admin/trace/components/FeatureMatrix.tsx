"use client";

import type { CSSProperties, ReactNode } from "react";
import { CONTENT_FEATURES, FEATURE_LABELS, MATRIX_FEATURE_GROUPS, MODEL_LABELS } from "../constants";
import {
  formatAvgPosition,
  formatCompactNumber,
  formatFraction,
  formatPercent,
  formatPoints,
  formatRatio,
  formatSignedNumber,
} from "../format";
import { buildFeatureMatrixRows } from "../logic";
import type { CallCard, FeatureMatrixRow, TraceFeatureRow } from "../types";

const PERCENT_FEATURES = new Set([
  "mention_rate",
  "top1_rate",
  "top3_rate",
  "positive_rate",
  "negative_rate",
  "net_sentiment",
  "competitor_avg_rate",
  "share_of_mentions",
  "model_agreement",
  "query_coverage",
]);

const POINT_FEATURES = new Set(["model_spread"]);
const COUNT_FEATURES = new Set([
  "brands_ahead",
  "quotation_count",
  "citation_count",
  "content_length",
  "heading_count",
]);
const RATIO_FEATURES = new Set(["vs_best_competitor"]);

function getFeatureNumber(row: TraceFeatureRow, key: string): number {
  const value = row[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}


function isContentFeature(key: string): boolean {
  return CONTENT_FEATURES.includes(key);
}

function getContentMeasuredForTarget(rows: FeatureMatrixRow[]): boolean {
  const targetRow = rows.find((row) => row.isTarget);
  if (!targetRow) return false;
  return CONTENT_FEATURES.some((key) => getFeatureNumber(targetRow.featureValues, key) !== 0);
}

function getSecondaryNote(row: FeatureMatrixRow, key: string): string | null {
  switch (key) {
    case "mention_rate":
      return `${formatFraction(row.counts.mentionCount, row.counts.totalCalls)} mentions`;
    case "share_of_mentions":
      return `${formatFraction(
        row.counts.mentionCount,
        row.counts.totalMentionPool
      )} tracked-brand mentions`;
    case "query_coverage":
      return `${formatFraction(row.counts.queryHitCount, row.counts.queryCount)} queries`;
    case "avg_position":
    case "position_std":
      return `${row.counts.positionCount} ranked obs`;
    case "top1_rate":
      return `${formatFraction(row.counts.top1Count, row.counts.positionCount)} ranked`;
    case "top3_rate":
      return `${formatFraction(row.counts.top3Count, row.counts.positionCount)} ranked`;
    case "positive_rate":
      return `${formatFraction(row.counts.positiveCount, row.counts.sentimentCount)} sentiment`;
    case "negative_rate":
      return `${formatFraction(row.counts.negativeCount, row.counts.sentimentCount)} sentiment`;
    case "net_sentiment":
      return `${row.counts.sentimentCount} sentiment obs`;
    default:
      return null;
  }
}

function getFeatureCellValue(
  row: FeatureMatrixRow,
  key: string,
  contentMeasuredForTarget: boolean
): { primary: string; secondary: string | null; unavailable?: boolean } {
  if (isContentFeature(key) && (!row.isTarget || !contentMeasuredForTarget)) {
    return {
      primary: "n/a",
      secondary: row.isTarget ? "target URL not measured" : "target-only crawl feature",
      unavailable: true,
    };
  }

  const value = getFeatureNumber(row.featureValues, key);
  const secondary = getSecondaryNote(row, key);

  if (key === "avg_position") {
    const displayValue = row.counts.positionCount > 0 ? value : 0;
    return { primary: formatAvgPosition(displayValue), secondary };
  }
  if (RATIO_FEATURES.has(key)) {
    return { primary: formatRatio(value), secondary };
  }
  if (POINT_FEATURES.has(key)) {
    return { primary: formatPoints(value), secondary };
  }
  if (PERCENT_FEATURES.has(key)) {
    return { primary: formatPercent(value), secondary };
  }
  if (COUNT_FEATURES.has(key)) {
    return { primary: formatCompactNumber(value, 0), secondary };
  }
  return { primary: formatCompactNumber(value), secondary };
}

function getDisplayedFeatureGroups(features: TraceFeatureRow[]) {
  const available = Object.keys(features[0] ?? {}).filter((key) => key !== "brand");
  const availableSet = new Set(available);
  const grouped = new Set(MATRIX_FEATURE_GROUPS.flatMap((group) => group.columns));
  const groups = MATRIX_FEATURE_GROUPS.map((group) => ({
    ...group,
    columns: group.columns.filter((column) => availableSet.has(column)),
  })).filter((group) => group.columns.length > 0);

  const remaining = available.filter((column) => !grouped.has(column));
  if (remaining.length > 0) {
    groups.push({ key: "other", label: "Other", columns: remaining });
  }

  return groups;
}

function getImportanceRanks(importance: Record<string, number>, columns: string[]) {
  const visible = new Set(columns);
  return new Map(
    Object.entries(importance)
      .filter(([key]) => visible.has(key))
      .sort((a, b) => b[1] - a[1])
      .map(([key], index) => [key, index + 1] as const)
  );
}

function getInfluenceStyle(rank?: number): CSSProperties | undefined {
  if (!rank || rank > 5) return undefined;
  const alpha = rank === 1 ? 0.16 : rank <= 3 ? 0.1 : 0.06;
  return { backgroundColor: `rgba(16, 163, 127, ${alpha})` };
}

function renderMetricLine(label: string, value: string, note?: string | null) {
  return (
    <div className="rounded-lg border border-[color:var(--line)]/70 bg-white/55 px-2 py-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
          {label}
        </span>
        <span className="font-mono text-[11px] text-[var(--ink)]">{value}</span>
      </div>
      {note ? <div className="mt-1 text-[10px] text-[var(--muted)]">{note}</div> : null}
    </div>
  );
}

function renderFeatureCell(
  row: FeatureMatrixRow,
  key: string,
  contentMeasuredForTarget: boolean,
  rank?: number
) {
  const cell = getFeatureCellValue(row, key, contentMeasuredForTarget);
  return (
    <td
      key={key}
      className="px-3 py-2.5 text-right align-top font-mono text-[var(--muted)]"
      style={getInfluenceStyle(rank)}
    >
      <div className={cell.unavailable ? "italic" : "text-[var(--ink)]"}>{cell.primary}</div>
      {cell.secondary ? (
        <div className="mt-1 text-[10px] font-sans text-[var(--muted)]">{cell.secondary}</div>
      ) : null}
    </td>
  );
}

function renderReliabilityCell(row: FeatureMatrixRow): ReactNode {
  return (
    <td className="min-w-[12rem] px-3 py-2.5 align-top">
      <div className="space-y-1.5">
        {renderMetricLine(
          "Complete",
          formatPercent(row.reliability.completedRate),
          `${formatFraction(row.reliability.completedCount, row.reliability.expectedCount)} done`
        )}
        {renderMetricLine(
          "Fallback",
          row.reliability.fallbackRate === null
            ? "n/a"
            : formatPercent(row.reliability.fallbackRate),
          `${formatFraction(row.reliability.fallbackMentions, row.counts.mentionCount)} mentions`
        )}
        {renderMetricLine(
          "Est. pos",
          row.reliability.estimatedPositionRate === null
            ? "n/a"
            : formatPercent(row.reliability.estimatedPositionRate),
          `${formatFraction(
            row.reliability.estimatedPositions,
            row.counts.positionCount
          )} ranked`
        )}
        {renderMetricLine(
          "Search used",
          row.reliability.searchUsedRate === null
            ? "n/a"
            : formatPercent(row.reliability.searchUsedRate),
          `${formatFraction(
            row.reliability.searchUsedMentions,
            row.reliability.searchMentions
          )} search mentions`
        )}
      </div>
    </td>
  );
}

function renderModelSplitCell(row: FeatureMatrixRow): ReactNode {
  return (
    <td className="min-w-[12rem] px-3 py-2.5 align-top">
      <div className="space-y-1.5">
        {row.modelSplits.map((split) => (
          <div key={split.model}>
            {renderMetricLine(
              MODEL_LABELS[split.model] || split.model,
              formatPercent(split.rate),
              `${formatFraction(split.mentions, split.total)} mentions`
            )}
          </div>
        ))}
      </div>
    </td>
  );
}

function renderGapCell(row: FeatureMatrixRow): ReactNode {
  return (
    <td className="min-w-[11rem] px-3 py-2.5 align-top">
      <div className="space-y-1.5">
        {renderMetricLine("To leader", formatPoints(-row.gaps.mentionGapToLeader))}
        {renderMetricLine("Vs target", formatPoints(row.gaps.mentionVsTarget))}
        {renderMetricLine(
          "Pos gap",
          row.gaps.positionGapToBest === null
            ? "n/a"
            : formatSignedNumber(row.gaps.positionGapToBest, 1),
          row.gaps.positionGapToBest === null ? "never ranked" : "higher is worse"
        )}
      </div>
    </td>
  );
}

export function FeatureMatrix({
  features,
  cards,
  target,
  importance,
}: {
  features: TraceFeatureRow[];
  cards: CallCard[];
  target: string;
  importance: Record<string, number>;
}) {
  if (features.length === 0) return null;

  const rows = buildFeatureMatrixRows({
    features,
    cards,
    target,
    queryCount: new Set(cards.map((card) => card.query)).size,
  });
  const featureGroups = getDisplayedFeatureGroups(features);
  const featureColumns = featureGroups.flatMap((group) => group.columns);
  const importanceRanks = getImportanceRanks(importance, featureColumns);
  const contentMeasuredForTarget = getContentMeasuredForTarget(rows);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-[color:var(--line)] bg-white/55 px-4 py-3 text-sm text-[var(--muted)]">
          Rates now show the raw count behind them, so the matrix explains the sample size as
          well as the percentage.
        </div>
        <div className="rounded-xl border border-[color:var(--line)] bg-white/55 px-4 py-3 text-sm text-[var(--muted)]">
          The three diagnostic columns are not surrogate inputs. They explain data quality,
          cross-model spread, and how far each row is from the leader and target.
        </div>
        <div className="rounded-xl border border-[color:var(--line)] bg-white/55 px-4 py-3 text-sm text-[var(--muted)]">
          Green-tinted feature columns are the most influential ones in the current surrogate
          fit. <span className="font-semibold text-[var(--ink)]">Share of tracked mentions</span>
          {" "}uses all extracted tracked-brand mentions as the denominator, so one response can
          add more than one count. <span className="font-semibold text-[var(--ink)]">n/a</span>
          {" "}means not measured, not a real zero.
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[color:var(--line)]">
        <table className="min-w-max text-xs">
          <thead>
            <tr className="bg-white/60 text-[var(--muted)]">
              <th
                rowSpan={2}
                className="sticky left-0 z-20 bg-white/90 px-3 py-2 text-left font-semibold"
              >
                Brand
              </th>
              <th colSpan={3} className="px-3 py-2 text-center font-semibold">
                Diagnostics
              </th>
              {featureGroups.map((group) => (
                <th
                  key={group.key}
                  colSpan={group.columns.length}
                  className="border-l border-[color:var(--line)] px-3 py-2 text-center font-semibold"
                >
                  {group.label}
                </th>
              ))}
            </tr>
            <tr className="bg-white/50 text-[var(--muted)]">
              <th className="min-w-[12rem] px-3 py-2 text-left font-normal">Data quality</th>
              <th className="min-w-[12rem] px-3 py-2 text-left font-normal">Per-model mention</th>
              <th className="min-w-[11rem] px-3 py-2 text-left font-normal">Gaps</th>
              {featureGroups.map((group) =>
                group.columns.map((column) => {
                  const rank = importanceRanks.get(column);
                  return (
                    <th
                      key={column}
                      className="border-l border-[color:var(--line)] px-3 py-2 text-right font-normal whitespace-nowrap"
                      style={getInfluenceStyle(rank)}
                      title={FEATURE_LABELS[column] || column}
                    >
                      <div className="flex items-center justify-end gap-2">
                        {rank && rank <= 5 ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                            #{rank}
                          </span>
                        ) : null}
                        <span>{FEATURE_LABELS[column] || column}</span>
                      </div>
                    </th>
                  );
                })
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.brand}
                className={`border-t border-[color:var(--line)] ${
                  row.isTarget ? "bg-emerald-50/35" : ""
                }`}
              >
                <td className="sticky left-0 z-10 bg-[var(--paper)] px-3 py-2.5 align-top font-semibold text-[var(--ink)]">
                  <div className="flex items-center gap-2">
                    <span>{row.brand}</span>
                    {row.isTarget ? (
                      <span className="rounded-full bg-[var(--ink)] px-2 py-0.5 text-[10px] font-semibold text-[var(--paper)]">
                        target
                      </span>
                    ) : null}
                  </div>
                </td>
                {renderReliabilityCell(row)}
                {renderModelSplitCell(row)}
                {renderGapCell(row)}
                {featureGroups.map((group) =>
                  group.columns.map((column) =>
                    renderFeatureCell(
                      row,
                      column,
                      contentMeasuredForTarget,
                      importanceRanks.get(column)
                    )
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--muted)]">
        Content columns only measure the target URL crawl. Competitor rows show{" "}
        <span className="font-semibold text-[var(--ink)]">n/a</span> because those values were
        not collected in a standard run. Mention rate is based on total responses; share of
        tracked mentions is based on the total extracted tracked-brand mentions across those
        responses.
      </p>
    </div>
  );
}

