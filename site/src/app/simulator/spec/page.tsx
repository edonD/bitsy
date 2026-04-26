import Link from "next/link";
import { SimulatorSpecCore } from "./SimulatorSpecCore";
import { SimulatorSpecOperations } from "./SimulatorSpecOperations";

export default function SimulatorPage() {
  return (
    <div>
      <div className="section-wash border-b border-[color:var(--line)] py-12 md:py-16">
        <div className="mx-auto max-w-5xl px-6">
          <Link href="/" className="ink-link mb-4 inline-block text-sm">
            Back to home
          </Link>
          <span className="mb-3 inline-flex rounded-full border border-[color:var(--line)] bg-[rgba(255,255,255,0.48)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            Product spec
          </span>
          <h1 className="max-w-4xl text-4xl leading-tight text-[var(--ink)] md:text-5xl">
            The Bitsy Simulator: what we need to build and why.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--muted)]">
            A digital twin of AI answer-engine behavior. We collect real brand/query/model samples into Convex, compress them into a daily state vector, and train an XGBoost surrogate so users can run instant what-if scenarios without re-polling APIs every time.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 pb-20">
        <SimulatorSpecCore />
        <SimulatorSpecOperations />
      </div>
    </div>
  );
}
