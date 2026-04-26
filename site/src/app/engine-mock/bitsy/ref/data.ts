import type { ModelKey, Preset } from "./types";

export const PRESETS: Preset[] = [
  {
    label: "AI SaaS",
    brand: "Bitsy",
    website: "https://bitsy.ai",
    competitors: "Profound, Peec AI, Otterly.AI, AthenaHQ",
    queries: "Best AI search visibility tool\nHow to rank higher in ChatGPT answers\nBest GEO tools for brands",
  },
  {
    label: "Fashion",
    brand: "Zalando",
    website: "https://zalando.com",
    competitors: "ASOS, H&M, About You, Zara",
    queries: "Best online fashion store in Europe\nWhere to buy sustainable clothes online\nBest sneaker marketplace",
  },
  {
    label: "CRM",
    brand: "HubSpot",
    website: "https://hubspot.com",
    competitors: "Salesforce, Pipedrive, Zoho CRM, Monday",
    queries: "Best CRM for small business\nBest free CRM tools\nTop sales CRM for growing teams",
  },
];

export const STAGES = [
  "Frame market",
  "Poll models",
  "Compare competitors",
  "Find source gaps",
  "Build action plan",
];

export const LOOP_TABS = [
  {
    id: "target",
    step: "01",
    label: "Target",
    description: "Set the market frame",
  },
  {
    id: "observe",
    step: "02",
    label: "Observe",
    description: "Measure model answers",
  },
  {
    id: "simulate",
    step: "03",
    label: "Simulate",
    description: "Test changes in the engine",
  },
  {
    id: "execute",
    step: "04",
    label: "Execute",
    description: "Ship generated assets",
  },
  {
    id: "verify",
    step: "05",
    label: "Verify",
    description: "Compare prediction vs lift",
  },
] as const;

export const MODEL_DEFS: { key: ModelKey; label: string; color: string; searchBias: number }[] = [
  { key: "chatgpt", label: "ChatGPT", color: "#10a37f", searchBias: 5 },
  { key: "claude", label: "Claude", color: "#c26b2e", searchBias: 1 },
  { key: "gemini", label: "Gemini", color: "#4285f4", searchBias: 8 },
];
