import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

const pipeline = [
  { n: "01", title: "Poll", stat: "models x queries", note: "Raw LLM answers" },
  { n: "02", title: "Parse", stat: "mention, rank, sentiment", note: "Structured observations" },
  { n: "03", title: "Roll up", stat: "1 brand-day row", note: "Target + features" },
  { n: "04", title: "Store", stat: "Convex samples", note: "Full history" },
  { n: "05", title: "Train", stat: "XGBoost", note: "Fresh model fit" },
  { n: "06", title: "Score", stat: "RMSE, R2, interval", note: "Diagnostics" },
];

const baseFeatures: { group: string; features: string[] }[] = [
  { group: "Rank", features: ["avg_position", "top1_rate", "top3_rate", "position_std"] },
  { group: "Sentiment", features: ["positive_rate", "negative_rate", "net_sentiment"] },
  {
    group: "Competition",
    features: ["competitor_avg_rate", "vs_best_competitor", "brands_ahead", "share_of_mentions"],
  },
  { group: "Model/query", features: ["model_agreement", "model_spread", "query_coverage"] },
];

const contentFeatures = [
  "statistics_density",
  "quotation_count",
  "citation_count",
  "content_length",
  "readability_grade",
  "freshness_days",
  "heading_count",
];

const qualityBars = [
  { label: "Cold start", rows: "6 rows", width: "12%", tone: "bg-rose-500", note: "Toy fit" },
  { label: "Emerging", rows: "30-90 rows", width: "42%", tone: "bg-amber-500", note: "Directional" },
  { label: "Useful", rows: "180+ rows", width: "72%", tone: "bg-emerald-600", note: "Walk-forward check" },
  { label: "Strong", rows: "500+ rows", width: "100%", tone: "bg-[var(--ink)]", note: "Track lift vs actual" },
];

const trustCards = [
  ["Good signal", "walk_forward validation", "Earlier dates predict later dates."],
  ["Weak signal", "in_sample validation", "The model scores rows it already saw."],
  ["Do not overread", "feature importance", "Directional ranking, not causality."],
  ["Best proof", "predicted vs actual lift", "Compare after changes ship."],
];

const comparisonRows = [
  ["What changes", "Existing numeric weights", "A new correction tree is added"],
  ["Model shape", "Fixed architecture", "Growing ensemble"],
  ["Gradient role", "Points each weight downhill", "Defines what the next tree should fix"],
  ["Best at", "Deep nets, embeddings, huge dense data", "Small/medium tabular data"],
  ["Explainability", "Usually extra tooling", "Feature importance and tree paths are native"],
];

const whyXgboostWinsHere = [
  {
    title: "Small data",
    value: "30-500 rows",
    body: "This product collects brand-day rows. Gradient-trained neural nets usually need far more rows before they generalize.",
  },
  {
    title: "Tabular signals",
    value: "rank + sentiment + content",
    body: "Tree splits naturally handle mixed numeric features without needing heavy scaling, embeddings, or architecture design.",
  },
  {
    title: "Nonlinear thresholds",
    value: "if rank gap > x",
    body: "The effect of a feature is often thresholded. Trees capture that directly; linear gradient models need manual interactions.",
  },
  {
    title: "Fast diagnostics",
    value: "CPU + milliseconds",
    body: "Refits are cheap, what-if calls are fast, and the model can expose importance without a separate explanation model.",
  },
];

const residuals = [
  { x: 34, y: 112, base: 146, next: 124, delay: "0s" },
  { x: 70, y: 82, base: 146, next: 104, delay: "0.15s" },
  { x: 106, y: 134, base: 146, next: 128, delay: "0.3s" },
  { x: 142, y: 66, base: 146, next: 92, delay: "0.45s" },
  { x: 178, y: 102, base: 146, next: 108, delay: "0.6s" },
  { x: 214, y: 48, base: 146, next: 76, delay: "0.75s" },
];

const leafWeights = [
  { label: "low rank gap", value: "+2.4", width: "78%", delay: "0s" },
  { label: "fresh content", value: "+1.7", width: "58%", delay: "0.2s" },
  { label: "negative sentiment", value: "-1.1", width: "36%", delay: "0.4s" },
];

