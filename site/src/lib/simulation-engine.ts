// Simulation engine for LLM brand visibility
// Generates realistic mock data based on approved research findings:
// - Research 2.1: ChatGPT cites 3-4 brands per response; Perplexity cites ~13
// - Research 2.2: 15% accuracy variance at temp=0; only 12% URL overlap between models
// - Research 2.5: Authoritative lists (41%), awards (18%), reviews (16%) drive mentions

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

export type ModelId =
  | "chatgpt"
  | "claude"
  | "gemini"
  | "perplexity";

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

export interface BrandMention {
  brand: string;
  mentioned: boolean;
  position: number | null; // 1-indexed position in response, null if not mentioned
  sentiment: "positive" | "neutral" | "negative";
  context: string; // snippet of how the brand was mentioned
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
  mentionRate: number; // 0-1
  avgPosition: number | null;
  sentimentBreakdown: { positive: number; neutral: number; negative: number };
  modelBreakdown: Record<ModelId, { mentionRate: number; avgPosition: number | null }>;
}

export interface SimulationResult {
  id: string;
  timestamp: number;
  config: SimulationConfig;
  queryResults: QueryResult[];
  brandStats: BrandStats[];
  modelStats: Record<ModelId, { avgBrandsMentioned: number; targetMentionRate: number }>;
}

// Deterministic seed-based pseudo-random number generator
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
    h = (h ^ (h >>> 16)) >>> 0;
    return h / 4294967296;
  };
}

