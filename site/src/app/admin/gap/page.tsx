"use client";

// Gap Analysis — the "what should I change" surface.
// Pulls mention rates + content features for target + peers, ranks feature
// gaps by (normalized magnitude × research-backed impact coefficient), and
// renders a punch list sorted by likely payoff.

import { useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface BrandFeatures {
  citation_count: number;
  statistics_density: number;
  statistics_count: number;
  quotation_count: number;
  readability_grade: number;
  freshness_days: number;
  content_length: number;
  heading_count: number;
  external_link_count: number;
  has_schema_org: number;
}

interface BrandEntry {
  brand: string;
  mention_rate: number | null;
  content_source?: string;
  content_url?: string | null;
  features: Partial<BrandFeatures>;
  crawler?: string;
  pages_crawled?: number;
}

interface Gap {
  feature: string;
  label: string;
  direction: "increase" | "decrease";
  user_value: number;
  leader_value: number;
  leader_brand: string;
  peer_avg: number;
  gap: number;
  impact_score: number;
  research_coef: number;
  evidence: string;
  peer_values: { brand: string; value: number }[];
}

interface GapResponse {
  target: BrandEntry;
  peers: BrandEntry[];
  ranked_gaps: Gap[];
  crawl_mode: string;
}

type CrawlMode = "fast" | "scripted" | "auto" | "none";

export default function GapPage() {
  const [target, setTarget] = useState("Bitsy");
  const [peers, setPeers] = useState("Profound, Peec AI, Otterly.AI, AthenaHQ");
  const [crawlMode, setCrawlMode] = useState<CrawlMode>("fast");
  const [maxPages, setMaxPages] = useState(3);

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GapResponse | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  async function run() {
    if (running) return;
    setRunning(true);
    setError(null);
    setResult(null);
    const t0 = Date.now();
    const timer = setInterval(() => setElapsedMs(Date.now() - t0), 200);
    try {
      const res = await fetch(`${API}/api/simulations/gap-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target,
          peers: peers.split(",").map((p) => p.trim()).filter(Boolean),
          crawl_mode: crawlMode,
          max_pages: maxPages,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data?.detail ?? res.statusText);
      else setResult(data as GapResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      clearInterval(timer);
      setRunning(false);
      setElapsedMs(Date.now() - t0);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/admin/trace" className="ink-link text-sm">
              ← back to engine
            </Link>
            <h1 className="mt-2 text-4xl text-[var(--ink)] md:text-5xl">Gap analysis</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
              Where does your brand lag its peers on the content features
              that actually drive LLM citations? One punch list, sorted by
              expected payoff, grounded in live crawls of every brand.
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
            <label className="block">
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Target brand</span>
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[color:var(--line)] bg-white/60 px-4 py-3 text-sm text-[var(--ink)] focus:border-[var(--ink)] focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Max pages per crawl</span>
              <input
                type="number"
                min={1}
                max={10}
                value={maxPages}
                onChange={(e) => setMaxPages(parseInt(e.target.value, 10) || 3)}
                className="mt-1 w-28 rounded-xl border border-[color:var(--line)] bg-white/60 px-4 py-3 text-sm text-[var(--ink)]"
              />
            </label>
            <div className="md:col-span-2">
              <label className="block">
                <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                  Peers (comma-separated — must be registered in brand_domains)
                </span>
                <input
                  value={peers}
                  onChange={(e) => setPeers(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[color:var(--line)] bg-white/60 px-4 py-3 text-sm text-[var(--ink)] focus:border-[var(--ink)] focus:outline-none"
                />
              </label>
            </div>
            <div className="md:col-span-2">
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Crawl mode</span>
              <div className="mt-2 grid gap-2 md:grid-cols-4">
                <ModeCard name="fast" current={crawlMode} onSelect={setCrawlMode} hint="Cloudflare /crawl. Cheap, fast." />
                <ModeCard name="scripted" current={crawlMode} onSelect={setCrawlMode} hint="Playwright CDP. Handles SPAs." />
                <ModeCard name="auto" current={crawlMode} onSelect={setCrawlMode} hint="Fast first, scripted fallback." />
                <ModeCard name="none" current={crawlMode} onSelect={setCrawlMode} hint="Use feature store only (no crawl)." />
              </div>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs text-[var(--muted)]">
              {running ? (
                <>
                  crawling + analyzing —{" "}
                  <span className="font-mono text-[var(--ink)]">
                    {Math.round(elapsedMs / 1000)}s
                  </span>
                </>
              ) : result ? (
                <>
                  last run: <span className="font-semibold text-[var(--ink)]">{result.ranked_gaps.length}</span>{" "}
                  gaps from <span className="font-semibold text-[var(--ink)]">{result.peers.length}</span> peers
                </>
              ) : (
                "enter a target + peers, hit Run"
              )}
            </p>
            <button
              onClick={run}
              disabled={running || !target}
              className="btn-primary rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {running ? "running…" : "Run gap analysis"}
            </button>
          </div>
          {error && (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </p>
          )}
        </section>

        {result && (
          <>
            {/* Top-line summary */}
            <section className="paper-panel rounded-[1.6rem] p-6 mb-6">
              <h2 className="text-lg text-[var(--ink)] mb-4">
                {result.target.brand} vs {result.peers.length} peers
              </h2>
              <div className="grid gap-3 md:grid-cols-3">
                <TargetStat
                  label="Your mention rate"
                  value={
                    result.target.mention_rate == null
                      ? "—"
                      : `${(result.target.mention_rate * 100).toFixed(1)}%`
                  }
                  note={result.target.mention_rate == null ? "run /collect to populate" : undefined}
                />
                <TargetStat
                  label="Best peer"
                  value={
                    result.peers.reduce<BrandEntry | null>((best, p) => {
                      if (!best || (p.mention_rate ?? 0) > (best.mention_rate ?? 0)) return p;
                      return best;
                    }, null)?.brand ?? "—"
                  }
                />
                <TargetStat
                  label="Content source"
                  value={result.target.content_source ?? "store"}
                  note={
                    result.target.crawler
                      ? `${result.target.crawler} · ${result.target.pages_crawled} pages`
                      : undefined
                  }
                />
              </div>
            </section>

            {/* The punch list */}
            {result.ranked_gaps.length === 0 ? (
              <section className="paper-panel rounded-[1.6rem] p-6 text-center">
                <p className="text-sm text-[var(--muted)]">
                  No meaningful gaps found against the selected peers. Either you&apos;re already ahead, or
                  content features are missing for all brands (try crawl mode &quot;fast&quot; or &quot;auto&quot;).
                </p>
              </section>
            ) : (
              <>
                <h3 className="text-sm uppercase tracking-[0.16em] text-[var(--muted)] mb-3">
                  Ranked gaps — biggest expected payoff first
                </h3>
                <div className="space-y-3">
                  {result.ranked_gaps.map((gap, i) => (
                    <GapCard
                      key={gap.feature}
                      gap={gap}
                      rank={i + 1}
                      targetBrand={result.target.brand}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Raw brand data at the bottom */}
            <section className="mt-8 paper-panel rounded-[1.6rem] p-6">
              <h3 className="text-sm uppercase tracking-[0.16em] text-[var(--muted)] mb-3">
                Raw feature snapshot
              </h3>
              <FeatureMatrix target={result.target} peers={result.peers} />
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function ModeCard({
  name,
  current,
  onSelect,
  hint,
}: {
  name: CrawlMode;
  current: CrawlMode;
  onSelect: (m: CrawlMode) => void;
  hint: string;
}) {
  const active = name === current;
  return (
    <button
      type="button"
      onClick={() => onSelect(name)}
      className={`text-left rounded-xl border px-4 py-3 transition-all ${
        active
          ? "border-[var(--ink)] bg-white/80"
          : "border-[color:var(--line)] bg-white/40 opacity-70 hover:opacity-100"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--ink)]">{name}</span>
        <span
          className={`h-4 w-4 rounded-full border ${
            active ? "bg-[var(--ink)] border-[var(--ink)]" : "bg-transparent border-[color:var(--line)]"
          }`}
        />
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">{hint}</p>
    </button>
  );
}

function TargetStat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="metric-card">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl text-[var(--ink)] font-mono">{value}</p>
      {note && <p className="mt-1 text-[11px] text-[var(--muted)]">{note}</p>}
    </div>
  );
}

