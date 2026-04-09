/**
 * Simulation pipeline — independent stages.
 *
 * Each exported function is a pure transform:
 *   config → brands → scores → samples → mentions → stats → result
 *
 * Chain them yourself or use `runPipeline` for the full default flow.
 */

import {
  type ModelId,
  type SimulationConfig,
  type BrandMention,
  type QueryResult,
  type BrandStats,
  type SimulationResult,
  MODEL_META,
} from "./types";

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Deterministic seed-based PRNG. Returns a function that yields 0-1 floats. */
export function createRng(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
    h = (h ^ (h >>> 16)) >>> 0;
    return h / 4294967296;
  };
}

// ─── Stage 1: prepareBrands ────────────────────────────────────────────────

export interface BrandEntry {
  name: string;
  isTarget: boolean;
}

/**
 * Build the flat brand list from a config.
 * Pure: config → brands.
 */
export function prepareBrands(config: SimulationConfig): BrandEntry[] {
  return [
    { name: config.targetBrand, isTarget: true },
    ...config.competitors.map((name) => ({ name, isTarget: false })),
  ];
}

// ─── Stage 2: scoreVisibility ──────────────────────────────────────────────

/** Per-brand, per-model base visibility score (0-1). */
export type ScoreMatrix = Record<string, Record<ModelId, number>>;

/**
 * Compute a deterministic base visibility score for every brand × model pair.
 *
 * Research basis:
 *   – 2.1: mentions are winner-take-all, top brands dominate
 *   – 2.2: only 12% overlap between models → per-model variance is large
 *
 * Pure: (brands, models) → score matrix.
 */
export function scoreVisibility(
  brands: BrandEntry[],
  models: ModelId[]
): ScoreMatrix {
  const matrix: ScoreMatrix = {};

  for (const brand of brands) {
    matrix[brand.name] = {} as Record<ModelId, number>;
    const brandRng = createRng(brand.name.toLowerCase());

    for (const model of models) {
      const base = brandRng() * 0.6 + 0.2; // 0.2 – 0.8
      const targetBoost = brand.isTarget ? 0.05 : 0;

      // Per-model variance: Research 2.2 says only 12% overlap between models
      const modelRng = createRng(brand.name + model);
      const modelVariance = (modelRng() - 0.5) * 0.3;

      matrix[brand.name][model] = Math.max(
        0.05,
        Math.min(0.95, base + targetBoost + modelVariance)
      );
    }
  }

  return matrix;
}

// ─── Stage 3: sampleResponses ──────────────────────────────────────────────

export interface RawSample {
  query: string;
  model: ModelId;
  sampleIndex: number;
  /** Sorted brand names by descending score (with per-query noise). */
  rankedBrands: string[];
  /** How many brands this response will mention. */
  mentionCount: number;
  /** The RNG instance for downstream deterministic decisions. */
  rng: () => number;
}

/**
 * Generate one RawSample per (query × model × sampleIndex) cell.
 *
 * Research basis:
 *   – ChatGPT cites ~3-4 brands; Perplexity ~13 (Research 2.1)
 *   – 15% accuracy variance at temp=0 (Research 2.2)
 *
 * Pure: (scores, config) → raw samples.
 */
export function sampleResponses(
  scores: ScoreMatrix,
  config: SimulationConfig
): RawSample[] {
  const samples: RawSample[] = [];
  const allBrands = [config.targetBrand, ...config.competitors];

  for (const query of config.queries) {
    for (const model of config.models) {
      const meta = MODEL_META[model];

      for (let idx = 0; idx < config.samplesPerQuery; idx++) {
        const rng = createRng(`${query}-${model}-${idx}`);

        const mentionCount = Math.max(
          1,
          Math.round(meta.avgCitationsPerResponse + (rng() - 0.5) * 2)
        );

        const ranked = allBrands
          .map((brand) => ({
            brand,
            score: scores[brand][model] + (rng() - 0.5) * 0.15,
          }))
          .sort((a, b) => b.score - a.score)
          .map((entry) => entry.brand);

        samples.push({
          query,
          model,
          sampleIndex: idx,
          rankedBrands: ranked,
          mentionCount,
          rng,
        });
      }
    }
  }

  return samples;
}

// ─── Stage 4: extractMentions ──────────────────────────────────────────────

const CONTEXT_TEMPLATES: Record<
  "positive" | "neutral" | "negative",
  string[]
