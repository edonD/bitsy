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

export interface ModelDiagnosticsResponse {
  model_trained: boolean;
  training_sample_count: number;
  brand_count: number;
  unique_dates: number;
  date_start: string | null;
  date_end: string | null;
  latest_row_count: number;
  duplicate_brand_date_rows: number;
  temporal_pair_count: number;
  rows_by_date: { date: string; rows: number; brands: number }[];
  top_brands_by_rows: { brand: string; rows: number; dates: number }[];
  mention_rate_summary: { min: number; median: number; mean: number; max: number };
  brand_row_summary: { min: number; median: number; max: number };
  use_content_features: boolean;
  feature_count: number;
  base_feature_names: string[];
  active_feature_names: string[];
  xgb_params: Record<string, string | number | boolean>;
  metrics: {
    rmse: number;
    mae: number;
    r2: number;
    interval_radius: number;
    training_mode: string;
    validation_mode: string;
    lag_feature_enabled: boolean;
    target_column: string;
  } | null;
  importance: { feature: string; importance: number }[];
  per_model_metrics: Record<
    string,
    { rmse: number; mae: number; r2: number; validation_mode: string }
  >;
  latest_training_run: {
    date?: string;
    r2_score?: number;
    rmse?: number;
    mae?: number;
    num_samples?: number;
    status?: string;
  } | null;
  config?: {
    target?: string;
    competitors?: string[];
    queries?: string[];
    models?: string[];
    website_url?: string;
  } | null;
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
  website_url?: string;
  models?: string[];
  samples_per_query?: number;
  fan_out?: boolean;
  enable_memory?: boolean;
  enable_search?: boolean;
  multi_generator_fanout?: boolean;
  intent_fanout?: boolean;
  cross_validate_extraction?: boolean;
  cross_validate_rate?: number;
}): Promise<CollectResponse> {
  const res = await fetch(`${API}/api/simulations/collect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      target: params.target,
      competitors: params.competitors,
      queries: params.queries,
      website_url: params.website_url,
      models: params.models ?? ["chatgpt", "claude", "gemini"],
      samples_per_query: params.samples_per_query ?? 2,
      fan_out: params.fan_out ?? true,
      enable_memory: params.enable_memory ?? true,
      enable_search: params.enable_search ?? false,
      multi_generator_fanout: params.multi_generator_fanout ?? false,
      intent_fanout: params.intent_fanout ?? false,
      cross_validate_extraction: params.cross_validate_extraction ?? false,
      cross_validate_rate: params.cross_validate_rate ?? 0.5,
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
  model?: string;
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

export async function getModelDiagnostics(): Promise<ModelDiagnosticsResponse> {
  const res = await fetch(`${API}/api/simulations/model-diagnostics`);
  if (!res.ok) throw new Error(`Model diagnostics failed: ${res.status}`);
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
  metrics: Record<string, number | null>;
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

// ── Competitor analysis ────────────────────────────────────────────────────

export interface BrandProfile {
  brand: string;
  url: string | null;
  analysis: Record<string, number | string | boolean | null> | null;
  error: string | null;
}

export interface FeatureGap {
  feature: string;
  label: string;
  target_value: number;
  competitor_avg: number;
  competitor_max: number;
  leader_brand: string;
  leader_value: number;
  gap: number;
  gap_direction: "behind" | "ahead" | "even" | "unknown";
  priority: "high" | "medium" | "low";
}

export interface SpecificRecommendation {
  feature: string;
  label: string;
  action: string;
  detail: string;
  evidence: string;
  effort: string;
  priority: string;
  gap: number;
  leader_brand: string;
  leader_value: number;
  target_value: number;
}

export interface ModelGuidance {
  label: string;
  knowledge_mix: string;
  prefers: string;
  actions: string[];
}

export interface CompetitorAnalysisResponse {
  target: BrandProfile;
  competitors: BrandProfile[];
  gaps: FeatureGap[];
  recommendations: SpecificRecommendation[];
  model_guidance: Record<string, ModelGuidance>;
}

export async function analyzeCompetitors(params: {
  target: { brand: string; url?: string };
  competitors: { brand: string; url?: string }[];
}): Promise<CompetitorAnalysisResponse> {
  const res = await fetch(`${API}/api/simulations/analyze-competitors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Competitor analysis failed: ${res.status}`);
  return res.json();
}

// ── Per-query breakdown ────────────────────────────────────────────────────

export interface QueryBrandStats {
  brand: string;
  mention_rate: number;
  avg_position: number | null;
  samples: number;
  per_model: Record<string, { rate: number; total: number }>;
}

export interface QueryBreakdown {
  query: string;
  winner: string | null;
  brands: QueryBrandStats[];
  total_samples: number;
}

export interface QueryBreakdownResponse {
  queries: QueryBreakdown[];
  total_observations: number;
  days_covered: number;
}

export async function getQueryBreakdown(days: number = 7): Promise<QueryBreakdownResponse> {
  const res = await fetch(`${API}/api/simulations/query-breakdown?days=${days}`);
  if (!res.ok) throw new Error(`Query breakdown failed: ${res.status}`);
  return res.json();
}

// ── Cited sources ──────────────────────────────────────────────────────────

export interface CitedSource {
  domain: string;
  count: number;
  rate: number;
}

export interface CitedSourcesResponse {
  brand: string;
  total_responses_mentioning: number;
  total_logs_checked: number;
  sources: CitedSource[];
  days_covered: number;
}

export async function getCitedSources(brand: string, days: number = 7): Promise<CitedSourcesResponse> {
  const res = await fetch(`${API}/api/simulations/cited-sources?brand=${encodeURIComponent(brand)}&days=${days}`);
  if (!res.ok) throw new Error(`Cited sources failed: ${res.status}`);
  return res.json();
}

// ── Trends ─────────────────────────────────────────────────────────────────

export interface TrendPoint {
  date: string;
  mention_rate: number;
  avg_position: number | null;
  net_sentiment: number;
  top1_rate: number;
}

export interface TrendsResponse {
  brand: string;
  timeline: TrendPoint[];
  days_of_data: number;
}

export async function getTrends(brand: string, days: number = 30): Promise<TrendsResponse> {
  const res = await fetch(`${API}/api/simulations/trends?brand=${encodeURIComponent(brand)}&days=${days}`);
  if (!res.ok) throw new Error(`Trends failed: ${res.status}`);
  return res.json();
}