function GapCard({
  gap,
  rank,
  targetBrand,
}: {
  gap: Gap;
  rank: number;
  targetBrand: string;
}) {
  // Normalize peer values for the bar chart: scale to the leader.
  const maxValue = Math.max(
    gap.leader_value,
    gap.user_value,
    ...gap.peer_values.map((p) => p.value),
    0.0001
  );
  const impactPct = Math.round(gap.research_coef * 100);

  return (
    <div className="paper-panel rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
            gap #{rank}
          </p>
          <h4 className="mt-1 text-lg text-[var(--ink)] font-semibold">{gap.label}</h4>
          <p className="text-[11px] text-[var(--muted)]">
            research coefficient: up to {impactPct}% · direction: {gap.direction}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Impact score</p>
          <p className="mt-1 text-2xl font-mono text-[var(--ink)]">
            {(gap.impact_score * 100).toFixed(1)}
          </p>
        </div>
      </div>

      {/* Side-by-side bars: you vs each peer */}
      <div className="mt-4 space-y-1.5">
        <BarRow
          label={targetBrand}
          value={gap.user_value}
          max={maxValue}
          isUser
        />
        {gap.peer_values.map((pv) => (
          <BarRow
            key={pv.brand}
            label={pv.brand}
            value={pv.value}
            max={maxValue}
            isLeader={pv.brand === gap.leader_brand}
          />
        ))}
      </div>

      {/* Evidence */}
      <div className="mt-4 rounded-xl border border-[color:var(--line)] bg-white/60 p-3 text-sm text-[var(--ink)]">
        {gap.evidence}
      </div>
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
  isUser,
  isLeader,
}: {
  label: string;
  value: number;
  max: number;
  isUser?: boolean;
  isLeader?: boolean;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const color = isUser
    ? "bg-amber-400"
    : isLeader
    ? "bg-emerald-500"
    : "bg-neutral-400";
  return (
    <div className="flex items-center gap-3 text-xs">
      <span
        className={`w-28 truncate ${isUser ? "font-semibold text-[var(--ink)]" : "text-[var(--muted)]"}`}
      >
        {label}
        {isUser && <span className="ml-1 text-[9px] text-amber-700">(you)</span>}
        {isLeader && !isUser && <span className="ml-1 text-[9px] text-emerald-700">(leader)</span>}
      </span>
      <div className="flex-1 h-5 rounded-full bg-[rgba(0,0,0,0.04)] overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-16 text-right font-mono text-[var(--ink)]">
        {value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
      </span>
    </div>
  );
}

function FeatureMatrix({ target, peers }: { target: BrandEntry; peers: BrandEntry[] }) {
  const allBrands = [target, ...peers];
  const cols: { key: keyof BrandFeatures; label: string }[] = [
    { key: "citation_count", label: "citations" },
    { key: "statistics_count", label: "stats" },
    { key: "statistics_density", label: "stats/1K" },
    { key: "quotation_count", label: "quotes" },
    { key: "heading_count", label: "headings" },
    { key: "external_link_count", label: "ext links" },
    { key: "content_length", label: "chars" },
    { key: "readability_grade", label: "readability" },
    { key: "freshness_days", label: "freshness d" },
    { key: "has_schema_org", label: "schema" },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
            <th className="text-left py-2 pr-3">Brand</th>
            {cols.map((c) => (
              <th key={c.key} className="text-right py-2 px-2">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allBrands.map((b) => (
            <tr
              key={b.brand}
              className={`border-t border-[color:var(--line)] ${
                b === target ? "bg-emerald-50/40" : ""
              }`}
            >
              <td className="py-2 pr-3">
                <span className="font-semibold text-[var(--ink)]">{b.brand}</span>
                {b === target && (
                  <span className="ml-2 rounded-full bg-[var(--ink)] px-2 py-0.5 text-[9px] font-semibold text-[var(--paper)]">
                    target
                  </span>
                )}
              </td>
              {cols.map((c) => {
                const v = (b.features as Record<string, number | undefined>)[c.key as string] ?? 0;
                return (
                  <td key={c.key} className="py-2 px-2 text-right font-mono text-[var(--muted)]">
                    {typeof v === "number" ? (v % 1 === 0 ? v : v.toFixed(1)) : String(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
