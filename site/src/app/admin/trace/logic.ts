// Client-side transformations: map incoming logs to cards and compute diffs
// between the memory and search mode calls for the same (model, sample).

import { MODELS } from "./constants";
import type {
  ApiLog,
  BrandObservation,
  CallCard,
  FeatureMatrixRow,
  TraceFeatureRow,
} from "./types";

export function updateCardsFromLogs(
  cards: CallCard[],
  logs: ApiLog[],
  startedAt: number
): CallCard[] {
  const fresh = logs.filter((l) => l._creationTime >= startedAt - 500);
  const byKey = new Map<string, ApiLog>();
  for (const l of fresh) {
    const mode = l.mode || "memory";
    const key = `${l.query}|${l.model}|${l.sample}|${mode}`;
    // Keep the newest log per key
    const existing = byKey.get(key);
    if (!existing || l._creationTime > existing._creationTime) {
      byKey.set(key, l);
    }
  }
  return cards.map((c) => {
    const log = byKey.get(c.key);
    if (!log) return c;
    const state: CallCard["state"] = log.status === "error" ? "error" : "done";
    return { ...c, state, log };
  });
}

export function getTrackedBrands(
  log?: ApiLog
): NonNullable<ApiLog["tracked_brands"]> {
  return log?.tracked_brands ?? [];
}

function normalizeBrand(value: string): string {
  return value.trim().toLowerCase();
}

