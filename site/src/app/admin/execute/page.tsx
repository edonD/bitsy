"use client";

// Execute playbook — the "what to ship, where, when, with what evidence"
// page. Input: one gap (brand + feature + peers). Output: a five-section
// playbook where every recommendation carries a research-backed citation.

import { useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface EvidenceItem {
  id: string;
  claim: string;
  paper: string;
  venue: string;
  url: string;
  finding: string;
}

interface ChannelItem {
  kind: string;
  where: string;
  evidence: EvidenceItem[];
}

interface AmpRow {
  domain: string;
  target_cite_count: number;
  peer_cite_counts: Record<string, number>;
  total_peer_cites: number;
  gap: number;
  pitch_angle: string;
  evidence: EvidenceItem[];
}

interface PairingItem {
  what: string;
  why: string;
  evidence: EvidenceItem[];
}

interface TimingItem {
  ship_by: string;
  refresh_cadence_days: number;
  rationale: string;
  evidence: EvidenceItem[];
}

interface Playbook {
  brand: string;
  feature: string;
  query: string | null;
  user_value: number;
  leader_value: number;
  leader_brand: string | null;
  content_patch: { text: string; char_count: number; evidence: EvidenceItem[] };
  channels: ChannelItem[];
  amplification: AmpRow[];
  content_pairing: PairingItem[];
  timing: TimingItem;
  summary: string;
  evidence_library_size: number;
}

const FEATURE_OPTIONS = [
  "citation_count",
  "statistics_count",
  "statistics_density",
  "quotation_count",
  "readability_grade",
  "freshness_days",
  "content_length",
  "heading_count",
  "has_schema_org",
];

export default function ExecutePage() {
  const [brand, setBrand] = useState("Bitsy");
  const [feature, setFeature] = useState("citation_count");
  const [peers, setPeers] = useState("Profound, Peec AI, Otterly.AI, AthenaHQ");
  const [userValue, setUserValue] = useState(0);
  const [leaderValue, setLeaderValue] = useState(14);
  const [leaderBrand, setLeaderBrand] = useState("Profound");
  const [query, setQuery] = useState("best AI search visibility tool");

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Playbook | null>(null);
  const [copied, setCopied] = useState(false);

  async function run() {
    if (running) return;
    setRunning(true);
    setError(null);
    setResult(null);
    setCopied(false);
    try {
      const res = await fetch(`${API}/api/simulations/execute/playbook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand,
          feature,
          user_value: userValue,
          leader_value: leaderValue,
          leader_brand: leaderBrand,
          peer_brands: peers.split(",").map((p) => p.trim()).filter(Boolean),
          query,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data?.detail ?? res.statusText);
      else setResult(data as Playbook);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  async function copyPatch() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.content_patch.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/admin/gap" className="ink-link text-sm">
              ← back to gap analysis
            </Link>
            <h1 className="mt-2 text-4xl text-[var(--ink)] md:text-5xl">Execute playbook</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
              Pick a gap. Get a five-section, evidence-backed plan:
              content patch, channels, amplification targets, content pairings,
              and timing — every recommendation cited to a paper or benchmark.
            </p>
          </div>
          <div className="text-right text-xs text-[var(--muted)]">
            <div className="font-mono">{API}</div>
            <div>Dev-only. Blocked in production.</div>
          </div>
        </div>

        {/* Inputs */}
        <section className="paper-panel rounded-[1.6rem] p-6 mb-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Brand">
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Feature gap">
              <select
                value={feature}
                onChange={(e) => setFeature(e.target.value)}
                className="input"
              >
                {FEATURE_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Your current value">
              <input
                type="number"
                value={userValue}
                onChange={(e) => setUserValue(parseFloat(e.target.value) || 0)}
                className="input"
              />
            </Field>
            <Field label="Leader value">
              <input
                type="number"
                value={leaderValue}
                onChange={(e) => setLeaderValue(parseFloat(e.target.value) || 0)}
                className="input"
              />
            </Field>
            <Field label="Leader brand">
              <input
                value={leaderBrand}
                onChange={(e) => setLeaderBrand(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Target buyer query">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="input"
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Peer brands (comma-separated, must be in brand_domains for amplification data)">
                <input
                  value={peers}
                  onChange={(e) => setPeers(e.target.value)}
                  className="input"
                />
              </Field>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs text-[var(--muted)]">
              {running ? "building playbook…" : result ? "done" : "fill in the gap and run"}
            </p>
            <button
              onClick={run}
              disabled={running || !brand || !feature}
              className="btn-primary rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {running ? "running…" : "Build playbook"}
            </button>
          </div>
          {error && (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </p>
          )}
        </section>

        {result && <PlaybookView playbook={result} copied={copied} onCopy={copyPatch} />}

        <style jsx>{`
          .input {
            margin-top: 0.25rem;
            width: 100%;
            border-radius: 0.75rem;
            border: 1px solid var(--line);
            background-color: rgba(255, 255, 255, 0.6);
            padding: 0.75rem 1rem;
            font-size: 0.875rem;
            color: var(--ink);
          }
          .input:focus {
            outline: none;
            border-color: var(--ink);
          }
        `}</style>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}

function PlaybookView({
  playbook,
  copied,
  onCopy,
}: {
  playbook: Playbook;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <>
      {/* Summary */}
      <section className="paper-panel rounded-[1.6rem] p-6 mb-6">
        <p className="muted-label text-xs">Playbook for {playbook.brand}</p>
        <h2 className="mt-2 text-2xl text-[var(--ink)]">
          {playbook.feature.replace(/_/g, " ")}
          {playbook.query ? (
            <span className="text-[var(--muted)] font-normal"> · “{playbook.query}”</span>
          ) : null}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">
          {playbook.summary}
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
          <span>
            you: <span className="text-[var(--ink)] font-mono">{playbook.user_value}</span>
          </span>
          <span>
            leader ({playbook.leader_brand ?? "—"}):{" "}
            <span className="text-[var(--ink)] font-mono">{playbook.leader_value}</span>
          </span>
          <span>
            evidence in library:{" "}
            <span className="text-[var(--ink)] font-mono">{playbook.evidence_library_size}</span>
          </span>
        </div>
      </section>

      {/* 1 · Content patch */}
      <Section number="01" title="Content patch">
        <p className="text-sm text-[var(--muted)] mb-3">
          Ready-to-paste paragraph. ≤100 words, one citation, no marketing adjectives.
        </p>
        <div className="rounded-xl border border-[color:var(--line)] bg-white/80 p-4">
          <p className="text-base leading-relaxed text-[var(--ink)]">
            {playbook.content_patch.text}
          </p>
          <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted)]">
            <span>{playbook.content_patch.char_count} chars</span>
            <button
              onClick={onCopy}
              className="rounded-full border border-[color:var(--line)] px-3 py-1 font-mono hover:text-[var(--ink)] hover:border-[var(--ink)] transition-colors"
            >
              {copied ? "copied ✓" : "copy ↗"}
            </button>
          </div>
        </div>
        <EvidenceList items={playbook.content_patch.evidence} />
      </Section>

      {/* 2 · Channels */}
      <Section number="02" title="Channels — where this content lives">
        {playbook.channels.length === 0 ? (
          <p className="text-sm italic text-[var(--muted)]">
            No channel recommendations for this feature yet.
          </p>
        ) : (
          <div className="space-y-3">
            {playbook.channels.map((c, i) => (
              <div
                key={i}
                className="rounded-xl border border-[color:var(--line)] bg-white/70 p-4"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-[var(--ink)]">{c.where}</span>
                  <span className="rounded-full bg-[rgba(0,0,0,0.05)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--muted)]">
                    {c.kind}
                  </span>
                </div>
                <EvidenceList items={c.evidence} compact />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 3 · Amplification */}
      <Section number="03" title="Amplification — who should cite you">
        {playbook.amplification.length === 0 ? (
          <p className="text-sm italic text-[var(--muted)]">
            No amplification targets found — run /collect with these peers to populate{" "}
            the cited-sources data.
          </p>
        ) : (
          <div className="space-y-3">
            {playbook.amplification.map((a) => (
              <div
                key={a.domain}
                className="rounded-xl border border-[color:var(--line)] bg-white/70 p-4"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-sm font-semibold text-[var(--ink)]">
                    {a.domain}
                  </span>
                  <span className="text-[11px] text-[var(--muted)]">
                    gap:{" "}
                    <span className="text-[var(--ink)] font-mono">{a.gap}</span>
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  {Object.entries(a.peer_cite_counts).map(([peer, count]) => (
                    <span
                      key={peer}
                      className="rounded-full bg-[rgba(0,0,0,0.04)] px-2 py-0.5 text-[var(--ink-soft)]"
                    >
                      {peer}: {count}
                    </span>
                  ))}
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">
                    {playbook.brand}: {a.target_cite_count}
                  </span>
                </div>
                <p className="mt-3 text-sm text-[var(--ink-soft)]">{a.pitch_angle}</p>
                <EvidenceList items={a.evidence} compact />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 4 · Content pairings */}
      <Section number="04" title="Content pairings — build these so the patch lands">
        {playbook.content_pairing.length === 0 ? (
          <p className="text-sm italic text-[var(--muted)]">
            No pairing recommendations yet.
          </p>
        ) : (
          <div className="space-y-3">
            {playbook.content_pairing.map((p, i) => (
              <div
                key={i}
                className="rounded-xl border border-[color:var(--line)] bg-white/70 p-4"
              >
                <p className="text-sm font-semibold text-[var(--ink)]">{p.what}</p>
                <p className="mt-1 text-sm text-[var(--ink-soft)]">{p.why}</p>
                <EvidenceList items={p.evidence} compact />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 5 · Timing */}
      <Section number="05" title="Timing — when to ship and refresh">
        <div className="rounded-xl border border-[color:var(--line)] bg-white/70 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Stat label="Ship by" value={playbook.timing.ship_by} />
            <Stat label="Refresh every" value={`${playbook.timing.refresh_cadence_days} days`} />
            <Stat label="Window" value="monthly" />
          </div>
          <p className="mt-3 text-sm text-[var(--ink-soft)]">{playbook.timing.rationale}</p>
          <EvidenceList items={playbook.timing.evidence} compact />
        </div>
      </Section>
    </>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="paper-panel rounded-[1.6rem] p-6 mb-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-xs font-semibold text-[var(--paper)]">
          {number}
        </span>
        <h3 className="text-lg text-[var(--ink)]">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-base font-mono text-[var(--ink)]">{value}</p>
    </div>
  );
}

function EvidenceList({
  items,
  compact,
}: {
  items: EvidenceItem[];
  compact?: boolean;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className={`${compact ? "mt-2" : "mt-4"} space-y-1.5`}>
      {items.map((e) => (
        <details
          key={e.id}
          className="rounded-lg border border-[color:var(--line)] bg-[rgba(247,243,236,0.5)] px-3 py-2 text-xs"
        >
          <summary className="cursor-pointer list-none flex items-center justify-between gap-2">
            <span className="truncate text-[var(--ink-soft)]">
              <span className="font-semibold text-[var(--ink)]">{e.claim}</span>
              <span className="mx-2 text-[var(--muted)]">·</span>
              <span className="text-[var(--muted)]">{e.venue}</span>
            </span>
            <span className="text-[10px] text-[var(--muted)] font-mono">more</span>
          </summary>
          <div className="mt-2 space-y-1 text-[var(--ink-soft)] leading-relaxed">
            <p>
              <span className="text-[var(--muted)]">Source:</span> {e.paper}
            </p>
            <p>{e.finding}</p>
            {e.url && (
              <a
                href={e.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 hover:underline break-all"
              >
                {e.url}
              </a>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
