import Link from "next/link";

// /admin — landing page that maps to the five-step loop. Helps discovery
// now that we have a dozen dev pages under /admin/*.

const SECTIONS: {
  number: string;
  step: string;
  tagline: string;
  pages: { href: string; name: string; desc: string }[];
}[] = [
  {
    number: "01",
    step: "Target",
    tagline: "Pick what to measure.",
    pages: [
      {
        href: "/admin/trace",
        name: "Engine trace",
        desc: "Set target + competitors + queries and watch every LLM call live.",
      },
    ],
  },
  {
    number: "02",
    step: "Observe",
    tagline: "See where you stand.",
    pages: [
      {
        href: "/admin/trace",
        name: "Trace",
        desc: "Per-model mention rates, raw responses, brand extraction.",
      },
      {
        href: "/admin/benchmark",
        name: "Benchmark panel",
        desc: "Nightly run status across the 50-brand corpus.",
      },
      {
        href: "/admin/logs",
        name: "API logs",
        desc: "Every LLM call sent and received.",
      },
    ],
  },
  {
    number: "03",
    step: "Simulate",
    tagline: "Test the change before you ship.",
    pages: [
      {
        href: "/admin/gap",
        name: "Gap analysis",
        desc: "Ranked content-feature gaps vs peers, with evidence.",
      },
      {
        href: "/admin/model",
        name: "Model diagnostics",
        desc: "Surrogate R², training mode, feature importance.",
      },
      {
        href: "/admin/crawler",
        name: "Crawler playground",
        desc: "Run fast or scripted crawl on any URL.",
      },
    ],
  },
  {
    number: "04",
    step: "Execute",
    tagline: "Ship the change — paste, don't guess.",
    pages: [
      {
        href: "/admin/execute",
        name: "Execute playbook",
        desc: "Six-section, evidence-backed action plan per gap.",
      },
    ],
  },
  {
    number: "05",
    step: "Verify",
    tagline: "Did it actually work?",
    pages: [
      {
        href: "/admin/verify",
        name: "Verify attribution",
        desc: "Log shipped changes, watch predicted-vs-actual 14 days later.",
      },
      {
        href: "/admin/alerts",
        name: "Alerts",
        desc: "Mention-rate drops + new entrants in the benchmark.",
      },
    ],
  },
  {
    number: "OPS",
    step: "Ops",
    tagline: "Keep the infra healthy.",
    pages: [
      {
        href: "/admin/budget",
        name: "Budget",
        desc: "Cloudflare Browser Run daily usage + monthly projection.",
      },
      {
        href: "/admin/improvements",
        name: "Improvements",
        desc: "Research backlog + product ideas.",
      },
    ],
  },
];

export default function AdminIndex() {
  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl text-[var(--ink)]">Dev console</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
            Every tool for building, testing, and watching the five-step loop.
            Each section maps to one step of the product.
          </p>
        </div>

        <div className="space-y-8">
          {SECTIONS.map((section) => (
            <section key={section.number} className="paper-panel rounded-[1.6rem] p-6">
              <div className="flex items-baseline gap-3 mb-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-[10px] font-semibold text-[var(--paper)]">
                  {section.number}
                </span>
                <h2 className="text-lg font-semibold text-[var(--ink)]">{section.step}</h2>
                <p className="text-sm text-[var(--muted)]">{section.tagline}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {section.pages.map((p) => (
                  <Link
                    key={p.href + p.name}
                    href={p.href}
                    className="group rounded-xl border border-[color:var(--line)] bg-white/60 px-4 py-3 hover:border-[var(--ink)] hover:bg-white/90 transition-all"
                  >
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      {p.name}{" "}
                      <span className="font-mono text-[10px] text-[var(--muted)] group-hover:text-[var(--ink)]">
                        {p.href}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-[var(--ink-soft)] leading-relaxed">
                      {p.desc}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
