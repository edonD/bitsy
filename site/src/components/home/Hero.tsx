import Link from "next/link";

const tools = ["ChatGPT", "Claude", "Gemini", "Perplexity"];

export function Hero() {
  return (
    <section id="top" className="section-wash">
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-16 md:pb-20 md:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="muted-label text-xs">AI search testing</p>
          <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-semibold leading-[0.94] tracking-[-0.055em] text-[var(--ink)] sm:text-6xl md:text-7xl">
            Test AI search
            <br />
            <span className="font-[family:var(--font-display)] text-[1.02em] font-medium italic tracking-[-0.035em]">
              before
            </span>{" "}
            you publish
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--ink-soft)]">
            Run real buyer prompts across {tools.join(", ")}. See where you show up, where a
            competitor wins, and what to fix next.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/#pricing"
              className="btn-primary rounded-full px-8 py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.08em]"
            >
              Get started
            </Link>
            <Link
              href="/#sample-report"
              className="btn-secondary rounded-full px-8 py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.08em]"
            >
              View sample report
            </Link>
          </div>

          <p className="mt-6 text-sm text-[var(--muted)]">
            Plans from $50/mo · No free trial · Tests {tools.join(", ")}
          </p>
        </div>

        <div className="paper-panel mt-14 overflow-hidden rounded-[0.45rem]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--line)] px-5 py-4">
            <div className="flex gap-2">
              <span className="surface-chip px-3 py-1 text-xs text-[var(--muted)]">Preview 01</span>
              <span className="surface-chip px-3 py-1 text-xs text-[var(--muted)]">Scenario</span>
              <span className="surface-chip px-3 py-1 text-xs text-[var(--muted)]">Report</span>
            </div>
            <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
              Product preview
            </span>
          </div>

          <div className="grid lg:grid-cols-[240px,minmax(0,1fr),320px]">
            <aside className="border-b border-[color:var(--line)] bg-[rgba(247,243,236,0.8)] p-5 lg:border-b-0 lg:border-r">
              <p className="muted-label text-xs">Setup</p>
              <div className="mt-4 space-y-3">
                {[
                  "Product: Bitsy",
                  "Competitors: 3 added",
                  "Buyer prompts: 12",
                  "Runs per tool: 5",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[0.3rem] border border-[color:var(--line)] bg-[rgba(255,255,255,0.72)] px-4 py-3 text-sm text-[var(--ink)]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </aside>

            <div className="p-5">
              <div className="surface-inset rounded-[0.35rem] p-5">
                <p className="muted-label text-xs">Buyer prompt</p>
                <h2 className="mt-3 text-3xl leading-tight text-[var(--ink)]">
                  Best AI search testing tools for SaaS teams
                </h2>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="metric-card">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      Mention rate
                    </p>
                    <p className="mt-2 text-3xl text-[var(--ink)]">34%</p>
                  </div>
                  <div className="metric-card">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      Best position
                    </p>
                    <p className="mt-2 text-3xl text-[var(--ink)]">#2</p>
                  </div>
                  <div className="metric-card">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      Competitors
                    </p>
                    <p className="mt-2 text-3xl text-[var(--ink)]">3</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[0.35rem] border border-[color:var(--line)] bg-[rgba(255,255,255,0.78)] p-4">
                <div className="flex flex-wrap gap-2">
                  {tools.map((tool) => (
                    <span
                      key={tool}
                      className="surface-chip px-3 py-1.5 text-sm text-[var(--ink)]"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-[color:var(--line)] bg-[rgba(251,248,243,0.82)] p-5 lg:border-l lg:border-t-0">
              <p className="muted-label text-xs">Results</p>
              <div className="mt-4 rounded-[0.35rem] border border-[color:var(--line)] bg-[rgba(255,255,255,0.82)]">
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
                    <div
                      key={name}
                      className="grid grid-cols-[1.1fr,0.9fr] px-4 py-3 text-sm"
                    >
                      <span className="text-[var(--ink)]">{name}</span>
                      <span className="font-mono text-[var(--muted)]">{result}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