> = {
  positive: [
    "{brand} is widely recommended for its robust feature set and competitive pricing.",
    "Many industry experts consider {brand} a top choice in this category.",
    "{brand} stands out with strong user ratings and comprehensive capabilities.",
    "For enterprises, {brand} offers particularly strong integrations and support.",
    "{brand} is frequently cited as a leader by analysts and user reviews alike.",
  ],
  neutral: [
    "{brand} is one of several options available in this space.",
    "{brand} offers standard features comparable to other solutions.",
    "Some users prefer {brand}, though alternatives exist with different trade-offs.",
    "{brand} is a viable option depending on your specific requirements.",
    "{brand} has a presence in this market with a range of plans.",
  ],
  negative: [
    "Some users report that {brand} has a steep learning curve.",
    "{brand} is sometimes criticized for its pricing relative to alternatives.",
    "While {brand} has features, some reviews note limitations in certain areas.",
    "{brand} may not be the best fit for smaller teams due to complexity.",
    "Users have noted that {brand}'s onboarding process could be improved.",
  ],
};

/**
 * For a single RawSample, decide mentions / position / sentiment / context
 * for every brand in the pool.
 *
 * Research basis:
 *   – Authoritative lists 41%, awards 18%, reviews 16% drive mentions (2.5)
 *   – Position-adjusted word count: exponential decay by position (2.2)
 *
 * Pure: (sample, allBrands) → mentions[].
 */
export function extractMentions(
  sample: RawSample,
  allBrands: string[]
): BrandMention[] {
  const { rankedBrands, mentionCount, rng } = sample;

  return allBrands.map((brand) => {
    const rank = rankedBrands.indexOf(brand);
    const mentioned = rank < mentionCount;

    if (!mentioned) {
      return { brand, mentioned: false, position: null, sentiment: "neutral" as const, context: "" };
    }

    // Sentiment: higher-ranked brands get better sentiment
    const roll = rng();
    let sentiment: "positive" | "neutral" | "negative";
    if (rank === 0) {
      sentiment = roll < 0.7 ? "positive" : "neutral";
    } else if (rank < 3) {
      sentiment = roll < 0.4 ? "positive" : roll < 0.85 ? "neutral" : "negative";
    } else {
      sentiment = roll < 0.2 ? "positive" : roll < 0.7 ? "neutral" : "negative";
    }

    const templates = CONTEXT_TEMPLATES[sentiment];
    const context = templates[Math.floor(rng() * templates.length)].replace(
      "{brand}",
      brand
    );

    return { brand, mentioned: true, position: rank + 1, sentiment, context };
  });
}

// ─── Stage 5: buildQueryResults ────────────────────────────────────────────

/**
 * Turn raw samples + their mentions into full QueryResult objects
 * (the shape the existing UI consumes).
 *
 * Pure: (samples, mentionsPerSample) → QueryResult[].
 */
export function buildQueryResults(
  samples: RawSample[],
  mentionsPerSample: BrandMention[][]
): QueryResult[] {
  return samples.map((sample, i) => {
    const mentions = mentionsPerSample[i];
    const mentioned = mentions.filter((m) => m.mentioned);

    // Build a short response snippet
    let responseSnippet: string;
    if (mentioned.length === 0) {
      responseSnippet = `Based on current information, there are several options for "${sample.query}" though specific recommendations depend on your use case.`;
    } else {
      const names = mentioned
        .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
        .map((m) => m.brand);
      const modelLabel = MODEL_META[sample.model].label;
      responseSnippet =
        names.length <= 3
          ? `When asked "${sample.query}", ${modelLabel} recommends ${names.join(", ")}. ${mentioned[0].context}`
          : `When asked "${sample.query}", ${modelLabel} mentions ${names.slice(0, 3).join(", ")}, and ${names.length - 3} others. ${mentioned[0].context}`;
    }

    return {
      query: sample.query,
      model: sample.model,
      sampleIndex: sample.sampleIndex,
      mentions,
      totalBrandsMentioned: mentioned.length,
      responseSnippet,
    };
  });
}

// ─── Stage 6: computeBrandStats ────────────────────────────────────────────

/**
 * Aggregate all query results into per-brand statistics.
 *
 * Pure: (queryResults, config) → BrandStats[].  Sorted by mention rate desc.
 */
