// Logic ported from the source app — deterministic engine report.

const PRESETS = [
  {
    label: "AI SaaS",
    brand: "Bitsy",
    description: "AI search visibility platform for B2B brands.",
    website: "https://bitsy.ai",
    competitors: "Profound, Peec AI, Otterly, AthenaHQ",
    queries: "Best AI search visibility tool\nHow to rank higher in ChatGPT answers\nBest GEO tools for brands\nWhich tool tracks AI brand mentions",
  },
  {
    label: "Fashion",
    brand: "Zalando",
    description: "Online fashion and lifestyle retailer in Europe.",
    website: "https://zalando.com",
    competitors: "ASOS, H&M, About You, Zara",
    queries: "Best online fashion store in Europe\nWhere to buy sustainable clothes online\nBest sneaker marketplace",
  },
  {
    label: "CRM",
    brand: "HubSpot",
    description: "CRM and marketing platform for growing businesses.",
    website: "https://hubspot.com",
    competitors: "Salesforce, Pipedrive, Zoho CRM, Monday",
    queries: "Best CRM for small business\nBest free CRM tools\nTop sales CRM for growing teams",
  },
];

const STAGES = [
  { name: "Understand your brand",    detail: "What you do, who you serve" },
  { name: "Ask the AI assistants",    detail: "ChatGPT, Claude, Gemini" },
  { name: "See who else gets named",  detail: "How often, in what order" },
  { name: "Find what’s missing",       detail: "Reviews, mentions, fresh content" },
  { name: "Suggest what to fix",      detail: "Ranked by likely impact" },
];

const LOOP_TABS = [
  { id: "target",   step: "01", label: "Target",   description: "Set the market frame" },
  { id: "observe",  step: "02", label: "Observe",  description: "Measure model answers" },
  { id: "simulate", step: "03", label: "Simulate", description: "Test a change" },
  { id: "execute",  step: "04", label: "Execute",  description: "Ship the assets" },
  { id: "verify",   step: "05", label: "Verify",   description: "Lift vs reality" },
];

const MODEL_DEFS = [
  { key: "chatgpt", label: "ChatGPT", color: "#3a7a64", searchBias: 5 },
  { key: "claude",  label: "Claude",  color: "#a8612e", searchBias: 1 },
  { key: "gemini",  label: "Gemini",  color: "#4f6b94", searchBias: 8 },
];

const DEFAULT_SCENARIO = {
  citations: 5,
  statistics: 8,
  expertQuotes: 3,
  freshness: 18,
  comparisonDepth: 4,
  thirdPartyMentions: 2,
};

function splitItems(value) {
  return value.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
}
function pct(value, digits = 0) { return `${value.toFixed(digits)}%`; }
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function hash(input) {
  let v = 0;
  for (let i = 0; i < input.length; i += 1) v = ((v * 31 + input.charCodeAt(i)) | 0);
  return Math.abs(v);
}
function inferIntent(q) {
  const s = q.toLowerCase();
  if (s.includes("best") || s.includes("top") || s.includes("compare")) return "Comparison";
  if (s.includes("how") || s.includes("rank")) return "Education";
  if (s.includes("price") || s.includes("cost")) return "Pricing";
  return "Recommendation";
}
function getMove(query) {
  const intent = inferIntent(query);
  if (intent === "Comparison") return "Publish a comparison page with proof, pricing, and alternatives.";
  if (intent === "Education") return "Publish a tactical guide that answers the query directly.";
  if (intent === "Pricing") return "Expose pricing, limits, and use-case fit in one concise page.";
  return "Create an answer page with third-party citations and clear category language.";
}

