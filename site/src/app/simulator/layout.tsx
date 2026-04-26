import type { ReactNode } from "react";
import { Instrument_Serif, Inter_Tight, JetBrains_Mono } from "next/font/google";

const engineSans = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-engine-sans",
  weight: ["300", "400", "500", "600", "700"],
});

const engineMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-engine-mono",
  weight: ["400", "500", "600"],
});

const engineSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-engine-serif",
  weight: ["400"],
  style: ["normal", "italic"],
});

export default function SimulatorLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${engineSans.variable} ${engineMono.variable} ${engineSerif.variable}`}>
      {children}
    </div>
  );
}
