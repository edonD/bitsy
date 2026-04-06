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
    const query = queryInput.trim();
    if (query && !queries.includes(query)) {
      setQueries([...queries, query]);
      setQueryInput("");
    }
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
    <div className="grid gap-8 lg:grid-cols-[1.08fr,0.92fr]">
      <section className="paper-panel rounded-[2.2rem] p-6 md:p-7">
        <div className="quiet-divider">
          <p className="muted-label text-xs">Quick start</p>
          <h2 className="mt-3 text-3xl text-[var(--ink)]">Start with an example</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Pick an example market, then replace the product names and questions with your own.
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

        <div className="quiet-divider">
          <p className="muted-label text-xs">Step 1</p>
          <h2 className="mt-3 text-3xl text-[var(--ink)]">Your product</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Add the product or brand you want to test.
          </p>
          <input
            type="text"
            value={targetBrand}
            onChange={(e) => setTargetBrand(e.target.value)}
            placeholder="e.g., HubSpot"
            className="mt-4 w-full rounded-2xl border border-[color:var(--line)] bg-[rgba(255,255,255,0.58)] px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[color:var(--line-strong)]"
          />
        </div>

        <div className="quiet-divider">
          <p className="muted-label text-xs">Step 2</p>
          <h2 className="mt-3 text-3xl text-[var(--ink)]">Competitor brands</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Keep this list small and relevant. A tighter comparison set produces a cleaner result.
          </p>
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={competitorInput}
              onChange={(e) => setCompetitorInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCompetitor()}
              placeholder="Add a competitor..."
              className="flex-1 rounded-2xl border border-[color:var(--line)] bg-[rgba(255,255,255,0.58)] px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[color:var(--line-strong)]"
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

        <div className="quiet-divider">
          <p className="muted-label text-xs">Step 3</p>
          <h2 className="mt-3 text-3xl text-[var(--ink)]">Buyer questions</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Add the questions buyers ask in search or chat. Think best-of, alternatives,
            comparisons, and "which tool should I choose?" prompts.
          </p>
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addQuery()}
              placeholder='e.g., "What is the best CRM for small businesses?"'
              className="flex-1 rounded-2xl border border-[color:var(--line)] bg-[rgba(255,255,255,0.58)] px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[color:var(--line-strong)]"
            />
            <button
              onClick={addQuery}
              className="btn-secondary rounded-2xl px-4 py-3 text-sm font-semibold"
            >
              Add
            </button>
          </div>

          {queries.length > 0 && (
            <div className="mt-4 space-y-2">
              {queries.map((query) => (
                <div
                  key={query}
                  className="surface-inset flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-[var(--ink)]"
                >
                  <span className="flex-1">"{query}"</span>
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

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <section className="paper-panel rounded-[2.2rem] p-6">
          <p className="muted-label text-xs">This test</p>
          <h2 className="mt-3 text-3xl text-[var(--ink)]">What Bitsy will check</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            For each question, Bitsy runs the selected AI tools a few times and checks whether
            your product appears, where it shows up, and how that changes across models.
          </p>

          <div className="mt-5 space-y-3 rounded-[1.5rem] border border-[color:var(--line)] bg-[rgba(255,255,255,0.42)] p-4 text-sm text-[var(--muted)]">
            <div className="flex items-center justify-between gap-4">
              <span>Your product</span>
              <strong className="text-[var(--ink)]">
                {targetBrand.trim() || "Not set yet"}
              </strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Competitors</span>
              <strong className="text-[var(--ink)]">{competitors.length}</strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Buyer questions</span>
              <strong className="text-[var(--ink)]">{queries.length}</strong>
            </div>
          </div>

          <div className="quiet-divider">
            <p className="muted-label text-xs">Step 4</p>
            <h3 className="mt-3 text-2xl text-[var(--ink)]">AI tools</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Pick the tools you want to compare.
            </p>
            <div className="mt-4 space-y-2">
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
                        {meta.label}
                      </div>
                      <div className="text-xs text-[var(--muted)]">{meta.provider}</div>
                    </div>
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: meta.color }}
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <div className="quiet-divider">
            <p className="muted-label text-xs">Step 5</p>
            <h3 className="mt-3 text-2xl text-[var(--ink)]">Repeat runs</h3>
            <div className="mt-4 flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={10}
                value={samplesPerQuery}
                onChange={(e) => setSamplesPerQuery(Number(e.target.value))}
                className="flex-1 accent-stone-900"
              />
              <span className="w-8 text-center font-mono text-sm font-semibold text-[var(--ink)]">
                {samplesPerQuery}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
              More repeats make the result steadier. A good first pass is usually 3 to 5.
            </p>
          </div>

          <div className="quiet-divider">
            <p className="muted-label text-xs">Summary</p>
            <div className="mt-3 space-y-2 text-sm text-[var(--muted)]">
              <p>
                Total brands in test:
                <strong className="ml-1 text-[var(--ink)]">{1 + competitors.length}</strong>
              </p>
              <p>
                AI tools selected:
                <strong className="ml-1 text-[var(--ink)]">{selectedModels.size}</strong>
              </p>
              <p>
                Total responses checked:
                <strong className="ml-1 text-[var(--ink)]">
                  {(queries.length * selectedModels.size * samplesPerQuery).toLocaleString()}
                </strong>
              </p>
            </div>
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
