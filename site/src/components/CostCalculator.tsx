"use client";

import { useState, useMemo } from "react";

// Real pricing data from Research 2.3 (April 2026)
// Cost per query assuming ~100 input tokens, ~500 output tokens
interface ModelInfo {
  name: string;
  provider: string;
  costPerQuery: number; // in dollars
  inputPer1M: number;
  outputPer1M: number;
  tier: "budget" | "mid" | "flagship";
  batchDiscount: number; // multiplier (0.5 = 50% off)
  hasRequestFee: boolean;
  requestFee: number; // per request, in dollars
  note: string;
}

const MODELS: ModelInfo[] = [
  {
    name: "GPT-4.1-nano",
    provider: "OpenAI",
    costPerQuery: 0.0002,
    inputPer1M: 0.10,
    outputPer1M: 0.40,
    tier: "budget",
    batchDiscount: 0.5,
    hasRequestFee: false,
    requestFee: 0,
    note: "Cheapest OpenAI option, good for polling",
  },
  {
    name: "GPT-4o-mini",
    provider: "OpenAI",
    costPerQuery: 0.0003,
    inputPer1M: 0.15,
    outputPer1M: 0.60,
    tier: "budget",
    batchDiscount: 0.5,
    hasRequestFee: false,
    requestFee: 0,
    note: "Budget with slightly better quality",
  },
  {
    name: "Gemini 2.5 Flash-Lite",
    provider: "Google",
    costPerQuery: 0.0002,
    inputPer1M: 0.10,
    outputPer1M: 0.40,
    tier: "budget",
    batchDiscount: 0.5,
    hasRequestFee: false,
    requestFee: 0,
    note: "Free tier available at lower rate limits",
  },
  {
    name: "Gemini 2.5 Flash",
    provider: "Google",
    costPerQuery: 0.0013,
    inputPer1M: 0.30,
    outputPer1M: 2.50,
    tier: "mid",
    batchDiscount: 0.5,
    hasRequestFee: false,
    requestFee: 0,
    note: "Good mid-range option",
  },
  {
    name: "Claude Haiku 4.5",
    provider: "Anthropic",
    costPerQuery: 0.0026,
    inputPer1M: 1.00,
    outputPer1M: 5.00,
    tier: "mid",
    batchDiscount: 0.5,
    hasRequestFee: false,
    requestFee: 0,
    note: "Fast, mid-range Anthropic model",
  },
  {
    name: "GPT-4o",
    provider: "OpenAI",
    costPerQuery: 0.0053,
    inputPer1M: 2.50,
    outputPer1M: 10.00,
    tier: "flagship",
    batchDiscount: 0.5,
    hasRequestFee: false,
    requestFee: 0,
    note: "Flagship OpenAI model",
  },
  {
    name: "GPT-4.1",
    provider: "OpenAI",
    costPerQuery: 0.0042,
    inputPer1M: 2.00,
    outputPer1M: 8.00,
    tier: "flagship",
    batchDiscount: 0.5,
    hasRequestFee: false,
    requestFee: 0,
    note: "Latest GPT-4 class model",
  },
  {
    name: "Claude Sonnet 4.6",
    provider: "Anthropic",
    costPerQuery: 0.0078,
    inputPer1M: 3.00,
    outputPer1M: 15.00,
    tier: "flagship",
    batchDiscount: 0.5,
    hasRequestFee: false,
    requestFee: 0,
    note: "Top-tier Anthropic model",
  },
  {
    name: "Gemini 2.5 Pro",
    provider: "Google",
    costPerQuery: 0.0051,
    inputPer1M: 1.25,
    outputPer1M: 10.00,
    tier: "flagship",
    batchDiscount: 0.5,
    hasRequestFee: false,
    requestFee: 0,
    note: "Flagship Google model",
  },
];

const PRESETS: { label: string; brands: number; queries: number; samples: number; frequency: number }[] = [
  { label: "Startup MVP (5 brands)", brands: 5, queries: 3, samples: 3, frequency: 1 },
  { label: "Small Business (10 brands)", brands: 10, queries: 5, samples: 3, frequency: 1 },
  { label: "Agency (50 brands)", brands: 50, queries: 8, samples: 3, frequency: 1 },
  { label: "Enterprise (100 brands)", brands: 100, queries: 10, samples: 5, frequency: 1 },
  { label: "Tryscope-Style (50 polls/day)", brands: 10, queries: 5, samples: 1, frequency: 50 },
];

