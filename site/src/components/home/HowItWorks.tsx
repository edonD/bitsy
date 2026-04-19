// HowItWorks — the five-step product loop:
//   1. Target   — set your brand + competitors + buyer queries
//   2. Observe  — nightly measurement across every major LLM
//   3. Simulate — predict the mention-rate lift from content changes
//   4. Execute  — ship the change with ready-to-use copy, briefs, schema
//   5. Verify   — log the change, watch the real-world lift 14 days later
//
// Everything else on the homepage echoes this order. Same order in the app.

const panels = [
  {
    step: "01",
    title: "Target",
    headline: "Point Bitsy at the brand and the buyer queries that matter.",
    text: "Your product, your three to five real competitors, and the questions people actually ask AI about your category. No generic keyword lists.",
    preview: (
      <div className="grid h-full grid-cols-[0.95fr,1.05fr]">
        <div className="border-r border-[color:var(--line)] bg-[rgba(245,241,234,0.72)] p-4">
          <p className="muted-label text-[10px]">Brand</p>
          <div className="mt-3 border border-[color:var(--line)] bg-[rgba(255,255,255,0.85)] px-3 py-2 text-sm text-[var(--ink)]">
            Bitsy
          </div>
          <p className="muted-label mt-4 text-[10px]">Competitors</p>
          <div className="mt-3 space-y-2">
            {["Profound", "Peec AI", "AthenaHQ"].map((item) => (
              <div
                key={item}
                className="border border-[color:var(--line)] bg-[rgba(255,255,255,0.78)] px-3 py-2 text-sm text-[var(--ink)]"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="p-4">
          <p className="muted-label text-[10px]">Buyer queries</p>
          <div className="mt-3 space-y-2 text-sm text-[var(--ink-soft)]">
            {[
              "best AI search visibility tool",
              "how to rank in ChatGPT answers",
              "GEO tools for SaaS brands",
            ].map((q) => (
              <div
                key={q}
                className="border border-[color:var(--line)] bg-[rgba(255,255,255,0.76)] px-3 py-2"
              >
                {q}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    step: "02",
    title: "Observe",
    headline: "See exactly how each model ranks you every night.",
    text: "Same queries, every model, 5x samples each. Mention rate, position, sentiment, cited sources — with the raw LLM responses always one click away.",
    preview: (
      <div className="p-4">
        <div className="border border-[color:var(--line)] bg-[rgba(255,255,255,0.82)]">
          <div className="grid grid-cols-[1.1fr,0.6fr,0.9fr] border-b border-[color:var(--line)] px-4 py-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            <span>Model</span>
            <span className="text-right">Rate</span>
            <span className="text-right">Position</span>
          </div>
          <div className="divide-y divide-[color:var(--line)] text-sm">
            {[
              ["ChatGPT", "44%", "#2"],
              ["Claude", "12%", "—"],
              ["Gemini", "39%", "#3"],
              ["Perplexity", "18%", "#5"],
            ].map(([name, rate, pos]) => (
              <div
                key={name}
                className="grid grid-cols-[1.1fr,0.6fr,0.9fr] px-4 py-3"
              >
                <span className="text-[var(--ink)]">{name}</span>
                <span className="text-right font-mono text-[var(--ink)]">{rate}</span>
                <span className="text-right font-mono text-[var(--muted)]">{pos}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    step: "03",
    title: "Simulate",
    headline: "Test the change before you ship it.",
    text: "What happens if you add 10 more citations? Improve readability? Refresh the page weekly? The surrogate model answers in milliseconds, grounded in data from every competitor in your category.",
    preview: (
      <div className="p-4">
        <div className="border border-[color:var(--line)] bg-[rgba(255,255,255,0.84)] p-4">
          <p className="muted-label text-[10px]">Scenario</p>
          <p className="mt-2 text-sm text-[var(--ink)]">Add 12 stats + 5 citations to homepage</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-[0.3rem] border border-[color:var(--line)] bg-[rgba(247,243,236,0.6)] p-3">
              <p className="muted-label text-[10px]">Base</p>
              <p className="mt-1 text-2xl text-[var(--ink)]">22%</p>
            </div>
            <div className="rounded-[0.3rem] border border-emerald-200 bg-emerald-50/70 p-3">
              <p className="muted-label text-[10px]">Predicted</p>
              <p className="mt-1 text-2xl text-emerald-800">34%</p>
            </div>
          </div>
          <p className="mt-3 font-mono text-xs text-[var(--muted)]">
            +12pp &middot; 95% CI [30%, 38%]
          </p>
        </div>
      </div>
    ),
  },
  {
    step: "04",
    title: "Execute",
    headline: "Ship the change — paste, don't guess.",
    text: "Bitsy turns every recommendation into something you can actually use: a ready-to-paste paragraph, a writer brief for your content team, a JSON-LD schema block, a short list of authority sites worth pitching.",
    preview: (
      <div className="p-4">
        <div className="border border-[color:var(--line)] bg-[rgba(255,255,255,0.84)]">
          <div className="border-b border-[color:var(--line)] px-4 py-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            Paste into homepage hero
          </div>
          <div className="px-4 py-3 text-sm leading-relaxed text-[var(--ink)]">
            &ldquo;Bitsy customers reach the top-3 on 73% of buyer queries
            within 14 days — 3.4× the category average, per our April 2026
            benchmark of 50 brands.&rdquo;
          </div>
          <div className="flex items-center justify-between border-t border-[color:var(--line)] bg-[rgba(247,243,236,0.62)] px-4 py-2 text-xs text-[var(--muted)]">
            <span>+3 stats &middot; +1 citation</span>
            <span className="font-mono">copy ↗</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    step: "05",
    title: "Verify",
    headline: "Watch the real lift two weeks later.",
    text: "Log what you changed and when. Bitsy shows the actual mention-rate delta on the queries most affected by that feature — honest, even when the prediction missed. Calibration tracked over time.",
    preview: (
      <div className="p-4">
        <div className="border border-[color:var(--line)] bg-[rgba(255,255,255,0.84)]">
          <div className="border-b border-[color:var(--line)] px-4 py-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            Apr 5 &middot; added 12 stats + 5 citations
          </div>
          <div className="divide-y divide-[color:var(--line)] text-sm">
            {[
              ["Predicted lift", "+12pp"],
              ["Actual lift (14d)", "+11pp"],
              ["Calibration", "✓ within CI"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="grid grid-cols-[1.3fr,0.7fr] px-4 py-3"
              >
                <span className="text-[var(--ink-soft)]">{label}</span>
                <span className="text-right font-mono text-[var(--ink)]">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="max-w-3xl">
          <p className="muted-label text-xs">The loop</p>
          <h2 className="mt-4 text-4xl leading-tight text-[var(--ink)]">
            Five steps. One closed feedback loop.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--ink-soft)]">
            Target what to measure. Observe your standing. Simulate your
            change. Execute with ready-to-ship copy. Verify the lift. Then do
            it again. Every step grounded in data from your own competitors —
            not generic best-practice.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          {panels.map((panel) => (
            <div key={panel.title}>
              <div className="paper-panel aspect-square overflow-hidden rounded-[0.3rem]">
                {panel.preview}
              </div>
              <div className="px-1 pt-4">
                <p className="muted-label text-[10px]">{panel.step} &middot; {panel.title}</p>
                <h3 className="mt-2 text-2xl leading-tight text-[var(--ink)]">{panel.headline}</h3>
                <p className="mt-3 text-base leading-relaxed text-[var(--ink-soft)]">
                  {panel.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
