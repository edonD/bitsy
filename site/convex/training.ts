import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const sampleFields = {
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
};

// Store training samples (one per brand per day)
export const storeSamples = mutation({
  args: { records: v.array(v.object(sampleFields)) },
  handler: async (ctx, args) => {
    const ids = [];
    for (const record of args.records) {
      const id = await ctx.db.insert("training_samples", {
        ...record,
        createdAt: Date.now(),
      });
      ids.push(id);
    }
    return ids;
  },
});

// Get ALL training samples (for model training)
export const getAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("training_samples").collect();
  },
});

// Get samples by date
export const getByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("training_samples")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();
  },
});

// Get samples by brand
export const getByBrand = query({
  args: { brand: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("training_samples")
      .withIndex("by_brand", (q) => q.eq("brand", args.brand))
      .collect();
  },
});

// Store a training run result
export const storeRun = mutation({
  args: {
    date: v.string(),
    r2_score: v.number(),
    rmse: v.number(),
    mae: v.number(),
    num_samples: v.number(),
    feature_importance: v.any(),
    model_version: v.number(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("training_runs", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Get latest training run
export const getLatestRun = query({
  handler: async (ctx) => {
    const results = await ctx.db
      .query("training_runs")
      .order("desc")
      .take(1);
    return results[0] ?? null;
  },
});

// Get all training runs
export const getAllRuns = query({
  handler: async (ctx) => {
    return await ctx.db.query("training_runs").order("desc").take(100);
  },
});