export function computeBrandStats(
  queryResults: QueryResult[],
  config: SimulationConfig
): BrandStats[] {
  const allBrands = [config.targetBrand, ...config.competitors];

  const stats: BrandStats[] = allBrands.map((brand) => {
    const all = queryResults.flatMap((qr) =>
      qr.mentions.filter((m) => m.brand === brand)
    );
    const hit = all.filter((m) => m.mentioned);

    const mentionRate = hit.length / all.length;
    const positions = hit
      .map((m) => m.position)
      .filter((p): p is number => p !== null);
    const avgPosition =
      positions.length > 0
        ? positions.reduce((a, b) => a + b, 0) / positions.length
        : null;

    const sentimentBreakdown = {
      positive: hit.filter((m) => m.sentiment === "positive").length,
      neutral: hit.filter((m) => m.sentiment === "neutral").length,
      negative: hit.filter((m) => m.sentiment === "negative").length,
    };

    const modelBreakdown = {} as Record<
      ModelId,
      { mentionRate: number; avgPosition: number | null }
    >;
    for (const model of config.models) {
      const modelAll = queryResults
        .filter((qr) => qr.model === model)
        .flatMap((qr) => qr.mentions.filter((m) => m.brand === brand));
      const modelHit = modelAll.filter((m) => m.mentioned);
      const modelPos = modelHit
        .map((m) => m.position)
        .filter((p): p is number => p !== null);

      modelBreakdown[model] = {
        mentionRate: modelHit.length / modelAll.length,
        avgPosition:
          modelPos.length > 0
            ? modelPos.reduce((a, b) => a + b, 0) / modelPos.length
            : null,
      };
    }

    return {
      brand,
      isTarget: brand === config.targetBrand,
      mentionRate,
      avgPosition,
      sentimentBreakdown,
      modelBreakdown,
    };
  });

  stats.sort((a, b) => b.mentionRate - a.mentionRate);
  return stats;
}

// ─── Stage 7: computeModelStats ────────────────────────────────────────────

export type ModelStats = Record<
  ModelId,
  { avgBrandsMentioned: number; targetMentionRate: number }
>;

/**
 * Aggregate query results into per-model summary statistics.
 *
 * Pure: (queryResults, config) → ModelStats.
 */
export function computeModelStats(
  queryResults: QueryResult[],
  config: SimulationConfig
): ModelStats {
  const out = {} as ModelStats;

  for (const model of config.models) {
    const modelResults = queryResults.filter((qr) => qr.model === model);
    const avgBrands =
      modelResults.reduce((sum, qr) => sum + qr.totalBrandsMentioned, 0) /
      modelResults.length;
    const targetHits = modelResults.filter((qr) =>
      qr.mentions.some(
        (m) => m.brand === config.targetBrand && m.mentioned
      )
    );

    out[model] = {
      avgBrandsMentioned: avgBrands,
      targetMentionRate: targetHits.length / modelResults.length,
    };
  }

  return out;
}

// ─── Stage 8: assembleResult ───────────────────────────────────────────────

/**
 * Pack everything into the final SimulationResult the UI expects.
 *
 * Pure: (config, queryResults, brandStats, modelStats) → SimulationResult.
 */
export function assembleResult(
  config: SimulationConfig,
  queryResults: QueryResult[],
  brandStats: BrandStats[],
  modelStats: ModelStats
): SimulationResult {
  return {
    id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    config,
    queryResults,
    brandStats,
    modelStats,
  };
}

// ─── Stage 9: engineerFeatures ─────────────────────────────────────────────

export interface FeatureVector {
  /** Time-series */
  mention_rate_current: number;
  mention_rate_lag1: number;
  mention_rate_7d_avg: number;
  mention_rate_30d_avg: number;
  mention_rate_volatility: number;
  mention_rate_trend: number;

  /** Competitor */
  competitor_avg_mention_rate: number;
  vs_best_competitor_ratio: number;
  competitor_gaining: number;

  /** Content quality (from GEO paper + Profound/Ahrefs empirical data) */
  source_freshness_months: number;
  high_authority_source_count: number;
  statistics_density: number;
  quotation_count: number;
  citation_count: number;
  content_length_chars: number;
  fluency_score: number;
  third_party_mention_count: number;

  /** Query characteristics */
  informational_query_pct: number;
  avg_query_length: number;
  semantic_diversity: number;

  /** Mechanism */
  parametric_pct: number;
  rag_pct: number;
  web_search_trigger_rate: number;

  /** Seasonality */
  day_of_week: number;
  is_weekend: number;
  seasonal_index: number;
}

/**
 * Derive a feature vector from brand + model stats.
 *
 * In the mock pipeline this fills in plausible defaults; in the real pipeline
 * these would come from actual daily observations + content analysis.
 *
 * Pure: (brandStats, modelStats, config, history?) → FeatureVector.
 */
