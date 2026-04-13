import Link from "next/link";

export function CallToAction() {
  return (
    <section>
      <div className="mx-auto max-w-4xl px-6 py-14 text-center md:py-16">
        <p className="muted-label text-xs">Early access</p>
        <h2 className="mt-4 text-4xl leading-tight text-[var(--ink)]">
          Be first to test your AI visibility
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[var(--ink-soft)]">
          Join the waitlist and lock in 50% off when we launch.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/#pricing"
            className="btn-primary rounded-full px-8 py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.08em]"
          >
            Join waitlist
          </Link>
          <Link
            href="/concept"
            className="btn-secondary rounded-full px-8 py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.08em]"
          >
            How it works
          </Link>
        </div>
      </div>
    </section>
  );
}
