// Types shared across the dev trace page.

export interface ApiLog {
  _id: string;
  _creationTime: number;
  date: string;
  query: string;
  model: string;
  sample: number;
  mode?: string; // "memory" | "search"
  prompt_sent?: string;
  raw_response?: string;
  parsed_brands?: {
    brands_mentioned?: { brand: string; position: number; sentiment: string }[];
  };
  tracked_brands?: {
    brand: string;
    mentioned: boolean;
    position?: number | null;
    sentiment?: string | null;
    detection_source: "json" | "text" | "none";
    position_source: "model_json" | "text_estimate" | "none";
    position_confidence: "high" | "estimated" | "none";
  }[];
  sources?: string[];
  latency_ms?: number;
  parser_status?: string;
  parse_strategy?: string;
  search_used?: boolean;
  tool_trace?: {
    provider?: string;
    tool_name?: string;
    search_call_count?: number;
    source_count?: number;
    search_calls?: {
      type?: string;
      status?: string | null;
      queries?: string[];
      hit_count?: number;
      hits?: string[];
      grounding_chunk_count?: number;
    }[];
  } | null;
  status: string;
  error?: string;
}

export type CallMode = "memory" | "search";

export interface CallCard {
  key: string;
  query: string;
  model: string;
  sample: number;
  mode: CallMode;
  state: "pending" | "running" | "done" | "error";
  log?: ApiLog;
}

export interface WhatIfResult {
  base_prediction: number;
  scenario_prediction: number;
  lift: number;
  lift_pct: number;
  ci_lower: number;
  ci_upper: number;
  confidence: string;
  contribution_method: string;
  data_days: number;
  confidence_tier: "benchmark" | "emerging" | "established";
  contributions: { feature: string; contribution: number; pct: number }[];
  per_model?: Record<
    string,
    { lift: number; lift_pct: number; base: number; predicted: number }
  >;
}

export interface TraceFeatureRow extends Record<string, number | string> {
  brand: string;
}

export interface BrandObservation {
  brand: string;
  mentioned: boolean;
  position: number | null;
  sentiment: string | null;
  detectionSource: "json" | "text" | "none";
  positionConfidence: "high" | "estimated" | "none";
}

export interface FeatureColumnGroup {
  key: string;
  label: string;
  columns: string[];
}

export interface MatrixCountSummary {
  totalCalls: number;
  mentionCount: number;
  positionCount: number;
  top1Count: number;
  top3Count: number;
  sentimentCount: number;
  positiveCount: number;
  negativeCount: number;
  totalMentionPool: number;
  queryHitCount: number;
  queryCount: number;
}

export interface MatrixReliabilitySummary {
  completedCount: number;
  expectedCount: number;
  completedRate: number;
  fallbackMentions: number;
  fallbackRate: number | null;
  estimatedPositions: number;
  estimatedPositionRate: number | null;
  searchMentions: number;
  searchUsedMentions: number;
  searchUsedRate: number | null;
}

export interface MatrixModelSplit {
  model: string;
  total: number;
  mentions: number;
  rate: number;
}

export interface MatrixGapSummary {
  mentionGapToLeader: number;
  mentionVsTarget: number;
  positionGapToBest: number | null;
}

export interface FeatureMatrixRow {
  brand: string;
  isTarget: boolean;
  featureValues: TraceFeatureRow;
  counts: MatrixCountSummary;
  reliability: MatrixReliabilitySummary;
  modelSplits: MatrixModelSplit[];
  gaps: MatrixGapSummary;
}
