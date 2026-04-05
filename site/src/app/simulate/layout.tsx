"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SimulationProvider } from "@/components/SimulationProvider";

const tabs = [
  { href: "/simulate", label: "Setup", exact: true },
  { href: "/simulate/results", label: "Results" },
  { href: "/simulate/compare", label: "Compare Models" },
  { href: "/simulate/trends", label: "Trends" },
];

export default function SimulateLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SimulationProvider>
      <div className="bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 py-10">
        <div className="max-w-6xl mx-auto px-6">
          <Link href="/" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
            &larr; Back to Research Hub
          </Link>
          <span className="block text-xs font-medium text-blue-600 bg-blue-50 rounded px-2 py-0.5 w-fit mb-3">
            Task 3.2
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
            LLM Visibility Simulator
          </h1>
          <p className="mt-3 text-lg text-slate-600 max-w-2xl leading-relaxed">
            Simulate how ChatGPT, Claude, Gemini, and Perplexity mention your brand vs. competitors.
            Powered by research-calibrated models reflecting real citation patterns.
          </p>

          <nav className="mt-8 flex gap-1 border-b border-slate-200">
            {tabs.map((tab) => {
              const isActive = tab.exact
                ? pathname === tab.href
                : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    isActive
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
    </SimulationProvider>
  );
}
