"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { API_BASE_URL as API, apiFetch } from "@/lib/config";
import { PlaybookView } from "./PlaybookView";
import type { Playbook } from "./types";

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

interface PlaybookValues {
  brand: string;
  feature: string;
  peers: string;
  userValue: number;
  leaderValue: number;
  leaderBrand: string;
  query: string;
  category: string;
}

export default function ExecutePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--paper)]" />}>
      <ExecutePageInner />
    </Suspense>
  );
}

function ExecutePageInner() {
  const searchParams = useSearchParams();

  const [brand, setBrand] = useState("Bitsy");
  const [feature, setFeature] = useState("citation_count");
  const [peers, setPeers] = useState("Profound, Peec AI, Otterly.AI, AthenaHQ");
  const [userValue, setUserValue] = useState(0);
  const [leaderValue, setLeaderValue] = useState(14);
  const [leaderBrand, setLeaderBrand] = useState("Profound");
  const [query, setQuery] = useState("best AI search visibility tool");
  const [category, setCategory] = useState("AI search visibility tools");

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Playbook | null>(null);
  const [copied, setCopied] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const autoRanRef = useRef(false);

  async function runWith(values: PlaybookValues) {
    setRunning(true);
    setError(null);
    setResult(null);
    setCopied(false);

    try {
      const res = await apiFetch("/api/simulations/execute/playbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: values.brand,
          feature: values.feature,
          user_value: values.userValue,
          leader_value: values.leaderValue,
          leader_brand: values.leaderBrand,
          peer_brands: values.peers.split(",").map((peer) => peer.trim()).filter(Boolean),
          query: values.query,
          category: values.category,
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

  async function run() {
    if (running) return;
    await runWith({ brand, feature, peers, userValue, leaderValue, leaderBrand, query, category });
  }

  useEffect(() => {
    if (autoRanRef.current || !searchParams) return;

    const getParam = (key: string) => searchParams.get(key);
    const nextBrand = getParam("brand") ?? brand;
    const nextFeature = getParam("feature") ?? feature;
    const nextPeers = getParam("peers") ?? peers;
    const nextUserValue = getParam("user_value") != null ? parseFloat(getParam("user_value")!) : userValue;
    const nextLeaderValue = getParam("leader_value") != null ? parseFloat(getParam("leader_value")!) : leaderValue;
    const nextLeaderBrand = getParam("leader_brand") ?? leaderBrand;
    const nextQuery = getParam("query") ?? query;
    const nextCategory = getParam("category") ?? category;

    if (getParam("brand")) setBrand(nextBrand);
    if (getParam("feature")) setFeature(nextFeature);
    if (getParam("peers")) setPeers(nextPeers);
    if (getParam("user_value")) setUserValue(nextUserValue);
    if (getParam("leader_value")) setLeaderValue(nextLeaderValue);
    if (getParam("leader_brand")) setLeaderBrand(nextLeaderBrand);
    if (getParam("query")) setQuery(nextQuery);
    if (getParam("category")) setCategory(nextCategory);

    if (getParam("autorun") === "1") {
      autoRanRef.current = true;
      runWith({
        brand: nextBrand,
        feature: nextFeature,
        peers: nextPeers,
        userValue: nextUserValue,
        leaderValue: nextLeaderValue,
        leaderBrand: nextLeaderBrand,
        query: nextQuery,
        category: nextCategory,
      });
    }
    // The URL hydration intentionally runs once with the initial state defaults.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function copyPatch() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.content_patch.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  async function savePlaybook() {
    if (!result || saveState === "saving") return;

    setSaveState("saving");
    try {
      const res = await apiFetch("/api/simulations/execute/save-playbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: result.brand,
          feature: result.feature,
          payload: result,
        }),
      });
      if (res.ok) {
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2400);
      } else {
        setSaveState("idle");
      }
    } catch {
      setSaveState("idle");
    }
  }

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/admin/gap" className="ink-link text-sm">
              back to gap analysis
            </Link>
            <h1 className="mt-2 text-4xl text-[var(--ink)] md:text-5xl">Execute playbook</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
              Pick a gap. Get a five-section, evidence-backed plan: content patch, channels, amplification targets,
              content pairings, and timing.
            </p>
          </div>
          <div className="text-right text-xs text-[var(--muted)]">
            <div className="font-mono">{API}</div>
            <div>Dev-only. Blocked in production.</div>
          </div>
        </div>

        <section className="paper-panel rounded-[1.6rem] p-6 mb-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Brand">
              <input value={brand} onChange={(e) => setBrand(e.target.value)} className="input" />
            </Field>
            <Field label="Feature gap">
              <select value={feature} onChange={(e) => setFeature(e.target.value)} className="input">
                {FEATURE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
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
              <input value={leaderBrand} onChange={(e) => setLeaderBrand(e.target.value)} className="input" />
            </Field>
            <Field label="Target buyer query">
              <input value={query} onChange={(e) => setQuery(e.target.value)} className="input" />
            </Field>
            <Field label="Category">
              <input value={category} onChange={(e) => setCategory(e.target.value)} className="input" />
            </Field>
            <div className="md:col-span-2">
              <Field label="Peer brands">
                <input value={peers} onChange={(e) => setPeers(e.target.value)} className="input" />
              </Field>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs text-[var(--muted)]">
              {running ? "building playbook..." : result ? "done" : "fill in the gap and run"}
            </p>
            <button
              onClick={run}
              disabled={running || !brand || !feature}
              className="btn-primary rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {running ? "running..." : "Build playbook"}
            </button>
          </div>
          {error && (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </p>
          )}
        </section>

        {result && (
          <PlaybookView
            playbook={result}
            copied={copied}
            onCopy={copyPatch}
            onSave={savePlaybook}
            saveState={saveState}
          />
        )}

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
