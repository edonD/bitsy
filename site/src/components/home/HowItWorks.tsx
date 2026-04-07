const panels = [
  {
    title: "Add your product and competitors",
    text: "Set the brand you want to test and the alternatives buyers compare you against.",
    preview: (
      <div className="grid h-full grid-cols-[0.95fr,1.05fr]">
        <div className="border-r border-[color:var(--line)] bg-[rgba(245,241,234,0.72)] p-4">
          <div className="space-y-2">
            {["Bitsy", "Scope", "Profound"].map((item) => (
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
          <div className="h-full border border-[color:var(--line)] bg-[rgba(255,255,255,0.76)] p-4">
            <p className="muted-label text-[10px]">Scenario</p>
            <div className="mt-4 space-y-3">
              <div className="h-3 w-20 bg-[rgba(25,22,18,0.14)]" />
              <div className="h-10 border border-[color:var(--line)] bg-[rgba(247,243,236,0.7)]" />
              <div className="h-10 border border-[color:var(--line)] bg-[rgba(247,243,236,0.7)]" />
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Pick the buyer prompts that matter",
    text: "Use real questions from your market instead of a generic keyword list.",
    preview: (
      <div className="p-4">
        <div className="border border-[color:var(--line)] bg-[rgba(255,255,255,0.8)]">
          <div className="border-b border-[color:var(--line)] px-4 py-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            Buyer prompts
          </div>
          <div className="divide-y divide-[color:var(--line)] text-sm text-[var(--ink)]">
            {[
              "best AI search testing tools",
              "Scope alternatives",
              "tools for GEO testing",
              "how to test AI search visibility",
            ].map((item) => (
              <div key={item} className="px-4 py-3">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Run the same prompts across AI tools",
    text: "Test ChatGPT, Claude, Gemini, and Perplexity in one clean run.",
    preview: (
      <div className="grid h-full grid-cols-2">
        {["ChatGPT", "Claude", "Gemini", "Perplexity"].map((tool, index) => (
          <div
            key={tool}
            className={`flex flex-col justify-between p-4 ${
              index % 2 === 0 ? "border-r" : ""
            } ${index < 2 ? "border-b" : ""} border-[color:var(--line)]`}
          >
            <p className="text-sm text-[var(--ink)]">{tool}</p>
            <div className="space-y-2">
              <div className="h-2 w-12 bg-[rgba(25,22,18,0.16)]" />
              <div className="h-2 w-20 bg-[rgba(25,22,18,0.1)]" />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "Read the result in one report",
    text: "See mention rate, best position, and which model ignored you.",
    preview: (
      <div className="p-4">
        <div className="border border-[color:var(--line)] bg-[rgba(255,255,255,0.82)]">
          <div className="grid grid-cols-2 border-b border-[color:var(--line)]">
            <div className="border-r border-[color:var(--line)] p-4">
              <p className="muted-label text-[10px]">Mention rate</p>
              <p className="mt-2 text-3xl text-[var(--ink)]">34%</p>
            </div>
            <div className="p-4">
              <p className="muted-label text-[10px]">Best position</p>
              <p className="mt-2 text-3xl text-[var(--ink)]">#2</p>
            </div>
          </div>
          <div className="divide-y divide-[color:var(--line)] text-sm">
            {[
              ["ChatGPT", "Mentioned #2"],
              ["Claude", "Not mentioned"],
              ["Gemini", "Mentioned"],
            ].map(([name, result]) => (
              <div key={name} className="flex items-center justify-between px-4 py-3">
                <span className="text-[var(--ink)]">{name}</span>
                <span className="font-mono text-[var(--muted)]">{result}</span>
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
            Four steps from setup to report.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--ink-soft)]">
            The structure should be obvious at a glance: set the scenario, run the prompts,
            compare the models, read the result.
          </p>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-4">
          {panels.map((panel) => (
            <div key={panel.title}>
              <div className="paper-panel aspect-square overflow-hidden rounded-[0.3rem]">
                {panel.preview}
              </div>
              <div className="px-1 pt-4 text-center">
                <h3 className="text-2xl leading-tight text-[var(--ink)]">{panel.title}</h3>
                <p className="mx-auto mt-3 max-w-xs text-base leading-relaxed text-[var(--ink-soft)]">
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
