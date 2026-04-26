"use client";

// Crawler playground — drop any URL in, choose tier, see exactly what the
// nightly competitor crawler would extract. Dev-only, blocked in prod.

import { useState } from "react";
import Link from "next/link";
import { API_BASE_URL as API, apiFetch } from "@/lib/config";

type Mode = "auto" | "fast" | "scripted";

interface CrawlPage {
  url: string;
  status: number;
  word_count: number;
  markdown_length: number;
  title?: string | null;
  features?: Record<string, unknown> | null;
  error?: string | null;
}

interface CrawlResult {
  url: string;
  crawler: string;
  cloudflare_configured: boolean;
  mode_requested: string;
  blocked: boolean;
  pages_found: number;
  pages_crawled: number;
  total_words: number;
  duration_ms: number;
  aggregate: Record<string, number | boolean | null>;
  pages: CrawlPage[];
  note?: string | null;
  error?: string | null;
}

const AGG_KEYS: { key: string; label: string; format?: (v: unknown) => string }[] = [
  { key: "word_count", label: "Words" },
  { key: "content_length", label: "Content length (chars)" },
  { key: "statistics_count", label: "Statistics" },
  { key: "statistics_density", label: "Stats / 1K words", format: (v) => `${Number(v).toFixed(1)}` },
  { key: "quotation_count", label: "Quotations" },
  { key: "citation_count", label: "Citations" },
  { key: "external_link_count", label: "External links" },
  { key: "heading_count", label: "Headings (h1+h2+h3)" },
  { key: "readability_grade", label: "Readability grade" },
  { key: "technical_term_density", label: "Technical term density" },
  {
    key: "freshness_days",
    label: "Freshness (days)",
    format: (v) => (v == null ? "—" : String(v)),
  },
  { key: "has_schema_org", label: "Schema.org", format: (v) => (v ? "yes" : "no") },
];