function makeBrandRows(brand, competitors, queries, website, mode) {
  const names = [brand, ...competitors].filter(Boolean);
  const querySignal = Math.min(24, queries.length * 5);
  const websiteBoost = website.startsWith("http") ? 5 : 0;
  const modeBoost = mode === "search" ? 5 : mode === "memory" ? -2 : 2;
  const targetBase = 22 + querySignal + websiteBoost + modeBoost - Math.min(18, competitors.length * 3);

  const raw = names.map((name, index) => {
    const isTarget = index === 0;
    const competitiveBias = isTarget ? 0 : 8 + (hash(name) % 22);
    const noise = (hash(`${name}:${queries.join("|")}:${mode}`) % 17) - 8;
    const mentionRate = clamp(targetBase + competitiveBias + noise, 7, 94);
    const avgPosition = clamp(6.2 - mentionRate / 22 + (hash(name) % 8) / 10, 1.1, 7.8);
    const sentiment = clamp(36 + mentionRate / 2.4 + (hash(`${name}:sentiment`) % 17) - 8, -40, 92);
    return { brand: name, mentionRate, avgPosition, sentiment, shareOfVoice: 0, rank: 0, isTarget };
  });
  const total = raw.reduce((s, r) => s + r.mentionRate, 0) || 1;
  return raw
    .map((r) => ({ ...r, shareOfVoice: (r.mentionRate / total) * 100 }))
    .sort((a, b) => b.mentionRate - a.mentionRate)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

function makeQueryScores(brand, competitors, queries, baseline) {
  const safe = competitors.length ? competitors : ["Category leader"];
  return queries.map((query) => {
    const competitor = safe[hash(query) % safe.length];
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

function makeSourceGaps(brand, baseline) {
  const base = hash(brand);
  return [
    {
      label: "Third-party citations",
      status: baseline > 62 ? "good" : baseline > 38 ? "thin" : "missing",
      current: 1 + (base % 4), target: 6,
      note: "AI answers prefer independent sources over owned pages.",
    },
    {
      label: "Comparison coverage",
      status: baseline > 58 ? "good" : "thin",
      current: 2 + (base % 3), target: 5,
      note: "Buyer prompts often ask for alternatives and shortlists.",
    },
    {
      label: "Fresh proof",
      status: base % 3 === 0 ? "missing" : "thin",
      current: 12 + (base % 41), target: 14,
      note: "Updated proof blocks are easier for grounded systems to reuse.",
    },
  ];
}

function makeActions(brand, weakestQuery, dominantCompetitor, gaps) {
  const citationGap = gaps[0];
  const competitor = dominantCompetitor?.brand ?? "the category leader";
  return [
    {
      id: "answer-page",
      title: `Own "${weakestQuery.query}"`,
      why: weakestQuery.recommendedMove,
      lift: Math.max(8, Math.round(weakestQuery.gap / 2) + 8),
      effort: "medium", confidence: "high",
      steps: [
        "Write the answer in the first 120 words.",
        `Name ${brand} and ${competitor} in a factual comparison table.`,
        "Add pricing, fit, proof, and limitations so the model can quote specifics.",
      ],
      evidence: "Best/compare prompts reward explicit category pages over generic homepages.",
    },
    {
      id: "citations",
      title: `Close the ${citationGap.label.toLowerCase()} gap`,
      why: `Current estimate is ${citationGap.current}; target is ${citationGap.target}.`,
      lift: 12, effort: "high", confidence: "high",
      steps: [
        "Pitch two niche review sites with a clear category angle.",
        "Create one benchmark or original stat others can cite.",
        "Add a source list to the page so grounded models can verify claims.",
      ],
      evidence: "Third-party mentions are reused more than owned copy in AI recommendations.",
    },
    {
      id: "proof-refresh",
      title: "Refresh the proof block",
      why: "Grounded answers need current numbers, named customers, and exact evidence.",
      lift: 7, effort: "low", confidence: "medium",
      steps: [
        "Update the page date and add a visible changelog line.",
        "Add three concrete numbers: customers, coverage, or benchmark results.",
        "Replace vague claims with source-backed sentences.",
      ],
      evidence: "Freshness and concrete claims make pages easier to retrieve and cite.",
    },
  ];
}

function createEngineReport({ brand, description, website, competitorsText, queriesText, mode }) {
  const targetBrand = brand.trim() || "Your brand";
  const competitors = splitItems(competitorsText).slice(0, 8);
  const queries = splitItems(queriesText).slice(0, 8);
  const safeQueries = queries.length > 0 ? queries : ["best solution in this category"];
  const leaderboard = makeBrandRows(targetBrand, competitors, safeQueries, website.trim(), mode);
  const target = leaderboard.find((r) => r.isTarget) ?? leaderboard[0];
  const dominantCompetitor = leaderboard.find((r) => !r.isTarget) ?? null;
  const baseline = target.mentionRate;
  const queryScores = makeQueryScores(targetBrand, competitors, safeQueries, baseline);
  const weakestQuery = [...queryScores].sort((a, b) => a.targetRate - b.targetRate)[0];
  const sourceGaps = makeSourceGaps(targetBrand, baseline);
  const actions = makeActions(targetBrand, weakestQuery, dominantCompetitor, sourceGaps);
  const modesPerQuery = mode === "balanced" ? 2 : 1;
  const confidence =
    queries.length >= 3 && competitors.length >= 3 && website.startsWith("http")
      ? "high"
      : queries.length >= 2
      ? "medium"
      : "low";

  return {
    brand: targetBrand, description: (description || "").trim(), website, competitors, queries,
    calls: safeQueries.length * MODEL_DEFS.length * modesPerQuery * 2,
    baseline, confidence,
    target, leaderboard,
    models: MODEL_DEFS.map((model) => {
      const modelBoost = mode === "search" ? model.searchBias : mode === "memory" ? -model.searchBias / 2 : model.searchBias / 3;
      const mentionRate = clamp(baseline + modelBoost + (hash(`${targetBrand}:${model.key}`) % 15) - 7, 4, 98);
      return {
        key: model.key, label: model.label, color: model.color,
        mentionRate,
        avgPosition: clamp(6 - mentionRate / 24, 1, 7),
        sentiment: clamp(42 + mentionRate / 2, -20, 95),
        sourceReliance: clamp(38 + model.searchBias * 5 + (hash(`${model.key}:sources`) % 14), 20, 92),
        confidence,
      };
    }),
    queryScores, sourceGaps, actions,
    readiness: [
      { label: "Brand name", ready: Boolean(brand.trim()), note: "So we know what to look for." },
      { label: "Website", ready: website.startsWith("http"), note: "So we know what you actually do." },
      { label: "At least 2 competitors", ready: competitors.length >= 2, note: "So we can rank you against them." },
      { label: "At least 3 buyer questions", ready: queries.length >= 3, note: "So the picture isn’t skewed by one question." },
    ],
    weakestQuery, dominantCompetitor,
  };
}

function getSimulationOutcome(report, controls) {
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
      18, 94,
    ),
  );
  const drivers = [
    { label: "third-party mentions", value: controls.thirdPartyMentions * 2.75 },
    { label: "comparison depth",     value: controls.comparisonDepth * 2.1 },
    { label: "expert quotes",        value: controls.expertQuotes * 1.35 },
    { label: "citations",            value: controls.citations * 1.15 },
    { label: "statistics",           value: controls.statistics * 0.72 },
  ].sort((a, b) => b.value - a.value);
  return {
    baseline: Math.round(report.baseline),
    predicted,
    lift: predicted - Math.round(report.baseline),
    confidence: report.confidence === "high" && controls.thirdPartyMentions > 0 ? "high" : "medium",
    intervalLow: Math.max(0, predicted - 4),
    intervalHigh: Math.min(100, predicted + 5),
    pressure, controllability,
    topDriver: drivers[0]?.label ?? "citations",
  };
}

Object.assign(window, {
  PRESETS, STAGES, LOOP_TABS, MODEL_DEFS, DEFAULT_SCENARIO,
  createEngineReport, getSimulationOutcome, pct, clamp, splitItems,
});
