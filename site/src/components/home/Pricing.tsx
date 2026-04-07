import Link from "next/link";

const tiers = [
  {
    id: "starter",
    name: "Starter",
    price: 50,
    cadence: "/month",
    tagline: "For solo founders checking where they stand in AI search.",
    cta: { label: "Start at $50/mo", href: "/simulate" },
    features: [
      "50 buyer prompts / month",
      "4 AI models — ChatGPT, Claude, Gemini, Perplexity",
      "5 saved scenarios",
      "Page rewrite simulations",
      "Mention rate, position, citation parsing",
      "Email support",
    ],
    tone: "bg-[rgba(255,255,255,0.94)]",
  },
  {
    id: "studio",
    name: "Studio",
    price: 120,
    cadence: "/month",
    tagline: "For teams shipping content weekly and watching competitors.",
    cta: { label: "Start at $120/mo", href: "/simulate" },
    featured: true,
    badge: "Preferred",
    features: [
      "250 buyer prompts / month",
      "4 AI models with run history",
      "Unlimited saved scenarios",
      "Draft + page update simulations",
      "Predicted lift on every variant",
      "Competitor watch on 5 brands",
      "Priority support",
    ],
    tone: "bg-[var(--paper-deep)]",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 1200,
    cadence: "/month",
    tagline: "For agencies and orgs running multi-brand AI visibility programs.",
    cta: { label: "Talk to us", href: "mailto:hello@bitsy.app?subject=Bitsy%20Enterprise" },
    features: [
      "Unlimited buyer prompts",
      "Multi-brand accounts",
      "Custom prompt sets per market",
      "API access for your stack",
      "SSO + audit log",
      "Dedicated success manager",
      "Annual contracts available",
    ],
    tone: "bg-[rgba(255,255,255,0.94)]",
  },
];

function PriceCard({ tier }: { tier: (typeof tiers)[number] }) {
  return (
    <div
      className={`relative flex h-full flex-col rounded-[0.45rem] border ${
        tier.featured
          ? "border-[color:var(--line-strong)] shadow-[0_22px_44px_rgba(31,25,18,0.1)]"
          : "border-[color:var(--line)]"
      } ${tier.tone} p-6 md:p-7`}
    >
      {tier.featured && tier.badge && (
        <div className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-[0.2rem] border border-[color:var(--line)] bg-[var(--ink)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--paper-soft)]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--paper-soft)]" />
          {tier.badge}
        </div>
      )}

      <p className="muted-label text-xs">{tier.name}</p>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-5xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
          ${tier.price}
        </span>
        <span className="text-base text-[var(--muted)]">{tier.cadence}</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">{tier.tagline}</p>

      <div className="my-6 h-px w-full bg-[color:var(--line)]" />

      <ul className="space-y-2.5">
        {tier.features.map((f) => (
          <li
            key={f}
            className="flex items-start gap-2.5 text-sm leading-snug text-[var(--ink-soft)]"
          >
            <span
              aria-hidden="true"
              className="mt-1 inline-block h-1.5 w-1.5 flex-none rounded-full bg-[var(--ink)]"
            />
            {f}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-7">
        <Link
          href={tier.cta.href}
          className={`inline-flex w-full items-center justify-center rounded-full px-6 py-3 font-mono text-sm font-semibold uppercase tracking-[0.08em] ${
            tier.featured ? "btn-primary" : "btn-secondary"
          }`}
        >
          {tier.cta.label}
        </Link>
      </div>
    </div>
  );
}

export function Pricing() {
  return (
    <section id="pricing">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="max-w-3xl">
          <p className="muted-label text-xs">Pricing</p>
          <h2 className="mt-4 text-4xl leading-tight text-[var(--ink)]">
            Pick a plan and start testing today.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--ink-soft)]">
            No free trial. Every plan starts paid because every Bitsy run costs us real model API
            time. Cancel anytime.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3 lg:items-stretch">
          {tiers.map((tier) => (
            <PriceCard key={tier.id} tier={tier} />
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
          <span>No free trial</span>
          <span aria-hidden="true">·</span>
          <span>Cancel anytime</span>
          <span aria-hidden="true">·</span>
          <span>Prices in USD, billed monthly</span>
        </div>
      </div>
    </section>
  );
}
