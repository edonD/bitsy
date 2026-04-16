import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const signalFields = {
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

export const store = mutation({
  args: { records: v.array(v.object(signalFields)) },
  handler: async (ctx, args) => {
    const ids = [];
    for (const record of args.records) {
      const id = await ctx.db.insert("brand_signals", {
        ...record,
        createdAt: Date.now(),
      });
      ids.push(id);
    }
    return ids;
  },
});

export const getByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("brand_signals")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();
  },
});

export const getByBrand = query({
  args: { brand: v.string(), days: v.number() },
  handler: async (ctx, args) => {
    const start = new Date();
    start.setDate(start.getDate() - args.days);
    const startStr = start.toISOString().split("T")[0];

    return await ctx.db
      .query("brand_signals")
      .withIndex("by_brand", (q) => q.eq("brand", args.brand))
      .filter((q) => q.gte(q.field("date"), startStr))
      .collect();
  },
});

export const getLatest = query({
  args: { brand: v.string() },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("brand_signals")
      .withIndex("by_brand", (q) => q.eq("brand", args.brand))
      .order("desc")
      .take(1);
    return results[0] ?? null;
  },
});
