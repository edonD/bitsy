const features = [
  {
    id: "sample-report",
    label: "02 · Observe",
    title: "See your standing across every model, every night.",
    text: "A live panel of buyer queries runs against ChatGPT, Claude, Gemini, and Perplexity on a schedule. One dashboard shows where you appear, where you missed, and which competitor won.",
    points: ["Nightly automated measurement", "Mention rate, position, sentiment", "Raw LLM responses on demand"],
    tone: "bg-[#ece8f7]",
    accent: "bg-[#f7f5fd]",
    preview: (
      <div className="paper-panel overflow-hidden rounded-[0.45rem]">
        <div className="flex items-center justify-between border-b border-[color:var(--line)] px-5 py-4">
          <div className="flex gap-2">
            <span className="surface-chip px-3 py-1 text-xs text-[var(--muted)]">Preview 01</span>
            <span className="surface-chip px-3 py-1 text-xs text-[var(--muted)]">Report</span>
          </div>
          <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            Buyer prompt
          </span>
        </div>
        <div className="grid gap-4 p-5 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-4">
            <div className="surface-inset rounded-[0.35rem] p-5">
              <p className="muted-label text-xs">Prompt</p>
              <h3 className="mt-3 text-2xl leading-tight text-[var(--ink)]">
                Best AI search testing tools for SaaS teams
              </h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {["Mention rate 34%", "Best position #2", "Competitors 3"].map((item) => (
                <div key={item} className="metric-card">
                  <p className="text-sm text-[var(--ink)]">{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[0.35rem] border border-[color:var(--line)] bg-[rgba(255,255,255,0.74)]">
            <div className="grid grid-cols-[1.1fr,0.9fr] border-b border-[color:var(--line)] px-4 py-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
              <span>AI tool</span>
              <span>Result</span>
            </div>
            <div className="divide-y divide-[color:var(--line)]">
              {[
                ["ChatGPT", "Mentioned #2"],
                ["Claude", "Not mentioned"],
                ["Gemini", "Mentioned"],
                ["Perplexity", "Competitor won"],
              ].map(([name, result]) => (
                <div key={name} className="grid grid-cols-[1.1fr,0.9fr] px-4 py-3 text-sm">
                  <span className="text-[var(--ink)]">{name}</span>
                  <span className="font-mono text-[var(--muted)]">{result}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "compare-models",
    label: "03 · Simulate",
    title: "Test a content change before you publish it.",
    text: "The what-if engine predicts mention-rate lift from any content tweak — more citations, better readability, a fresher page — grounded in live data from your own competitors, not generic best-practice.",
    points: ["Predicted lift with 95% CI", "Per-model forecasts", "Gap-sorted action list"],
    tone: "bg-[#e8f1f7]",
    accent: "bg-[#f5fafc]",
    preview: (
      <div className="paper-panel overflow-hidden rounded-[0.45rem]">
        <div className="flex items-center justify-between border-b border-[color:var(--line)] px-5 py-4">
          <div className="flex gap-2">
            <span className="surface-chip px-3 py-1 text-xs text-[var(--muted)]">Preview 02</span>
            <span className="surface-chip px-3 py-1 text-xs text-[var(--muted)]">Compare</span>
          </div>
          <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            Model spread
          </span>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          {[
            { name: "ChatGPT", score: "44%", note: "Mentioned #2" },
            { name: "Claude", score: "12%", note: "Rare mention" },
            { name: "Gemini", score: "39%", note: "Mentioned" },
            { name: "Perplexity", score: "18%", note: "Competitor ahead" },
          ].map((item) => (
            <div key={item.name} className="surface-inset rounded-[0.35rem] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg text-[var(--ink)]">{item.name}</p>
                  <p className="mt-2 font-mono text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                    {item.note}
                  </p>
                </div>
                <p className="text-3xl text-[var(--ink)]">{item.score}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "rerun",
    label: "04 · Verify",
    title: "Log the change. See if it actually worked.",
    text: "Bitsy records what you changed and when. Two weeks later it shows the actual mention-rate delta — per-query, per-model — on the features your change touched. Predictions are held honest against reality.",
    points: ["Predicted vs actual lift", "14-day attribution window", "Calibration tracked over time"],
    tone: "bg-[#f4eadc]",
    accent: "bg-[#fbf6ee]",
    preview: (
      <div className="paper-panel overflow-hidden rounded-[0.45rem]">
        <div className="flex items-center justify-between border-b border-[color:var(--line)] px-5 py-4">
          <div className="flex gap-2">
            <span className="surface-chip px-3 py-1 text-xs text-[var(--muted)]">Preview 03</span>
            <span className="surface-chip px-3 py-1 text-xs text-[var(--muted)]">Before / after</span>
          </div>
          <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            Saved runs
          </span>
        </div>
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          <div className="rounded-[0.35rem] border border-[color:var(--line)] bg-[rgba(255,255,255,0.8)] p-5">
            <p className="muted-label text-xs">Before</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>ChatGPT</span>
                <span className="font-mono text-[var(--muted)]">22%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Claude</span>
                <span className="font-mono text-[var(--muted)]">9%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Gemini</span>
                <span className="font-mono text-[var(--muted)]">18%</span>
              </div>
            </div>
          </div>
          <div className="rounded-[0.35rem] border border-[color:var(--line)] bg-[rgba(255,255,255,0.9)] p-5">
            <p className="muted-label text-xs">After comparison page</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>ChatGPT</span>
                <span className="font-mono text-[var(--ink)]">34%  +12</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Claude</span>
                <span className="font-mono text-[var(--ink)]">17%  +8</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Gemini</span>
                <span className="font-mono text-[var(--ink)]">29%  +11</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
];

export function Features() {
  return (
    <>
      {features.map((feature, index) => (
        <section key={feature.id} id={feature.id}>
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
            <div
              className={`grid gap-10 ${
                index % 2 === 0 ? "lg:grid-cols-[0.9fr,1.1fr]" : "lg:grid-cols-[1.1fr,0.9fr]"
              } lg:items-center`}
            >
              <div className={index % 2 === 0 ? "" : "lg:order-2"}>
                <p className="muted-label text-xs">{feature.label}</p>
                <h2 className="mt-4 max-w-xl text-4xl leading-tight text-[var(--ink)]">
                  {feature.title}
                </h2>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--ink-soft)]">
                  {feature.text}
                </p>
                <div className="mt-8 space-y-3">
                  {feature.points.map((point) => (
                    <div
                      key={point}
                      className="rounded-[0.3rem] border border-[color:var(--line)] bg-[rgba(255,255,255,0.72)] px-4 py-3 text-sm text-[var(--ink-soft)]"
                    >
                      {point}
                    </div>
                  ))}
                </div>
              </div>

              <div className={index % 2 === 0 ? "" : "lg:order-1"}>
                <div
                  className={`${feature.tone} rounded-[0.4rem] border border-[color:var(--line)] p-4 md:p-5`}
                >
                  <div className={`${feature.accent} rounded-[0.3rem] p-3 md:p-4`}>
                    {feature.preview}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}
    </>
  );
}
