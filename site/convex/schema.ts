import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Raw LLM API observations (one row per brand per query per model per sample)
  mention_records: defineTable({
    date: v.string(),
    brand: v.string(),
    model: v.string(),
    query: v.string(),
    sample: v.number(),
    mentioned: v.boolean(),
    position: v.optional(v.number()),
    sentiment: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_brand", ["brand"])
    .index("by_date_brand", ["date", "brand"]),

  // Aggregated brand features per day (one row per brand per day)
  // These 14 features match engine.py FEATURE_NAMES exactly
  brand_signals: defineTable({
    date: v.string(),
    brand: v.string(),
    mention_rate: v.number(),
    avg_position: v.number(),
    top1_rate: v.number(),
    top3_rate: v.number(),
    position_std: v.number(),
    positive_rate: v.number(),
    negative_rate: v.number(),
    net_sentiment: v.number(),
    competitor_avg_rate: v.number(),
    vs_best_competitor: v.number(),
    brands_ahead: v.number(),
    share_of_mentions: v.number(),
    model_agreement: v.number(),
    model_spread: v.number(),
    query_coverage: v.number(),
    createdAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_brand", ["brand"])
    .index("by_date_brand", ["date", "brand"]),

  // Training data rows (same features as brand_signals, accumulated over days)
  training_samples: defineTable({
    date: v.string(),
    brand: v.string(),
    mention_rate: v.number(),
    avg_position: v.number(),
    top1_rate: v.number(),
    top3_rate: v.number(),
    position_std: v.number(),
    positive_rate: v.number(),
    negative_rate: v.number(),
    net_sentiment: v.number(),
    competitor_avg_rate: v.number(),
    vs_best_competitor: v.number(),
    brands_ahead: v.number(),
    share_of_mentions: v.number(),
    model_agreement: v.number(),
    model_spread: v.number(),
    query_coverage: v.number(),
    createdAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_brand", ["brand"]),

  // Model training run metadata
  training_runs: defineTable({
    date: v.string(),
    r2_score: v.number(),
    rmse: v.number(),
    mae: v.number(),
    num_samples: v.number(),
    feature_importance: v.any(),
    model_version: v.number(),
    status: v.string(),
    createdAt: v.number(),
  }).index("by_date", ["date"]),

  // Pipeline logs
  pipeline_logs: defineTable({
    timestamp: v.string(),
    step: v.string(),
    message: v.string(),
    status: v.string(),
    data: v.any(),
    createdAt: v.number(),
  })
    .index("by_step", ["step"])
    .index("by_timestamp", ["timestamp"]),

  // Raw API call logs (prompt sent, response received)
  api_logs: defineTable({
    date: v.string(),
    query: v.string(),
    model: v.string(),
    sample: v.number(),
    prompt_sent: v.string(),
    raw_response: v.optional(v.string()),
    parsed_brands: v.optional(v.any()),
    status: v.string(),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_model", ["model"]),
});
