import { MODEL_DEFS } from "./data";
import type {
  ActionItem,
  BrandRow,
  EngineReport,
  Mode,
  QueryScore,
  ScenarioControls,
  SimulationOutcome,
  SourceGap,
} from "./types";

export function splitItems(value: string) {
  return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}

export function pct(value: number, digits = 0) {
  return `${value.toFixed(digits)}%`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export const DEFAULT_SCENARIO: ScenarioControls = {
  citations: 5,
  statistics: 8,
  expertQuotes: 3,
  freshness: 18,
  comparisonDepth: 4,
  thirdPartyMentions: 2,
};

function hash(input: string) {
  let value = 0;
  for (let index = 0; index < input.length; index += 1) {
    value = (value * 31 + input.charCodeAt(index)) | 0;
  }
  return Math.abs(value);
}

function inferIntent(query: string) {
  const q = query.toLowerCase();
  if (q.includes("best") || q.includes("top") || q.includes("compare")) return "Comparison";
  if (q.includes("how") || q.includes("rank")) return "Education";
  if (q.includes("price") || q.includes("cost")) return "Pricing";
  return "Recommendation";
}

function getMove(query: string) {
  const intent = inferIntent(query);
  if (intent === "Comparison") return "Publish a comparison page with proof, pricing, and alternatives.";
  if (intent === "Education") return "Publish a tactical guide that answers the query directly.";
  if (intent === "Pricing") return "Expose pricing, limits, and use-case fit in one concise page.";
  return "Create an answer page with third-party citations and clear category language.";
}

function makeBrandRows(brand: string, competitors: string[], queries: string[], website: string, mode: Mode) {
  const names = [brand, ...competitors].filter(Boolean);
  const querySignal = Math.min(24, queries.length * 5);
  const websiteBoost = website.startsWith("http") ? 5 : 0;
  const modeBoost = mode === "search" ? 5 : mode === "memory" ? -2 : 2;
  const targetBase = 22 + querySignal + websiteBoost + modeBoost - Math.min(18, competitors.length * 3);

  const rawRows = names.map((name, index) => {
    const isTarget = index === 0;
    const competitiveBias = isTarget ? 0 : 8 + (hash(name) % 22);
    const noise = (hash(`${name}:${queries.join("|")}:${mode}`) % 17) - 8;
    const mentionRate = clamp(targetBase + competitiveBias + noise, 7, 94);
    const avgPosition = clamp(6.2 - mentionRate / 22 + (hash(name) % 8) / 10, 1.1, 7.8);
    const sentiment = clamp(36 + mentionRate / 2.4 + (hash(`${name}:sentiment`) % 17) - 8, -40, 92);
    return {
      brand: name,
      mentionRate,
      avgPosition,
      sentiment,
      shareOfVoice: 0,
      rank: 0,
      isTarget,
    };
  });

  const total = rawRows.reduce((sum, row) => sum + row.mentionRate, 0) || 1;
  return rawRows
    .map((row) => ({ ...row, shareOfVoice: (row.mentionRate / total) * 100 }))
    .sort((a, b) => b.mentionRate - a.mentionRate)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function makeQueryScores(brand: string, competitors: string[], queries: string[], baseline: number): QueryScore[] {
  const safeCompetitors = competitors.length > 0 ? competitors : ["Category leader"];
  return queries.map((query) => {
    const competitor = safeCompetitors[hash(query) % safeCompetitors.length];
    const targetRate = clamp(baseline + (hash(`${query}:${brand}`) % 25) - 12, 4, 94);
    const winnerRate = clamp(targetRate + (hash(`${query}:${competitor}`) % 28) - 8, 8, 96);
    const targetRank = winnerRate > targetRate ? 2 + (hash(`${query}:rank`) % 3) : 1;
    return {
      query,
      intent: inferIntent(query),
      targetRate,
      targetRank,
      winner: winnerRate > targetRate ? competitor : brand,
      gap: Math.max(0, winnerRate - targetRate),
      recommendedMove: getMove(query),
    };
  });
}

function makeSourceGaps(brand: string, baseline: number): SourceGap[] {
  const base = hash(brand);
  return [
    {
      label: "Third-party citations",
      status: baseline > 62 ? "good" : baseline > 38 ? "thin" : "missing",
      current: 1 + (base % 4),
      target: 6,
      note: "AI answers prefer independent sources over owned pages for brand recommendations.",
    },
    {
      label: "Comparison coverage",
      status: baseline > 58 ? "good" : "thin",
      current: 2 + (base % 3),
      target: 5,
      note: "Buyer prompts often ask for alternatives, rankings, and shortlists.",
    },
    {
      label: "Fresh proof",
      status: base % 3 === 0 ? "missing" : "thin",
      current: 12 + (base % 41),
      target: 14,
      note: "Fresh pages and updated proof blocks are easier for grounded systems to reuse.",
    },
  ];
}

function makeActions(brand: string, weakestQuery: QueryScore, dominantCompetitor: BrandRow | null, sourceGaps: SourceGap[]): ActionItem[] {
  const citationGap = sourceGaps[0];
  const competitor = dominantCompetitor?.brand ?? "the category leader";
  return [
    {
      id: "answer-page",
      title: `Own "${weakestQuery.query}"`,
      why: weakestQuery.recommendedMove,
      lift: Math.max(8, Math.round(weakestQuery.gap / 2) + 8),
      effort: "medium",
      confidence: "high",
      steps: [
        "Write the answer in the first 120 words.",
        `Name ${brand} and ${competitor} in a factual comparison table.`,
        "Add pricing, fit, proof, and limitations so the model can quote specifics.",
      ],
      evidence: "Best/compare prompts usually reward explicit category pages over generic homepages.",
    },
    {
      id: "citations",
      title: `Close the ${citationGap.label.toLowerCase()} gap`,
      why: `Current estimate is ${citationGap.current}; target is ${citationGap.target}.`,
      lift: 12,
      effort: "high",
      confidence: "high",
      steps: [
        "Pitch two niche review sites with a clear category angle.",
        "Create one benchmark or original stat others can cite.",
        "Add a source list to the page so search-grounded models can verify claims.",
      ],
      evidence: "Third-party mentions are often reused more than owned copy in AI recommendations.",
    },
    {
      id: "proof-refresh",
      title: "Refresh the proof block",
      why: "Grounded answers need current numbers, named customers, and exact evidence.",
      lift: 7,
      effort: "low",
      confidence: "medium",
      steps: [
        "Update the page date and add a visible changelog line.",
        "Add three concrete numbers: customers, coverage, or benchmark results.",
        "Replace vague claims with source-backed sentences.",
      ],
      evidence: "Freshness and concrete claims make pages easier to retrieve and cite.",
    },
  ];
}

export function createEngineReport({
  brand,
  website,
  competitorsText,
  queriesText,
  mode,
}: {
  brand: string;
  website: string;
  competitorsText: string;
  queriesText: string;
  mode: Mode;
}): EngineReport {
  const targetBrand = brand.trim() || "Your brand";
  const competitors = splitItems(competitorsText).slice(0, 8);
  const queries = splitItems(queriesText).slice(0, 8);
  const safeQueries = queries.length > 0 ? queries : ["best solution in this category"];
  const leaderboard = makeBrandRows(targetBrand, competitors, safeQueries, website.trim(), mode);
  const target = leaderboard.find((row) => row.isTarget) ?? leaderboard[0];
  const dominantCompetitor = leaderboard.find((row) => !row.isTarget) ?? null;
  const baseline = target.mentionRate;
  const queryScores = makeQueryScores(targetBrand, competitors, safeQueries, baseline);
  const weakestQuery = [...queryScores].sort((a, b) => a.targetRate - b.targetRate)[0];
  const sourceGaps = makeSourceGaps(targetBrand, baseline);
  const actions = makeActions(targetBrand, weakestQuery, dominantCompetitor, sourceGaps);
  const modesPerQuery = mode === "balanced" ? 2 : 1;
  const confidence = queries.length >= 3 && competitors.length >= 3 && website.startsWith("http") ? "high" : queries.length >= 2 ? "medium" : "low";

  return {
    brand: targetBrand,
    website,
    competitors,
    queries,
    calls: safeQueries.length * MODEL_DEFS.length * modesPerQuery * 2,
    baseline,
    confidence,
    target,
    leaderboard,
    models: MODEL_DEFS.map((model) => {
      const modelBoost = mode === "search" ? model.searchBias : mode === "memory" ? -model.searchBias / 2 : model.searchBias / 3;
      const mentionRate = clamp(baseline + modelBoost + (hash(`${targetBrand}:${model.key}`) % 15) - 7, 4, 98);
      return {
        key: model.key,
        label: model.label,
        color: model.color,
        mentionRate,
        avgPosition: clamp(6 - mentionRate / 24, 1, 7),
        sentiment: clamp(42 + mentionRate / 2, -20, 95),
        sourceReliance: clamp(38 + model.searchBias * 5 + (hash(`${model.key}:sources`) % 14), 20, 92),
        confidence,
      };
    }),
    queryScores,
    sourceGaps,
    actions,
    readiness: [
      { label: "Brand named", ready: Boolean(brand.trim()), note: "Needed for entity matching." },
      { label: "Website URL", ready: website.startsWith("http"), note: "Needed for content and source checks." },
      { label: "Competitors", ready: competitors.length >= 2, note: "Use at least two competitors for ranking context." },
      { label: "Buyer questions", ready: queries.length >= 3, note: "Three or more prompts gives a better market frame." },
    ],
    weakestQuery,
    dominantCompetitor,
  };
}

export function getSimulationOutcome(
  report: EngineReport,
  controls: ScenarioControls,
): SimulationOutcome {
  const lift =
    controls.citations * 1.15 +
    controls.statistics * 0.72 +
    controls.expertQuotes * 1.35 +
    controls.comparisonDepth * 2.1 +
    controls.thirdPartyMentions * 2.75 +
    Math.max(0, 30 - controls.freshness) * 0.18;
  const cappedLift = Math.round(clamp(lift, 2, 34));
  const predicted = Math.round(clamp(report.baseline + cappedLift, 4, 98));
  const pressure = Math.round(clamp(100 - report.target.shareOfVoice + (report.dominantCompetitor ? 8 : 0), 12, 96));
  const controllability = Math.round(
    clamp(
      42 +
        controls.citations * 2 +
        controls.statistics +
        controls.comparisonDepth * 4 +
        controls.thirdPartyMentions * 3,
      18,
      94,
    ),
  );
  const drivers = [
    { label: "third-party mentions", value: controls.thirdPartyMentions * 2.75 },
    { label: "comparison depth", value: controls.comparisonDepth * 2.1 },
    { label: "expert quotes", value: controls.expertQuotes * 1.35 },
    { label: "citations", value: controls.citations * 1.15 },
    { label: "statistics", value: controls.statistics * 0.72 },
  ].sort((a, b) => b.value - a.value);

  return {
    baseline: Math.round(report.baseline),
    predicted,
    lift: predicted - Math.round(report.baseline),
    confidence: report.confidence === "high" && controls.thirdPartyMentions > 0 ? "high" : "medium",
    intervalLow: Math.max(0, predicted - 4),
    intervalHigh: Math.min(100, predicted + 5),
    pressure,
    controllability,
    topDriver: drivers[0]?.label ?? "citations",
  };
}
