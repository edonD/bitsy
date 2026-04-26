"use client";

// Read-only result tables: aggregate stats, crawled content tiles, feature-importance bars, and final output.

import type { BrandResult } from "@/lib/api";
import { CONTENT_FEATURES, FEATURE_LABELS } from "../constants";
import { formatAvgPosition, formatPercent } from "../format";
import { getBrandObservation } from "../logic";
import type { CallCard } from "../types";

export { FeatureMatrix } from "./FeatureMatrix";

function getDisplayAvgPosition(avgPosition: number | null | undefined, mentionRate: number): number {
  return mentionRate > 0 ? avgPosition ?? 0 : 0;
}

export function AggregateTable({
  brands,
  cards,
}: {
  brands: BrandResult[];
  cards: CallCard[];
}) {
  const completed = cards.filter((card) => card.state === "done");
  const mentionCounts: Record<string, { seen: number; total: number }> = {};
  for (const brand of brands) {
    mentionCounts[brand.brand] = { seen: 0, total: completed.length };
  }

  for (const card of completed) {
    for (const brand of brands) {
      if (getBrandObservation(card.log, brand.brand).mentioned) {
        mentionCounts[brand.brand].seen += 1;
      }
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
            <th className="text-left py-2 pr-3">Brand</th>
            <th className="text-right py-2 px-3">Counted</th>
            <th className="text-right py-2 px-3">Mention rate</th>
            <th className="text-right py-2 px-3">Avg position</th>
            <th className="text-right py-2 px-3">Top-1</th>
            <th className="text-right py-2 pl-3">Sentiment</th>
          </tr>
        </thead>
        <tbody>
          {brands.map((brand) => {
            const counts = mentionCounts[brand.brand];
            return (
              <tr
                key={brand.brand}
                className={`border-t border-[color:var(--line)] ${
                  brand.is_target ? "bg-emerald-50/40" : ""
                }`}
              >
                <td className="py-2.5 pr-3">
                  <span className="text-[var(--ink)] font-semibold">{brand.brand}</span>
                  {brand.is_target ? (
                    <span className="ml-2 rounded-full bg-[var(--ink)] px-2 py-0.5 text-[10px] font-semibold text-[var(--paper)]">
                      target
                    </span>
                  ) : null}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-[var(--muted)]">
                  {counts.seen}/{counts.total}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-[var(--ink)]">
                  {formatPercent(brand.mention_rate)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-[var(--muted)]">
                  {formatAvgPosition(getDisplayAvgPosition(brand.avg_position, brand.mention_rate))}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-[var(--muted)]">
                  {formatPercent(brand.top1_rate)}
                </td>
                <td className="py-2.5 pl-3 text-right font-mono">
                  <span
                    className={
                      brand.net_sentiment > 0.1
                        ? "text-emerald-700"
                        : brand.net_sentiment < -0.1
                        ? "text-rose-700"
                        : "text-[var(--muted)]"
                    }
                  >
                    {brand.net_sentiment.toFixed(2)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-[var(--muted)]">
        mention_rate = seen / total samples · avg_position = mean rank when mentioned · 0.0 =
        never mentioned
      </p>
    </div>
  );
}

export function ContentFeatures({
  features,
  target,
}: {
  features: Record<string, number | string>[];
  target: string;
}) {
  const row = features.find((feature) => feature.brand === target);
  if (!row) return <p className="text-sm text-[var(--muted)]">No data for target.</p>;
  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
      {CONTENT_FEATURES.map((key) => {
        const value = row[key];
        return (
          <div key={key} className="metric-card">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
              {FEATURE_LABELS[key] || key}
            </p>
            <p className="mt-1 text-2xl text-[var(--ink)] font-mono">
              {typeof value === "number" ? value.toFixed(1) : String(value ?? "—")}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function ImportanceBars({
  importance,
}: {
  importance: Record<string, number>;
}) {
  const entries = Object.entries(importance).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, value]) => value), 0.0001);
  return (
    <div className="space-y-1.5">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-center gap-3">
          <span className="w-48 truncate text-sm text-[var(--ink)]">
            {FEATURE_LABELS[key] || key}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[rgba(0,0,0,0.05)]">
            <div
              className="h-full bg-[var(--ink)]"
              style={{ width: `${(value / max) * 100}%` }}
            />
          </div>
          <span className="w-16 text-right font-mono text-xs text-[var(--muted)]">
            {value.toFixed(3)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function OutputTable({
  brands,
  onPick,
  picked,
}: {
  brands: BrandResult[];
  onPick: (brand: string) => void;
  picked: string | null;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
            <th className="text-left py-2 pr-3">Brand</th>
            <th className="text-right py-2 px-3">Mention rate</th>
            <th className="text-right py-2 px-3">Top-1</th>
            <th className="text-right py-2 px-3">Top-3</th>
            <th className="text-right py-2 px-3">Avg position</th>
            <th className="text-right py-2 px-3">Sentiment</th>
            <th className="py-2 pl-3"></th>
          </tr>
        </thead>
        <tbody>
          {brands.map((brand) => (
            <tr
              key={brand.brand}
              className={`border-t border-[color:var(--line)] ${
                brand.is_target ? "bg-emerald-50/40" : ""
              } ${picked === brand.brand ? "ring-1 ring-[var(--ink)] ring-inset" : ""}`}
            >
              <td className="py-2.5 pr-3">
                <span className="text-[var(--ink)] font-semibold">{brand.brand}</span>
                {brand.is_target ? (
                  <span className="ml-2 rounded-full bg-[var(--ink)] px-2 py-0.5 text-[10px] font-semibold text-[var(--paper)]">
                    target
                  </span>
                ) : null}
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-[var(--ink)]">
                {formatPercent(brand.mention_rate)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-[var(--muted)]">
                {formatPercent(brand.top1_rate)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-[var(--muted)]">
                {formatPercent(brand.top3_rate)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-[var(--muted)]">
                {formatAvgPosition(getDisplayAvgPosition(brand.avg_position, brand.mention_rate))}
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-[var(--muted)]">
                {brand.net_sentiment.toFixed(2)}
              </td>
              <td className="py-2.5 pl-3 text-right">
                <button
                  onClick={() => onPick(brand.brand)}
                  className="rounded-full border border-[color:var(--line)] px-3 py-1 text-xs text-[var(--muted)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
                >
                  what-if →
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
