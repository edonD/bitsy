"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/simulate", label: "Scenario Lab" },
  { href: "/simulate/trends", label: "Runs" },
  { href: "/research", label: "Methodology" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--line)] bg-[rgba(247,242,234,0.92)] backdrop-blur-md">
      <nav className="mx-auto max-w-6xl px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/" className="mr-auto flex min-w-0 items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--line-strong)] bg-[rgba(255,255,255,0.52)] font-[family:var(--font-display)] text-xl text-[var(--ink)]">
              B
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold tracking-[0.16em] text-[var(--ink)] uppercase">
                Bitsy
              </span>
              <span className="block text-xs text-[var(--muted)]">Test AI visibility</span>
            </span>
          </Link>

          <div className="hidden flex-wrap items-center gap-1 md:flex">
            {navItems.map((item) => {
              const isActive = item.href === "/simulate"
                ? pathname === item.href || pathname.startsWith("/simulate/")
                : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-sm ${
                    isActive
                      ? "bg-[rgba(34,30,26,0.9)] text-[var(--paper-soft)]"
                      : "text-[var(--muted)] hover:bg-[rgba(255,255,255,0.5)] hover:text-[var(--ink)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <Link
            href="/simulate"
            className="btn-primary rounded-full px-4 py-2 text-sm font-semibold"
          >
            Start test
          </Link>
        </div>
      </nav>
    </header>
  );
}
