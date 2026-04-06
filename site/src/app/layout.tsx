import type { Metadata } from "next";
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
  title: "Bitsy | AI Search Scenario Lab",
  description:
    "Bitsy lets you test how AI tools might talk about your product before you publish.",
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
          <main className="flex-1">{children}</main>
          <footer className="border-t border-[color:var(--line)] py-8">
            <div className="mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-[1.2fr,0.8fr]">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink)]">
                  Bitsy
                </p>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
                  A simple way to test how AI tools might mention your product before launch.
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Focus
                </p>
                <div className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                  <p>Set up a test</p>
                  <p>Compare AI answers</p>
                  <p>The core engine comes next</p>
                </div>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
