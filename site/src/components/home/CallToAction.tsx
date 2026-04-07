import Link from "next/link";

export function CallToAction() {
  return (
    <section>
      <div className="mx-auto max-w-4xl px-6 py-14 text-center md:py-16">
        <p className="muted-label text-xs">Start here</p>
        <h2 className="mt-4 text-4xl leading-tight text-[var(--ink)]">
          Run your first AI search test
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[var(--ink-soft)]">
          Start with a sample setup, then replace the brands and prompts with your own.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/#pricing"
            className="btn-primary rounded-full px-8 py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.08em]"
          >
            See pricing
          </Link>
          <Link
            href="/#sample-report"
            className="btn-secondary rounded-full px-8 py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.08em]"
          >
            View sample report
          </Link>
        </div>
      </div>
    </section>
  );
}
