/**
 * Simulation pipeline — public API.
 *
 * Re-exports every type, constant, and stage function so consumers
 * can import from "@/lib/simulation" with a single path.
 */

// ── Types & constants ──────────────────────────────────────────────────────
export {
  type ModelId,
  type ModelMeta,
  type Brand,
  type SimulationConfig,
  type BrandMention,
  type QueryResult,
  type BrandStats,
  type SimulationResult,
  type IndustryPreset,
  MODEL_META,
  INDUSTRY_PRESETS,
} from "./types";

// ── Pipeline stages ────────────────────────────────────────────────────────
export {
  // helpers
  createRng,
  // stage 1
  type BrandEntry,
  prepareBrands,
  // stage 2
  type ScoreMatrix,
  scoreVisibility,
  // stage 3
  type RawSample,
  sampleResponses,
  // stage 4
  extractMentions,
  // stage 5
  buildQueryResults,
  // stage 6
  computeBrandStats,
  // stage 7
  type ModelStats,
  computeModelStats,
  // stage 8
  assembleResult,
  // stage 9
  type FeatureVector,
  engineerFeatures,
  // stage 10
  type ScenarioChange,
  encodeScenario,
  // stage 11
  type Prediction,
  predictScenario,
  // stage 12
  type FeatureContribution,
  type Explanation,
  explainPrediction,
  // stage 13
  type SensitivityPoint,
  type SensitivityResult,
  sensitivityAnalysis,
  // full pipeline
  runPipeline,
} from "./stages";
