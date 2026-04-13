import Link from "next/link";

const navItems = [
  { href: "/#product", label: "Product" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#sample-report", label: "Report" },
  { href: "/concept", label: "Concept" },
  { href: "/#faq", label: "FAQ" },
];

export function Navigation() {
  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--line)] bg-[rgba(249,246,240,0.9)] backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-4">
        <Link href="/#top" className="mr-auto flex min-w-0 items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[0.35rem] border border-[color:var(--line-strong)] bg-[rgba(255,255,255,0.68)] font-[family:var(--font-display)] text-xl text-[var(--ink)]">
            B
          </span>
          <span className="text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">Bitsy</span>
        </Link>

        <div className="hidden items-center gap-6 text-sm text-[var(--muted)] md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-[var(--ink)]">
              {item.label}
            </Link>
          ))}
        </div>

        <Link
          href="/#pricing"
          className="btn-primary rounded-full px-5 py-2.5 text-sm font-semibold"
        >
          Join waitlist
        </Link>
      </nav>
    </header>
  );
}
