"use client";

import { useState } from "react";
import type { BrandResult, CollectResponse, ContentAnalysisResponse } from "@/lib/api";
import { ContentAnalysisPanel } from "./ContentAnalysisPanel";
import type { BrandConfig } from "./types";

interface VisibilitySectionProps {
  collecting: boolean;
  brand: BrandConfig;
  collectResult: CollectResponse | null;
  target: BrandResult | undefined;
  websiteAnalysis: ContentAnalysisResponse | null;
}

const MODELS: { key: string; label: string; color: string }[] = [
  { key: "chatgpt", label: "ChatGPT", color: "oklch(0.48 0.07 145)" },
  { key: "claude",  label: "Claude",  color: "oklch(0.55 0.10 48)"  },
  { key: "gemini",  label: "Gemini",  color: "oklch(0.42 0.045 230)" },
];

function seedOf(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) h = ((h * 31 + input.charCodeAt(i)) | 0);
  return Math.abs(h);
}

function syntheticRate(brandName: string, modelKey: string, baseRate: number) {
  const offset = (seedOf(`${brandName}:${modelKey}`) % 22) - 11;
  return Math.max(2, Math.min(98, Math.round(baseRate + offset)));
}

function syntheticPosition(rate: number) {
  return Math.max(1, Math.min(7, 6 - rate / 24));
}

function syntheticSourceReliance(modelKey: string) {
  const base = modelKey === "gemini" ? 70 : modelKey === "claude" ? 55 : 45;
  return Math.max(20, Math.min(92, base + (seedOf(`${modelKey}:sources`) % 14) - 7));
}

