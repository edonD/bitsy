/**
 * Shared types for the simulation pipeline.
 *
 * Every stage imports from here — never from each other.
 */

export type ModelId = "chatgpt" | "claude" | "gemini" | "perplexity";

export interface ModelMeta {
  id: ModelId;
  label: string;
  provider: string;
  avgCitationsPerResponse: number;
  color: string;
}

export const MODEL_META: Record<ModelId, ModelMeta> = {
  chatgpt: {
    id: "chatgpt",
    label: "ChatGPT (GPT-4o)",
    provider: "OpenAI",
    avgCitationsPerResponse: 3.5,
    color: "#10a37f",
  },
  claude: {
    id: "claude",
    label: "Claude (Sonnet 4.6)",
    provider: "Anthropic",
    avgCitationsPerResponse: 4,
    color: "#d97706",
  },
  gemini: {
    id: "gemini",
    label: "Gemini 2.5 Pro",
    provider: "Google",
    avgCitationsPerResponse: 5,
    color: "#4285f4",
  },
  perplexity: {
    id: "perplexity",
    label: "Perplexity Sonar Pro",
    provider: "Perplexity",
    avgCitationsPerResponse: 13,
    color: "#6366f1",
  },
};

export interface Brand {
  name: string;
  isTarget: boolean;
}

export interface SimulationConfig {
  targetBrand: string;
  competitors: string[];
  queries: string[];
  models: ModelId[];
  samplesPerQuery: number;
}

export interface BrandMention {
  brand: string;
  mentioned: boolean;
  position: number | null;
  sentiment: "positive" | "neutral" | "negative";
  context: string;
}

export interface QueryResult {
  query: string;
  model: ModelId;
  sampleIndex: number;
  mentions: BrandMention[];
  totalBrandsMentioned: number;
  responseSnippet: string;
}

export interface BrandStats {
  brand: string;
  isTarget: boolean;
  mentionRate: number;
  avgPosition: number | null;
  sentimentBreakdown: { positive: number; neutral: number; negative: number };
  modelBreakdown: Record<
    ModelId,
    { mentionRate: number; avgPosition: number | null }
  >;
}

export interface SimulationResult {
  id: string;
  timestamp: number;
  config: SimulationConfig;
  queryResults: QueryResult[];
  brandStats: BrandStats[];
  modelStats: Record<
    ModelId,
    { avgBrandsMentioned: number; targetMentionRate: number }
  >;
}

export interface IndustryPreset {
  label: string;
  targetBrand: string;
  competitors: string[];
  queries: string[];
}

export const INDUSTRY_PRESETS: IndustryPreset[] = [
  {
    label: "CRM Software",
    targetBrand: "HubSpot",
    competitors: [
      "Salesforce",
      "Pipedrive",
      "Zoho CRM",
      "Monday.com",
      "Freshsales",
    ],
    queries: [
      "What is the best CRM for small businesses?",
      "Top CRM software for sales teams",
      "Best free CRM tools in 2026",
      "CRM comparison: which should I choose?",
      "Best CRM for startups with limited budget",
    ],
  },
  {
    label: "Project Management",
    targetBrand: "Asana",
    competitors: [
      "Monday.com",
      "ClickUp",
      "Notion",
      "Trello",
      "Jira",
      "Linear",
    ],
    queries: [
      "Best project management tool for remote teams",
      "Which project management software should I use?",
      "Top alternatives to Jira for agile teams",
      "Best free project management tools",
      "Project management software comparison 2026",
    ],
  },
  {
    label: "Email Marketing",
    targetBrand: "Mailchimp",
    competitors: [
      "ConvertKit",
      "ActiveCampaign",
      "Brevo",
      "Klaviyo",
      "Constant Contact",
    ],
    queries: [
      "Best email marketing platform for ecommerce",
      "Which email marketing tool has the best automation?",
      "Cheapest email marketing software",
      "Best email marketing for small business",
      "Email marketing platform comparison",
    ],
  },
  {
    label: "Web Hosting",
    targetBrand: "Vercel",
    competitors: [
      "Netlify",
      "AWS",
      "DigitalOcean",
      "Cloudflare Pages",
      "Railway",
    ],
    queries: [
      "Best hosting for Next.js applications",
      "Which web hosting is fastest?",
      "Best cloud hosting for developers",
      "Cheapest hosting for web apps",
      "Hosting platform comparison for startups",
    ],
  },
];
