import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Store a single mention record from an LLM API call
export const storeMentionRecord = mutation({
  args: {
    date: v.string(),
    brand: v.string(),
    model: v.string(),
    query_id: v.string(),
    mentioned: v.boolean(),
    mention_rate: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("mention_records", {
      date: args.date,
      brand: args.brand,
      model: args.model,
      query_id: args.query_id,
      mentioned: args.mentioned,
      mention_rate: args.mention_rate,
      createdAt: Date.now(),
    });
  },
});

// Store multiple mention records at once
export const storeMentionRecords = mutation({
  args: {
    records: v.array(
      v.object({
        date: v.string(),
        brand: v.string(),
        model: v.string(),
        query_id: v.string(),
        mentioned: v.boolean(),
        mention_rate: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const ids = [];
    for (const record of args.records) {
      const id = await ctx.db.insert("mention_records", {
        ...record,
        createdAt: Date.now(),
      });
      ids.push(id);
    }
    return ids;
  },
});

// Get mention records for a specific date
export const getMentionsByDate = query({
  args: {
    date: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mention_records")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();
  },
});

// Get mention records for a specific brand
export const getMentionsByBrand = query({
  args: {
    brand: v.string(),
    days: v.number(), // Last N days
  },
  handler: async (ctx, args) => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - args.days);

    const start = startDate.toISOString().split("T")[0];

    return await ctx.db
      .query("mention_records")
      .withIndex("by_brand", (q) => q.eq("brand", args.brand))
      .filter((q) => q.gte(q.field("date"), start))
      .collect();
  },
});

// Get mention records for a specific date + brand
export const getMentionsByDateBrand = query({
  args: {
    date: v.string(),
    brand: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mention_records")
      .withIndex("by_date_brand", (q) => q.eq("date", args.date).eq("brand", args.brand))
      .collect();
  },
});

// Get all mention records for a date (all brands)
export const getAllMentionsByDate = query({
  args: {
    date: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mention_records")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();
  },
});

// Delete mention records for a specific date (for re-running collection)
export const deleteMentionsByDate = mutation({
  args: {
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("mention_records")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();

    for (const record of records) {
      await ctx.db.delete(record._id);
    }

    return records.length;
  },
});
