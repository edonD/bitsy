export type EngineState = "idle" | "running" | "complete";
export type Mode = "balanced" | "memory" | "search";
export type ModelKey = "chatgpt" | "claude" | "gemini";
export type EngineTab = "target" | "observe" | "simulate" | "execute" | "verify";

export interface Preset {
  label: string;
  brand: string;
  website: string;
  competitors: string;
  queries: string;
}

export interface BrandRow {
  brand: string;
  mentionRate: number;
  avgPosition: number;
  shareOfVoice: number;
  sentiment: number;
  rank: number;
  isTarget: boolean;
}

export interface ModelScore {
  key: ModelKey;
  label: string;
  color: string;
  mentionRate: number;
  avgPosition: number;
  sentiment: number;
  sourceReliance: number;
  confidence: "low" | "medium" | "high";
}

export interface QueryScore {
  query: string;
  intent: string;
  targetRate: number;
  targetRank: number;
  winner: string;
  gap: number;
  recommendedMove: string;
}

export interface SourceGap {
  label: string;
  status: "missing" | "thin" | "good";
  current: number;
  target: number;
  note: string;
}

export interface ActionItem {
  id: string;
  title: string;
  why: string;
  lift: number;
  effort: "low" | "medium" | "high";
  confidence: "medium" | "high";
  steps: string[];
  evidence: string;
}

export interface ScenarioControls {
  citations: number;
  statistics: number;
  expertQuotes: number;
  freshness: number;
  comparisonDepth: number;
  thirdPartyMentions: number;
}

export interface SimulationOutcome {
  baseline: number;
  predicted: number;
  lift: number;
  confidence: "medium" | "high";
  intervalLow: number;
  intervalHigh: number;
  pressure: number;
  controllability: number;
  topDriver: string;
}

export interface ReadinessItem {
  label: string;
  ready: boolean;
  note: string;
}

export interface EngineReport {
  brand: string;
  website: string;
  competitors: string[];
  queries: string[];
  calls: number;
  baseline: number;
  confidence: "low" | "medium" | "high";
  target: BrandRow;
  leaderboard: BrandRow[];
  models: ModelScore[];
  queryScores: QueryScore[];
  sourceGaps: SourceGap[];
  actions: ActionItem[];
  readiness: ReadinessItem[];
  weakestQuery: QueryScore;
  dominantCompetitor: BrandRow | null;
}
