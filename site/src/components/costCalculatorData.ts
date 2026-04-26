// Real pricing data from Research 2.3 (April 2026).
// Cost per query assumes roughly 100 input tokens and 500 output tokens.
export interface ModelInfo {
  name: string;
  provider: string;
  costPerQuery: number;
  inputPer1M: number;
  outputPer1M: number;
  tier: "budget" | "mid" | "flagship";
  batchDiscount: number;
  hasRequestFee: boolean;
  requestFee: number;
  note: string;
}

export const MODELS: ModelInfo[] = [
  {
    name: "GPT-4.1-nano",
    provider: "OpenAI",
    costPerQuery: 0.0002,
    inputPer1M: 0.10,
    outputPer1M: 0.40,
    tier: "budget",
    batchDiscount: 0.5,
    hasRequestFee: false,
    requestFee: 0,
    note: "Cheapest OpenAI option, good for polling",
  },
  {
    name: "GPT-4o-mini",
    provider: "OpenAI",
    costPerQuery: 0.0003,
    inputPer1M: 0.15,
    outputPer1M: 0.60,
    tier: "budget",
    batchDiscount: 0.5,
    hasRequestFee: false,
    requestFee: 0,
    note: "Budget with slightly better quality",
  },
  {
    name: "Gemini 2.5 Flash-Lite",
    provider: "Google",
    costPerQuery: 0.0002,
    inputPer1M: 0.10,
    outputPer1M: 0.40,
    tier: "budget",
    batchDiscount: 0.5,
    hasRequestFee: false,
    requestFee: 0,
    note: "Free tier available at lower rate limits",
  },
  {
    name: "Gemini 2.5 Flash",
    provider: "Google",
    costPerQuery: 0.0013,
    inputPer1M: 0.30,
    outputPer1M: 2.50,
    tier: "mid",
    batchDiscount: 0.5,
    hasRequestFee: false,
    requestFee: 0,
    note: "Good mid-range option",
  },
  {
    name: "Claude Haiku 4.5",
    provider: "Anthropic",
    costPerQuery: 0.0026,
    inputPer1M: 1.00,
    outputPer1M: 5.00,
    tier: "mid",
    batchDiscount: 0.5,
    hasRequestFee: false,
    requestFee: 0,
    note: "Fast, mid-range Anthropic model",
  },
  {
    name: "GPT-4o",
    provider: "OpenAI",
    costPerQuery: 0.0053,
    inputPer1M: 2.50,
    outputPer1M: 10.00,
    tier: "flagship",
    batchDiscount: 0.5,
    hasRequestFee: false,
    requestFee: 0,
    note: "Flagship OpenAI model",
  },
  {
    name: "GPT-4.1",
    provider: "OpenAI",
    costPerQuery: 0.0042,
    inputPer1M: 2.00,
    outputPer1M: 8.00,
    tier: "flagship",
    batchDiscount: 0.5,
    hasRequestFee: false,
    requestFee: 0,
    note: "Latest GPT-4 class model",
  },
  {
    name: "Claude Sonnet 4.6",
    provider: "Anthropic",
    costPerQuery: 0.0078,
    inputPer1M: 3.00,
    outputPer1M: 15.00,
    tier: "flagship",
    batchDiscount: 0.5,
    hasRequestFee: false,
    requestFee: 0,
    note: "Top-tier Anthropic model",
  },
  {
    name: "Gemini 2.5 Pro",
    provider: "Google",
    costPerQuery: 0.0051,
    inputPer1M: 1.25,
    outputPer1M: 10.00,
    tier: "flagship",
    batchDiscount: 0.5,
    hasRequestFee: false,
    requestFee: 0,
    note: "Flagship Google model",
  },
];

export const PRESETS: { label: string; brands: number; queries: number; samples: number; frequency: number }[] = [
  { label: "Startup MVP (5 brands)", brands: 5, queries: 3, samples: 3, frequency: 1 },
  { label: "Small Business (10 brands)", brands: 10, queries: 5, samples: 3, frequency: 1 },
  { label: "Agency (50 brands)", brands: 50, queries: 8, samples: 3, frequency: 1 },
  { label: "Enterprise (100 brands)", brands: 100, queries: 10, samples: 5, frequency: 1 },
  { label: "Tryscope-Style (50 polls/day)", brands: 10, queries: 5, samples: 1, frequency: 50 },
];

export function formatCurrency(value: number): string {
  if (value < 0.01) return `$${value.toFixed(4)}`;
  if (value < 1) return `$${value.toFixed(3)}`;
  if (value < 100) return `$${value.toFixed(2)}`;
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