export default function DevModelTrainingPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex flex-wrap gap-4 text-sm">
              <Link href="/admin" className="ink-link">
                Admin
              </Link>
              <Link href="/admin/model" className="ink-link">
                Live diagnostics
              </Link>
              <Link href="/simulator" className="ink-link">
                Simulator
              </Link>
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Local development only
            </p>
            <h1 className="mt-2 text-4xl text-[var(--ink)] md:text-5xl">
              Model training map
            </h1>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Hidden outside <code className="font-mono">next dev</code>
          </div>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <Metric label="Model" value="XGBoost" />
          <Metric label="Target" value="mention_rate" />
          <Metric label="Best score" value="walk-forward" />
          <Metric label="Use" value="what-if" />
        </section>

        <BoostingAnimation />

        <GradientVsBoosting />

        <WhyXgboostHere />

        <section className="mt-8 paper-panel rounded-[2rem] p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Pipeline graph
              </p>
              <h2 className="mt-1 text-2xl text-[var(--ink)]">How one collection becomes a model</h2>
            </div>
            <p className="max-w-lg text-sm text-[var(--muted)]">
              LLM answers become numeric brand-day rows. XGBoost only sees the rows.
            </p>
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-6">
            {pipeline.map((step, index) => (
              <div key={step.n} className="relative">
                {index < pipeline.length - 1 ? (
                  <div className="absolute left-[calc(100%-0.35rem)] top-10 hidden h-px w-4 bg-[var(--line-strong)] lg:block" />
                ) : null}
                <div className="h-full rounded-2xl border border-[color:var(--line)] bg-white/65 p-4">
                  <p className="font-mono text-xs text-[var(--muted)]">{step.n}</p>
                  <h3 className="mt-3 text-lg font-semibold text-[var(--ink)]">{step.title}</h3>
                  <p className="mt-2 text-sm font-medium text-[var(--ink-soft)]">{step.stat}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{step.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <div className="paper-panel rounded-[2rem] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              Training row anatomy
            </p>
            <div className="mt-5 overflow-hidden rounded-2xl border border-[color:var(--line)]">
              <div className="grid grid-cols-[1fr_1fr_2fr] bg-[var(--ink)] text-xs font-semibold uppercase tracking-[0.12em] text-[var(--paper)]">
                <div className="p-3">Identity</div>
                <div className="border-l border-white/20 p-3">Target</div>
                <div className="border-l border-white/20 p-3">Features</div>
              </div>
              <div className="grid grid-cols-[1fr_1fr_2fr] bg-white/70 text-sm">
                <div className="p-4">
                  <Chip>brand</Chip>
                  <Chip>date</Chip>
                </div>
                <div className="border-l border-[color:var(--line)] p-4">
                  <Chip strong>mention_rate</Chip>
                  <p className="mt-3 text-xs text-[var(--muted)]">Shifted forward when dates exist.</p>
                </div>
                <div className="border-l border-[color:var(--line)] p-4">
                  <div className="flex flex-wrap gap-2">
                    {["rank", "sentiment", "competition", "model spread", "content"].map((item) => (
                      <Chip key={item}>{item}</Chip>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <ModeCard
                title="Same-day mode"
                tone="warn"
                badge="debug fit"
                days={["D1 features", "D1 target", "score D1"]}
              />
              <ModeCard
                title="Next-period mode"
                tone="good"
                badge="honest test"
                days={["D1 features", "D2 target", "score later dates"]}
              />
            </div>
          </div>

          <div className="paper-panel rounded-[2rem] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              Data depth
            </p>
            <h2 className="mt-1 text-2xl text-[var(--ink)]">How much data changes trust</h2>
            <div className="mt-6 space-y-5">
              {qualityBars.map((bar) => (
                <div key={bar.label}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-[var(--ink)]">{bar.label}</span>
                    <span className="font-mono text-xs text-[var(--muted)]">{bar.rows}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-[rgba(25,22,18,0.1)]">
                    <div className={`h-full rounded-full ${bar.tone}`} style={{ width: bar.width }} />
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">{bar.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="paper-panel rounded-[2rem] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              Feature map
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {baseFeatures.map(({ group, features }) => (
                <div key={group} className="rounded-2xl border border-[color:var(--line)] bg-white/60 p-4">
                  <p className="text-sm font-semibold text-[var(--ink)]">{group}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {features.map((feature) => (
                      <Chip key={feature}>{feature}</Chip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="paper-panel rounded-[2rem] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              User-controlled levers
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {contentFeatures.map((feature) => (
                <Chip key={feature} strong>
                  {feature}
                </Chip>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              Prefer these for recommendations. They are closer to actions a user can actually take.
            </div>
          </div>
        </section>

        <section className="mt-8 paper-panel rounded-[2rem] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Trust graph
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            {trustCards.map(([title, value, note]) => (
              <div key={title} className="rounded-2xl border border-[color:var(--line)] bg-white/65 p-4">
                <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
                <p className="mt-3 font-mono text-xs text-[var(--ink-soft)]">{value}</p>
                <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{note}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function BoostingAnimation() {
  return (
    <section className="train-anim mt-8 overflow-hidden rounded-[2rem] border border-[color:var(--line)] bg-[#fbfaf7] p-6 shadow-[0_18px_60px_rgba(25,22,18,0.08)]">
      <style>{`
        @keyframes drawLine {
          0%, 12% { stroke-dashoffset: 240; opacity: 0.2; }
          38%, 100% { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes fadeResidual {
          0%, 26% { opacity: 0.9; }
          52%, 100% { opacity: 0.18; }
        }
        @keyframes showResidual {
          0%, 30% { opacity: 0; stroke-dashoffset: 70; }
          54%, 100% { opacity: 0.9; stroke-dashoffset: 0; }
        }
        @keyframes treePop {
          0%, 30% { transform: scale(0.88); opacity: 0.25; }
          48%, 100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pathDraw {
          0%, 36% { stroke-dashoffset: 90; opacity: 0.2; }
          58%, 100% { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes fillWeight {
          0%, 45% { transform: scaleX(0); opacity: 0.35; }
          70%, 100% { transform: scaleX(1); opacity: 1; }
        }
        @keyframes pulseRound {
          0%, 18% { background: rgba(255,255,255,0.75); border-color: var(--line); }
          28%, 42% { background: rgba(16, 185, 129, 0.12); border-color: rgba(5, 150, 105, 0.55); }
          60%, 100% { background: rgba(255,255,255,0.75); border-color: var(--line); }
        }
        @keyframes updateGlow {
          0%, 48% { transform: translateX(0); opacity: 0; }
          60% { opacity: 1; }
          82%, 100% { transform: translateX(72%); opacity: 0; }
        }
        @keyframes phaseActive {
          0%, 16% { background: rgba(255,255,255,0.72); color: var(--muted); transform: translateY(0); }
          22%, 38% { background: var(--ink); color: var(--paper); transform: translateY(-3px); }
          46%, 100% { background: rgba(255,255,255,0.72); color: var(--muted); transform: translateY(0); }
        }
        @keyframes flowDot {
          0%, 8% { transform: translateX(0); opacity: 0; }
          16% { opacity: 1; }
          78% { transform: translateX(calc(100% - 1.25rem)); opacity: 1; }
          92%, 100% { transform: translateX(calc(100% - 1.25rem)); opacity: 0; }
        }
        @keyframes oldPredictionBar {
          0%, 44% { width: 82%; opacity: 1; }
          62%, 100% { width: 82%; opacity: 0.35; }
        }
        @keyframes newPredictionBar {
          0%, 48% { width: 18%; opacity: 0.2; }
          72%, 100% { width: 68%; opacity: 1; }
        }
        @keyframes residualCallout {
          0%, 24% { opacity: 0; transform: translateY(6px); }
          34%, 58% { opacity: 1; transform: translateY(0); }
          72%, 100% { opacity: 0.65; transform: translateY(0); }
        }
        .train-anim .line-fit { stroke-dasharray: 240; animation: drawLine 5.5s ease-in-out infinite; }
        .train-anim .residual-before { animation: fadeResidual 5.5s ease-in-out infinite; }
        .train-anim .residual-after { stroke-dasharray: 70; animation: showResidual 5.5s ease-in-out infinite; }
        .train-anim .tree-node { transform-origin: center; animation: treePop 5.5s ease-in-out infinite; }
        .train-anim .tree-path { stroke-dasharray: 90; animation: pathDraw 5.5s ease-in-out infinite; }
        .train-anim .weight-fill { transform-origin: left; animation: fillWeight 5.5s ease-in-out infinite; }
        .train-anim .round-card { animation: pulseRound 5.5s ease-in-out infinite; }
        .train-anim .update-beam { animation: updateGlow 5.5s ease-in-out infinite; }
        .train-anim .phase-pill { animation: phaseActive 5.5s ease-in-out infinite; }
        .train-anim .flow-dot { animation: flowDot 5.5s ease-in-out infinite; }
        .train-anim .old-prediction { animation: oldPredictionBar 5.5s ease-in-out infinite; }
        .train-anim .new-prediction { animation: newPredictionBar 5.5s ease-in-out infinite; }
        .train-anim .residual-callout { animation: residualCallout 5.5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .train-anim * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
        }
      `}</style>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Training animation
          </p>
          <h2 className="mt-1 text-2xl text-[var(--ink)]">Boosted trees learn from what the last trees missed</h2>
        </div>
        <div className="rounded-full border border-[color:var(--line)] bg-white/80 px-4 py-2 font-mono text-xs text-[var(--ink-soft)]">
          Fm = Fm-1 + 0.1 x tree(residuals)
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[color:var(--line)] bg-white/65 p-4">
        <div className="relative h-2 overflow-hidden rounded-full bg-[rgba(25,22,18,0.1)]">
          <div className="flow-dot absolute top-0 h-2 w-5 rounded-full bg-emerald-600" />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            ["1", "Predict", "start from current ensemble"],
            ["2", "Miss", "measure residual errors"],
            ["3", "Fit", "train one tree on misses"],
            ["4", "Add", "apply small correction"],
          ].map(([n, title, note], index) => (
            <div
              key={title}
              className="phase-pill rounded-2xl border border-[color:var(--line)] px-4 py-3"
              style={{ animationDelay: `${index * 0.72}s` }}
            >
              <p className="font-mono text-xs">phase {n}</p>
              <p className="mt-1 text-sm font-semibold">{title}</p>
              <p className="mt-1 text-xs opacity-75">{note}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.08fr_0.82fr_0.9fr]">
        <div className="rounded-2xl border border-[color:var(--line)] bg-white/70 p-4">
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Residuals</span>
            <span className="font-mono text-[var(--ink-soft)]">error = actual - prediction</span>
          </div>
          <div className="mb-2 flex flex-wrap gap-3 text-[11px] text-[var(--muted)]">
            <span className="inline-flex items-center gap-1"><span className="h-2 w-5 rounded-full bg-[#b45309]" /> old prediction</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-5 rounded-full bg-emerald-600" /> updated prediction</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#191612]" /> actual row</span>
          </div>
          <svg viewBox="0 0 250 170" className="h-56 w-full" role="img" aria-label="Animated residual chart">
            <line x1="20" y1="150" x2="236" y2="150" stroke="var(--line-strong)" strokeWidth="1" />
            <line x1="20" y1="18" x2="20" y2="150" stroke="var(--line-strong)" strokeWidth="1" />
            <text x="25" y="28" fill="var(--muted)" fontSize="9">mention_rate</text>
            <text x="178" y="164" fill="var(--muted)" fontSize="9">training rows</text>
            <path
              d="M26 146 C 80 146, 138 146, 228 146"
              fill="none"
              stroke="#b45309"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.55"
            />
            <path
              className="line-fit"
              d="M26 132 C 72 124, 116 120, 154 105 S 210 82, 228 70"
              fill="none"
              stroke="#059669"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {residuals.map((point) => (
              <g key={`${point.x}-${point.y}`} style={{ animationDelay: point.delay }}>
                <line
                  className="residual-before"
                  x1={point.x}
                  y1={point.y}
                  x2={point.x}
                  y2={point.base}
                  stroke="#e11d48"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  className="residual-after"
                  x1={point.x}
                  y1={point.y}
                  x2={point.x}
                  y2={point.next}
                  stroke="#059669"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx={point.x} cy={point.y} r="4.5" fill="#191612" />
              </g>
            ))}
            <g className="residual-callout">
              <rect x="30" y="45" width="86" height="28" rx="10" fill="#fff7ed" stroke="#fb923c" />
              <text x="73" y="57" textAnchor="middle" fill="#9a3412" fontSize="8" fontFamily="monospace">big red gap</text>
              <text x="73" y="67" textAnchor="middle" fill="#9a3412" fontSize="8" fontFamily="monospace">becomes target</text>
            </g>
          </svg>
          <div className="grid gap-2 rounded-2xl border border-[color:var(--line)] bg-[rgba(25,22,18,0.03)] p-3">
            <div>
              <div className="mb-1 flex justify-between text-[11px] text-[var(--muted)]">
                <span>average residual before tree</span>
                <span className="font-mono">large</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white">
                <div className="old-prediction h-full rounded-full bg-rose-500" />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[11px] text-[var(--muted)]">
                <span>residual after added tree</span>
                <span className="font-mono">smaller</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white">
                <div className="new-prediction h-full rounded-full bg-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[color:var(--line)] bg-white/70 p-4">
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">New tree</span>
            <span className="font-mono text-[var(--ink-soft)]">fits residuals</span>
          </div>
          <svg viewBox="0 0 250 180" className="h-56 w-full" role="img" aria-label="Animated tree fitting residuals">
            <path className="tree-path" d="M125 40 L72 94 L48 142" fill="none" stroke="#72695c" strokeWidth="2" />
            <path className="tree-path" d="M125 40 L72 94 L104 142" fill="none" stroke="#72695c" strokeWidth="2" />
            <path className="tree-path" d="M125 40 L178 94 L156 142" fill="none" stroke="#72695c" strokeWidth="2" />
            <path className="tree-path" d="M125 40 L178 94 L206 142" fill="none" stroke="#72695c" strokeWidth="2" />
            <TreeNode x="125" y="40" text="rank_gap" />
            <TreeNode x="72" y="94" text="fresh" />
            <TreeNode x="178" y="94" text="sent." />
            <LeafNode x="48" y="142" text="+2.4" />
            <LeafNode x="104" y="142" text="+1.1" />
            <LeafNode x="156" y="142" text="-0.8" />
            <LeafNode x="206" y="142" text="+0.5" />
          </svg>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--muted)]">
            <div className="rounded-xl bg-white/70 p-3">
              <p className="font-semibold text-[var(--ink)]">Splits</p>
              <p className="mt-1">group rows with similar errors</p>
            </div>
            <div className="rounded-xl bg-white/70 p-3">
              <p className="font-semibold text-[var(--ink)]">Leaves</p>
              <p className="mt-1">store correction values</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[color:var(--line)] bg-white/70 p-4">
          <div className="mb-4 flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Leaf weights</span>
            <span className="font-mono text-[var(--ink-soft)]">eta = 0.1</span>
          </div>
          <div className="space-y-4">
            {leafWeights.map((weight) => (
              <div key={weight.label}>
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-[var(--muted)]">{weight.label}</span>
                  <span className="font-mono text-[var(--ink)]">{weight.value}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-[rgba(25,22,18,0.1)]">
                  <div
                    className="weight-fill h-full rounded-full bg-[var(--ink)]"
                    style={{ width: weight.width, animationDelay: weight.delay }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="relative mt-7 overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[rgba(25,22,18,0.04)] p-4">
            <div className="update-beam absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-emerald-300/45 to-transparent" />
            <p className="font-mono text-xs text-[var(--ink)]">prediction += learning_rate x leaf_weight</p>
          </div>
          <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-white/65 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--muted)]">example row</span>
              <span className="font-mono text-[var(--ink)]">{"42.0 -> 44.4"}</span>
            </div>
            <div className="mt-3 grid gap-2">
              <div className="h-2 rounded-full bg-[rgba(25,22,18,0.1)]">
                <div className="old-prediction h-full rounded-full bg-amber-500" />
              </div>
              <div className="h-2 rounded-full bg-[rgba(25,22,18,0.1)]">
                <div className="new-prediction h-full rounded-full bg-emerald-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {["Start with average", "Measure errors", "Fit tree to errors", "Add small correction"].map((round, index) => (
          <div
            key={round}
            className="round-card rounded-2xl border bg-white/75 p-4"
            style={{ animationDelay: `${index * 0.28}s` }}
          >
            <p className="font-mono text-xs text-[var(--muted)]">round {index + 1}</p>
            <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{round}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function GradientVsBoosting() {
  return (
    <section className="compare-anim mt-8 rounded-[2rem] border border-[color:var(--line)] bg-white/70 p-6">
      <style>{`
        @keyframes gdPoint {
          0%, 8% { transform: translate(0px, 0px); }
          28% { transform: translate(42px, 55px); }
          48% { transform: translate(85px, 83px); }
          68% { transform: translate(123px, 98px); }
          88%, 100% { transform: translate(153px, 104px); }
        }
        @keyframes gdWeightA {
          0%, 12% { transform: scaleY(0.85); }
          32% { transform: scaleY(0.62); }
          58% { transform: scaleY(0.43); }
          100% { transform: scaleY(0.32); }
        }
        @keyframes gdWeightB {
          0%, 12% { transform: scaleY(0.35); }
          32% { transform: scaleY(0.52); }
          58% { transform: scaleY(0.68); }
          100% { transform: scaleY(0.78); }
        }
        @keyframes gdWeightC {
          0%, 12% { transform: scaleY(0.72); }
          32% { transform: scaleY(0.58); }
          58% { transform: scaleY(0.48); }
          100% { transform: scaleY(0.42); }
        }
        @keyframes treeAdd {
          0%, 24% { transform: translateY(10px) scale(0.92); opacity: 0.2; }
          38%, 100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes residualShrink {
          0%, 20% { transform: scaleY(1); background: #e11d48; }
          48% { transform: scaleY(0.62); background: #f59e0b; }
          76%, 100% { transform: scaleY(0.28); background: #059669; }
        }
        @keyframes ensemblePulse {
          0%, 42% { box-shadow: inset 0 0 0 1px var(--line); }
          58%, 76% { box-shadow: inset 0 0 0 2px rgba(5, 150, 105, 0.6), 0 12px 30px rgba(5, 150, 105, 0.16); }
          100% { box-shadow: inset 0 0 0 1px var(--line); }
        }
        .compare-anim .gd-dot { transform-origin: center; animation: gdPoint 6s ease-in-out infinite; }
        .compare-anim .gd-wa { animation: gdWeightA 6s ease-in-out infinite; transform-origin: bottom; }
        .compare-anim .gd-wb { animation: gdWeightB 6s ease-in-out infinite; transform-origin: bottom; }
        .compare-anim .gd-wc { animation: gdWeightC 6s ease-in-out infinite; transform-origin: bottom; }
        .compare-anim .tree-add { animation: treeAdd 6s ease-in-out infinite; }
        .compare-anim .residual-bar { animation: residualShrink 6s ease-in-out infinite; transform-origin: bottom; }
        .compare-anim .ensemble-pulse { animation: ensemblePulse 6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .compare-anim * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
        }
      `}</style>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Gradient descent vs XGBoost
          </p>
          <h2 className="mt-1 text-2xl text-[var(--ink)]">Same loss goal, different training move</h2>
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-[var(--muted)]">
          Gradient descent nudges parameters inside one fixed model. XGBoost adds a new tree that
          corrects the current model&apos;s errors.
        </p>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-[color:var(--line)] bg-[#fffaf2] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">Classic gradient descent</p>
              <p className="mt-1 font-mono text-xs text-[var(--muted)]">w = w - learning_rate x gradient</p>
            </div>
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs text-[var(--muted)]">fixed model</span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[1.35fr_0.65fr]">
            <svg viewBox="0 0 260 180" className="h-56 w-full" role="img" aria-label="Gradient descent moving down a loss curve">
              <line x1="26" y1="152" x2="236" y2="152" stroke="var(--line-strong)" />
              <line x1="26" y1="20" x2="26" y2="152" stroke="var(--line-strong)" />
              <path
                d="M38 36 C 66 76, 90 108, 126 128 C 162 148, 196 140, 228 114"
                fill="none"
                stroke="#92400e"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M42 38 L84 93 L127 121 L165 136 L195 142"
                fill="none"
                stroke="#f59e0b"
                strokeDasharray="5 7"
                strokeWidth="2"
              />
              <g className="gd-dot">
                <circle cx="42" cy="38" r="8" fill="#191612" />
                <circle cx="42" cy="38" r="14" fill="none" stroke="#191612" opacity="0.18" strokeWidth="5" />
              </g>
              <text x="42" y="20" fontSize="10" fill="var(--muted)">high loss</text>
              <text x="172" y="164" fontSize="10" fill="var(--muted)">lower loss</text>
            </svg>

            <div className="rounded-2xl border border-[color:var(--line)] bg-white/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Weights</p>
              <div className="mt-4 flex h-36 items-end gap-3">
                <div className="gd-wa w-8 rounded-t-lg bg-amber-700" />
                <div className="gd-wb w-8 rounded-t-lg bg-amber-500" />
                <div className="gd-wc w-8 rounded-t-lg bg-amber-300" />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
                The same parameters keep moving until the loss stops falling.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[color:var(--line)] bg-[#f4fbf7] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">XGBoost gradient boosting</p>
              <p className="mt-1 font-mono text-xs text-[var(--muted)]">F_new = F_old + eta x tree(errors)</p>
            </div>
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs text-[var(--muted)]">growing ensemble</span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[0.75fr_1.25fr]">
            <div className="rounded-2xl border border-[color:var(--line)] bg-white/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Errors shrink</p>
              <div className="mt-4 flex h-40 items-end gap-3">
                {[0, 1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="residual-bar w-8 rounded-t-lg"
                    style={{ height: `${52 + item * 18}%`, animationDelay: `${item * 0.12}s` }}
                  />
                ))}
              </div>
            </div>

            <div className="ensemble-pulse rounded-2xl bg-white/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Ensemble grows</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <MiniTree label="T1" delay="0s" />
                <Plus />
                <MiniTree label="T2" delay="0.4s" />
                <Plus />
                <MiniTree label="T3" delay="0.8s" />
                <Plus />
                <MiniTree label="T4" delay="1.2s" />
              </div>
              <div className="mt-5 rounded-xl border border-[color:var(--line)] bg-[rgba(25,22,18,0.04)] p-3 font-mono text-xs text-[var(--ink)]">
                base + correction + correction + correction
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
                The old trees stay. Each new tree is a small correction to the current ensemble.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-[color:var(--line)]">
        <div className="grid bg-[var(--ink)] text-xs font-semibold uppercase tracking-[0.12em] text-[var(--paper)] md:grid-cols-3">
          <div className="p-3">Question</div>
          <div className="border-t border-white/20 p-3 md:border-l md:border-t-0">Gradient descent</div>
          <div className="border-t border-white/20 p-3 md:border-l md:border-t-0">XGBoost</div>
        </div>
        {comparisonRows.map(([question, gd, xgb]) => (
          <div key={question} className="grid bg-white/70 text-sm md:grid-cols-3">
            <div className="border-t border-[color:var(--line)] p-3 font-semibold text-[var(--ink)]">{question}</div>
            <div className="border-t border-[color:var(--line)] p-3 text-[var(--muted)] md:border-l">{gd}</div>
            <div className="border-t border-[color:var(--line)] p-3 text-[var(--ink-soft)] md:border-l">{xgb}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function WhyXgboostHere() {
  return (
    <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="paper-panel rounded-[2rem] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          Why XGBoost is better here
        </p>
        <h2 className="mt-1 text-2xl text-[var(--ink)]">Because this is small, tabular, noisy data</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {whyXgboostWinsHere.map((reason) => (
            <div key={reason.title} className="rounded-2xl border border-[color:var(--line)] bg-white/65 p-4">
              <p className="text-sm font-semibold text-[var(--ink)]">{reason.title}</p>
              <p className="mt-2 font-mono text-xs text-emerald-800">{reason.value}</p>
              <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">{reason.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="paper-panel rounded-[2rem] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          Actual XGBoost math
        </p>
        <div className="mt-5 space-y-4">
          <MathCard label="1. Current miss">
            g<sub>i</sub> = partial loss / partial prediction
          </MathCard>
          <MathCard label="2. Leaf value">
            w<sub>leaf</sub> = - sum(g) / (sum(h) + lambda)
          </MathCard>
          <MathCard label="3. Ensemble update">
            F<sub>m</sub>(x) = F<sub>m-1</sub>(x) + eta f<sub>m</sub>(x)
          </MathCard>
        </div>
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
          Not universally better. Gradient descent wins for images, language models, embeddings,
          and massive dense datasets. XGBoost wins here because the product data is tabular and scarce.
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl text-[var(--ink)]">{value}</p>
    </div>
  );
}

function TreeNode({ x, y, text }: { x: string; y: string; text: string }) {
  return (
    <g className="tree-node">
      <circle cx={x} cy={y} r="24" fill="#191612" />
      <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="#f9f5ed" fontSize="9" fontFamily="monospace">
        {text}
      </text>
    </g>
  );
}

function LeafNode({ x, y, text }: { x: string; y: string; text: string }) {
  return (
    <g className="tree-node">
      <rect x={Number(x) - 22} y={Number(y) - 14} width="44" height="28" rx="10" fill="#ecfdf5" stroke="#059669" />
      <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="#065f46" fontSize="11" fontFamily="monospace">
        {text}
      </text>
    </g>
  );
}

function Chip({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 font-mono text-[11px] ${
        strong
          ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]"
          : "border-[color:var(--line)] bg-white/70 text-[var(--ink-soft)]"
      }`}
    >
      {children}
    </span>
  );
}

function MiniTree({ label, delay }: { label: string; delay: string }) {
  return (
    <div className="tree-add rounded-2xl border border-emerald-200 bg-emerald-50 p-3" style={{ animationDelay: delay }}>
      <svg viewBox="0 0 70 58" className="h-14 w-16" aria-hidden="true">
        <line x1="35" y1="12" x2="18" y2="35" stroke="#047857" strokeWidth="2" />
        <line x1="35" y1="12" x2="52" y2="35" stroke="#047857" strokeWidth="2" />
        <circle cx="35" cy="12" r="9" fill="#047857" />
        <rect x="8" y="34" width="20" height="16" rx="6" fill="#d1fae5" stroke="#047857" />
        <rect x="42" y="34" width="20" height="16" rx="6" fill="#d1fae5" stroke="#047857" />
      </svg>
      <p className="text-center font-mono text-xs text-emerald-900">{label}</p>
    </div>
  );
}

function Plus() {
  return <span className="font-mono text-lg text-[var(--muted)]">+</span>;
}

function MathCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[color:var(--line)] bg-white/65 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
      <p className="mt-3 font-mono text-sm text-[var(--ink)]">{children}</p>
    </div>
  );
}

function ModeCard({
  title,
  badge,
  tone,
  days,
}: {
  title: string;
  badge: string;
  tone: "warn" | "good";
  days: string[];
}) {
  const bg = tone === "good" ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200";
  const dot = tone === "good" ? "bg-emerald-600" : "bg-amber-500";

  return (
    <div className={`rounded-2xl border p-4 ${bg}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
        <span className="rounded-full bg-white/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
          {badge}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {days.map((day) => (
          <div key={day} className="rounded-xl bg-white/70 p-3">
            <span className={`block h-2 w-2 rounded-full ${dot}`} />
            <p className="mt-3 text-xs leading-snug text-[var(--ink-soft)]">{day}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
