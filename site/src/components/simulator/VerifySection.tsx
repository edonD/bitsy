"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  getAttribution,
  logChange,
  type VerifyAttribution,
  type VerifyChange,
} from "@/lib/api";
import type { BrandConfig } from "./types";

const FEATURE_OPTIONS = [
  { id: "citation_count", label: "Citations" },
  { id: "statistics_count", label: "Stats count" },
  { id: "statistics_density", label: "Stats density" },
  { id: "quotation_count", label: "Quotations" },
  { id: "readability_grade", label: "Readability grade" },
  { id: "freshness_days", label: "Freshness" },
  { id: "content_length", label: "Content length" },
  { id: "heading_count", label: "Headings" },
  { id: "has_schema_org", label: "Schema markup" },
];

const FEATURE_LABELS = FEATURE_OPTIONS.reduce(
  (acc, f) => ({ ...acc, [f.id]: f.label }),
  {} as Record<string, string>,
);

interface VerifySectionProps {
  brand: BrandConfig;
}

export function VerifySection({ brand }: VerifySectionProps) {
  const [feature, setFeature] = useState("citation_count");
  const [description, setDescription] = useState("");
  const [predictedLift, setPredictedLift] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [logErr, setLogErr] = useState<string | null>(null);
  const [logMsg, setLogMsg] = useState<string | null>(null);

  const [attribution, setAttribution] = useState<VerifyAttribution | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  async function loadAttribution() {
    if (!brand.name) return;
    setLoading(true);
    setLoadErr(null);
    try {
      const data = await getAttribution(brand.name);
      setAttribution(data);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Could not load attribution");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (brand.name) loadAttribution();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand.name]);

  async function submitChange() {
    if (submitting || !brand.name || !description.trim()) return;
    setSubmitting(true);
    setLogErr(null);
    setLogMsg(null);
    try {
      const result = await logChange({
        brand: brand.name,
        feature,
        description: description.trim(),
        predicted_lift: predictedLift === "" ? null : parseFloat(predictedLift),
      });
      const baselineCopy =
        result.baseline_rate != null
          ? `Baseline mention rate captured: ${(result.baseline_rate * 100).toFixed(1)}%.`
          : "Baseline mention rate not yet available — Observe must run first.";
      setLogMsg(
        `Logged. ${baselineCopy} Attribution lands once 14 days of post-change benchmark data exist.`,
      );
      setDescription("");
      setPredictedLift("");
      loadAttribution();
    } catch (e) {
      setLogErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  const counts = attribution?.counts;
  const calibration = attribution?.calibration_pct;

  return (
    <div style={{ marginTop: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      {/* ── LOG ── */}
      <section className="panel" style={{ padding: 0, position: "relative", width: "100%", maxWidth: 980 }}>
        <div className="corner-mark">VERIFY</div>

        <div style={{ padding: "26px 28px 18px" }}>
          <h2 className="title" style={{ fontSize: 30, margin: "0 0 6px", lineHeight: 1.1 }}>
            Did the move work?
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55, margin: 0, maxWidth: 600 }}>
            Log what you shipped, when. After 14 days of benchmark data we hold every prediction
            against reality and roll up calibration across changes — Bitsy stays honest about what worked.
          </p>
        </div>

        <div className="rule" />

        {!brand.name && (
          <div style={{ padding: "16px 28px" }}>
            <Notice tone="warn">Set up your brand in Target first.</Notice>
          </div>
        )}

        {brand.name && (
          <>
            <div style={{ padding: "20px 28px 6px" }}>
              <div className="label" style={{ marginBottom: 12 }}>Log a shipped change</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Feature changed">
                  <select
                    className="field"
                    value={feature}
                    onChange={(e) => setFeature(e.target.value)}
                  >
                    {FEATURE_OPTIONS.map((f) => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Predicted lift (pp) · optional">
                  <input
                    type="number"
                    step="0.1"
                    className="field"
                    value={predictedLift}
                    onChange={(e) => setPredictedLift(e.target.value)}
                    placeholder="e.g. 8"
                  />
                </Field>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="What you shipped">
                    <input
                      className="field"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Added 12 citations + 3 fresh stats to /pricing hero"
                    />
                  </Field>
                </div>
              </div>
            </div>

            <div className="rule" style={{ marginTop: 18 }} />

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
              <span className="micro" style={{ maxWidth: 520 }}>
                Baseline rate is captured at log time. Post-change rate is read from your Observe trends 14 days later.
              </span>
              <button
                className="btn btn-primary"
                disabled={submitting || !description.trim()}
                onClick={submitChange}
                style={{ padding: "11px 20px", fontSize: 13 }}
              >
                {submitting ? "Logging…" : "Log change →"}
              </button>
            </div>

            {(logMsg || logErr) && (
              <div style={{ padding: "0 28px 18px" }}>
                {logMsg && <Notice tone="ok">{logMsg}</Notice>}
                {logErr && <Notice tone="warn">{logErr}</Notice>}
              </div>
            )}
          </>
        )}
      </section>

      {/* ── ATTRIBUTION SUMMARY ── */}
      {brand.name && (
        <section className="panel" style={{ padding: 0, width: "100%", maxWidth: 980 }}>
          <div className="corner-mark">CALIBRATION</div>

          <div style={{ padding: "24px 28px 12px", display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <h3 className="title" style={{ fontSize: 22, margin: 0, letterSpacing: "-0.014em" }}>
              Attribution for {brand.name}
            </h3>
            <button
              className="btn"
              onClick={loadAttribution}
              disabled={loading}
              style={{ padding: "6px 12px", fontSize: 11 }}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          <div className="rule" />

          {loadErr && (
            <div style={{ padding: "16px 28px" }}>
              <Notice tone="warn">{loadErr}</Notice>
            </div>
          )}

          {attribution && counts && (
            <>
              <div style={{ padding: "20px 28px 16px", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
                <Stat label="Total" value={counts.total} />
                <Stat label="Accurate" value={counts.accurate} tone="moss" />
                <Stat label="Close" value={counts.close} tone="ink" />
                <Stat label="Off" value={counts.off} tone="rust" />
                <Stat label="Pending" value={counts.pending} tone="muted" />
              </div>

              {calibration != null && (
                <>
                  <div className="rule" />
                  <div style={{ padding: "16px 28px" }}>
                    <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
                      Calibration:{" "}
                      <span className="num" style={{ color: "var(--ink)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        {calibration}%
                      </span>{" "}
                      of predictions land within 6pp of actual.
                      <span style={{ color: "var(--muted-2)", fontSize: 12, marginLeft: 8 }}>
                        Signal data: {attribution.signal_days_available} days
                      </span>
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      )}

      {/* ── CHANGES LIST ── */}
      {brand.name && attribution && (
        <section className="panel" style={{ padding: 0, width: "100%", maxWidth: 980 }}>
          <div className="corner-mark">CHANGES</div>
          <div style={{ padding: "24px 28px 12px" }}>
            <h3 className="title" style={{ fontSize: 22, margin: 0, letterSpacing: "-0.014em" }}>
              Predicted vs. actual
            </h3>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 0" }}>
              Newest first. &ldquo;Pending&rdquo; means we&rsquo;re still waiting on benchmark data.
            </p>
          </div>
          <div className="rule" />
          <div style={{ padding: "16px 28px 22px" }}>
            {attribution.changes.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, fontStyle: "italic", color: "var(--muted)" }}>
                No changes logged yet for {brand.name}. Log one above — attribution shows up 14 days after ship.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {attribution.changes.map((c) => (
                  <ChangeRow key={c.id ?? c.shipped_at} change={c} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function ChangeRow({ change }: { change: VerifyChange }) {
  const tone = STATUS_TONE[change.status];
  const featureLabel = FEATURE_LABELS[change.feature] ?? change.feature;

  return (
    <div
      style={{
        border: "1px solid var(--line-2)",
        borderRadius: 8,
        background: "var(--paper)",
        padding: "14px 16px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>
            {change.description || "(no description)"}
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 11,
              color: "var(--muted)",
              fontFamily: "var(--mono)",
              letterSpacing: "0.04em",
            }}
          >
            {featureLabel} · shipped {change.shipped_date ?? "—"} · day {change.days_elapsed ?? "—"}
          </p>
        </div>
        <span
          className="mono"
          style={{
            flexShrink: 0,
            padding: "3px 10px",
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            background: tone.bg,
            color: tone.fg,
          }}
        >
          {change.status}
        </span>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <Metric label="Baseline" value={formatRate(change.baseline_rate)} />
        <Metric label="Measured" value={formatRate(change.actual_rate)} note={change.measured_at ?? undefined} />
        <Metric label="Predicted lift" value={formatLift(change.predicted_lift)} />
        <Metric
          label="Actual lift"
          value={change.actual_lift == null ? "pending" : formatLift(change.actual_lift)}
          tone={
            change.actual_lift == null
              ? "muted"
              : change.actual_lift > 0
                ? "moss"
                : change.actual_lift < 0
                  ? "rust"
                  : undefined
          }
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "moss" | "rust" | "ink" | "muted";
}) {
  const color =
    tone === "moss"
      ? "var(--moss)"
      : tone === "rust"
        ? "var(--rust)"
        : tone === "muted"
          ? "var(--muted)"
          : "var(--ink)";
  return (
    <div>
      <div className="label" style={{ marginBottom: 4 }}>{label}</div>
      <div
        className="num"
        style={{
          fontSize: 26,
          color,
          fontVariantNumeric: "tabular-nums",
          fontWeight: 600,
          letterSpacing: "-0.022em",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "moss" | "rust" | "muted";
}) {
  const color =
    tone === "moss"
      ? "var(--moss)"
      : tone === "rust"
        ? "var(--rust)"
        : tone === "muted"
          ? "var(--muted-2)"
          : "var(--ink)";
  return (
    <div>
      <div
        className="mono"
        style={{ fontSize: 9.5, color: "var(--muted-2)", letterSpacing: "0.12em", textTransform: "uppercase" }}
      >
        {label}
      </div>
      <div
        className="num"
        style={{
          marginTop: 3,
          fontSize: 14,
          color,
          fontVariantNumeric: "tabular-nums",
          fontWeight: 500,
        }}
      >
        {value}
      </div>
      {note && <div style={{ fontSize: 10, color: "var(--muted-2)", marginTop: 2 }}>{note}</div>}
    </div>
  );
}

function Notice({ children, tone }: { children: ReactNode; tone: "warn" | "ok" }) {
  const color = tone === "warn" ? "var(--rust)" : "var(--moss)";
  const bg =
    tone === "warn"
      ? "var(--rust-soft, rgba(168,97,46,0.10))"
      : "rgba(58,122,100,0.10)";
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

function formatRate(rate: number | null): string {
  if (rate == null || !Number.isFinite(rate)) return "—";
  // The backend stores baseline_rate as 0–1 fraction in feature store rows.
  const pct = rate <= 1 ? rate * 100 : rate;
  return `${pct.toFixed(1)}%`;
}

function formatLift(lift: number | null | undefined): string {
  if (lift == null || !Number.isFinite(lift)) return "—";
  return `${lift > 0 ? "+" : ""}${lift.toFixed(1)}pp`;
}

const STATUS_TONE: Record<VerifyChange["status"], { bg: string; fg: string }> = {
  accurate: { bg: "rgba(58,122,100,0.16)", fg: "var(--moss)" },
  close: { bg: "rgba(168,97,46,0.14)", fg: "var(--rust)" },
  off: { bg: "rgba(168,97,46,0.22)", fg: "var(--rust)" },
  pending: { bg: "rgba(0,0,0,0.06)", fg: "var(--muted)" },
};
