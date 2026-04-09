/**
 * Backward-compatible façade.
 *
 * All logic now lives in @/lib/simulation/stages.ts as independent,
 * chainable stage functions.  This file re-exports the types, constants,
 * and storage helpers the existing UI already imports.
 */

// ── Re-export types & constants (unchanged public surface) ─────────────────
export {
  type Brand,
  type SimulationConfig,
  type ModelId,
  type ModelMeta,
  type BrandMention,
  type QueryResult,
  type BrandStats,
  type SimulationResult,
  type IndustryPreset,
  MODEL_META,
  INDUSTRY_PRESETS,
} from "./simulation";

// ── Re-export the full pipeline as `runSimulation` (drop-in) ───────────────
export { runPipeline as runSimulation } from "./simulation";

// ── Storage helpers (unchanged) ────────────────────────────────────────────
import type { SimulationResult } from "./simulation";

const STORAGE_KEY = "bitsy-simulation-history";

export function saveSimulationResult(result: SimulationResult): void {
  if (typeof window === "undefined") return;
  const existing = getSimulationHistory();
  existing.unshift(result);
  const trimmed = existing.slice(0, 20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function getSimulationHistory(): SimulationResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SimulationResult[];
  } catch {
    return [];
  }
}

export function clearSimulationHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
