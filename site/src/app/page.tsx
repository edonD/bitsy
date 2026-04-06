import Link from "next/link";

const quickPoints = [
  "Add your product and competitors",
  "Run the questions buyers ask",
  "See which AI tools mention you",
];

const toolList = ["ChatGPT", "Claude", "Gemini", "Perplexity"];

const useCases = [
  "Test a launch page before publishing",
  "Check how your product compares against competitors",
  "Spot where AI tools disagree",
];

const researchLinks = [
  {
    href: "/research/llm-mechanics",
    title: "How AI tools choose what to mention",
  },
  {
    href: "/research/geo-tools",
    title: "How the testing workflow should work",
  },
  {
    href: "/research/landscape",
    title: "Who is building in this market",
  },
];

export default function HomePage() {
  return (
    <div className="pb-16">
      <section className="border-b border-[color:var(--line)]">
        <div className="mx-auto max-w-5xl px-6 py-24 text-center md:py-32">
          <p className="muted-label text-xs">AI visibility testing</p>
          <h1 className="mx-auto mt-6 max-w-4xl font-[family:var(--font-body)] text-5xl font-semibold uppercase leading-[0.92] tracking-[-0.06em] text-[var(--ink)] sm:text-6xl md:text-7xl">
            Test AI search
            <br />
            before you publish
          </h1>
          <p className="mx-auto mt-8 max-w-2xl font-mono text-base leading-relaxed text-[var(--muted)] md:text-lg">
            Add your product, run the buyer questions that matter, and see how major AI tools
            are likely to mention you.
          </p>

          <div className="mt-10 flex justify-center">
            <Link
              href="/simulate"
              className="btn-primary rounded-full px-6 py-3 font-mono text-sm font-semibold uppercase tracking-[0.08em]"
            >
              Open Simulator
            </Link>
          </div>

          <p className="mt-10 font-mono text-sm text-[var(--muted)]">
            Works with {toolList.join(", ")}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-4 md:grid-cols-3">
          {quickPoints.map((point, index) => (
            <div key={point} className="paper-card rounded-[1.6rem] px-5 py-5 text-left">
              <p className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--muted)]">
                0{index + 1}
              </p>
              <p className="mt-3 text-lg leading-relaxed text-[var(--ink)]">{point}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-[color:var(--line)] bg-[rgba(255,255,255,0.14)]">
        <div className="mx-auto grid max-w-5xl gap-8 px-6 py-16 md:grid-cols-2">
          <div>
            <p className="muted-label text-xs">Use it for</p>
            <div className="mt-6 space-y-3">
              {useCases.map((item) => (
                <div key={item} className="surface-inset rounded-[1.4rem] px-4 py-4">
                  <p className="text-base leading-relaxed text-[var(--ink)]">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-4">
              <p className="muted-label text-xs">Research</p>
              <Link href="/research" className="ink-link text-sm">
                View all
              </Link>
            </div>
            <div className="mt-6 space-y-3">
              {researchLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="surface-inset block rounded-[1.4rem] px-4 py-4 hover:border-[color:var(--line-strong)]"
                >
                  <p className="text-base leading-relaxed text-[var(--ink)]">{item.title}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