export default function CrawlerPage() {
  const [url, setUrl] = useState("https://aisplash.me");
  const [maxPages, setMaxPages] = useState(3);
  const [depth, setDepth] = useState(2);
  const [mode, setMode] = useState<Mode>("auto");

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CrawlResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  async function run() {
    if (running) return;
    setRunning(true);
    setError(null);
    setResult(null);
    const t0 = Date.now();
    const timer = setInterval(() => setElapsedMs(Date.now() - t0), 200);
    try {
      const res = await apiFetch("/api/simulations/crawl-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          max_pages: maxPages,
          depth,
          mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.detail ?? res.statusText);
      } else {
        setResult(data as CrawlResult);
      }
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
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/admin/trace" className="ink-link text-sm">
              ← back to engine trace
            </Link>
            <h1 className="mt-2 text-4xl text-[var(--ink)] md:text-5xl">Crawler playground</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
              Drop any URL, pick a tier, and see exactly what the nightly
              competitor crawler would extract — per-page responses,
              aggregated GEO features, and timings.
            </p>
          </div>
          <div className="text-right text-xs text-[var(--muted)]">
            <div className="font-mono">{API}</div>
            <div>Dev-only. Blocked in production.</div>
          </div>
        </div>

        {/* Form */}
        <section className="paper-panel rounded-[1.6rem] p-6 mb-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block">
                <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">URL</span>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="mt-1 w-full rounded-xl border border-[color:var(--line)] bg-white/60 px-4 py-3 text-sm text-[var(--ink)] focus:border-[var(--ink)] focus:outline-none"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Max pages</span>
              <input
                type="number"
                min={1}
                max={25}
                value={maxPages}
                onChange={(e) => setMaxPages(parseInt(e.target.value, 10) || 3)}
                className="mt-1 w-28 rounded-xl border border-[color:var(--line)] bg-white/60 px-4 py-3 text-sm text-[var(--ink)]"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Depth</span>
              <input
                type="number"
                min={1}
                max={4}
                value={depth}
                onChange={(e) => setDepth(parseInt(e.target.value, 10) || 2)}
                className="mt-1 w-28 rounded-xl border border-[color:var(--line)] bg-white/60 px-4 py-3 text-sm text-[var(--ink)]"
              />
            </label>
          </div>

          <div className="mt-5">
            <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Mode</span>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              <ModeCard
                name="auto"
                current={mode}
                onSelect={setMode}
                title="Auto (tiered)"
                hint="Cloudflare /crawl first. If it returns empty, falls back to scripted browser. Default for nightly."
              />
              <ModeCard
                name="fast"
                current={mode}
                onSelect={setMode}
                title="Fast"
                hint="Cloudflare /crawl only. Respects robots.txt. Cheapest, works on most sites."
              />
              <ModeCard
                name="scripted"
                current={mode}
                onSelect={setMode}
                title="Scripted"
                hint="Playwright over Cloudflare Browser Run CDP. Accepts cookies, scrolls for lazy-load, waits for content. Slower but handles SPAs."
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs text-[var(--muted)]">
              {running ? (
                <>running — <span className="font-mono text-[var(--ink)]">{Math.round(elapsedMs / 1000)}s elapsed</span></>
              ) : result ? (
                <>last run: <span className="font-mono text-[var(--ink)]">{Math.round(result.duration_ms / 1000)}s</span> via <span className="font-semibold text-[var(--ink)]">{result.crawler}</span></>
              ) : (
                "submit a URL to begin"
              )}
            </p>
            <button
              onClick={run}
              disabled={running || !url}
              className="btn-primary rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {running ? "crawling…" : "Run crawl"}
            </button>
          </div>

          {error && (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </p>
          )}
        </section>

        {/* Results */}
        {result && (
          <>
            <section className="paper-panel rounded-[1.6rem] p-6 mb-6">
              <h2 className="text-lg text-[var(--ink)] mb-4">Run summary</h2>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <Stat label="Crawler" value={result.crawler} />
                <Stat label="Mode requested" value={result.mode_requested} />
                <Stat
                  label="Blocked"
                  value={result.blocked ? "yes" : "no"}
                  warning={result.blocked}
                />
                <Stat label="Duration" value={`${(result.duration_ms / 1000).toFixed(1)}s`} />
                <Stat
                  label="Pages found"
                  value={String(result.pages_found)}
                />
                <Stat
                  label="Pages with content"
                  value={String(result.pages_crawled)}
                />
                <Stat
                  label="Total words"
                  value={result.total_words.toLocaleString()}
                />
                <Stat
                  label="Cloudflare"
                  value={result.cloudflare_configured ? "configured" : "not configured"}
                  warning={!result.cloudflare_configured}
                />
              </div>
              {result.note && (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {result.note}
                </p>
              )}
              {result.error && (
                <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {result.error}
                </p>
              )}
            </section>

            <section className="paper-panel rounded-[1.6rem] p-6 mb-6">
              <h2 className="text-lg text-[var(--ink)] mb-1">Aggregate GEO features</h2>
              <p className="mb-4 text-sm text-[var(--muted)]">
                Rolled up across every successfully crawled page — this is
                exactly the row the engine would write to{" "}
                <span className="font-mono">brand_signals</span> for this
                brand today.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {AGG_KEYS.map(({ key, label, format }) => {
                  const v = result.aggregate[key];
                  const display = format ? format(v) : v == null ? "—" : String(v);
                  return (
                    <div key={key} className="metric-card">
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                        {label}
                      </p>
                      <p className="mt-1 text-2xl text-[var(--ink)] font-mono">
                        {display}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="paper-panel rounded-[1.6rem] p-6 mb-10">
              <h2 className="text-lg text-[var(--ink)] mb-4">
                Per-page breakdown ({result.pages.length})
              </h2>
              <div className="space-y-2">
                {result.pages.map((p, i) => (
                  <PageRow key={`${p.url}-${i}`} page={p} />
                ))}
              </div>
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
  title,
  hint,
}: {
  name: Mode;
  current: Mode;
  onSelect: (m: Mode) => void;
  title: string;
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
        <span className="text-sm font-semibold text-[var(--ink)]">{title}</span>
        <span
          className={`h-4 w-4 rounded-full border ${
            active
              ? "bg-[var(--ink)] border-[var(--ink)]"
              : "bg-transparent border-[color:var(--line)]"
          }`}
        />
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">{hint}</p>
    </button>
  );
}

function Stat({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className="metric-card">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p
        className={`mt-1 text-lg font-mono ${
          warning ? "text-rose-700" : "text-[var(--ink)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function PageRow({ page }: { page: CrawlPage }) {
  const [open, setOpen] = useState(false);
  const hasError = Boolean(page.error);
  const empty = page.word_count === 0;
  return (
    <div
      className={`rounded-xl border bg-white/70 transition-all ${
        hasError
          ? "border-rose-200"
          : empty
          ? "border-amber-200"
          : "border-emerald-100"
      }`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left"
      >
        <span
          className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            hasError
              ? "bg-rose-100 text-rose-800"
              : empty
              ? "bg-amber-100 text-amber-800"
              : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {page.status || "—"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-[var(--ink)]">
            {page.title || page.url}
          </p>
          <p className="truncate text-[11px] text-[var(--muted)]">{page.url}</p>
        </div>
        <span className="font-mono text-xs text-[var(--muted)] whitespace-nowrap">
          {page.word_count.toLocaleString()} words
        </span>
        <span className={`text-xs text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {open && (
        <div className="border-t border-[color:var(--line)] px-4 py-3 bg-white/40 text-xs">
          {hasError && (
            <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-900">
              {page.error}
            </p>
          )}
          {page.features && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">
                Extracted features
              </p>
              <pre className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3 text-[11px] text-[var(--ink)] overflow-x-auto whitespace-pre-wrap max-h-72 overflow-y-auto">
                {JSON.stringify(page.features, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
