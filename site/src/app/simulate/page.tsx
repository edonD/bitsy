"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSimulation } from "@/components/SimulationProvider";
import {
  type ModelId,
  MODEL_META,
  INDUSTRY_PRESETS,
} from "@/lib/simulation-engine";

const ALL_MODELS: ModelId[] = ["chatgpt", "claude", "gemini", "perplexity"];

export default function SimulateSetupPage() {
  const router = useRouter();
  const { run, isRunning } = useSimulation();

  const [targetBrand, setTargetBrand] = useState("");
  const [competitorInput, setCompetitorInput] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [queryInput, setQueryInput] = useState("");
  const [queries, setQueries] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<Set<ModelId>>(
    new Set(ALL_MODELS)
  );
  const [samplesPerQuery, setSamplesPerQuery] = useState(5);

  const addCompetitor = () => {
    const name = competitorInput.trim();
    if (name && !competitors.includes(name) && name !== targetBrand) {
      setCompetitors([...competitors, name]);
      setCompetitorInput("");
    }
  };

  const removeCompetitor = (name: string) => {
    setCompetitors(competitors.filter((c) => c !== name));
  };

  const addQuery = () => {
    const q = queryInput.trim();
    if (q && !queries.includes(q)) {
      setQueries([...queries, q]);
      setQueryInput("");
    }
  };

  const removeQuery = (q: string) => {
    setQueries(queries.filter((existing) => existing !== q));
  };

  const toggleModel = (model: ModelId) => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(model)) {
        if (next.size > 1) next.delete(model);
      } else {
        next.add(model);
      }
      return next;
    });
  };

  const applyPreset = (preset: typeof INDUSTRY_PRESETS[number]) => {
    setTargetBrand(preset.targetBrand);
    setCompetitors(preset.competitors);
    setQueries(preset.queries);
  };

  const canRun =
    targetBrand.trim().length > 0 &&
    competitors.length > 0 &&
    queries.length > 0 &&
    selectedModels.size > 0;

  const handleRun = () => {
    if (!canRun || isRunning) return;
    run({
      targetBrand: targetBrand.trim(),
      competitors,
      queries,
      models: Array.from(selectedModels),
      samplesPerQuery,
    });
    router.push("/simulate/results");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left: Setup form */}
      <div className="lg:col-span-2 space-y-6">
        {/* Industry Presets */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Quick Start — Industry Presets
          </label>
          <div className="flex flex-wrap gap-2">
            {INDUSTRY_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => applyPreset(preset)}
                className="px-3 py-1.5 text-xs font-medium rounded-full border border-slate-300 text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Target Brand */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Your Brand</h3>
          <input
            type="text"
            value={targetBrand}
            onChange={(e) => setTargetBrand(e.target.value)}
            placeholder="e.g., HubSpot"
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Competitors */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">
            Competitors ({competitors.length})
          </h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={competitorInput}
              onChange={(e) => setCompetitorInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCompetitor()}
              placeholder="Add competitor name..."
              className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={addCompetitor}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
          </div>
          {competitors.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {competitors.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-full text-sm text-slate-700"
                >
                  {c}
                  <button
                    onClick={() => removeCompetitor(c)}
                    className="text-slate-400 hover:text-red-500 ml-0.5"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Queries */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">
            Queries to Simulate ({queries.length})
          </h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addQuery()}
              placeholder='e.g., "What is the best CRM for small businesses?"'
              className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={addQuery}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
          </div>
          {queries.length > 0 && (
            <div className="space-y-1.5">
              {queries.map((q) => (
                <div
                  key={q}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-md text-sm text-slate-700"
                >
                  <span className="flex-1">&ldquo;{q}&rdquo;</span>
                  <button
                    onClick={() => removeQuery(q)}
                    className="text-slate-400 hover:text-red-500 shrink-0"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Model selection + Run */}
      <div className="space-y-6">
        {/* Model Selection */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">LLM Models</h3>
          <div className="space-y-2">
            {ALL_MODELS.map((modelId) => {
              const meta = MODEL_META[modelId];
              const isSelected = selectedModels.has(modelId);
              return (
                <label
                  key={modelId}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-white border-blue-300 shadow-sm"
                      : "border-slate-200 hover:bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleModel(modelId)}
                    className="accent-blue-600"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-800">
                      {meta.label}
                    </div>
                    <div className="text-xs text-slate-500">
                      ~{meta.avgCitationsPerResponse} brands/response
                    </div>
                  </div>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: meta.color }}
                  />
                </label>
              );
            })}
          </div>
        </div>

        {/* Samples */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Samples per Query</h3>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={10}
              value={samplesPerQuery}
              onChange={(e) => setSamplesPerQuery(Number(e.target.value))}
              className="flex-1 accent-blue-600"
            />
            <span className="text-sm font-mono font-semibold text-slate-900 w-8 text-center">
              {samplesPerQuery}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Higher samples improve statistical confidence. Research shows 15% variance
            even at temperature=0 (Research 2.2).
          </p>
        </div>

        {/* Run Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">Simulation Summary</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p>
              Brands: <strong>{1 + competitors.length}</strong> (
              {targetBrand || "your brand"} + {competitors.length} competitors)
            </p>
            <p>
              Queries: <strong>{queries.length}</strong>
            </p>
            <p>
              Models: <strong>{selectedModels.size}</strong>
            </p>
            <p>
              Samples: <strong>{samplesPerQuery}</strong> per query
            </p>
            <p className="pt-1 border-t border-blue-200 font-semibold">
              Total API calls:{" "}
              {(queries.length * selectedModels.size * samplesPerQuery).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Run Button */}
        <button
          onClick={handleRun}
          disabled={!canRun || isRunning}
          className={`w-full py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
            canRun && !isRunning
              ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          }`}
        >
          {isRunning ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Running Simulation...
            </span>
          ) : (
            "Run Simulation"
          )}
        </button>

        {!canRun && (
          <p className="text-xs text-slate-500 text-center">
            {!targetBrand.trim()
              ? "Enter your brand name"
              : competitors.length === 0
              ? "Add at least one competitor"
              : queries.length === 0
              ? "Add at least one query"
              : "Select at least one model"}
          </p>
        )}
      </div>
    </div>
  );
}
