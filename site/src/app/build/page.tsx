import Link from "next/link";

export default function BuildPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="paper-panel rounded-[2rem] p-8">
        <p className="muted-label text-xs">Collection prototype</p>
        <h1 className="mt-3 text-5xl leading-tight text-[var(--ink)]">
          The live collection loop is not productized yet.
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[var(--muted)]">
          This part of Bitsy used to overstate what was running. For now, it is intentionally
          reduced to a planning surface. The product-facing experience is the scenario lab,
          while the real collection and calibration pipeline will be rebuilt behind the
          prediction engine decision.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="paper-card rounded-2xl p-5">
            <h2 className="text-2xl text-[var(--ink)]">Now</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Research-backed prototype UI and scenario flow.
            </p>
          </div>
          <div className="paper-card rounded-2xl p-5">
            <h2 className="text-2xl text-[var(--ink)]">Next</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Decide the real prediction architecture and the data contract it needs.
            </p>
          </div>
          <div className="paper-card rounded-2xl p-5">
            <h2 className="text-2xl text-[var(--ink)]">Then</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Rebuild live collection, storage, and model calibration around that engine.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/simulate"
            className="rounded-full bg-[rgba(26,23,20,0.92)] px-5 py-3 text-sm font-semibold text-[var(--paper-soft)] hover:bg-[rgba(26,23,20,1)]"
          >
            Open scenario lab
          </Link>
          <Link
            href="/research"
            className="rounded-full border border-[color:var(--line-strong)] bg-[rgba(255,255,255,0.52)] px-5 py-3 text-sm font-semibold text-[var(--ink)] hover:bg-white"
          >
            Review research
          </Link>
        </div>
      </div>
    </div>
  );
}