export function engineerFeatures(
  brandStats: BrandStats[],
  modelStats: ModelStats,
  config: SimulationConfig,
  history: SimulationResult[] = []
): FeatureVector {
  const target = brandStats.find((b) => b.isTarget);
  const competitors = brandStats.filter((b) => !b.isTarget);
  const targetRate = target ? target.mentionRate * 100 : 0;

  // Time-series: use history if available, else assume stable
  const prevRates = history.map((h) => {
    const t = h.brandStats.find((b) => b.isTarget);
    return t ? t.mentionRate * 100 : 0;
  });
  const lag1 = prevRates.length > 0 ? prevRates[0] : targetRate;
  const avg7 =
    prevRates.length >= 7
      ? prevRates.slice(0, 7).reduce((a, b) => a + b, 0) / 7
      : targetRate;
  const avg30 =
    prevRates.length >= 30
      ? prevRates.slice(0, 30).reduce((a, b) => a + b, 0) / 30
      : targetRate;
  const volatility =
    prevRates.length >= 2
      ? Math.sqrt(
          prevRates.reduce((s, r) => s + (r - avg7) ** 2, 0) /
            prevRates.length
        )
      : 2.0;
  const trend = targetRate - lag1;

  // Competitor
  const compRates = competitors.map((c) => c.mentionRate * 100);
  const compAvg =
    compRates.length > 0
      ? compRates.reduce((a, b) => a + b, 0) / compRates.length
      : 0;
  const bestComp = compRates.length > 0 ? Math.max(...compRates) : 0;

  const now = new Date();

  return {
    mention_rate_current: targetRate,
    mention_rate_lag1: lag1,
    mention_rate_7d_avg: avg7,
    mention_rate_30d_avg: avg30,
    mention_rate_volatility: volatility,
    mention_rate_trend: trend,

    competitor_avg_mention_rate: compAvg,
    vs_best_competitor_ratio: bestComp > 0 ? targetRate / bestComp : 1,
    competitor_gaining: compAvg > targetRate ? 1 : 0,

    // Defaults — in production these come from content analysis
    source_freshness_months: 1.5,
    high_authority_source_count: 3,
    statistics_density: 0.4,
    quotation_count: 2,
    citation_count: 4,
    content_length_chars: 6000,
    fluency_score: 0.75,
    third_party_mention_count: 5,

    informational_query_pct: 0.7,
    avg_query_length: config.queries.reduce((s, q) => s + q.split(" ").length, 0) / config.queries.length,
    semantic_diversity: 0.6,

    parametric_pct: 0.79,
    rag_pct: 0.21,
    web_search_trigger_rate: 0.21,

    day_of_week: now.getDay(),
    is_weekend: now.getDay() === 0 || now.getDay() === 6 ? 1 : 0,
    seasonal_index: 1.0,
  };
}

// ─── Stage 10: encodeScenario ──────────────────────────────────────────────

export type ScenarioChange = Partial<FeatureVector>;

/**
 * Merge user-specified changes onto a base feature vector.
 *
 * Pure: (base, changes) → modified feature vector.
 */
export function encodeScenario(
  base: FeatureVector,
  changes: ScenarioChange
): FeatureVector {
  return { ...base, ...changes };
}

// ─── Stage 11: predictScenario ─────────────────────────────────────────────

export interface Prediction {
  baseMentionRate: number;
  scenarioMentionRate: number;
  lift: number;
  liftPct: number;
  confidenceLower: number;
  confidenceUpper: number;
  confidence: "high" | "medium" | "low";
}

/**
 * Predict how a scenario changes mention rate versus the base case.
 *
 * In the mock pipeline this uses research-backed heuristic weights.
 * In production this calls the XGBoost surrogate (~1ms).
 *
 * Research basis for weights:
 *   – GEO paper: quotations +41%, statistics +37%, citations +30%, fluency +28%
 *   – Ahrefs: 76.4% of top-cited updated <30 days → freshness is strong
 *   – Profound: 6.5x for third-party → third_party weight is high
 *   – GEO paper: keyword stuffing -10% → not modeled here (absence is safe)
 *
 * Pure: (base, scenario) → Prediction.
 */
