import Link from "next/link";

const pages = [
  { href: "/research/llm-mechanics", title: "How LLMs decide what to mention", task: "2.1" },
  { href: "/research/geo-tools", title: "How GEO tools work under the hood", task: "2.2" },
  { href: "/research/economics", title: "The economics", task: "2.3" },
  { href: "/research/landscape", title: "The competitive landscape", task: "2.4" },
  { href: "/research/papers", title: "The science and papers", task: "2.5" },
];

export default function ResearchIndex() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr),320px]">
        <div className="max-w-3xl">
          <p className="muted-label text-xs">Methodology</p>
          <h1 className="mt-3 text-4xl leading-tight text-[var(--ink)] md:text-5xl">
            The research behind the product.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-[var(--muted)]">
            Bitsy should earn trust through measurement, not vague claims. These notes hold the
            market work, mechanics, and evidence behind the simulator direction.
          </p>
        </div>

        <div className="paper-card rounded-[1.75rem] p-5">
          <p className="muted-label text-xs">Read this first</p>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--muted)]">
            <p>How models decide what to mention.</p>
            <p>How repeated sampling should work.</p>
            <p>Where the market is already crowded.</p>
          </div>
        </div>
      </div>

      <div className="mt-12 space-y-4">
        {pages.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className="paper-card group block rounded-[1.75rem] p-6 hover:-translate-y-0.5 hover:border-[color:var(--line-strong)]"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Research note {page.task}
            </span>
            <div className="mt-2 flex items-center justify-between gap-4">
              <h2 className="text-2xl text-[var(--ink)]">{page.title}</h2>
              <span className="text-sm text-[var(--muted)] transition-transform group-hover:translate-x-1">
                Open
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
