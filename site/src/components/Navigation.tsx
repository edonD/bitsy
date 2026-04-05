"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/research/llm-mechanics", label: "LLM Mechanics" },
  { href: "/research/geo-tools", label: "GEO Tools" },
  { href: "/research/economics", label: "Economics" },
  { href: "/research/landscape", label: "Landscape" },
  { href: "/research/papers", label: "Papers" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
      <nav className="max-w-6xl mx-auto px-6 flex items-center gap-8 h-14">
        <Link href="/" className="font-bold text-lg text-slate-900 shrink-0">
          Bitsy
        </Link>
        <div className="flex items-center gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
