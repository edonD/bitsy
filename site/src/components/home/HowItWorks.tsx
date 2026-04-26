// HowItWorks — the five-step product loop:
//   1. Target   — set your brand, competitors, and buyer questions
//   2. Observe  — check answers across major AI tools
//   3. Decide   — pick the best fix
//   4. Execute  — ship the change with ready-to-use copy and briefs
//   5. Verify   — log the change and compare later runs
//
// Everything else on the homepage echoes this order. Same order in the app.

const panels = [
  {
    step: "01",
    title: "Target",
    headline: "Tell Bitsy what buyers ask.",
    text: "Add your product, your real competitors, and the questions buyers ask before they choose a tool.",
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
          <p className="muted-label text-[10px]">Buyer questions</p>
          <div className="mt-3 space-y-2 text-sm text-[var(--ink-soft)]">
            {[
              "best tools for testing AI answers",
              "how to get recommended by ChatGPT",
              "AI search tools for SaaS brands",
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
    headline: "See where you show up.",
    text: "Bitsy asks the same questions in ChatGPT, Claude, and Gemini. You see who was mentioned, where they appeared, and the raw answers.",
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
    title: "Decide",
    headline: "Know what to fix first.",
    text: "Bitsy turns the gaps into a short action list. It shows which page, claim, source, or comparison is most likely to help.",
    preview: (
      <div className="p-4">
        <div className="border border-[color:var(--line)] bg-[rgba(255,255,255,0.84)] p-4">
          <p className="muted-label text-[10px]">Recommended fix</p>
          <p className="mt-2 text-sm text-[var(--ink)]">Add a comparison page for high-intent buyers</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-[0.3rem] border border-[color:var(--line)] bg-[rgba(247,243,236,0.6)] p-3">
              <p className="muted-label text-[10px]">Now</p>
              <p className="mt-1 text-2xl text-[var(--ink)]">22%</p>
            </div>
            <div className="rounded-[0.3rem] border border-emerald-200 bg-emerald-50/70 p-3">
              <p className="muted-label text-[10px]">Goal</p>
              <p className="mt-1 text-2xl text-emerald-800">34%</p>
            </div>
          </div>
          <p className="mt-3 font-mono text-xs text-[var(--muted)]">
            Directional estimate &middot; verify on the next run
          </p>
        </div>
      </div>
    ),
  },
  {
    step: "04",
    title: "Execute",
    headline: "Ship the fix.",
    text: "Get the actual work: a page brief, a paragraph to paste, a schema block, or a list of sites worth pitching.",
    preview: (
      <div className="p-4">
        <div className="border border-[color:var(--line)] bg-[rgba(255,255,255,0.84)]">
          <div className="border-b border-[color:var(--line)] px-4 py-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            Paste into homepage hero
          </div>
          <div className="px-4 py-3 text-sm leading-relaxed text-[var(--ink)]">
            &ldquo;Bitsy helps SaaS teams see where AI tools recommend competitors,
            then gives them a clear fix list to improve the next run.&rdquo;
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
    headline: "Check if it worked.",
    text: "Log what changed. Run the same questions again later. See whether your brand showed up more often.",
    preview: (
      <div className="p-4">
        <div className="border border-[color:var(--line)] bg-[rgba(255,255,255,0.84)]">
          <div className="border-b border-[color:var(--line)] px-4 py-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            Apr 5 &middot; added 12 stats + 5 citations
          </div>
          <div className="divide-y divide-[color:var(--line)] text-sm">
            {[
              ["Before", "22%"],
              ["After", "31%"],
              ["Result", "up 9 points"],
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
          <p className="muted-label text-xs">How it works</p>
          <h2 className="mt-4 text-4xl leading-tight text-[var(--ink)]">
            A simple loop for improving AI visibility.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--ink-soft)]">
            Measure the questions that matter. Find the gaps. Ship one clear
            fix. Run the same questions again and see what changed.
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
