import type { BrandTemplate, SimulatorTab, TargetMode } from "./types";

export const TEMPLATES: BrandTemplate[] = [
  {
    label: "AI SaaS",
    config: {
      name: "Bitsy",
      description: "AI search visibility platform for B2B brands.",
      website: "https://bitsy.ai",
      competitors: ["Profound", "Peec AI", "Otterly", "AthenaHQ"],
      queries: [
        "Best AI search visibility tool",
        "How to rank higher in ChatGPT answers",
        "Best GEO tools for brands",
      ],
    },
  },
  {
    label: "Fashion",
    config: {
      name: "Zalando",
      description: "Online fashion and lifestyle retailer in Europe.",
      website: "https://zalando.com",
      competitors: ["ASOS", "H&M", "About You", "Shein", "Zara"],
      queries: [
        "Best online fashion store in Europe",
        "Where to buy affordable designer clothes online",
        "Best sustainable fashion marketplace",
      ],
    },
  },
  {
    label: "CRM",
    config: {
      name: "HubSpot",
      description: "CRM and marketing platform for growing businesses.",
      website: "https://hubspot.com",
      competitors: ["Salesforce", "Pipedrive", "Zoho CRM", "Monday.com"],
      queries: ["Best CRM for small businesses", "Top CRM software for sales teams", "Best free CRM tools"],
    },
  },
  {
    label: "Hosting",
    config: {
      name: "Vercel",
      description: "Frontend cloud and edge hosting for modern web apps.",
      website: "https://vercel.com",
      competitors: ["Netlify", "AWS", "Cloudflare Pages", "Railway"],
      queries: ["Best hosting for Next.js", "Which web hosting is fastest", "Best cloud hosting for developers"],
    },
  },
];

export const TABS: { id: SimulatorTab; label: string; desc: string }[] = [
  { id: "target", label: "Target", desc: "Set the market frame" },
  { id: "observe", label: "Observe", desc: "Measure model answers" },
  { id: "compete", label: "Compete", desc: "Gap analysis vs competitors" },
  { id: "simulate", label: "Simulate", desc: "Test before publishing" },
  { id: "execute", label: "Execute", desc: "Get the playbook" },
  { id: "verify", label: "Verify", desc: "Did the move work?" },
  { id: "measure", label: "Measure", desc: "Track over time" },
];

export const COLLECTION_OPTIONS = {
  samples_per_query: 2,
  multi_generator_fanout: false,
  intent_fanout: false,
  cross_validate_extraction: false,
  cross_validate_rate: 0.5,
} as const;

export const TARGET_MODE_OPTIONS: Record<TargetMode, { enable_memory: boolean; enable_search: boolean }> = {
  balanced: { enable_memory: true, enable_search: true },
  search: { enable_memory: false, enable_search: true },
  memory: { enable_memory: true, enable_search: false },
};

export const CONTENT_METRIC_KEYS = [
  "statistics_density",
  "quotation_count",
  "citation_count",
  "content_length",
  "readability_grade",
  "freshness_days",
  "heading_count",
] as const;
