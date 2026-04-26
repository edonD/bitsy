const features = [
  {
    id: "sample-report",
    label: "02 · Measure",
    title: "See who AI recommends.",
    text: "Run your buyer questions through ChatGPT, Claude, and Gemini. See where you appear, where you are missing, and which competitor wins.",
    points: ["Real buyer questions", "Rank, position, and sentiment", "Raw AI answers included"],
    tone: "bg-[#ece8f7]",
    accent: "bg-[#f7f5fd]",
    preview: (
      <div className="paper-panel overflow-hidden rounded-[0.45rem]">
        <div className="flex items-center justify-between border-b border-[color:var(--line)] px-5 py-4">
          <div className="flex gap-2">
            <span className="surface-chip px-3 py-1 text-xs text-[var(--muted)]">Preview 01</span>
            <span className="surface-chip px-3 py-1 text-xs text-[var(--muted)]">Results</span>
          </div>
          <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            Buyer question
          </span>
        </div>
        <div className="grid gap-4 p-5 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-4">
            <div className="surface-inset rounded-[0.35rem] p-5">
              <p className="muted-label text-xs">Question</p>
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
    label: "03 · Decide",
    title: "Know what to fix next.",
    text: "Bitsy turns the results into a short list of actions: pages to write, claims to add, sources to pitch, and competitors to watch.",
    points: ["Clear fix list", "Competitor gaps", "Confidence shown plainly"],
    tone: "bg-[#e8f1f7]",
    accent: "bg-[#f5fafc]",
    preview: (
      <div className="paper-panel overflow-hidden rounded-[0.45rem]">
        <div className="flex items-center justify-between border-b border-[color:var(--line)] px-5 py-4">
          <div className="flex gap-2">
            <span className="surface-chip px-3 py-1 text-xs text-[var(--muted)]">Preview 02</span>
            <span className="surface-chip px-3 py-1 text-xs text-[var(--muted)]">Fix list</span>
          </div>
          <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            Priority
          </span>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          {[
            { name: "Comparison page", score: "1", note: "Highest gap" },
            { name: "Add proof", score: "2", note: "Weak claim" },
            { name: "Pitch source", score: "3", note: "Competitor cited" },
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
    id: "execute",
    label: "04 · Fix",
    title: "Ship the work.",
    text: "Every recommendation becomes something usable: a paragraph to paste, a page brief, a schema block, or a list of sites to contact.",
    points: ["Copy you can paste", "Briefs for new pages", "Sites worth pitching"],
    tone: "bg-[#f4eadc]",
    accent: "bg-[#fbf6ee]",
    preview: (
      <div className="paper-panel overflow-hidden rounded-[0.45rem]">
        <div className="flex items-center justify-between border-b border-[color:var(--line)] px-5 py-4">
          <div className="flex gap-2">
            <span className="surface-chip px-3 py-1 text-xs text-[var(--muted)]">Preview 03</span>
            <span className="surface-chip px-3 py-1 text-xs text-[var(--muted)]">Patch</span>
          </div>
          <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            Ready to ship
          </span>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-[0.35rem] border border-[color:var(--line)] bg-[rgba(255,255,255,0.82)]">
            <p className="border-b border-[color:var(--line)] px-4 py-2 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
              Paste into homepage hero
            </p>
            <p className="px-4 py-3 text-sm leading-relaxed text-[var(--ink)]">
              &ldquo;Bitsy helps SaaS teams see where AI tools recommend competitors,
              then gives them a clear fix list to improve the next run.&rdquo;
            </p>
            <div className="flex items-center justify-between border-t border-[color:var(--line)] bg-[rgba(247,243,236,0.62)] px-4 py-2 text-xs text-[var(--muted)]">
              <span>+3 stats &middot; +1 citation</span>
              <span className="font-mono">copy ↗</span>
            </div>
          </div>
          <div className="rounded-[0.35rem] border border-[color:var(--line)] bg-[rgba(255,255,255,0.82)]">
            <p className="border-b border-[color:var(--line)] px-4 py-2 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
              FAQPage schema &middot; drop in &lt;head&gt;
            </p>
            <pre className="px-4 py-3 font-mono text-[11px] leading-relaxed text-[var(--ink)] overflow-x-auto">
{`{ "@type": "FAQPage",
  "mainEntity": [...] }`}
            </pre>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "rerun",
    label: "05 · Verify",
    title: "See if it worked.",
    text: "Save what changed. Run the same questions again later. Bitsy shows whether your brand appeared more often.",
    points: ["Before and after runs", "Saved change log", "Progress over time"],
    tone: "bg-[#eaf2e4]",
    accent: "bg-[#f5f9f1]",
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
