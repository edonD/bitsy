import type { Metadata } from "next";
import Link from "next/link";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { Providers } from "./providers";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Bitsy | Test AI Search Before You Publish",
  description:
    "Bitsy helps teams test how AI tools talk about their product before they publish.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${displayFont.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-[var(--paper)] font-[family:var(--font-body)] text-[var(--ink)] antialiased">
        <Providers>
          <Navigation />
          <main>{children}</main>
          <footer className="border-t border-[color:var(--line)] bg-[rgba(248,244,237,0.96)] py-8">
            <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">Bitsy</p>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]">
                  Test AI search before you publish. See where you show up, where competitors win,
                  and what to fix next.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-5 text-sm text-[var(--muted)]">
                <Link href="/#product" className="hover:text-[var(--ink)]">
                  Product
                </Link>
                <Link href="/#how-it-works" className="hover:text-[var(--ink)]">
                  How it works
                </Link>
                <Link href="/#sample-report" className="hover:text-[var(--ink)]">
                  Report
                </Link>
                <Link href="/#built-for" className="hover:text-[var(--ink)]">
                  Teams
                </Link>
                <Link href="/#faq" className="hover:text-[var(--ink)]">
                  FAQ
                </Link>
                <Link href="/#pricing" className="hover:text-[var(--ink)]">
                  Pricing
                </Link>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