function getNumericFeature(row: TraceFeatureRow, key: string): number {
  const value = row[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function getBrandObservation(log: ApiLog | undefined, brand: string): BrandObservation {
  const normalizedBrand = normalizeBrand(brand);
  const tracked = getTrackedBrands(log).find(
    (item) => normalizeBrand(item.brand) === normalizedBrand
  );

  if (tracked) {
    return {
      brand,
      mentioned: tracked.mentioned,
      position:
        typeof tracked.position === "number" && Number.isFinite(tracked.position)
          ? tracked.position
          : null,
      sentiment: tracked.sentiment ?? null,
      detectionSource: tracked.detection_source,
      positionConfidence: tracked.position_confidence,
    };
  }

  const parsed = log?.parsed_brands?.brands_mentioned?.find(
    (item) => normalizeBrand(item.brand) === normalizedBrand
  );
  const parserFallback =
    log?.parser_status === "text_fallback" ||
    log?.parser_status === "partial_recovery" ||
    log?.parser_status === "extraction_conflict";

  if (parsed) {
    return {
      brand,
      mentioned: true,
      position:
        typeof parsed.position === "number" && Number.isFinite(parsed.position)
          ? parsed.position
          : null,
      sentiment: parsed.sentiment ?? null,
      detectionSource: parserFallback ? "text" : "json",
      positionConfidence:
        typeof parsed.position === "number"
          ? parserFallback
            ? "estimated"
            : "high"
          : "none",
    };
  }

  return {
    brand,
    mentioned: false,
    position: null,
    sentiment: null,
    detectionSource: "none",
    positionConfidence: "none",
  };
}

export function getModePeer(card: CallCard, cards: CallCard[]): CallCard | undefined {
  const peerMode = card.mode === "memory" ? "search" : "memory";
  return cards.find(
    (candidate) =>
      candidate !== card &&
      candidate.model === card.model &&
      candidate.sample === card.sample &&
      candidate.mode === peerMode
  );
}

export function summarizeModeDiff(card: CallCard, peer?: CallCard) {
  if (!peer || !card.log || !peer.log) return null;

  const currentTracked = getTrackedBrands(card.log);
  const peerTracked = getTrackedBrands(peer.log);
  const peerMap = new Map(peerTracked.map((item) => [item.brand, item]));

  const gained: string[] = [];
  const lost: string[] = [];
  for (const item of currentTracked) {
    const prev = peerMap.get(item.brand);
    if (item.mentioned && !prev?.mentioned) gained.push(item.brand);
    if (!item.mentioned && prev?.mentioned) lost.push(item.brand);
  }

  const currentTop = card.log.parsed_brands?.brands_mentioned?.[0]?.brand ?? null;
  const peerTop = peer.log.parsed_brands?.brands_mentioned?.[0]?.brand ?? null;

  return {
    peerMode: peer.mode,
    gained,
    lost,
    topChanged: currentTop !== peerTop ? { currentTop, peerTop } : null,
    sourceDelta: (card.log.sources?.length ?? 0) - (peer.log.sources?.length ?? 0),
    parserChanged: card.log.parser_status !== peer.log.parser_status,
  };
}

export function buildFeatureMatrixRows({
  features,
  cards,
  target,
  queryCount,
}: {
  features: TraceFeatureRow[];
  cards: CallCard[];
  target: string;
  queryCount: number;
}): FeatureMatrixRow[] {
  const doneCards = cards.filter((card) => card.state === "done" && card.log);
  const expectedCount = cards.length;
  const completedCount = doneCards.length;
  const normalizedTarget = normalizeBrand(target);
  const perModelTotals = Object.fromEntries(
    MODELS.map((model) => [
      model,
      doneCards.filter((card) => card.model === model).length,
    ])
  ) as Record<(typeof MODELS)[number], number>;

  const draftRows = features.map((featureRow) => {
    const brand = String(featureRow.brand);
    const mentionQueries = new Set<string>();
    let mentionCount = 0;
    let positionCount = 0;
    let top1Count = 0;
    let top3Count = 0;
    let sentimentCount = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    let fallbackMentions = 0;
    let estimatedPositions = 0;
    let searchMentions = 0;
    let searchUsedMentions = 0;
    const modelSplits = Object.fromEntries(
      MODELS.map((model) => [
        model,
        {
          model,
          total: perModelTotals[model],
          mentions: 0,
          rate: 0,
        },
      ])
    ) as Record<
      (typeof MODELS)[number],
      FeatureMatrixRow["modelSplits"][number]
    >;

    for (const card of doneCards) {
      const observation = getBrandObservation(card.log, brand);
      if (!observation.mentioned) continue;

      mentionCount += 1;
      mentionQueries.add(card.query);
      modelSplits[card.model as (typeof MODELS)[number]].mentions += 1;

      if (observation.detectionSource === "text") fallbackMentions += 1;
      if (card.mode === "search") {
        searchMentions += 1;
        if (card.log?.search_used) searchUsedMentions += 1;
      }

      if (typeof observation.position === "number") {
        positionCount += 1;
        if (observation.position === 1) top1Count += 1;
        if (observation.position <= 3) top3Count += 1;
        if (observation.positionConfidence === "estimated") {
          estimatedPositions += 1;
        }
      }

      if (observation.sentiment) {
        sentimentCount += 1;
        if (observation.sentiment === "positive") positiveCount += 1;
        if (observation.sentiment === "negative") negativeCount += 1;
      }
    }

    for (const model of MODELS) {
      const split = modelSplits[model];
      split.rate = split.total > 0 ? (split.mentions / split.total) * 100 : 0;
    }

    return {
      brand,
      isTarget: normalizeBrand(brand) === normalizedTarget,
      featureValues: featureRow,
      counts: {
        totalCalls: completedCount,
        mentionCount,
        positionCount,
        top1Count,
        top3Count,
        sentimentCount,
        positiveCount,
        negativeCount,
        totalMentionPool: 0,
        queryHitCount: mentionQueries.size,
        queryCount,
      },
      reliability: {
        completedCount,
        expectedCount,
        completedRate: expectedCount > 0 ? (completedCount / expectedCount) * 100 : 0,
        fallbackMentions,
        fallbackRate: mentionCount > 0 ? (fallbackMentions / mentionCount) * 100 : null,
        estimatedPositions,
        estimatedPositionRate:
          positionCount > 0 ? (estimatedPositions / positionCount) * 100 : null,
        searchMentions,
        searchUsedMentions,
        searchUsedRate:
          searchMentions > 0 ? (searchUsedMentions / searchMentions) * 100 : null,
      },
      modelSplits: MODELS.map((model) => modelSplits[model]),
      gaps: {
        mentionGapToLeader: 0,
        mentionVsTarget: 0,
        positionGapToBest: null,
      },
    };
  });

  const totalMentionPool = draftRows.reduce(
    (sum, row) => sum + row.counts.mentionCount,
    0
  );
  const leaderMentionRate = draftRows.reduce(
    (best, row) => Math.max(best, getNumericFeature(row.featureValues, "mention_rate")),
    0
  );
  const targetMentionRate =
    draftRows.find((row) => row.isTarget)?.featureValues.mention_rate ?? 0;
  const targetMentionRateValue =
    typeof targetMentionRate === "number" ? targetMentionRate : 0;
  const bestAvgPosition = draftRows.reduce<number | null>((best, row) => {
    const avgPosition =
      row.counts.positionCount > 0 ? getNumericFeature(row.featureValues, "avg_position") : 0;
    if (avgPosition <= 0) return best;
    if (best === null) return avgPosition;
    return Math.min(best, avgPosition);
  }, null);

  return draftRows.map((row) => {
    const mentionRate = getNumericFeature(row.featureValues, "mention_rate");
    const avgPosition =
      row.counts.positionCount > 0 ? getNumericFeature(row.featureValues, "avg_position") : 0;
    return {
      ...row,
      counts: {
        ...row.counts,
        totalMentionPool,
      },
      gaps: {
        mentionGapToLeader: leaderMentionRate - mentionRate,
        mentionVsTarget: mentionRate - targetMentionRateValue,
        positionGapToBest:
          avgPosition > 0 && bestAvgPosition !== null ? avgPosition - bestAvgPosition : null,
      },
    };
  });
}
