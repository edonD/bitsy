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
  // 14 FEATURE_NAMES from engine.py + 7 optional CONTENT_FEATURE_NAMES
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
    // Optional content features (from URL analysis, target brand only)
    statistics_density: v.optional(v.number()),
    quotation_count: v.optional(v.number()),
    citation_count: v.optional(v.number()),
    content_length: v.optional(v.number()),
    readability_grade: v.optional(v.number()),
    freshness_days: v.optional(v.number()),
    heading_count: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_brand", ["brand"])
    .index("by_date_brand", ["date", "brand"]),

  // Training data rows (same schema as brand_signals, accumulated over days)
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
    // Optional content features
    statistics_density: v.optional(v.number()),
    quotation_count: v.optional(v.number()),
    citation_count: v.optional(v.number()),
    content_length: v.optional(v.number()),
    readability_grade: v.optional(v.number()),
    freshness_days: v.optional(v.number()),
    heading_count: v.optional(v.number()),
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
    mode: v.optional(v.string()),  // "memory" | "search"
    prompt_sent: v.string(),
    raw_response: v.optional(v.string()),
    parsed_brands: v.optional(v.any()),
    sources: v.optional(v.array(v.string())),  // cited URLs in search mode
    status: v.string(),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_model", ["model"]),

  // Verify — change log. One row per content change a user ships; used to
  // compute predicted-vs-actual 14+ days later.
  change_log: defineTable({
    date: v.string(),                       // YYYY-MM-DD the change shipped
    brand: v.string(),
    feature: v.string(),                    // gap-analysis feature key
    description: v.string(),                // human-readable: "added 12 stats to homepage"
    shipped_at: v.number(),                 // Unix ms
    predicted_lift: v.optional(v.number()), // pp (from the playbook), optional
    baseline_rate: v.optional(v.number()),  // mention_rate at shipped_at, for later attribution
    context: v.optional(v.any()),           // URL, word count, before/after snippet, etc.
    createdAt: v.number(),
  })
    .index("by_brand", ["brand"])
    .index("by_date", ["date"]),

  // Saved Execute playbooks per brand. So users can ship-then-review.
  playbook_artifacts: defineTable({
    date: v.string(),
    brand: v.string(),
    feature: v.string(),
    payload: v.any(),  // full playbook JSON at save time
    createdAt: v.number(),
  })
    .index("by_brand", ["brand"])
    .index("by_date", ["date"]),

  // Daily Cloudflare Browser Run usage tracker — enforces the $5/mo budget.
  browser_usage_daily: defineTable({
    date: v.string(),                       // YYYY-MM-DD
    seconds_used: v.number(),
    request_count: v.number(),
    last_updated: v.number(),
  }).index("by_date", ["date"]),

  // Waitlist signups
  waitlist: defineTable({
    email: v.string(),
    source: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_email", ["email"]),
});
