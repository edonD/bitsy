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
  requestFee: number; // per request, in dollars (for Perplexity)
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
  {
    name: "Perplexity Sonar",
    provider: "Perplexity",
    costPerQuery: 0.0006,
    inputPer1M: 1.00,
    outputPer1M: 1.00,
    tier: "mid",
    batchDiscount: 1, // no batch discount
    hasRequestFee: true,
    requestFee: 0.008, // ~$8 per 1K requests (medium context)
    note: "Includes live web search + citations",
  },
  {
    name: "Perplexity Sonar Pro",
    provider: "Perplexity",
    costPerQuery: 0.0078,
    inputPer1M: 3.00,
    outputPer1M: 15.00,
    tier: "flagship",
    batchDiscount: 1,
    hasRequestFee: true,
    requestFee: 0.014, // ~$14 per 1K requests
    note: "Multi-step queries, 2x citations",
  },
];

const PRESETS: { label: string; brands: number; queries: number; samples: number; frequency: number }[] = [
  { label: "Startup MVP (5 brands)", brands: 5, queries: 3, samples: 3, frequency: 1 },
  { label: "Small Business (10 brands)", brands: 10, queries: 5, samples: 3, frequency: 1 },
  { label: "Agency (50 brands)", brands: 50, queries: 8, samples: 3, frequency: 1 },
  { label: "Enterprise (100 brands)", brands: 100, queries: 10, samples: 5, frequency: 1 },
  { label: "Tryscope-Style (50 polls/day)", brands: 10, queries: 5, samples: 1, frequency: 1 },
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
    new Set(["GPT-4.1-nano", "Gemini 2.5 Flash-Lite", "Claude Haiku 4.5", "Perplexity Sonar"])
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

      const cheapestBudget = budgetModels.length > 0
        ? Math.min(...budgetModels.map((m) => m.costPerQuery + (m.hasRequestFee ? m.requestFee : 0)))
        : Math.min(...activeModels.map((m) => m.costPerQuery + (m.hasRequestFee ? m.requestFee : 0)));
      const cheapestMid = midModels.length > 0
        ? Math.min(...midModels.map((m) => m.costPerQuery + (m.hasRequestFee ? m.requestFee : 0)))
        : cheapestBudget;
      const cheapestFlagship = flagshipModels.length > 0
        ? Math.min(...flagshipModels.map((m) => m.costPerQuery + (m.hasRequestFee ? m.requestFee : 0)))
        : cheapestMid;

      const batchMult = useBatchAPI ? 0.5 : 1;
      tieredMonthlyCost =
        totalQueries * budgetShare * cheapestBudget * batchMult +
        totalQueries * midShare * cheapestMid * batchMult +
        totalQueries * flagshipShare * cheapestFlagship * batchMult;
    }

    const annualCost = naiveMonthlyCost * 12;
    const annualTiered = tieredMonthlyCost ? tieredMonthlyCost * 12 : null;

    // Recommended config
    const avgCostPerQuery = naiveMonthlyCost / queriesPerMonth;

    return {
      queriesPerDay,
      queriesPerMonth,
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
        <label className="block text-sm font-semibold text-slate-700 mb-2">Quick Presets</label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="px-3 py-1.5 text-xs font-medium rounded-full border border-slate-300 text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Inputs */}
        <div className="space-y-5">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-semibold text-slate-800">Monitoring Parameters</h3>

            <div>
              <label className="flex items-center justify-between text-sm text-slate-600 mb-1">
                <span>Brands to monitor</span>
                <span className="font-mono text-slate-900 font-semibold">{brands}</span>
              </label>
              <input
                type="range"
                min={1}
                max={500}
                value={brands}
                onChange={(e) => setBrands(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                <span>1</span><span>500</span>
              </div>
            </div>

            <div>
              <label className="flex items-center justify-between text-sm text-slate-600 mb-1">
                <span>Queries per brand</span>
                <span className="font-mono text-slate-900 font-semibold">{queriesPerBrand}</span>
              </label>
              <input
                type="range"
                min={1}
                max={30}
                value={queriesPerBrand}
                onChange={(e) => setQueriesPerBrand(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                <span>1</span><span>30</span>
              </div>
            </div>

            <div>
              <label className="flex items-center justify-between text-sm text-slate-600 mb-1">
                <span>Samples per query</span>
                <span className="font-mono text-slate-900 font-semibold">{samplesPerQuery}</span>
              </label>
              <input
                type="range"
                min={1}
                max={30}
                value={samplesPerQuery}
                onChange={(e) => setSamplesPerQuery(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                <span>1</span><span>30</span>
              </div>
            </div>

            <div>
              <label className="flex items-center justify-between text-sm text-slate-600 mb-1">
                <span>Polls per day</span>
                <span className="font-mono text-slate-900 font-semibold">{pollingFrequency}</span>
              </label>
              <input
                type="range"
                min={1}
                max={50}
                value={pollingFrequency}
                onChange={(e) => setPollingFrequency(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                <span>1</span><span>50</span>
              </div>
            </div>
          </div>

          {/* Model Selection */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Models</h3>
            <div className="space-y-1.5">
              {MODELS.map((model) => (
                <label
                  key={model.name}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white rounded px-1.5 py-1 -mx-1.5 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedModels.has(model.name)}
                    onChange={() => toggleModel(model.name)}
                    className="accent-blue-600 rounded"
                  />
                  <span className="flex-1 text-slate-700">{model.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    model.tier === "budget"
                      ? "bg-green-100 text-green-700"
                      : model.tier === "mid"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                    {formatCurrency(model.costPerQuery)}/q
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Optimizations */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Optimizations</h3>
            <label className="flex items-center gap-2 text-sm cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={useBatchAPI}
                onChange={(e) => setUseBatchAPI(e.target.checked)}
                className="accent-blue-600"
              />
              <span className="text-slate-700">Use Batch API (50% off, 24h delay)</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={useTieredStrategy}
                onChange={(e) => setUseTieredStrategy(e.target.checked)}
                className="accent-blue-600"
              />
              <span className="text-slate-700">Tiered strategy (90% budget / 9% mid / 1% flagship)</span>
            </label>
          </div>
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {results ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <div className="text-xs text-blue-600 font-medium">Queries/Month</div>
                  <div className="text-xl font-bold text-blue-800 mt-1">
                    {results.queriesPerMonth.toLocaleString()}
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <div className="text-xs text-blue-600 font-medium">Queries/Day</div>
                  <div className="text-xl font-bold text-blue-800 mt-1">
                    {results.queriesPerDay.toLocaleString()}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <div className="text-xs text-green-600 font-medium">Monthly Cost</div>
                  <div className="text-xl font-bold text-green-800 mt-1">
                    {formatCurrency(results.naiveMonthlyCost)}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <div className="text-xs text-green-600 font-medium">Annual Cost</div>
                  <div className="text-xl font-bold text-green-800 mt-1">
                    {formatCurrency(results.annualCost)}
                  </div>
                </div>
              </div>

              {/* Tiered Strategy Result */}
              {results.tieredMonthlyCost !== null && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <div className="text-sm font-semibold text-emerald-800">Tiered Strategy Estimate</div>
                  <div className="flex items-baseline gap-3 mt-1">
                    <span className="text-2xl font-bold text-emerald-700">
                      {formatCurrency(results.tieredMonthlyCost)}
                    </span>
                    <span className="text-sm text-emerald-600">/month</span>
                    <span className="text-sm text-emerald-600">
                      ({Math.round((1 - results.tieredMonthlyCost / results.naiveMonthlyCost) * 100)}% savings)
                    </span>
                  </div>
                  <div className="text-xs text-emerald-600 mt-1">
                    Annual: {formatCurrency(results.annualTiered!)} (vs {formatCurrency(results.annualCost)} uniform)
                  </div>
                </div>
              )}

              {/* Avg Cost Per Query */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="text-sm font-semibold text-slate-700">Average Cost Per Query</div>
                <div className="text-lg font-bold text-slate-900 mt-1">
                  {formatCurrency(results.avgCostPerQuery)}
                </div>
              </div>

              {/* Per-Model Breakdown */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-800">Cost Breakdown by Model</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left">
                        <th className="py-2 px-3 font-medium text-slate-600">Model</th>
                        <th className="py-2 px-3 font-medium text-slate-600 text-right">Queries</th>
                        <th className="py-2 px-3 font-medium text-slate-600 text-right">Token Cost</th>
                        <th className="py-2 px-3 font-medium text-slate-600 text-right">Req. Fees</th>
                        <th className="py-2 px-3 font-medium text-slate-600 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {results.modelBreakdown.map((row) => (
                        <tr key={row.model.name} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-700">
                            <div className="font-medium">{row.model.name}</div>
                            <div className="text-xs text-slate-400">{row.model.provider}</div>
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600 font-mono text-xs">
                            {row.queriesPerMonth.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600 font-mono text-xs">
                            {formatCurrency(row.tokenCost)}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600 font-mono text-xs">
                            {row.requestFees > 0 ? formatCurrency(row.requestFees) : "—"}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-900 font-mono text-xs">
                            {formatCurrency(row.totalCost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-200 bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-800">Total</td>
                        <td className="py-2 px-3 text-right font-mono text-xs font-semibold text-slate-800">
                          {results.queriesPerMonth.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-xs text-slate-600">
                          {formatCurrency(results.modelBreakdown.reduce((s, m) => s + m.tokenCost, 0))}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-xs text-slate-600">
                          {formatCurrency(results.modelBreakdown.reduce((s, m) => s + m.requestFees, 0))}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-xs font-bold text-slate-900">
                          {formatCurrency(results.naiveMonthlyCost)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Recommendation */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">Recommendation</h3>
                <div className="text-sm text-blue-700 space-y-1">
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
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-amber-800 mb-2">Compared to GEO SaaS Tools</h3>
                  <div className="text-sm text-amber-700 space-y-1">
                    <p>
                      Your raw API cost of <strong>{formatCurrency(results.naiveMonthlyCost)}/mo</strong> for{" "}
                      {results.queriesPerMonth.toLocaleString()} queries compares to:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 ml-1 text-xs">
                      <li>Rankscale: ~{formatCurrency(results.queriesPerMonth * 0.017)}/mo at $0.017/prompt</li>
                      <li>Otterly.AI: ~{formatCurrency(results.queriesPerMonth * 1.5)}/mo at ~$1.50/prompt</li>
                      <li>AthenaHQ: ~{formatCurrency(results.queriesPerMonth * 0.083)}/mo at $0.083/prompt</li>
                      <li>Profound: ~{formatCurrency(results.queriesPerMonth * 9.98)}/mo at $9.98/prompt</li>
                    </ul>
                    <p className="text-xs mt-2">
                      The markup over raw API cost ranges from <strong>10x</strong> (budget tools) to{" "}
                      <strong>1,000x+</strong> (premium tools). The value add is parsing, dashboards, and insights.
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-500">
              Select at least one model to see cost estimates.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
