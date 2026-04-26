import type { CollectResponse } from "@/lib/api";

export interface BrandConfig {
  name: string;
  description: string;
  website: string;
  competitors: string[];
  queries: string[];
}

export type SimulatorTab = "target" | "observe" | "compete" | "simulate" | "execute" | "verify" | "measure";
export type TargetMode = "balanced" | "search" | "memory";

export interface BrandTemplate {
  label: string;
  config: BrandConfig;
}

export interface StoredRun {
  label: string;
  date: string;
  data: CollectResponse;
}