export function predictScenario(
  base: FeatureVector,
  scenario: FeatureVector
): Prediction {
  // Heuristic weights (stand-in for surrogate model coefficients)
  const weights: Partial<Record<keyof FeatureVector, number>> = {
    source_freshness_months: -2.5,      // fresher → lower months → higher mention
    high_authority_source_count: 1.8,
    statistics_density: 3.7,            // GEO: +37%
    quotation_count: 4.1,              // GEO: +41%
    citation_count: 3.0,              // GEO: +30%
    content_length_chars: 0.001,      // longer helps, diminishing
    fluency_score: 2.8,              // GEO: +28%
    third_party_mention_count: 2.2,  // Profound: 6.5x
    competitor_avg_mention_rate: -0.3, // competitors rising hurts
  };

  let delta = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const k = key as keyof FeatureVector;
    const diff = (scenario[k] as number) - (base[k] as number);
    if (diff !== 0) {
      delta += diff * weight;
    }
  }

  const baseMentionRate = base.mention_rate_current;
  const scenarioMentionRate = Math.max(0, Math.min(100, baseMentionRate + delta));
  const lift = scenarioMentionRate - baseMentionRate;
  const liftPct = baseMentionRate > 0 ? (lift / baseMentionRate) * 100 : 0;

  // Uncertainty: wider when lift is large
  const uncertainty = 1.96 * (2.0 + Math.abs(lift) * 0.15);
  const confidenceLower = Math.max(0, scenarioMentionRate - uncertainty);
  const confidenceUpper = Math.min(100, scenarioMentionRate + uncertainty);

  const confidence: "high" | "medium" | "low" =
    Math.abs(lift) < 1 ? "low" : Math.abs(lift) < 5 ? "medium" : "high";

  return {
    baseMentionRate,
    scenarioMentionRate,
    lift,
    liftPct,
    confidenceLower,
    confidenceUpper,
    confidence,
  };
}

// ─── Stage 12: explainPrediction ───────────────────────────────────────────

export interface FeatureContribution {
  feature: string;
  delta: number;
  contribution: number;
  pct: number;
}

export interface Explanation {
  contributions: FeatureContribution[];
  totalLift: number;
}

/**
 * Decompose a prediction into per-feature contributions (mock SHAP).
 *
 * Pure: (base, scenario, prediction) → Explanation.
 */
export function explainPrediction(
  base: FeatureVector,
  scenario: FeatureVector,
  prediction: Prediction
): Explanation {
  const weights: Partial<Record<keyof FeatureVector, number>> = {
    source_freshness_months: -2.5,
    high_authority_source_count: 1.8,
    statistics_density: 3.7,
    quotation_count: 4.1,
    citation_count: 3.0,
    content_length_chars: 0.001,
    fluency_score: 2.8,
    third_party_mention_count: 2.2,
    competitor_avg_mention_rate: -0.3,
  };

  const contributions: FeatureContribution[] = [];
  let totalMagnitude = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const k = key as keyof FeatureVector;
    const delta = (scenario[k] as number) - (base[k] as number);
    if (delta !== 0) {
      const contribution = delta * weight;
      totalMagnitude += Math.abs(contribution);
      contributions.push({ feature: key, delta, contribution, pct: 0 });
    }
  }

  // Compute percentage share of total lift
  for (const c of contributions) {
    c.pct =
      totalMagnitude > 0 ? (Math.abs(c.contribution) / totalMagnitude) * 100 : 0;
  }

  contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return { contributions, totalLift: prediction.lift };
}

// ─── Stage 13: sensitivityAnalysis ─────────────────────────────────────────

export interface SensitivityPoint {
  multiplier: number;
  featureValue: number;
  predictedRate: number;
}

export type SensitivityResult = Record<string, SensitivityPoint[]>;

/**
 * Sweep each feature across a range of multipliers and record predicted rates.
 * Shows diminishing returns curves.
 *
 * Pure: (base, features, multipliers?) → SensitivityResult.
 */
export function sensitivityAnalysis(
  base: FeatureVector,
  features: (keyof FeatureVector)[],
  multipliers: number[] = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0]
): SensitivityResult {
  const result: SensitivityResult = {};

  for (const feat of features) {
    const points: SensitivityPoint[] = [];
    const baseVal = base[feat] as number;

    for (const mult of multipliers) {
      const scenario = encodeScenario(base, { [feat]: baseVal * mult } as ScenarioChange);
      const pred = predictScenario(base, scenario);
      points.push({
        multiplier: mult,
        featureValue: baseVal * mult,
        predictedRate: pred.scenarioMentionRate,
      });
    }

    result[feat] = points;
  }

  return result;
}

// ─── Full pipeline runner ──────────────────────────────────────────────────

/**
 * Run the entire default pipeline from config → SimulationResult.
 * This is the drop-in replacement for the old monolithic `runSimulation`.
 */
export function runPipeline(config: SimulationConfig): SimulationResult {
  const brands = prepareBrands(config);
  const scores = scoreVisibility(brands, config.models);
  const samples = sampleResponses(scores, config);

  const allBrandNames = brands.map((b) => b.name);
  const mentionsPerSample = samples.map((s) => extractMentions(s, allBrandNames));

  const queryResults = buildQueryResults(samples, mentionsPerSample);
  const brandStats = computeBrandStats(queryResults, config);
  const modelStats = computeModelStats(queryResults, config);

  return assembleResult(config, queryResults, brandStats, modelStats);
}
