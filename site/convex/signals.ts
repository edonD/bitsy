import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Store a single brand signal record
export const storeSignalRecord = mutation({
  args: {
    date: v.string(),
    brand: v.string(),
    freshness_days: v.number(),
    authority_count: v.number(),
    domain_authority: v.number(),
    num_queries: v.number(),
    market_share: v.number(),
    content_age_days: v.number(),
    competitor_rank: v.number(),
    schema_markup_score: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("brand_signals", {
      date: args.date,
      brand: args.brand,
      freshness_days: args.freshness_days,
      authority_count: args.authority_count,
      domain_authority: args.domain_authority,
      num_queries: args.num_queries,
      market_share: args.market_share,
      content_age_days: args.content_age_days,
      competitor_rank: args.competitor_rank,
      schema_markup_score: args.schema_markup_score,
      createdAt: Date.now(),
    });
  },
});

// Store multiple signal records at once
export const storeSignalRecords = mutation({
  args: {
    records: v.array(
      v.object({
        date: v.string(),
        brand: v.string(),
        freshness_days: v.number(),
        authority_count: v.number(),
        domain_authority: v.number(),
        num_queries: v.number(),
        market_share: v.number(),
        content_age_days: v.number(),
        competitor_rank: v.number(),
        schema_markup_score: v.number(),
      })
    ),
  },
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

// Get signal for a specific brand on a specific date
export const getSignalByDateBrand = query({
  args: {
    date: v.string(),
    brand: v.string(),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("brand_signals")
      .withIndex("by_date_brand", (q) => q.eq("date", args.date).eq("brand", args.brand))
      .collect();

    return results.length > 0 ? results[0] : null;
  },
});

// Get all signals for a specific date
export const getSignalsByDate = query({
  args: {
    date: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("brand_signals")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();
  },
});

// Get latest signal for a brand
export const getLatestSignal = query({
  args: {
    brand: v.string(),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("brand_signals")
      .withIndex("by_brand", (q) => q.eq("brand", args.brand))
      .order("desc")
      .take(1);

    return results.length > 0 ? results[0] : null;
  },
});

// Get signals for a brand over last N days
export const getSignalsByBrandRecent = query({
  args: {
    brand: v.string(),
    days: v.number(),
  },
  handler: async (ctx, args) => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - args.days);

    const start = startDate.toISOString().split("T")[0];

    return await ctx.db
      .query("brand_signals")
      .withIndex("by_brand", (q) => q.eq("brand", args.brand))
      .filter((q) => q.gte(q.field("date"), start))
      .collect();
  },
});

// Delete signals for a specific date (for re-running collection)
export const deleteSignalsByDate = mutation({
  args: {
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("brand_signals")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();

    for (const record of records) {
      await ctx.db.delete(record._id);
    }

    return records.length;
  },
});
