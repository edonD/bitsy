import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Mention records from LLM API calls
  mention_records: defineTable({
    date: v.string(), // YYYY-MM-DD
    brand: v.string(),
    model: v.string(), // claude, gpt-4, gemini, llama
    query_id: v.string(), // query_001, query_002, etc
    mentioned: v.boolean(), // Was brand mentioned in this LLM response?
    mention_rate: v.number(), // Daily mention rate (0-100)
    createdAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_brand", ["brand"])
    .index("by_date_brand", ["date", "brand"]),

  // Brand signals collected daily
  brand_signals: defineTable({
    date: v.string(), // YYYY-MM-DD
    brand: v.string(),
    freshness_days: v.number(), // Days since last mention
    authority_count: v.number(), // Gartner, G2, Capterra, Wikipedia, Forbes, TechCrunch
    domain_authority: v.number(), // Moz DA score (0-100)
    num_queries: v.number(), // How many different queries mentioned brand
    market_share: v.number(), // 0-1 (brand mentions / total competitor mentions)
    content_age_days: v.number(), // Average age of blog posts
    competitor_rank: v.number(), // Rank vs competitors
    schema_markup_score: v.number(), // 0-1 (schema.org implementation)
    createdAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_brand", ["brand"])
    .index("by_date_brand", ["date", "brand"]),

  // Training data (assembled from mentions + signals)
  training_samples: defineTable({
    date: v.string(),
    brand: v.string(),
    mention_rate: v.number(), // Target variable
    // Features
    freshness_days: v.number(),
    authority_count: v.number(),
    domain_authority: v.number(),
    num_queries: v.number(),
    market_share: v.number(),
    content_age_days: v.number(),
    competitor_rank: v.number(),
    schema_markup_score: v.number(),
    createdAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_brand", ["brand"]),

  // Model training runs
  training_runs: defineTable({
    date: v.string(), // YYYY-MM-DD
    r2_score: v.number(),
    rmse: v.number(),
    mae: v.number(),
    num_samples: v.number(),
    feature_importance: v.any(), // JSON object with feature importance
    model_version: v.number(),
    status: v.string(), // "pending", "success", "failed"
    createdAt: v.number(),
  }).index("by_date", ["date"]),

  // Pipeline logs (for transparency)
  pipeline_logs: defineTable({
    timestamp: v.string(),
    step: v.string(), // "1A", "1B", "1C", etc
    message: v.string(),
    status: v.string(), // "pending", "success", "error"
    data: v.any(), // JSON data for this log
    createdAt: v.number(),
  })
    .index("by_step", ["step"])
    .index("by_timestamp", ["timestamp"]),
});
