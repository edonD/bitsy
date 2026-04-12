/**
 * Client for the FastAPI backend.
 *
 * Every function hits a real endpoint backed by real LLM API calls
 * and a real XGBoost surrogate model.
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Types ──────────────────────────────────────────────────────────────────

export interface BrandResult {
  brand: string;
  mention_rate: number;
  avg_position: number | null;
  top1_rate: number;
  top3_rate: number;
  positive_rate: number;
  negative_rate: number;
  net_sentiment: number;
  is_target: boolean;
}

export interface CollectResponse {
  total_observations: number;
  total_calls: number;
  brands: BrandResult[];
  model_metrics: { rmse: number; r2: number; importance: Record<string, number> };
  training_samples_total: number;
  duration_seconds: number;
}

export interface Contribution {
  feature: string;
  contribution: number;
  pct: number;
}

export interface PerModelPrediction {
  lift: number;
  lift_pct: number;
  base: number;
  predicted: number;
}

export interface WhatIfResponse {
  brand: string;
  base_prediction: number;
  scenario_prediction: number;
  lift: number;
  lift_pct: number;
  ci_lower: number;
  ci_upper: number;
  confidence: string;
  contributions: Contribution[];
  per_model?: Record<string, PerModelPrediction>;
}

export interface StatusResponse {
  has_data: boolean;
  observation_count: number;
  training_sample_count: number;
  model_trained: boolean;
  model_r2: number | null;
  target: string | null;
  brands: string[];
  feature_names: string[];
}

export interface Recommendation {
  action: string;
  feature: string;
  current_value: number;
  target_value: number;
  predicted_lift: number;
  effort: string;
  tactics: string[];
}

// ── API calls ──────────────────────────────────────────────────────────────

export async function getStatus(): Promise<StatusResponse> {
  const res = await fetch(`${API}/api/simulations/status`);
  if (!res.ok) throw new Error(`Status failed: ${res.status}`);
  return res.json();
}

export async function runCollection(params: {
  target: string;
  competitors: string[];
  queries: string[];
  models?: string[];
  samples_per_query?: number;
}): Promise<CollectResponse> {
  const res = await fetch(`${API}/api/simulations/collect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      target: params.target,
      competitors: params.competitors,
      queries: params.queries,
      models: params.models ?? ["chatgpt", "claude", "gemini"],
      samples_per_query: params.samples_per_query ?? 2,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Collection failed: ${err}`);
  }
  return res.json();
}

export async function runWhatIf(params: {
  brand: string;
  changes: Record<string, number>;
}): Promise<WhatIfResponse> {
  const res = await fetch(`${API}/api/simulations/whatif`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`What-if failed: ${err}`);
  }
  return res.json();
}

export async function getFeatures(): Promise<{ features: Record<string, number>[] }> {
  const res = await fetch(`${API}/api/simulations/features`);
  if (!res.ok) throw new Error(`Features failed: ${res.status}`);
  return res.json();
}

export async function getImportance(): Promise<{ importance: Record<string, number>; r2: number }> {
  const res = await fetch(`${API}/api/simulations/importance`);
  if (!res.ok) throw new Error(`Importance failed: ${res.status}`);
  return res.json();
}

export async function getRecommendations(brand: string): Promise<{ brand: string; recommendations: Recommendation[] }> {
  const res = await fetch(`${API}/api/simulations/recommendations?brand=${encodeURIComponent(brand)}`);
  if (!res.ok) throw new Error(`Recommendations failed: ${res.status}`);
  return res.json();
}

// ── Content Analysis ──────────────────────────────────────────────────────

export interface ContentFeature {
  name: string;
  label: string;
  value: number | string | boolean | null;
  geo_impact: string;
  rating: "good" | "needs_work" | "missing";
  description: string;
}

export interface ContentAnalysisResponse {
  url: string | null;
  title: string | null;
  features: ContentFeature[];
  summary: string;
  content_length: number;
  word_count: number;
  overall_score: number;
  fetch_error: string | null;
}

export async function analyzeContent(params: { url?: string; text?: string }): Promise<ContentAnalysisResponse> {
  const res = await fetch(`${API}/api/simulations/analyze-content`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Content analysis failed: ${res.status}`);
  return res.json();
}
