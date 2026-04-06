"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SimulationProvider } from "@/components/SimulationProvider";

const tabs = [
  { href: "/simulate", label: "Setup", exact: true },
  { href: "/simulate/results", label: "Results" },
  { href: "/simulate/compare", label: "Compare" },
  { href: "/simulate/trends", label: "Runs" },
];

export default function SimulateLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SimulationProvider>
      <div className="border-b border-[color:var(--line)] py-10">
        <div className="mx-auto max-w-6xl px-6">
          <Link href="/" className="ink-link mb-4 inline-block text-sm">
            Back to Bitsy
          </Link>
          <span className="surface-chip mb-3 inline-flex px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            Scenario lab
          </span>
          <h1 className="max-w-3xl text-4xl leading-tight text-[var(--ink)] md:text-5xl">
            Test your product against real buyer questions.
          </h1>
          <p className="mt-3 max-w-2xl text-lg leading-relaxed text-[var(--muted)]">
            Add your product, a few competitors, and the questions buyers ask. Bitsy then shows
            how different AI tools might respond.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
            <span className="surface-chip px-3 py-1.5">
              Before you publish
            </span>
            <span className="surface-chip px-3 py-1.5">
              Compare AI tools
            </span>
            <span className="surface-chip px-3 py-1.5">
              Saved local runs
            </span>
          </div>

          <div className="surface-inset mt-6 rounded-[1.5rem] px-4 py-4 text-sm leading-relaxed text-[var(--muted)]">
            <strong className="text-[var(--ink)]">What this test answers:</strong> for these
            questions, how often are AI tools likely to mention your product and where does it
            appear relative to competitors?
          </div>

          <nav className="mt-8 flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const isActive = tab.exact
                ? pathname === tab.href
                : pathname.startsWith(tab.href);

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`rounded-full px-4 py-2 text-sm ${
                    isActive
                      ? "bg-[rgba(34,30,26,0.92)] text-[var(--paper-soft)]"
                      : "border border-[color:var(--line)] bg-[rgba(255,255,255,0.42)] text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10">{children}</div>
    </SimulationProvider>
  );
}
