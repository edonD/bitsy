"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  buildPlaybook,
  savePlaybook,
  type CompetitorAnalysisResponse,
  type FeatureGap,
  type Playbook,
  type PlaybookEvidence,
} from "@/lib/api";
import type { BrandConfig } from "./types";

const MANUAL_FEATURES = [
  { id: "citation_count", label: "Citations" },
  { id: "statistics_density", label: "Stats density" },
  { id: "statistics_count", label: "Stats count" },
  { id: "quotation_count", label: "Quotations" },
  { id: "freshness_days", label: "Freshness" },
  { id: "content_length", label: "Content length" },
  { id: "heading_count", label: "Headings" },
  { id: "readability_grade", label: "Readability" },
];

const FEATURE_LABELS: Record<string, string> = MANUAL_FEATURES.reduce(
  (acc, f) => ({ ...acc, [f.id]: f.label }),
  {} as Record<string, string>,
);

interface ExecuteSectionProps {
  brand: BrandConfig;
  compAnalysis: CompetitorAnalysisResponse | null;
}

export function ExecuteSection({ brand, compAnalysis }: ExecuteSectionProps) {
  const gaps = useMemo<FeatureGap[]>(
    () => (compAnalysis?.gaps ?? []).filter((g) => g.gap_direction === "behind"),
    [compAnalysis],
  );

  const [selectedFeature, setSelectedFeature] = useState<string>(
    gaps[0]?.feature ?? "citation_count",
  );
  const [manualUserValue, setManualUserValue] = useState(0);
  const [manualLeaderValue, setManualLeaderValue] = useState(10);
  const [manualLeaderBrand, setManualLeaderBrand] = useState(brand.competitors[0] ?? "");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playbook, setPlaybook] = useState<Playbook | null>(null);
  const [copied, setCopied] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    if (gaps.length && !gaps.some((g) => g.feature === selectedFeature)) {
      setSelectedFeature(gaps[0].feature);
    }
  }, [gaps, selectedFeature]);

  useEffect(() => {
    if (!manualLeaderBrand && brand.competitors[0]) {
      setManualLeaderBrand(brand.competitors[0]);
    }
  }, [brand.competitors, manualLeaderBrand]);

  const selectedGap = gaps.find((g) => g.feature === selectedFeature);
  const usingGap = Boolean(selectedGap);

  const userValue = selectedGap?.target_value ?? manualUserValue;
  const leaderValue = selectedGap?.competitor_max ?? manualLeaderValue;
  const leaderBrand = selectedGap?.leader_brand ?? manualLeaderBrand;

  const canBuild =
    Boolean(brand.name) &&
    Boolean(selectedFeature) &&
    leaderValue > userValue &&
    !running;

  async function build() {
    if (!canBuild) return;
    setRunning(true);
    setError(null);
    setPlaybook(null);
    setCopied(false);
    setSaveState("idle");

    try {
      const result = await buildPlaybook({
        brand: brand.name,
        feature: selectedFeature,
        user_value: userValue,
        leader_value: leaderValue,
        leader_brand: leaderBrand || null,
        peer_brands: brand.competitors,
        query: brand.queries[0],
        category: brand.description || undefined,
      });
      setPlaybook(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Playbook build failed");
    } finally {
      setRunning(false);
    }
  }

  async function copyPatch() {
    if (!playbook) return;
    try {
      await navigator.clipboard.writeText(playbook.content_patch.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // noop
    }
  }

  async function persist() {
    if (!playbook || saveState === "saving") return;
    setSaveState("saving");
    try {
      await savePlaybook({
        brand: playbook.brand,
        feature: playbook.feature,
        payload: playbook,
      });
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2400);
    } catch {
      setSaveState("idle");
    }
  }

  return (
    <div style={{ marginTop: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      <section className="panel" style={{ padding: 0, position: "relative", width: "100%", maxWidth: 980 }}>
        <div className="corner-mark">EXECUTE</div>

        <div style={{ padding: "26px 28px 18px" }}>
          <h2 className="title" style={{ fontSize: 30, margin: "0 0 6px", lineHeight: 1.1 }}>
            Get the playbook
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55, margin: 0, maxWidth: 580 }}>
            Pick the feature you&rsquo;re behind on. We&rsquo;ll generate a five-section, evidence-backed plan:
            paste-ready copy, channels, amplification targets, pairings, and timing.
          </p>
        </div>

        <div className="rule" />

        {!brand.name && (
          <div style={{ padding: "16px 28px" }}>
            <Notice tone="warn">Set up your brand in Target first.</Notice>
          </div>
        )}

        {brand.name && (
          <div style={{ padding: "20px 28px" }}>
            {usingGap ? (
              <>
                <div className="label" style={{ marginBottom: 12 }}>
                  Pick a gap from your last competitor analysis
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {gaps.slice(0, 6).map((g) => {
                    const active = g.feature === selectedFeature;
                    return (
                      <button
                        key={g.feature}
                        onClick={() => setSelectedFeature(g.feature)}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "auto 1fr auto",
                          gap: 14,
                          alignItems: "center",
                          textAlign: "left",
                          padding: "12px 16px",
                          background: active ? "var(--card)" : "transparent",
                          border: `1px solid ${active ? "var(--ink)" : "var(--line-2)"}`,
                          borderRadius: 8,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        <span
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            border: `1.5px solid ${active ? "var(--ink)" : "var(--line-3)"}`,
                            background: "var(--paper)",
                            position: "relative",
                            flexShrink: 0,
                          }}
                        >
                          {active && (
                            <span
                              style={{
                                position: "absolute",
                                inset: 3,
                                borderRadius: "50%",
                                background: "var(--ink)",
                              }}
                            />
                          )}
                        </span>
                        <span>
                          <span
                            style={{
                              display: "block",
                              fontSize: 14,
                              fontWeight: 500,
                              color: "var(--ink)",
                              letterSpacing: "-0.012em",
                              marginBottom: 3,
                            }}
                          >
                            {g.label}
                          </span>
                          <span style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>
                            you {g.target_value} · leader {g.leader_brand} {g.leader_value} · gap {g.gap}
                          </span>
                        </span>
                        <span
                          className="mono"
                          style={{
                            fontSize: 10,
                            color: priorityColor(g.priority),
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                          }}
                        >
                          {g.priority}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <ManualGapForm
                feature={selectedFeature}
                setFeature={setSelectedFeature}
                userValue={manualUserValue}
                setUserValue={setManualUserValue}
                leaderValue={manualLeaderValue}
                setLeaderValue={setManualLeaderValue}
                leaderBrand={manualLeaderBrand}
                setLeaderBrand={setManualLeaderBrand}
                competitors={brand.competitors}
              />
            )}

            {!compAnalysis && (
              <p className="micro" style={{ marginTop: 14, lineHeight: 1.55 }}>
                Tip: run the Compete tab first and we&rsquo;ll auto-select the highest-priority gap from the leader gap analysis.
              </p>
            )}
          </div>
        )}

        <div className="rule" />

        <div
          style={{
            padding: "16px 28px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <span className="micro" style={{ maxWidth: 480 }}>
            Plan is grounded in the Bitsy evidence library + your live cited-sources data.
            Every recommendation cites a paper or benchmark.
          </span>
          <button
            className="btn btn-primary"
            disabled={!canBuild}
            onClick={build}
            style={{ padding: "11px 20px", fontSize: 13 }}
          >
            {running ? "Building…" : "Build playbook →"}
          </button>
        </div>

        {error && (
          <div style={{ padding: "0 28px 18px" }}>
            <Notice tone="warn">{error}</Notice>
          </div>
        )}
      </section>

      {running && (
        <section className="panel" style={{ padding: "28px", maxWidth: 980, width: "100%", textAlign: "center" }}>
          <div className="label" style={{ marginBottom: 6 }}>WORKING</div>
          <p style={{ fontSize: 14, color: "var(--ink)", margin: "0 0 4px" }}>
            Authoring playbook for {brand.name}
          </p>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
            Pulling cited-sources data, generating content patch, picking channels, attaching evidence.
          </p>
        </section>
      )}

      {playbook && !running && (
        <PlaybookView
          playbook={playbook}
          copied={copied}
          onCopy={copyPatch}
          onSave={persist}
          saveState={saveState}
        />
      )}
    </div>
  );
}

// ── Manual gap form (when no Compete data) ─────────────────────────────────

function ManualGapForm({
  feature,
  setFeature,
  userValue,
  setUserValue,
  leaderValue,
  setLeaderValue,
  leaderBrand,
  setLeaderBrand,
  competitors,
}: {
  feature: string;
  setFeature: (v: string) => void;
  userValue: number;
  setUserValue: (n: number) => void;
  leaderValue: number;
  setLeaderValue: (n: number) => void;
  leaderBrand: string;
  setLeaderBrand: (v: string) => void;
  competitors: string[];
}) {
  return (
    <div style={{ display: "grid", gap: 14, gridTemplateColumns: "1fr 1fr" }}>
      <Field label="Feature">
        <select
          className="field"
          value={feature}
          onChange={(e) => setFeature(e.target.value)}
        >
          {MANUAL_FEATURES.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
      </Field>
      <Field label="Leader brand">
        {competitors.length > 0 ? (
          <select
            className="field"
            value={leaderBrand}
            onChange={(e) => setLeaderBrand(e.target.value)}
          >
            {competitors.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        ) : (
          <input
            className="field"
            value={leaderBrand}
            onChange={(e) => setLeaderBrand(e.target.value)}
            placeholder="Competitor name"
          />
        )}
      </Field>
      <Field label="Your current value">
        <input
          type="number"
          className="field"
          value={userValue}
          onChange={(e) => setUserValue(parseFloat(e.target.value) || 0)}
        />
      </Field>
      <Field label="Leader value">
        <input
          type="number"
          className="field"
          value={leaderValue}
          onChange={(e) => setLeaderValue(parseFloat(e.target.value) || 0)}
        />
      </Field>
    </div>
  );
}

// ── Playbook view ──────────────────────────────────────────────────────────

function PlaybookView({
  playbook,
  copied,
  onCopy,
  onSave,
  saveState,
}: {
  playbook: Playbook;
  copied: boolean;
  onCopy: () => void;
  onSave: () => void;
  saveState: "idle" | "saving" | "saved";
}) {
  const featureLabel = FEATURE_LABELS[playbook.feature] ?? playbook.feature.replace(/_/g, " ");

  return (
    <div style={{ width: "100%", maxWidth: 980, display: "flex", flexDirection: "column", gap: 18 }}>
      <section className="panel" style={{ padding: 0 }}>
        <div className="corner-mark">PLAYBOOK</div>

        <div style={{ padding: "26px 28px 16px" }}>
          <div className="label" style={{ marginBottom: 6 }}>For {playbook.brand}</div>
          <h3 className="title" style={{ fontSize: 26, margin: "0 0 6px", lineHeight: 1.15, letterSpacing: "-0.018em" }}>
            Close the {featureLabel.toLowerCase()} gap
            {playbook.query && (
              <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                {" "}· &ldquo;{playbook.query}&rdquo;
              </span>
            )}
          </h3>
          <p style={{ fontSize: 13.5, color: "var(--ink-2)", margin: "10px 0 0", lineHeight: 1.6 }}>
            {playbook.summary}
          </p>
        </div>

        <div className="rule" />

        <div style={{ padding: "14px 28px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <Stat label="You" value={String(playbook.user_value)} />
          <Stat
            label={`Leader · ${playbook.leader_brand ?? "—"}`}
            value={String(playbook.leader_value)}
          />
          <Stat label="Evidence library" value={String(playbook.evidence_library_size)} />
        </div>

        <div className="rule" />

        <div
          style={{
            padding: "16px 28px 20px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button
            className="btn"
            onClick={onSave}
            disabled={saveState === "saving"}
            style={{ padding: "8px 14px", fontSize: 12 }}
          >
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Save playbook"}
          </button>
        </div>
      </section>

      <Section number="01" title="Content patch">
        <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 0, marginBottom: 10, lineHeight: 1.55 }}>
          Paste-ready paragraph. Under 100 words, one citation, no marketing adjectives.
        </p>
        <div
          style={{
            border: "1px solid var(--line-2)",
            borderRadius: 8,
            background: "var(--paper)",
            padding: "16px 18px",
          }}
        >
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "var(--ink-2)" }}>
            {playbook.content_patch.text}
          </p>
          <div
            style={{
              marginTop: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 11,
              color: "var(--muted)",
            }}
          >
            <span className="mono">{playbook.content_patch.char_count} chars</span>
            <button
              onClick={onCopy}
              className="btn"
              style={{ padding: "5px 11px", fontSize: 11 }}
            >
              {copied ? "copied" : "copy"}
            </button>
          </div>
        </div>
        <EvidenceList items={playbook.content_patch.evidence} />
      </Section>

      <Section number="02" title="Channels — where this content lives">
        {playbook.channels.length === 0 ? (
          <Empty>No channel recommendations for this feature yet.</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {playbook.channels.map((c) => (
              <div
                key={`${c.kind}-${c.where}`}
                style={{
                  border: "1px solid var(--line-2)",
                  borderRadius: 8,
                  background: "var(--paper)",
                  padding: "12px 16px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>
                    {c.where}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: 10,
                      color: "var(--muted-2)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {c.kind}
                  </span>
                </div>
                <EvidenceList items={c.evidence} compact />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section number="03" title="Amplification — who should cite you">
        {playbook.amplification.length === 0 ? (
          <Empty>
            No amplification targets found. Run Observe with these peers to populate cited-sources data.
          </Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {playbook.amplification.map((row) => (
              <div
                key={row.domain}
                style={{
                  border: "1px solid var(--line-2)",
                  borderRadius: 8,
                  background: "var(--paper)",
                  padding: "12px 16px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <span className="mono" style={{ fontSize: 13, color: "var(--ink)", fontWeight: 600 }}>
                    {row.domain}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>
                    gap{" "}
                    <span className="mono" style={{ color: "var(--ink)" }}>
                      {row.gap}
                    </span>
                  </span>
                </div>
                <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6, fontSize: 11 }}>
                  {Object.entries(row.peer_cite_counts).map(([peer, count]) => (
                    <span
                      key={peer}
                      style={{
                        background: "rgba(0,0,0,0.04)",
                        padding: "2px 8px",
                        borderRadius: 999,
                        color: "var(--ink-soft)",
                      }}
                    >
                      {peer}: {count}
                    </span>
                  ))}
                  <span
                    style={{
                      background: "var(--rust-soft, rgba(168,97,46,0.15))",
                      padding: "2px 8px",
                      borderRadius: 999,
                      color: "var(--rust)",
                    }}
                  >
                    {playbook.brand}: {row.target_cite_count}
                  </span>
                </div>
                <p style={{ marginTop: 10, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.6 }}>
                  {row.pitch_angle}
                </p>
                <EvidenceList items={row.evidence} compact />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section number="04" title="Content pairings — build these so the patch lands">
        {playbook.content_pairing.length === 0 ? (
          <Empty>No pairing recommendations yet.</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {playbook.content_pairing.map((p) => (
              <div
                key={p.what}
                style={{
                  border: "1px solid var(--line-2)",
                  borderRadius: 8,
                  background: "var(--paper)",
                  padding: "12px 16px",
                }}
              >
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{p.what}</p>
                <p style={{ marginTop: 4, marginBottom: 0, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.6 }}>
                  {p.why}
                </p>
                <EvidenceList items={p.evidence} compact />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section number="05" title="Publish — research-backed blog templates">
        {playbook.blog_templates.length === 0 ? (
          <Empty>No templates matched this feature yet.</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {playbook.blog_templates.map((tmpl) => (
              <BlogTemplateCard key={tmpl.id} template={tmpl} />
            ))}
          </div>
        )}
      </Section>

      <Section number="06" title="Timing — when to ship and refresh">
        <div
          style={{
            border: "1px solid var(--line-2)",
            borderRadius: 8,
            background: "var(--paper)",
            padding: "14px 18px",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            <Stat label="Ship by" value={playbook.timing.ship_by} />
            <Stat label="Refresh every" value={`${playbook.timing.refresh_cadence_days} days`} />
            <Stat label="Window" value="monthly" />
          </div>
          <p style={{ marginTop: 12, marginBottom: 0, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.6 }}>
            {playbook.timing.rationale}
          </p>
          <EvidenceList items={playbook.timing.evidence} compact />
        </div>
      </Section>
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────────────────────────

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="panel" style={{ padding: 0 }}>
      <div className="corner-mark">{number}</div>
      <div style={{ padding: "24px 28px 14px" }}>
        <h4 className="title" style={{ fontSize: 18, margin: "0 0 4px", letterSpacing: "-0.014em" }}>
          {title}
        </h4>
      </div>
      <div className="rule" />
      <div style={{ padding: "18px 28px 22px" }}>{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 4 }}>{label}</div>
      <div
        className="num"
        style={{
          fontSize: 16,
          color: "var(--ink)",
          fontVariantNumeric: "tabular-nums",
          fontWeight: 500,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function BlogTemplateCard({ template }: { template: Playbook["blog_templates"][number] }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        border: "1px solid var(--line-2)",
        borderRadius: 8,
        background: "var(--paper)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "16px 18px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          color: "inherit",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mono" style={{ fontSize: 10, color: "var(--muted-2)", letterSpacing: "0.16em" }}>
              BLOG TEMPLATE · {template.id}
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 16,
                fontWeight: 500,
                color: "var(--ink)",
                letterSpacing: "-0.014em",
                lineHeight: 1.3,
              }}
            >
              {template.title}
            </div>
          </div>
          <div style={{ flexShrink: 0, textAlign: "right" }}>
            <div className="label">Effort</div>
            <div className="num" style={{ fontSize: 14, fontVariantNumeric: "tabular-nums" }}>
              ~{template.effort_hours}h
            </div>
            <div style={{ fontSize: 10, color: "var(--muted)" }}>
              {template.target_word_count.toLocaleString()} words
            </div>
          </div>
        </div>
        <p style={{ marginTop: 10, marginBottom: 0, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.6 }}>
          {template.premise}
        </p>
        <p style={{ marginTop: 6, marginBottom: 0, fontSize: 12, fontStyle: "italic", color: "var(--muted)" }}>
          {template.why_this_works}
        </p>
      </button>

      <div
        style={{
          borderTop: "1px solid var(--line-2)",
          padding: "8px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 11,
          color: "var(--muted)",
        }}
      >
        <span>{template.outline.length} sections · research-backed</span>
        <button
          onClick={() => setOpen(!open)}
          className="mono"
          style={{
            fontSize: 11,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--ink)",
            letterSpacing: "0.06em",
          }}
        >
          {open ? "collapse" : "expand"}
        </button>
      </div>

      {open && (
        <div style={{ borderTop: "1px solid var(--line-2)", padding: "16px 18px", background: "var(--paper)" }}>
          <div className="label" style={{ marginBottom: 8 }}>Outline</div>
          <div style={{ border: "1px solid var(--line)", borderRadius: 6, overflow: "hidden" }}>
            {template.outline.map((row, idx) => (
              <div
                key={`${row.heading}-${idx}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "9px 14px",
                  borderBottom:
                    idx === template.outline.length - 1 ? "none" : "1px solid var(--line)",
                  fontSize: 13,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ color: "var(--ink)" }}>{row.heading}</div>
                  {row.note && (
                    <div style={{ marginTop: 2, fontSize: 11, fontStyle: "italic", color: "var(--muted)" }}>
                      {row.note}
                    </div>
                  )}
                </div>
                <span className="mono" style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>
                  {row.wordcount > 0 ? `${row.wordcount} w` : "—"}
                </span>
              </div>
            ))}
          </div>
          <EvidenceList items={template.evidence} compact />
        </div>
      )}
    </div>
  );
}

function EvidenceList({ items, compact }: { items: PlaybookEvidence[]; compact?: boolean }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginTop: compact ? 8 : 14, display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((item) => (
        <details
          key={item.id}
          style={{
            border: "1px solid var(--line)",
            borderRadius: 6,
            background: "rgba(247,243,236,0.5)",
            padding: "8px 12px",
            fontSize: 12,
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              listStyle: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <span style={{ fontWeight: 600, color: "var(--ink)" }}>{item.claim}</span>
              <span style={{ margin: "0 8px", color: "var(--muted)" }}>—</span>
              <span style={{ color: "var(--muted)" }}>{item.venue}</span>
            </span>
            <span className="mono" style={{ fontSize: 10, color: "var(--muted-2)" }}>more</span>
          </summary>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4, color: "var(--ink-soft)", lineHeight: 1.55 }}>
            <p style={{ margin: 0 }}>
              <span style={{ color: "var(--muted)" }}>Source:</span> {item.paper}
            </p>
            <p style={{ margin: 0 }}>{item.finding}</p>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#1d4ed8", wordBreak: "break-all" }}
              >
                {item.url}
              </a>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p style={{ margin: 0, fontSize: 13, fontStyle: "italic", color: "var(--muted)" }}>{children}</p>
  );
}

function Notice({ children, tone }: { children: ReactNode; tone: "warn" | "info" }) {
  const color = tone === "warn" ? "var(--rust)" : "var(--ink)";
  const bg = tone === "warn" ? "var(--rust-soft, rgba(176,76,42,0.06))" : "var(--card)";
  return (
    <div
      style={{
        padding: "10px 14px",
        border: `1px solid ${color}`,
        borderRadius: 8,
        background: bg,
        fontSize: 12.5,
        color,
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span className="label" style={{ display: "block", marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}

function priorityColor(priority: string): string {
  switch (priority) {
    case "high":
      return "var(--rust)";
    case "medium":
      return "var(--ink)";
    case "low":
      return "var(--muted)";
    default:
      return "var(--muted-2)";
  }
}
