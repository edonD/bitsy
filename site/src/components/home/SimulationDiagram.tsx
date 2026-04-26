import Link from "next/link";

const scenarios = [
  {
    tag: "Measure",
    question: "Where does Bitsy show up today?",
    meta: "12 buyer questions · 3 AI tools",
    tone: "bg-[#ece4d2]",
  },
  {
    tag: "Gap",
    question: "Which competitor is winning this question?",
    meta: "Competitor answer · source found",
    tone: "bg-[#dde7f3]",
  },
  {
    tag: "Fix",
    question: "What page should we write next?",
    meta: "Brief · outline · source list",
    tone: "bg-[#dceadf]",
  },
  {
    tag: "Verify",
    question: "Did the change improve the next run?",
    meta: "Before · after · saved run",
    tone: "bg-[#e7dff0]",
  },
];

const simulationOutputs = [
  {
    label: "Current result",
    status: "Mentioned by 2 of 3 AI tools",
    meta: "Now",
    tone: "bg-[#f2ead8]",
  },
  {
    label: "Missing",
    status: "Not mentioned by Claude",
    meta: "Spotted",
    tone: "bg-[#e5edf7]",
  },
  {
    label: "Next fix",
    status: "Write 'Bitsy vs Scope'",
    meta: "Suggested",
    tone: "bg-[#e7f0df]",
  },
  {
    label: "Page update",
    status: "Add FAQ block to /pricing",
    meta: "Ready",
    tone: "bg-[#efe6f5]",
  },
  {
    label: "Competitor move",
    status: "Scope cited via /docs",
    meta: "Watch",
    tone: "bg-[#f6e8e6]",
  },
];

function ScenarioCard({
  tag,
  question,
  meta,
  tone,
}: {
  tag: string;
  question: string;
  meta: string;
  tone: string;
}) {
  return (
    <div className="relative pt-3">
      <div
        className={`${tone} absolute left-3 top-0 z-10 inline-flex items-center gap-1.5 rounded-[0.2rem] border border-[color:var(--line)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink)] shadow-[0_2px_6px_rgba(31,25,18,0.04)]`}
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--ink)]" />
        {tag}
      </div>
      <div className="rounded-[0.25rem] border border-[color:var(--line)] bg-[rgba(255,255,255,0.97)] px-4 pb-3.5 pt-5 shadow-[0_8px_18px_rgba(31,25,18,0.05)]">
        <p className="text-sm leading-snug text-[var(--ink)]">{question}</p>
        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
          {meta}
        </p>
      </div>
    </div>
  );
}

function OutputCard({
  label,
  status,
  meta,
  tone,
}: {
  label: string;
  status: string;
  meta: string;
  tone: string;
}) {
  return (
    <div className="relative pt-3">
      <div
        className={`${tone} absolute left-3 top-0 z-10 inline-flex items-center gap-1.5 rounded-[0.2rem] border border-[color:var(--line)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink)] shadow-[0_2px_6px_rgba(31,25,18,0.04)]`}
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--ink)]" />
        {label}
      </div>
      <div className="rounded-[0.25rem] border border-[color:var(--line)] bg-[rgba(255,255,255,0.97)] px-4 pb-3.5 pt-5 shadow-[0_8px_18px_rgba(31,25,18,0.05)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--ink)]">{status}</p>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
            {meta}
          </span>
        </div>
      </div>
    </div>
  );
}

const brands = [
  { src: "/brands/openai.svg", alt: "OpenAI", sizeClass: "max-h-20" },
  { src: "/brands/anthropic.svg", alt: "Anthropic", sizeClass: "max-h-6" },
  { src: "/brands/gemini.svg", alt: "Google Gemini", sizeClass: "max-h-6" },
];

function CenterNode() {
  return (
    <div className="flex flex-col items-center">
      <div className="w-[224px] rounded-[0.4rem] border border-[color:var(--line)] bg-[var(--paper-deep)] p-4 shadow-[0_22px_44px_rgba(31,25,18,0.12)]">
        <p className="text-center font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ink)]">
          Bitsy
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {brands.map((brand) => (
            <div
              key={brand.alt}
              className="flex h-[92px] items-center justify-center rounded-[0.2rem] border border-[color:var(--line)] bg-[var(--paper-soft)] px-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={brand.src}
                alt={brand.alt}
                className={`${brand.sizeClass} w-auto max-w-full object-contain`}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 space-y-1.5 text-center font-mono text-[10px] uppercase tracking-[0.18em]">
        <p className="text-[var(--ink)]">Answers checked</p>
        <p className="text-[var(--muted)]">Gaps found</p>
        <p className="text-[rgba(38,32,25,0.42)]">Fix list ready</p>
        <p className="text-[rgba(38,32,25,0.28)]">Progress tracked</p>
      </div>
    </div>
  );
}

export function SimulationDiagram() {
  return (
    <section id="simulation-layer">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="muted-label text-xs">The report</p>
            <h2 className="mt-4 text-4xl leading-tight text-[var(--ink)]">
              Ask one question: what should we fix next?
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--ink-soft)]">
              Bitsy checks your buyer questions, compares the answers, and turns the gaps
              into a short list of pages, edits, and sources worth acting on.
            </p>
          </div>
          <Link href="/#sample-report" className="ink-link w-fit text-sm">
            View sample report
          </Link>
        </div>

        <div className="relative mt-10 overflow-hidden border border-[color:var(--line)] bg-[rgba(255,255,255,0.76)] p-6 lg:p-12">
          <div className="relative grid gap-12 lg:grid-cols-[minmax(0,1fr),224px,minmax(0,1fr)] lg:items-center lg:gap-10">
            <div className="space-y-5">
              {scenarios.map((s) => (
                <ScenarioCard key={s.question} {...s} />
              ))}
            </div>

            <CenterNode />

            <div className="space-y-5">
              {simulationOutputs.map((item) => (
                <OutputCard key={item.label} {...item} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
