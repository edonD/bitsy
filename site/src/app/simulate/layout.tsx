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
      <div className="border-b border-[color:var(--line)] py-8 md:py-10">
        <div className="mx-auto max-w-6xl px-6">
          <Link href="/" className="ink-link mb-4 inline-block text-sm">
            Back to home
          </Link>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),280px] lg:items-end">
            <div>
              <span className="surface-chip mb-3 inline-flex px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                Scenario lab
              </span>
              <h1 className="max-w-3xl text-4xl leading-tight text-[var(--ink)] md:text-5xl">
                Run a quick AI visibility test.
              </h1>
              <p className="mt-3 max-w-2xl text-lg leading-relaxed text-[var(--muted)]">
                Add one product, a few competitors, and the buyer questions that matter. Bitsy
                shows where your brand appears and which tools are most favorable.
              </p>
            </div>

            <div className="paper-card rounded-[1.5rem] p-4 text-sm leading-relaxed text-[var(--muted)]">
              <p className="muted-label text-xs">What this includes</p>
              <div className="mt-3 space-y-2">
                <p>Multi-model comparison across four AI tools.</p>
                <p>Repeated local runs for steadier preview results.</p>
                <p>Saved browser history so scenarios are easy to revisit.</p>
              </div>
            </div>
          </div>

          <nav className="mt-8 flex flex-wrap gap-2 rounded-full border border-[color:var(--line)] bg-[rgba(255,255,255,0.34)] p-1">
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
                      : "text-[var(--muted)] hover:bg-[rgba(255,255,255,0.58)] hover:text-[var(--ink)]"
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
