import type { FeatureColumnGroup } from "./types";

// Labels, colors, and feature lists used across the trace UI.

export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const MODEL_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
};

export const MODEL_ACCENT: Record<string, string> = {
  chatgpt: "#10a37f",
  claude: "#d97706",
  gemini: "#4285f4",
};

export const FEATURE_LABELS: Record<string, string> = {
  avg_position: "Avg position",
  top1_rate: "Top-1 rate",
  top3_rate: "Top-3 rate",
  position_std: "Position std",
  positive_rate: "Positive sentiment",
  negative_rate: "Negative sentiment",
  net_sentiment: "Net sentiment",
  competitor_avg_rate: "Other-brand avg",
  vs_best_competitor: "Vs best competitor",
  brands_ahead: "Brands ahead",
  share_of_mentions: "Share of tracked mentions",
  model_agreement: "Model agreement",
  model_spread: "Model spread",
  query_coverage: "Query coverage",
  statistics_density: "Statistics /1K words",
  quotation_count: "Quotations",
  citation_count: "Citations",
  content_length: "Content length",
  readability_grade: "Readability grade",
  freshness_days: "Freshness (days)",
  heading_count: "Heading count",
};

// Features shown in the "Content features" section after a target-URL crawl.
export const CONTENT_FEATURES = [
  "statistics_density",
  "quotation_count",
  "citation_count",
  "content_length",
  "readability_grade",
  "freshness_days",
  "heading_count",
];

export const MATRIX_FEATURE_GROUPS: FeatureColumnGroup[] = [
  {
    key: "visibility",
    label: "Visibility",
    columns: ["mention_rate", "share_of_mentions", "query_coverage"],
  },
  {
    key: "ranking",
    label: "Ranking",
    columns: ["avg_position", "top1_rate", "top3_rate", "position_std"],
  },
  {
    key: "sentiment",
    label: "Sentiment",
    columns: ["positive_rate", "negative_rate", "net_sentiment"],
  },
  {
    key: "competition",
    label: "Competition",
    columns: ["competitor_avg_rate", "vs_best_competitor", "brands_ahead"],
  },
  {
    key: "consistency",
    label: "Consistency",
    columns: ["model_agreement", "model_spread"],
  },
  {
    key: "content",
    label: "Content",
    columns: CONTENT_FEATURES,
  },
];

// Features editable in the What-If panel. Order matters — they render top-to-bottom.
export const WHATIF_EDITABLE_FEATURES = [
  "statistics_density",
  "quotation_count",
  "citation_count",
  "content_length",
  "readability_grade",
  "freshness_days",
  "heading_count",
  "share_of_mentions",
  "query_coverage",
  "positive_rate",
];

// The three providers we render. Used for building card keys client-side.
export const MODELS: readonly ["chatgpt", "claude", "gemini"] = [
  "chatgpt",
  "claude",
  "gemini",
];
