"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSimulation } from "@/components/SimulationProvider";
import {
  type ModelId,
  MODEL_META,
  INDUSTRY_PRESETS,
} from "@/lib/simulation-engine";

const ALL_MODELS: ModelId[] = ["chatgpt", "claude", "gemini"];

const DEFAULT_QUERY_SUGGESTIONS = [
  "Best option for a small team",
  "Top alternatives in this category",
  "What should I choose this year?",
  "Best fit for a fast-growing company",
];

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

  const activePreset = useMemo(
    () => INDUSTRY_PRESETS.find((preset) => preset.targetBrand === targetBrand.trim()),
    [targetBrand]
  );

  const suggestedQueries =
    activePreset?.queries.slice(0, 4) ?? DEFAULT_QUERY_SUGGESTIONS;

  const totalResponses = queries.length * selectedModels.size * samplesPerQuery;

  const addCompetitor = () => {
    const name = competitorInput.trim();
    if (name && !competitors.includes(name) && name !== targetBrand) {
      setCompetitors([...competitors, name]);
      setCompetitorInput("");
    }
  };

  const addQuery = () => {
    const query = queryInput.trim();
    if (query && !queries.includes(query)) {
      setQueries([...queries, query]);
      setQueryInput("");
    }
  };

  const addSuggestedQuery = (query: string) => {
    if (!queries.includes(query)) {
      setQueries([...queries, query]);
    }
  };

  const removeCompetitor = (name: string) => {
    setCompetitors(competitors.filter((competitor) => competitor !== name));
  };

  const removeQuery = (query: string) => {
    setQueries(queries.filter((existing) => existing !== query));
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

  const applyPreset = (preset: (typeof INDUSTRY_PRESETS)[number]) => {
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
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr),340px]">
      <section className="paper-panel rounded-[2.2rem] p-6 md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="muted-label text-xs">Build the test</p>
            <h2 className="mt-3 text-3xl text-[var(--ink)]">Set up the scenario</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
              Use a preset if you want a fast start, then replace the brands and questions with
              your own.
            </p>
          </div>
          <span className="surface-chip px-3 py-1 text-xs text-[var(--muted)]">
            2 to 5 competitors is usually enough
          </span>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-[0.95fr,1.05fr]">
          <div className="paper-card rounded-[1.6rem] p-5">
            <p className="muted-label text-xs">Market preset</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Load a sample market and edit from there.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {INDUSTRY_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className="surface-chip px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:border-[color:var(--line-strong)] hover:text-[var(--ink)]"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="paper-card rounded-[1.6rem] p-5">
            <p className="muted-label text-xs">Your product</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Add the product or brand you want to test.
            </p>
            <input
              type="text"
              value={targetBrand}
              onChange={(event) => setTargetBrand(event.target.value)}
              placeholder="e.g., HubSpot"
              className="field-input mt-4"
            />
          </div>
        </div>

        <div className="mt-5 paper-card rounded-[1.6rem] p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="muted-label text-xs">Competitors</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                Keep the comparison set tight so the results stay easy to read.
              </p>
            </div>
            <span className="font-mono text-xs text-[var(--muted)]">
              {competitors.length} added
            </span>
          </div>

          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={competitorInput}
              onChange={(event) => setCompetitorInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && addCompetitor()}
              placeholder="Add a competitor"
              className="field-input flex-1"
            />
            <button
              onClick={addCompetitor}
              className="btn-secondary rounded-2xl px-4 py-3 text-sm font-semibold"
            >
              Add
            </button>
          </div>

          {competitors.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {competitors.map((competitor) => (
                <span
                  key={competitor}
                  className="surface-chip inline-flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--ink)]"
                >
                  {competitor}
                  <button
                    onClick={() => removeCompetitor(competitor)}
                    className="text-[var(--muted)] hover:text-rose-600"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 paper-card rounded-[1.6rem] p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="muted-label text-xs">Buyer questions</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                Add the prompts that real buyers would type into search or chat.
              </p>
            </div>
            <span className="font-mono text-xs text-[var(--muted)]">
              {queries.length} added
            </span>
          </div>

          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && addQuery()}
              placeholder='e.g., "Best CRM for small business?"'
              className="field-input flex-1"
            />
            <button
              onClick={addQuery}
              className="btn-secondary rounded-2xl px-4 py-3 text-sm font-semibold"
            >
              Add
            </button>
          </div>

          <div className="mt-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
              Quick starters
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {suggestedQueries.map((query) => (
                <button
                  key={query}
                  onClick={() => addSuggestedQuery(query)}
                  className="surface-chip px-3 py-1.5 text-left text-xs text-[var(--muted)] hover:border-[color:var(--line-strong)] hover:text-[var(--ink)]"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>

          {queries.length > 0 && (
            <div className="mt-4 grid gap-2">
              {queries.map((query) => (
                <div
                  key={query}
                  className="surface-inset flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-[var(--ink)]"
                >
                  <span className="flex-1">{query}</span>
                  <button
                    onClick={() => removeQuery(query)}
                    className="text-[var(--muted)] hover:text-rose-600"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <section className="paper-panel rounded-[2rem] p-6">
          <p className="muted-label text-xs">Run settings</p>
          <h2 className="mt-3 text-2xl text-[var(--ink)]">Choose the tools</h2>
          <div className="mt-4 grid gap-2">
            {ALL_MODELS.map((modelId) => {
              const meta = MODEL_META[modelId];
              const isSelected = selectedModels.has(modelId);

              return (
                <label
                  key={modelId}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 ${
                    isSelected
                      ? "border-[color:var(--line-strong)] bg-[rgba(255,255,255,0.74)]"
                      : "border-[color:var(--line)] bg-[rgba(255,255,255,0.34)] hover:bg-[rgba(255,255,255,0.5)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleModel(modelId)}
                    className="accent-stone-900"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-[var(--ink)]">
                      {meta.provider}
                    </div>
                    <div className="text-xs text-[var(--muted)]">{meta.label}</div>
                  </div>
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: meta.color }}
                  />
                </label>
              );
            })}
          </div>

          <div className="quiet-divider">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="muted-label text-xs">Repeat runs</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  More repeats smooth out one-off variance.
                </p>
              </div>
              <span className="font-mono text-sm font-semibold text-[var(--ink)]">
                {samplesPerQuery}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={samplesPerQuery}
              onChange={(event) => setSamplesPerQuery(Number(event.target.value))}
              className="mt-4 w-full accent-stone-900"
            />
          </div>
        </section>

        <section className="paper-panel rounded-[2rem] p-6">
          <p className="muted-label text-xs">Summary</p>
          <div className="mt-4 space-y-3">
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Total brands
              </p>
              <p className="mt-2 text-3xl text-[var(--ink)]">{1 + competitors.length}</p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Questions
              </p>
              <p className="mt-2 text-3xl text-[var(--ink)]">{queries.length}</p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Responses checked
              </p>
              <p className="mt-2 text-3xl text-[var(--ink)]">
                {totalResponses.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="quiet-divider">
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Bitsy will show how often your product appears, how it ranks, and which AI tools are
              most favorable.
            </p>
          </div>

          <button
            onClick={handleRun}
            disabled={!canRun || isRunning}
            className={`mt-6 w-full rounded-2xl px-4 py-3 text-sm font-semibold ${
              canRun && !isRunning
                ? "btn-primary"
                : "cursor-not-allowed bg-[rgba(26,23,20,0.12)] text-[var(--muted)]"
            }`}
          >
            {isRunning ? "Running test..." : "Run test"}
          </button>

          {!canRun && (
            <p className="mt-3 text-center text-xs text-[var(--muted)]">
              {!targetBrand.trim()
                ? "Add your product"
                : competitors.length === 0
                ? "Add at least one competitor"
                : queries.length === 0
                ? "Add at least one buyer question"
                : "Select at least one AI tool"}
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}