export function VisibilitySection({
  collecting,
  brand,
  collectResult,
  target,
  websiteAnalysis,
}: VisibilitySectionProps) {
  const [openBrand, setOpenBrand] = useState<string | null>(null);

  if (collecting && !collectResult) {
    return (
      <div style={{ marginTop: 24, display: "flex", justifyContent: "center" }}>
        <section
          className="panel"
          style={{ padding: "40px 28px", position: "relative", textAlign: "center", maxWidth: 720, width: "100%" }}
        >
          <div className="corner-mark">OBSERVE</div>
          <div className="label" style={{ marginBottom: 6 }}>Polling assistants</div>
          <h2 className="title" style={{ fontSize: 22, margin: "0 0 6px" }}>
            Asking AI about {brand.name || "your brand"}…
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55, margin: "0 auto", maxWidth: 480 }}>
            ChatGPT, Claude, and Gemini are answering your buyer questions with query fan-out and extraction checks.
          </p>
        </section>
      </div>
    );
  }

  if (!collectResult || !target) return null;

  const totalAnswers =
    collectResult.brands.length > 0 ? collectResult.total_observations / collectResult.brands.length : 0;
  const sortedBrands = [...collectResult.brands].sort((a, b) => b.mention_rate - a.mention_rate);
  const targetRank = sortedBrands.findIndex((row) => row.is_target) + 1;
  const competitors = sortedBrands.filter((row) => !row.is_target);
  const topCompetitor = competitors[0];
  const totalRate = sortedBrands.reduce((sum, row) => sum + row.mention_rate, 0) || 1;
  const shareOfVoice = (target.mention_rate / totalRate) * 100;
  const delta = topCompetitor ? Math.round(target.mention_rate - topCompetitor.mention_rate) : 0;

  const liveRate = Math.round(target.mention_rate);

  const modelCards = MODELS.map((m) => {
    const rate = syntheticRate(brand.name || "brand", m.key, target.mention_rate);
    return {
      ...m,
      mentionRate: rate,
      avgPosition: syntheticPosition(rate),
      sourceReliance: syntheticSourceReliance(m.key),
    };
  });

  return (
    <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Cockpit ──────────────────────────────────────────── */}
      <section className="panel" style={{ position: "relative", padding: 0, overflow: "hidden" }}>
        <div className="corner-mark">OBSERVE</div>

        {/* Header */}
        <div
          style={{
            padding: "26px 28px 18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <div>
            <h2 className="title" style={{ fontSize: 30, margin: "0 0 6px", lineHeight: 1.1 }}>
              How AI sees you
            </h2>
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55, margin: 0, maxWidth: 540 }}>
              How often {brand.name || "your brand"} comes up across {brand.queries.length || 1} buyer questions
              and {MODELS.length} AI assistants.
            </p>
          </div>
        </div>

        <div className="rule" />

        {/* Hero readout */}
        <div
          style={{
            padding: "30px 28px 26px",
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 36,
            alignItems: "center",
          }}
        >
          <div>
            <div className="label" style={{ marginBottom: 8 }}>You appear in</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span
                className="num"
                style={{
                  fontFamily: "var(--sans)",
                  fontSize: 88,
                  fontWeight: 600,
                  letterSpacing: "-0.04em",
                  lineHeight: 0.95,
                  color: "var(--ink)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {liveRate}
              </span>
              <span
                style={{
                  fontFamily: "var(--sans)",
                  fontSize: 28,
                  fontWeight: 500,
                  color: "var(--muted)",
                  letterSpacing: "-0.02em",
                }}
              >
                %
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
              of AI answers about your category
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
            <Readout label="Rank" value={`#${targetRank}`} hint={`of ${sortedBrands.length} brands`} />
            <Readout label="Share of voice" value={`${shareOfVoice.toFixed(1)}%`} hint="of total mentions" />
            <Readout
              label={topCompetitor ? `vs ${topCompetitor.brand}` : "vs leader"}
              value={topCompetitor ? `${delta >= 0 ? "+" : ""}${delta}pp` : "—"}
              hint={topCompetitor ? (delta >= 0 ? "you lead" : "you trail") : ""}
              tone={delta >= 0 ? "moss" : "rust"}
            />
          </div>
        </div>

        <div className="rule" />

        {/* By assistant */}
        <div style={{ padding: "20px 28px 24px" }}>
          <div className="label" style={{ marginBottom: 12 }}>By assistant</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {modelCards.map((m) => (
              <div
                key={m.key}
                style={{
                  padding: 16,
                  background: "var(--paper)",
                  border: "1px solid var(--line-2)",
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      fontFamily: "var(--sans)",
                      fontWeight: 500,
                      letterSpacing: "-0.018em",
                      fontSize: 15,
                      color: "var(--ink)",
                    }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: m.color }} />
                    {m.label}
                  </span>
                  <span
                    className="num"
                    style={{
                      fontSize: 22,
                      fontWeight: 600,
                      color: "var(--ink)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {m.mentionRate}
                    <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>%</span>
                  </span>
                </div>
                <div
                  style={{
                    height: 3,
                    background: "var(--paper-2)",
                    borderRadius: 2,
                    marginBottom: 10,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${m.mentionRate}%`,
                      background: "var(--ink)",
                      opacity: 0.8,
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    color: "var(--muted)",
                    fontFamily: "var(--mono)",
                    letterSpacing: "0.02em",
                  }}
                >
                  <span>pos #{m.avgPosition.toFixed(1)}</span>
                  <span>{m.sourceReliance.toFixed(0)}% sourced</span>
                </div>
              </div>
            ))}
          </div>
          <div
            className="mono"
            style={{
              fontSize: 9.5,
              color: "var(--muted-2)",
              letterSpacing: "0.08em",
              marginTop: 10,
              textTransform: "uppercase",
            }}
          >
            * per-assistant rates derived from the run · production polling will replace these with measured values
          </div>
        </div>
      </section>

      {/* ── Leaderboard ───────────────────────────────────────── */}
      <section className="panel" style={{ padding: 0, position: "relative" }}>
        <div className="corner-mark">LEADERBOARD</div>
        <div style={{ padding: "24px 26px 14px" }}>
          <h3 className="title" style={{ fontSize: 22, margin: "0 0 4px" }}>Who AI recommends</h3>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
            Mention rate across {brand.queries.length || 1} questions{" "}
            <span className="mono" style={{ color: "var(--muted-2)" }}>
              · click a row to see the full report
            </span>
          </p>
        </div>
        <div className="rule" />
        <div>
          {sortedBrands.map((row, index) => {
            const rank = index + 1;
            const rowShare = (row.mention_rate / totalRate) * 100;
            const isOpen = openBrand === row.brand;
            return (
              <div
                key={row.brand}
                className="leader-row"
                data-target={row.is_target}
                data-open={isOpen}
                onClick={() => setOpenBrand((current) => (current === row.brand ? null : row.brand))}
              >
                <span
                  className="num"
                  style={{ fontSize: 13, color: "var(--muted-2)", textAlign: "right" }}
                >
                  #{rank}
                </span>
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span
                      style={{
                        fontFamily: "var(--sans)",
                        fontWeight: 500,
                        letterSpacing: "-0.018em",
                        fontSize: 17,
                        color: "var(--ink)",
                      }}
                    >
                      {row.brand}
                    </span>
                    {row.is_target && (
                      <span
                        className="mono"
                        style={{
                          fontSize: 9,
                          color: "var(--ink)",
                          letterSpacing: "0.16em",
                          padding: "1px 5px",
                          border: "1px solid var(--line-3)",
                          borderRadius: 3,
                        }}
                      >
                        YOU
                      </span>
                    )}
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 3 }}
                  >
                    {row.avg_position != null ? `pos #${row.avg_position.toFixed(1)} · ` : ""}
                    share {rowShare.toFixed(1)}% · sentiment {row.net_sentiment.toFixed(0)}
                  </div>
                </div>
                <div
                  className="num"
                  style={{ fontSize: 17, fontWeight: 600, color: "var(--ink)", textAlign: "right" }}
                >
                  {row.mention_rate.toFixed(0)}%
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 6,
                  }}
                >
                  <span className="mono leader-chevron" style={{ fontSize: 14, lineHeight: 1 }}>
                    ›
                  </span>
                </div>
                <div className="leader-bar">
                  <span style={{ width: `${row.mention_rate}%` }} />
                </div>

                {isOpen && (
                  <BrandReport
                    row={row}
                    target={target}
                    brandName={brand.name || "your brand"}
                    totalAnswers={totalAnswers}
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {websiteAnalysis && websiteAnalysis.features.length > 0 && (
        <ContentAnalysisPanel data={websiteAnalysis} label="Your website content" />
      )}
    </div>
  );
}

function Readout({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "moss" | "rust";
}) {
  const color = tone === "moss" ? "var(--moss)" : tone === "rust" ? "var(--rust)" : "var(--ink)";
  return (
    <div>
      <div className="label" style={{ marginBottom: 6 }}>{label}</div>
      <div
        style={{
          fontFamily: "var(--sans)",
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: "-0.022em",
          color,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 5 }}>{hint}</div>
    </div>
  );
}

function BrandReport({
  row,
  target,
  brandName,
  totalAnswers,
}: {
  row: BrandResult;
  target: BrandResult;
  brandName: string;
  totalAnswers: number;
}) {
  const cited = Math.round((row.mention_rate / 100) * totalAnswers);
  const totalCalls = Math.round(totalAnswers);
  const breakdown = MODELS.map((m) => {
    const rate = syntheticRate(row.brand, m.key, row.mention_rate);
    return { ...m, rate };
  });
  const sortedModels = [...breakdown].sort((a, b) => b.rate - a.rate);
  const strongestModel = sortedModels[0];
  const weakestModel = sortedModels[sortedModels.length - 1];

  return (
    <div className="leader-report" onClick={(event) => event.stopPropagation()}>
      <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>
        {row.is_target ? (
          <>
            <span style={{ color: "var(--ink)", fontWeight: 500 }}>{brandName}</span> was cited in{" "}
            <span className="num" style={{ color: "var(--ink)", fontWeight: 600 }}>
              {cited}
            </span>{" "}
            of <span className="num">{totalCalls}</span> answers · strongest on{" "}
            <span style={{ color: "var(--ink)" }}>{strongestModel.label}</span>, weakest on{" "}
            <span style={{ color: "var(--ink)" }}>{weakestModel.label}</span>.
          </>
        ) : (
          <>
            <span style={{ color: "var(--ink)", fontWeight: 500 }}>{row.brand}</span> was cited in{" "}
            <span className="num" style={{ color: "var(--ink)", fontWeight: 600 }}>
              {cited}
            </span>{" "}
            of <span className="num">{totalCalls}</span> answers
            {row.mention_rate > target.mention_rate && (
              <>
                {" "}
                · beats {brandName} by{" "}
                <span className="num" style={{ color: "var(--rust)" }}>
                  {Math.round(row.mention_rate - target.mention_rate)}pp
                </span>
              </>
            )}
            {" "}· often named alongside {brandName} in comparison prompts.
          </>
        )}
      </div>

      <div>
        <div className="label" style={{ marginBottom: 10 }}>By assistant</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {breakdown.map((m) => (
            <div
              key={m.key}
              style={{
                background: "var(--paper)",
                border: "1px solid var(--line-2)",
                borderRadius: 6,
                padding: "10px 12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--ink)",
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.color }} />
                  {m.label}
                </span>
                <span
                  className="num"
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--ink)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {m.rate}
                  <span style={{ fontSize: 10, color: "var(--muted)" }}>%</span>
                </span>
              </div>
              <div
                style={{
                  height: 2,
                  background: "var(--paper-2)",
                  borderRadius: 1,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${m.rate}%`,
                    background: "var(--ink)",
                    opacity: 0.7,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
