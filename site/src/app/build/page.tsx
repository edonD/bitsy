import Link from "next/link";

export default function BuildPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="paper-panel rounded-[2rem] p-8">
        <p className="muted-label text-xs">Collection prototype</p>
        <h1 className="mt-3 text-5xl leading-tight text-[var(--ink)]">
          The simulator is live. The collection layer comes next.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--muted)]">
          This page is now just the roadmap for what comes after the simulator: live collection,
          storage, and calibration.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="paper-card rounded-2xl p-5">
            <h2 className="text-2xl text-[var(--ink)]">Now</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Clean scenario testing and local run history.
            </p>
          </div>
          <div className="paper-card rounded-2xl p-5">
            <h2 className="text-2xl text-[var(--ink)]">Next</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Decide the real prediction engine and the data contract behind it.
            </p>
          </div>
          <div className="paper-card rounded-2xl p-5">
            <h2 className="text-2xl text-[var(--ink)]">Then</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Rebuild collection, storage, and confidence calibration around that engine.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/simulate"
            className="btn-primary rounded-full px-5 py-3 text-sm font-semibold"
          >
            Open scenario lab
          </Link>
          <Link
            href="/research"
            className="btn-secondary rounded-full px-5 py-3 text-sm font-semibold"
          >
            Review research
          </Link>
        </div>
      </div>
    </div>
  );
}
