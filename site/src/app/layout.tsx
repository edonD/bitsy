import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bitsy — GEO & LLM Visibility Research Hub",
  description:
    "Comprehensive research on Generative Engine Optimization: how LLMs decide what to mention, the tools, the economics, and the science.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-full flex flex-col bg-white text-slate-900`}>
        <Navigation />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-slate-50 py-8 mt-16">
          <div className="max-w-6xl mx-auto px-6 text-center text-sm text-slate-500">
            <p>Bitsy Research Hub &mdash; Built with Next.js. All research sourced and cited.</p>
            <p className="mt-1">
              Inspired by{" "}
              <a href="https://tryscope.app/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                Tryscope
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