// Context snippets based on query type
const contextTemplates = {
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

function generateResponseSnippet(
  query: string,
  mentions: BrandMention[],
  model: ModelId
): string {
  const mentioned = mentions.filter((m) => m.mentioned);
  if (mentioned.length === 0) {
    return `Based on current information, there are several options for "${query}" though specific recommendations depend on your use case.`;
  }

  const brandList = mentioned
    .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
    .map((m) => m.brand);

  const modelName = MODEL_META[model].label;
  if (brandList.length <= 3) {
    return `When asked "${query}", ${modelName} recommends ${brandList.join(", ")}. ${mentioned[0].context}`;
  }
  return `When asked "${query}", ${modelName} mentions ${brandList.slice(0, 3).join(", ")}, and ${brandList.length - 3} others. ${mentioned[0].context}`;
}

export function runSimulation(config: SimulationConfig): SimulationResult {
  const allBrands = [config.targetBrand, ...config.competitors];
  const queryResults: QueryResult[] = [];

  // Generate a base "visibility score" for each brand per model
  // This determines how likely each brand is to be mentioned
  // Based on Research 2.1: mentions are winner-take-all, top brands dominate
  const brandScores: Record<string, Record<ModelId, number>> = {};

  for (const brand of allBrands) {
    brandScores[brand] = {} as Record<ModelId, number>;
    const brandSeed = seededRandom(brand.toLowerCase());

    for (const model of config.models) {
      // Base score: seeded from brand name for consistency
      const baseScore = brandSeed() * 0.6 + 0.2; // 0.2-0.8 range

      // Target brand gets a slight boost (simulating "you know your brand")
      const isTarget = brand === config.targetBrand;
      const targetBoost = isTarget ? 0.05 : 0;

      // Per-model variance: Research 2.2 says only 12% overlap between models
      const modelSeed = seededRandom(brand + model);
      const modelVariance = (modelSeed() - 0.5) * 0.3;

      brandScores[brand][model] = Math.max(0.05, Math.min(0.95, baseScore + targetBoost + modelVariance));
    }
  }

  // Generate query results
  for (const query of config.queries) {
    for (const model of config.models) {
      const meta = MODEL_META[model];

      for (let sampleIdx = 0; sampleIdx < config.samplesPerQuery; sampleIdx++) {
        const rng = seededRandom(`${query}-${model}-${sampleIdx}`);

        // Determine how many brands this model will mention
        // Based on research: ChatGPT ~3-4, Perplexity ~13
        const mentionCount = Math.max(
          1,
          Math.round(meta.avgCitationsPerResponse + (rng() - 0.5) * 2)
        );

        // Sort brands by their score for this model, with per-query variance
        const brandProbabilities = allBrands.map((brand) => ({
          brand,
          score: brandScores[brand][model] + (rng() - 0.5) * 0.15, // 15% variance per Research 2.2
        }));
        brandProbabilities.sort((a, b) => b.score - a.score);

        const mentions: BrandMention[] = allBrands.map((brand) => {
          const idx = brandProbabilities.findIndex((bp) => bp.brand === brand);
          const mentioned = idx < mentionCount;

          let sentiment: "positive" | "neutral" | "negative" = "neutral";
          let context = "";

          if (mentioned) {
            const sentimentRoll = rng();
            if (idx === 0) {
              sentiment = sentimentRoll < 0.7 ? "positive" : "neutral";
            } else if (idx < 3) {
              sentiment = sentimentRoll < 0.4 ? "positive" : sentimentRoll < 0.85 ? "neutral" : "negative";
            } else {
              sentiment = sentimentRoll < 0.2 ? "positive" : sentimentRoll < 0.7 ? "neutral" : "negative";
            }

            const templates = contextTemplates[sentiment];
            context = templates[Math.floor(rng() * templates.length)].replace(
              "{brand}",
              brand
            );
          }

          return {
            brand,
            mentioned,
            position: mentioned ? idx + 1 : null,
            sentiment,
            context,
          };
        });

        const result: QueryResult = {
          query,
          model,
          sampleIndex: sampleIdx,
          mentions,
          totalBrandsMentioned: mentions.filter((m) => m.mentioned).length,
          responseSnippet: generateResponseSnippet(query, mentions, model),
        };

        queryResults.push(result);
      }
    }
  }

  // Compute brand stats
  const brandStats: BrandStats[] = allBrands.map((brand) => {
    const allMentions = queryResults.flatMap((qr) =>
      qr.mentions.filter((m) => m.brand === brand)
    );
    const mentionedResults = allMentions.filter((m) => m.mentioned);

    const mentionRate = mentionedResults.length / allMentions.length;
    const positions = mentionedResults
      .map((m) => m.position)
      .filter((p): p is number => p !== null);
    const avgPosition =
      positions.length > 0
        ? positions.reduce((a, b) => a + b, 0) / positions.length
        : null;

    const sentimentBreakdown = {
      positive: mentionedResults.filter((m) => m.sentiment === "positive").length,
      neutral: mentionedResults.filter((m) => m.sentiment === "neutral").length,
      negative: mentionedResults.filter((m) => m.sentiment === "negative").length,
    };

    const modelBreakdown = {} as Record<
      ModelId,
      { mentionRate: number; avgPosition: number | null }
    >;

    for (const model of config.models) {
      const modelMentions = queryResults
        .filter((qr) => qr.model === model)
        .flatMap((qr) => qr.mentions.filter((m) => m.brand === brand));
      const modelMentioned = modelMentions.filter((m) => m.mentioned);
      const modelPositions = modelMentioned
        .map((m) => m.position)
        .filter((p): p is number => p !== null);

      modelBreakdown[model] = {
        mentionRate: modelMentioned.length / modelMentions.length,
        avgPosition:
          modelPositions.length > 0
            ? modelPositions.reduce((a, b) => a + b, 0) / modelPositions.length
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

  // Sort by mention rate descending
  brandStats.sort((a, b) => b.mentionRate - a.mentionRate);

  // Compute model-level stats
  const modelStats = {} as Record<
    ModelId,
    { avgBrandsMentioned: number; targetMentionRate: number }
  >;

  for (const model of config.models) {
    const modelResults = queryResults.filter((qr) => qr.model === model);
    const avgBrands =
      modelResults.reduce((sum, qr) => sum + qr.totalBrandsMentioned, 0) /
      modelResults.length;
    const targetMentions = modelResults.filter((qr) =>
      qr.mentions.some(
        (m) => m.brand === config.targetBrand && m.mentioned
      )
    );

    modelStats[model] = {
      avgBrandsMentioned: avgBrands,
      targetMentionRate: targetMentions.length / modelResults.length,
    };
  }

  return {
    id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    config,
    queryResults,
    brandStats,
    modelStats,
  };
}

// Default industry presets
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
    competitors: ["Salesforce", "Pipedrive", "Zoho CRM", "Monday.com", "Freshsales"],
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
    competitors: ["Monday.com", "ClickUp", "Notion", "Trello", "Jira", "Linear"],
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
    competitors: ["ConvertKit", "ActiveCampaign", "Brevo", "Klaviyo", "Constant Contact"],
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
    competitors: ["Netlify", "AWS", "DigitalOcean", "Cloudflare Pages", "Railway"],
    queries: [
      "Best hosting for Next.js applications",
      "Which web hosting is fastest?",
      "Best cloud hosting for developers",
      "Cheapest hosting for web apps",
      "Hosting platform comparison for startups",
    ],
  },
];

// Storage helpers
const STORAGE_KEY = "bitsy-simulation-history";

export function saveSimulationResult(result: SimulationResult): void {
  if (typeof window === "undefined") return;
  const existing = getSimulationHistory();
  existing.unshift(result);
  // Keep last 20
  const trimmed = existing.slice(0, 20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function getSimulationHistory(): SimulationResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SimulationResult[];
  } catch {
    return [];
  }
}

export function clearSimulationHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