function formatCurrency(value: number): string {
  if (value < 0.01) return `$${value.toFixed(4)}`;
  if (value < 1) return `$${value.toFixed(3)}`;
  if (value < 100) return `$${value.toFixed(2)}`;
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

interface CalculatorProps {
  compact?: boolean;
}

export function CostCalculator({ compact = false }: CalculatorProps) {
  const [brands, setBrands] = useState(10);
  const [queriesPerBrand, setQueriesPerBrand] = useState(5);
  const [samplesPerQuery, setSamplesPerQuery] = useState(3);
  const [pollingFrequency, setPollingFrequency] = useState(1); // times per day
  const [selectedModels, setSelectedModels] = useState<Set<string>>(
    new Set(["GPT-4.1-nano", "Gemini 2.5 Flash-Lite", "Claude Haiku 4.5"])
  );
  const [useBatchAPI, setUseBatchAPI] = useState(false);
  const [useTieredStrategy, setUseTieredStrategy] = useState(false);

  const toggleModel = (name: string) => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const applyPreset = (preset: typeof PRESETS[number]) => {
    setBrands(preset.brands);
    setQueriesPerBrand(preset.queries);
    setSamplesPerQuery(preset.samples);
    setPollingFrequency(preset.frequency);
  };

  const results = useMemo(() => {
    const activeModels = MODELS.filter((m) => selectedModels.has(m.name));
    const modelCount = activeModels.length;
    if (modelCount === 0) return null;

    const queriesPerDay = brands * queriesPerBrand * modelCount * samplesPerQuery * pollingFrequency;
    const queriesPerMonth = queriesPerDay * 30;

    // Per-model breakdown
    const perModelQueries = brands * queriesPerBrand * samplesPerQuery * pollingFrequency * 30;

    const modelBreakdown = activeModels.map((model) => {
      let queryCost = model.costPerQuery;
      let requestFee = model.hasRequestFee ? model.requestFee : 0;

      if (useBatchAPI && model.batchDiscount < 1) {
        queryCost *= model.batchDiscount;
      }

      const tokenCost = queryCost * perModelQueries;
      const totalRequestFees = requestFee * perModelQueries;
      const totalCost = tokenCost + totalRequestFees;

      return {
        model,
        queriesPerMonth: perModelQueries,
        tokenCost,
        requestFees: totalRequestFees,
        totalCost,
      };
    });

    const naiveMonthlyCost = modelBreakdown.reduce((sum, m) => sum + m.totalCost, 0);

    // Tiered strategy: 90% budget, 9% mid, 1% flagship
    let tieredMonthlyCost: number | null = null;
    if (useTieredStrategy && activeModels.length > 1) {
      const budgetModels = activeModels.filter((m) => m.tier === "budget");
      const midModels = activeModels.filter((m) => m.tier === "mid");
      const flagshipModels = activeModels.filter((m) => m.tier === "flagship");

      const totalQueries = queriesPerMonth;
      const budgetShare = 0.9;
      const midShare = 0.09;
      const flagshipShare = 0.01;

      const getCheapestModel = (models: ModelInfo[], fallback: ModelInfo[]): ModelInfo =>
        (models.length > 0 ? models : fallback).reduce((best, m) => {
          const bestCost = best.costPerQuery + (best.hasRequestFee ? best.requestFee : 0);
          const mCost = m.costPerQuery + (m.hasRequestFee ? m.requestFee : 0);
          return mCost < bestCost ? m : best;
        });

      const cheapestBudgetModel = getCheapestModel(budgetModels, activeModels);
      const cheapestMidModel = getCheapestModel(midModels, [cheapestBudgetModel]);
      const cheapestFlagshipModel = getCheapestModel(flagshipModels, [cheapestMidModel]);

      const effectiveCost = (model: ModelInfo): number => {
        let cost = model.costPerQuery;
        if (useBatchAPI && model.batchDiscount < 1) {
          cost *= model.batchDiscount;
        }
        const reqFee = model.hasRequestFee ? model.requestFee : 0;
        return cost + reqFee;
      };

      tieredMonthlyCost =
        totalQueries * budgetShare * effectiveCost(cheapestBudgetModel) +
        totalQueries * midShare * effectiveCost(cheapestMidModel) +
        totalQueries * flagshipShare * effectiveCost(cheapestFlagshipModel);
    }

    const annualCost = naiveMonthlyCost * 12;
    const annualTiered = tieredMonthlyCost ? tieredMonthlyCost * 12 : null;

    // Recommended config
    const avgCostPerQuery = naiveMonthlyCost / queriesPerMonth;

    // SaaS tools charge per user-level prompt (one query to their platform),
    // NOT per individual API call across models and samples.
    // A "prompt" = one user query (e.g., "best CRM for small business").
    // The tool handles multi-model querying and sampling internally.
    const promptsPerMonth = brands * queriesPerBrand * pollingFrequency * 30;

    return {
      queriesPerDay,
      queriesPerMonth,
      promptsPerMonth,
      modelBreakdown,
      naiveMonthlyCost,
      tieredMonthlyCost,
      annualCost,
      annualTiered,
      avgCostPerQuery,
    };
  }, [brands, queriesPerBrand, samplesPerQuery, pollingFrequency, selectedModels, useBatchAPI, useTieredStrategy]);

  return (
    <div className={compact ? "" : "max-w-4xl mx-auto"}>
      {/* Presets */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-semibold text-[var(--ink)]">Quick presets</label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="rounded-full border border-[color:var(--line)] bg-[rgba(255,255,255,0.46)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:border-[color:var(--line-strong)] hover:text-[var(--ink)]"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Inputs */}
        <div className="space-y-5">
          <div className="paper-card space-y-4 rounded-[1.5rem] p-4">
            <h3 className="text-sm font-semibold text-[var(--ink)]">Monitoring parameters</h3>

            <div>
              <label className="mb-1 flex items-center justify-between text-sm text-[var(--muted)]">
                <span>Brands to monitor</span>
                <span className="font-mono font-semibold text-[var(--ink)]">{brands}</span>
              </label>
              <input
                type="range"
                min={1}
                max={500}
                value={brands}
                onChange={(e) => setBrands(Number(e.target.value))}
                className="w-full accent-stone-900"
              />
              <div className="mt-0.5 flex justify-between text-xs text-[var(--muted)]">
                <span>1</span><span>500</span>
              </div>
            </div>

            <div>
              <label className="mb-1 flex items-center justify-between text-sm text-[var(--muted)]">
                <span>Queries per brand</span>
                <span className="font-mono font-semibold text-[var(--ink)]">{queriesPerBrand}</span>
              </label>
              <input
                type="range"
                min={1}
                max={30}
                value={queriesPerBrand}
                onChange={(e) => setQueriesPerBrand(Number(e.target.value))}
                className="w-full accent-stone-900"
              />
              <div className="mt-0.5 flex justify-between text-xs text-[var(--muted)]">
                <span>1</span><span>30</span>
              </div>
            </div>

            <div>
              <label className="mb-1 flex items-center justify-between text-sm text-[var(--muted)]">
                <span>Samples per query</span>
                <span className="font-mono font-semibold text-[var(--ink)]">{samplesPerQuery}</span>
              </label>
              <input
                type="range"
                min={1}
                max={30}
                value={samplesPerQuery}
                onChange={(e) => setSamplesPerQuery(Number(e.target.value))}
                className="w-full accent-stone-900"
              />
              <div className="mt-0.5 flex justify-between text-xs text-[var(--muted)]">
                <span>1</span><span>30</span>
              </div>
            </div>

            <div>
              <label className="mb-1 flex items-center justify-between text-sm text-[var(--muted)]">
                <span>Polls per day</span>
                <span className="font-mono font-semibold text-[var(--ink)]">{pollingFrequency}</span>
              </label>
              <input
                type="range"
                min={1}
                max={50}
                value={pollingFrequency}
                onChange={(e) => setPollingFrequency(Number(e.target.value))}
                className="w-full accent-stone-900"
              />
              <div className="mt-0.5 flex justify-between text-xs text-[var(--muted)]">
                <span>1</span><span>50</span>
              </div>
            </div>
          </div>

          {/* Model Selection */}
          <div className="paper-card rounded-[1.5rem] p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--ink)]">Models</h3>
            <div className="space-y-1.5">
              {MODELS.map((model) => (
                <label
                  key={model.name}
                  className="mx-[-0.375rem] flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm transition-colors hover:bg-[rgba(255,255,255,0.5)]"
                >
                  <input
                    type="checkbox"
                    checked={selectedModels.has(model.name)}
                    onChange={() => toggleModel(model.name)}
                    className="rounded accent-stone-900"
                  />
                  <span className="flex-1 text-[var(--ink)]">{model.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    model.tier === "budget"
                      ? "bg-[rgba(255,255,255,0.7)] text-[var(--ink)]"
                      : model.tier === "mid"
                      ? "bg-[rgba(255,255,255,0.54)] text-[var(--ink)]"
                      : "bg-[rgba(36,32,28,0.14)] text-[var(--ink)]"
                  }`}>
                    {formatCurrency(model.costPerQuery)}/q
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Optimizations */}
          <div className="paper-card rounded-[1.5rem] p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--ink)]">Optimizations</h3>
            <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useBatchAPI}
                onChange={(e) => setUseBatchAPI(e.target.checked)}
                className="accent-stone-900"
              />
              <span className="text-[var(--ink)]">Use Batch API (50% off, 24h delay)</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useTieredStrategy}
                onChange={(e) => setUseTieredStrategy(e.target.checked)}
                className="accent-stone-900"
              />
              <span className="text-[var(--ink)]">Tiered strategy (90% budget / 9% mid / 1% flagship)</span>
            </label>
          </div>
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {results ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="paper-card rounded-[1.5rem] p-3 text-center">
                  <div className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">Queries/month</div>
                  <div className="mt-1 text-xl text-[var(--ink)]">
                    {results.queriesPerMonth.toLocaleString()}
                  </div>
                </div>
                <div className="paper-card rounded-[1.5rem] p-3 text-center">
                  <div className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">Queries/day</div>
                  <div className="mt-1 text-xl text-[var(--ink)]">
                    {results.queriesPerDay.toLocaleString()}
                  </div>
                </div>
                <div className="paper-card rounded-[1.5rem] p-3 text-center">
                  <div className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">Monthly cost</div>
                  <div className="mt-1 text-xl text-[var(--ink)]">
                    {formatCurrency(results.naiveMonthlyCost)}
                  </div>
                </div>
                <div className="paper-card rounded-[1.5rem] p-3 text-center">
                  <div className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">Annual cost</div>
                  <div className="mt-1 text-xl text-[var(--ink)]">
                    {formatCurrency(results.annualCost)}
                  </div>
                </div>
              </div>

              {/* Tiered Strategy Result */}
              {results.tieredMonthlyCost !== null && (
                <div className="paper-card rounded-[1.5rem] p-4">
                  <div className="text-sm font-semibold text-[var(--ink)]">Tiered strategy estimate</div>
                  <div className="flex items-baseline gap-3 mt-1">
                    <span className="text-2xl font-bold text-[var(--ink)]">
                      {formatCurrency(results.tieredMonthlyCost)}
                    </span>
                    <span className="text-sm text-[var(--muted)]">/month</span>
                    <span className="text-sm text-[var(--muted)]">
                      ({Math.round((1 - results.tieredMonthlyCost / results.naiveMonthlyCost) * 100)}% savings)
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[var(--muted)]">
                    Annual: {formatCurrency(results.annualTiered!)} (vs {formatCurrency(results.annualCost)} uniform)
                  </div>
                </div>
              )}

              {/* Avg Cost Per Query */}
              <div className="paper-card rounded-[1.5rem] p-4">
                <div className="text-sm font-semibold text-[var(--muted)]">Average cost per query</div>
                <div className="mt-1 text-lg font-bold text-[var(--ink)]">
                  {formatCurrency(results.avgCostPerQuery)}
                </div>
              </div>

              {/* Per-Model Breakdown */}
              <div className="paper-card overflow-hidden rounded-[1.5rem]">
                <div className="border-b border-[color:var(--line)] px-4 py-3">
                  <h3 className="text-sm font-semibold text-[var(--ink)]">Cost breakdown by model</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left">
                        <th className="py-2 px-3 font-medium text-[var(--muted)]">Model</th>
                        <th className="py-2 px-3 text-right font-medium text-[var(--muted)]">Queries</th>
                        <th className="py-2 px-3 text-right font-medium text-[var(--muted)]">Token cost</th>
                        <th className="py-2 px-3 text-right font-medium text-[var(--muted)]">Req. fees</th>
                        <th className="py-2 px-3 text-right font-medium text-[var(--muted)]">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {results.modelBreakdown.map((row) => (
                        <tr key={row.model.name} className="hover:bg-[rgba(255,255,255,0.2)]">
                          <td className="py-2 px-3 text-[var(--ink)]">
                            <div className="font-medium">{row.model.name}</div>
                            <div className="text-xs text-[var(--muted)]">{row.model.provider}</div>
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-xs text-[var(--muted)]">
                            {row.queriesPerMonth.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-xs text-[var(--muted)]">
                            {formatCurrency(row.tokenCost)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-xs text-[var(--muted)]">
                            {row.requestFees > 0 ? formatCurrency(row.requestFees) : "—"}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-xs font-semibold text-[var(--ink)]">
                            {formatCurrency(row.totalCost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-[color:var(--line)] bg-[rgba(255,255,255,0.26)]">
                        <td className="py-2 px-3 font-semibold text-[var(--ink)]">Total</td>
                        <td className="py-2 px-3 text-right font-mono text-xs font-semibold text-[var(--ink)]">
                          {results.queriesPerMonth.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-xs text-[var(--muted)]">
                          {formatCurrency(results.modelBreakdown.reduce((s, m) => s + m.tokenCost, 0))}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-xs text-[var(--muted)]">
                          {formatCurrency(results.modelBreakdown.reduce((s, m) => s + m.requestFees, 0))}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-xs font-bold text-[var(--ink)]">
                          {formatCurrency(results.naiveMonthlyCost)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Recommendation */}
              <div className="paper-card rounded-[1.5rem] p-4">
                <h3 className="mb-2 text-sm font-semibold text-[var(--ink)]">Recommendation</h3>
                <div className="space-y-1 text-sm text-[var(--muted)]">
                  {results.naiveMonthlyCost < 20 && (
                    <p>Your configuration is very cost-effective. Consider adding more models for broader coverage.</p>
                  )}
                  {results.naiveMonthlyCost >= 20 && results.naiveMonthlyCost < 200 && (
                    <p>Moderate spend. Enable the tiered strategy and batch API to cut costs by 80-95%.</p>
                  )}
                  {results.naiveMonthlyCost >= 200 && results.naiveMonthlyCost < 1000 && (
                    <p>
                      Significant spend at {formatCurrency(results.naiveMonthlyCost)}/mo. Strongly recommend tiered
                      strategy + batch API. Consider reducing samples to 3 with temperature=0 for near-deterministic
                      results.
                    </p>
                  )}
                  {results.naiveMonthlyCost >= 1000 && (
                    <p>
                      High spend at {formatCurrency(results.naiveMonthlyCost)}/mo. Use tiered strategy (90% budget
                      models), batch API, prompt caching, and semantic caching. With all optimizations, expect 90-97%
                      reduction to {formatCurrency(results.naiveMonthlyCost * 0.05)}&ndash;
                      {formatCurrency(results.naiveMonthlyCost * 0.1)}/mo.
                    </p>
                  )}
                  {selectedModels.size === 1 && (
                    <p>Monitoring only 1 model. LLMs give different answers — use 3-4 models for reliable visibility data.</p>
                  )}
                  {!useBatchAPI && results.naiveMonthlyCost > 50 && (
                    <p>Enable Batch API for an easy 50% savings on non-urgent daily polls.</p>
                  )}
                </div>
              </div>

              {/* Comparison to SaaS */}
              {!compact && (
                <div className="paper-card rounded-[1.5rem] p-4">
                  <h3 className="mb-2 text-sm font-semibold text-[var(--ink)]">Compared to GEO SaaS tools</h3>
                  <div className="space-y-1 text-sm text-[var(--muted)]">
                    <p>
                      Your raw API cost: <strong>{formatCurrency(results.naiveMonthlyCost)}/mo</strong> for{" "}
                      {results.queriesPerMonth.toLocaleString()} API calls ({results.promptsPerMonth.toLocaleString()}{" "}
                      unique prompts × {selectedModels.size} models × {samplesPerQuery} samples).
                    </p>
                    <p className="text-xs">
                      SaaS tools charge per <em>user-level prompt</em> (one query to their platform). They handle
                      multi-model querying and sampling internally. Based on your{" "}
                      <strong>{results.promptsPerMonth.toLocaleString()} prompts/mo</strong>:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 ml-1 text-xs">
                      <li>Rankscale: ~{formatCurrency(results.promptsPerMonth * 0.017)}/mo at $0.017/prompt</li>
                      <li>Otterly.AI: ~{formatCurrency(results.promptsPerMonth * 1.5)}/mo at ~$1.50/prompt</li>
                      <li>AthenaHQ: ~{formatCurrency(results.promptsPerMonth * 0.083)}/mo at $0.083/prompt</li>
                      <li>Profound: ~{formatCurrency(results.promptsPerMonth * 9.98)}/mo at $9.98/prompt</li>
                    </ul>
                    <p className="mt-2 text-xs">
                      SaaS markup over raw API cost varies significantly by tool — from roughly{" "}
                      <strong>1.5x&ndash;3x</strong> (budget tools like Rankscale) to{" "}
                      <strong>20x&ndash;50x</strong> (premium tools like Profound). The premium covers parsing,
                      dashboards, competitive insights, and managed infrastructure. Whether the premium is worth it
                      depends on your team&apos;s ability to build and maintain the DIY pipeline.
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="paper-card rounded-[1.5rem] p-8 text-center text-sm text-[var(--muted)]">
              Select at least one model to see cost estimates.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
