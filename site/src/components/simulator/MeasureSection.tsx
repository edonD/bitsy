"use client";

import type { Dispatch, SetStateAction } from "react";
import type { TrendsResponse } from "@/lib/api";
import { pct, signed } from "./format";
import type { StoredRun } from "./types";

interface MeasureSectionProps {
  runs: StoredRun[];
  compareA: number | null;
  compareB: number | null;
  setCompareA: Dispatch<SetStateAction<number | null>>;
  setCompareB: Dispatch<SetStateAction<number | null>>;
  trends: TrendsResponse | null;
}

export function MeasureSection({
  runs,
  compareA,
  compareB,
  setCompareA,
  setCompareB,
  trends,
}: MeasureSectionProps) {
  const runA = compareA !== null ? runs[compareA]?.data : null;
  const runB = compareB !== null ? runs[compareB]?.data : null;

  return (
    <div className="space-y-6">
      <div className="paper-panel rounded-[2rem] p-6">
        <p className="muted-label text-xs mb-1">Expected timelines</p>
        <h2 className="text-2xl text-[var(--ink)] mb-4">When will content changes show up?</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <TimelineCard
            color="#4285f4"
            title="Gemini (grounding)"
            value="2-7 days"
            detail="Live Google Search grounding. New content typically indexed within a week."
          />
          <TimelineCard
            color="#10a37f"
            title="ChatGPT with browsing"
            value="4-14 days"
            detail="Triggers web search ~21% of the time. Slower index refresh."
          />
          <TimelineCard
            color="var(--muted)"
            title="ChatGPT parametric"
            value="6-18 months"
            detail="Baked into training data. Only updates on next model release."
          />
        </div>
        <p className="mt-4 text-xs text-[var(--muted)]">
          <strong className="text-[var(--ink)]">Implication:</strong> RAG-based effects appear within a week. To
          move the parametric needle, you need earned media and third-party mentions that will be in the next
          training corpus - your own site content is less impactful there.
        </p>
      </div>

      {trends && trends.timeline.length > 0 && <TrendChart trends={trends} />}

      <div className="paper-panel rounded-[2rem] p-6">
        <p className="muted-label text-xs mb-1">Before/after comparison</p>
        <h2 className="text-2xl text-[var(--ink)] mb-2">Compare runs side-by-side</h2>
        <p className="text-sm text-[var(--muted)] mb-6">
          Each visibility check is saved here. Select two runs to compare before and after a content update, a PR
          campaign, or a competitor&apos;s move.
        </p>

        {runs.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-[var(--muted)]">No runs yet. Go to the Visibility tab and run your first check.</p>
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-6">
              {runs.map((run, index) => {
                const target = run.data.brands.find((brand) => brand.is_target);
                const isA = compareA === index;
                const isB = compareB === index;
                return (
                  <div
                    key={`${run.label}-${run.date}`}
                    className={`paper-card rounded-[1.4rem] p-4 flex items-center justify-between gap-4 ${
                      isA || isB ? "border-2 border-[var(--ink)]" : ""
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-[var(--ink)]">{run.label}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {run.date} &middot; {run.data.total_observations} obs &middot;{" "}
                        {target ? pct(target.mention_rate) : "-"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCompareA(isA ? null : index)}
                        className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                          isA ? "bg-[var(--ink)] text-[var(--paper)]" : "surface-chip text-[var(--muted)] hover:text-[var(--ink)]"
                        }`}
                      >
                        A
                      </button>
                      <button
                        onClick={() => setCompareB(isB ? null : index)}
                        className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                          isB ? "bg-[var(--ink)] text-[var(--paper)]" : "surface-chip text-[var(--muted)] hover:text-[var(--ink)]"
                        }`}
                      >
                        B
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {runA && runB && <RunComparison runA={runA} runB={runB} />}
          </>
        )}
      </div>
    </div>
  );
}

function TimelineCard({
  color,
  title,
  value,
  detail,
}: {
  color: string;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="paper-card rounded-[1.4rem] p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
      </div>
      <p className="text-2xl text-[var(--ink)] font-semibold">{value}</p>
      <p className="text-xs text-[var(--muted)] mt-1">{detail}</p>
    </div>
  );
}

function TrendChart({ trends }: { trends: TrendsResponse }) {
  const maxRate = Math.max(...trends.timeline.map((point) => point.mention_rate), 1);

  return (
    <div className="paper-panel rounded-[2rem] p-6">
      <p className="muted-label text-xs mb-1">Mention rate timeline</p>
      <h2 className="text-2xl text-[var(--ink)] mb-4">{trends.brand} over time</h2>
      <div className="flex items-end gap-1 h-32 border-b border-[color:var(--line)] pb-1">
        {trends.timeline.map((point) => {
          const height = (point.mention_rate / maxRate) * 100;
          return (
            <div key={point.date} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div
                className="w-full rounded-t transition-all"
                style={{ height: `${Math.max(2, height)}%`, backgroundColor: "var(--ink)" }}
                title={`${point.date}: ${point.mention_rate.toFixed(1)}%`}
              />
              <span className="absolute -bottom-6 text-[9px] text-[var(--muted)] opacity-0 group-hover:opacity-100 whitespace-nowrap">
                {point.date.slice(5)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-[var(--muted)]">
        <span>{trends.timeline[0]?.date}</span>
        <span>{trends.days_of_data} days</span>
        <span>{trends.timeline[trends.timeline.length - 1]?.date}</span>
      </div>
    </div>
  );
}

function RunComparison({
  runA,
  runB,
}: {
  runA: StoredRun["data"];
  runB: StoredRun["data"];
}) {
  return (
    <div className="paper-card rounded-[1.4rem] overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[rgba(255,255,255,0.42)]">
            <th className="border-b border-[color:var(--line)] px-4 py-3 text-left font-semibold text-[var(--ink)]">Brand</th>
            <th className="border-b border-[color:var(--line)] px-4 py-3 text-right font-semibold text-[var(--ink)]">Run A</th>
            <th className="border-b border-[color:var(--line)] px-4 py-3 text-right font-semibold text-[var(--ink)]">Run B</th>
            <th className="border-b border-[color:var(--line)] px-4 py-3 text-right font-semibold text-[var(--ink)]">Change</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--line)]">
          {runB.brands.map((brandB) => {
            const brandA = runA.brands.find((item) => item.brand === brandB.brand);
            const delta = brandA ? brandB.mention_rate - brandA.mention_rate : 0;
            return (
              <tr key={brandB.brand} className={`hover:bg-[rgba(255,255,255,0.28)] ${brandB.is_target ? "font-semibold" : ""}`}>
                <td className="px-4 py-3 text-[var(--ink)]">{brandB.brand}</td>
                <td className="px-4 py-3 text-right text-[var(--muted)]">{pct(brandA?.mention_rate ?? 0)}</td>
                <td className="px-4 py-3 text-right text-[var(--muted)]">{pct(brandB.mention_rate)}</td>
                <td className={`px-4 py-3 text-right font-semibold ${delta > 0.1 ? "text-emerald-700" : delta < -0.1 ? "text-rose-700" : "text-[var(--muted)]"}`}>
                  {Math.abs(delta) > 0.1 ? `${signed(delta)} pp` : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
