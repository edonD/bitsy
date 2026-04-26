"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { StatusResponse } from "@/lib/api";
import type { BrandConfig, BrandTemplate, TargetMode } from "./types";

interface TargetSectionProps {
  brand: BrandConfig;
  setBrand: Dispatch<SetStateAction<BrandConfig>>;
  templates: BrandTemplate[];
  backendStatus: StatusResponse | null;
  collectionMode: TargetMode;
  setCollectionMode: Dispatch<SetStateAction<TargetMode>>;
  canRun: boolean;
  collecting: boolean;
  loadPreviousData: () => void;
  runVisibility: () => void;
}

const MODE_OPTIONS: { id: TargetMode; label: string; note: string }[] = [
  { id: "balanced", label: "Best of both",      note: "Mix what AI knows with what it finds online. Most realistic." },
  { id: "search",   label: "Use the web",       note: "Force AI to search the web for every answer." },
  { id: "memory",   label: "Use memory only",   note: "Only what AI already knows. Faster, no live search." },
];

const READINESS = [
  { key: "brand",       label: "Brand name" },
  { key: "website",     label: "Website" },
  { key: "competitors", label: "At least 2 competitors" },
  { key: "queries",     label: "At least 3 buyer questions" },
] as const;

function splitList(value: string) {
  return value.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
}
function listValue(items: string[]) {
  return items.join("\n");
}

export function TargetSection({
  brand,
  setBrand,
  templates,
  backendStatus,
  collectionMode,
  setCollectionMode,
  canRun,
  collecting,
  loadPreviousData,
  runVisibility,
}: TargetSectionProps) {
  const readiness = {
    brand: Boolean(brand.name.trim()),
    website: brand.website.trim().startsWith("http"),
    competitors: brand.competitors.length >= 2,
    queries: brand.queries.length >= 3,
  };
  const readyCount = Object.values(readiness).filter(Boolean).length;
  const allReady = readyCount === READINESS.length;

  function update<K extends keyof BrandConfig>(key: K, value: BrandConfig[K]) {
    setBrand((current) => ({ ...current, [key]: value }));
  }

  return (
    <div style={{ marginTop: 24, display: "flex", justifyContent: "center" }}>
      <section className="panel" style={{ padding: 0, position: "relative", width: "100%", maxWidth: 720 }}>
        <div className="corner-mark">SETUP</div>

        <div style={{ padding: "26px 28px 18px" }}>
          <h2 className="title" style={{ fontSize: 30, margin: "0 0 6px", lineHeight: 1.1 }}>
            Tell us about your brand
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55, margin: 0, maxWidth: 520 }}>
            We&rsquo;ll ask AI assistants the questions your buyers ask, and see how often you come up.
          </p>
        </div>

        <div style={{ padding: "0 28px 18px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span className="micro" style={{ marginRight: 4 }}>Try an example</span>
          {templates.map((template) => (
            <button
              key={template.label}
              className="btn"
              style={{ padding: "5px 10px", fontSize: 11 }}
              onClick={() => setBrand(template.config)}
            >
              {template.label}
            </button>
          ))}
          {backendStatus?.has_data && (
            <button
              className="btn"
              style={{ padding: "5px 10px", fontSize: 11, marginLeft: "auto" }}
              onClick={loadPreviousData}
            >
              Load previous run
            </button>
          )}
        </div>

        <div className="rule" />

        <div style={{ padding: "22px 28px 6px", display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="Your brand name" hint="Exactly how it&rsquo;s written">
            <input
              className="field"
              value={brand.name}
              onChange={(event) => update("name", event.target.value)}
              placeholder="Acme"
            />
          </Field>

          <Field label="What you do" hint="One sentence">
            <input
              className="field"
              value={brand.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="e.g. AI search visibility platform for B2B brands."
            />
          </Field>

          <Field label="Your website" hint="So we can find you online">
            <input
              className="field"
              value={brand.website}
              onChange={(event) => update("website", event.target.value)}
              placeholder="https://example.com"
            />
          </Field>

          <Field label="Who you compete with" hint="2&ndash;5 names, comma separated">
            <textarea
              className="field"
              rows={2}
              value={listValue(brand.competitors)}
              onChange={(event) => update("competitors", splitList(event.target.value))}
              placeholder="Competitor A, Competitor B, …"
            />
          </Field>

          <Field label="What buyers ask AI" hint="One question per line, at least 3">
            <textarea
              className="field"
              rows={4}
              value={listValue(brand.queries)}
              onChange={(event) => update("queries", splitList(event.target.value))}
              placeholder={"e.g. Best CRM for small business\nTop tool for ChatGPT visibility"}
            />
          </Field>
        </div>

        <div className="rule" style={{ marginTop: 18 }} />

        <div style={{ padding: "20px 28px 22px" }}>
          <div className="label" style={{ marginBottom: 12 }}>How should AI answer?</div>
          <div style={{ display: "grid", gap: 8 }}>
            {MODE_OPTIONS.map((opt) => {
              const active = collectionMode === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setCollectionMode(opt.id)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    gap: 12,
                    alignItems: "center",
                    textAlign: "left",
                    padding: "11px 14px",
                    background: active ? "var(--card)" : "transparent",
                    border: `1px solid ${active ? "var(--ink)" : "var(--line-2)"}`,
                    borderRadius: 8,
                    cursor: "pointer",
                    transition: "border-color 140ms, background 140ms",
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
                        fontFamily: "var(--sans)",
                        fontSize: 13.5,
                        fontWeight: 500,
                        color: "var(--ink)",
                        letterSpacing: "-0.012em",
                      }}
                    >
                      {opt.label}
                    </span>
                    <span style={{ display: "block", fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                      {opt.note}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

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
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              {READINESS.map((r) => {
                const ready = readiness[r.key];
                return (
                  <span
                    key={r.key}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 11.5,
                      color: ready ? "var(--ink)" : "var(--muted-2)",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: ready ? "var(--moss)" : "transparent",
                        border: `1.5px solid ${ready ? "var(--moss)" : "var(--line-3)"}`,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--paper)",
                      }}
                    >
                      {ready && (
                        <svg viewBox="0 0 14 14" width="10" height="10">
                          <path
                            d="M3 7 L6 10 L11 4"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    {r.label}
                  </span>
                );
              })}
            </div>
            <span
              className="mono"
              style={{ fontSize: 10, color: "var(--muted-2)", letterSpacing: "0.08em", marginTop: 2 }}
            >
              {allReady ? "READY TO RUN" : `${readyCount} of ${READINESS.length} ready`}
            </span>
          </div>

          <button
            className="btn btn-primary"
            disabled={!canRun || collecting}
            onClick={runVisibility}
            style={{ padding: "11px 20px", fontSize: 13 }}
          >
            {collecting ? "Asking AI…" : "See how AI sees you →"}
          </button>
        </div>
      </section>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
        }}
      >
        <span className="label">{label}</span>
        {hint && (
          <span
            className="micro"
            style={{ fontSize: 10 }}
            dangerouslySetInnerHTML={{ __html: hint }}
          />
        )}
      </div>
      {children}
    </label>
  );
}
