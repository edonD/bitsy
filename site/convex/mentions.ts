import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const store = mutation({
  args: {
    records: v.array(
      v.object({
        date: v.string(),
        brand: v.string(),
        model: v.string(),
        query: v.string(),
        sample: v.number(),
        mentioned: v.boolean(),
        position: v.optional(v.number()),
        sentiment: v.optional(v.string()),
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

export const getByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mention_records")
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
      .query("mention_records")
      .withIndex("by_brand", (q) => q.eq("brand", args.brand))
      .filter((q) => q.gte(q.field("date"), startStr))
      .collect();
  },
});

export const getByDateBrand = query({
  args: { date: v.string(), brand: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mention_records")
      .withIndex("by_date_brand", (q) =>
        q.eq("date", args.date).eq("brand", args.brand)
      )
      .collect();
  },
});

export const deleteByDate = mutation({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("mention_records")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();
    for (const r of records) await ctx.db.delete(r._id);
    return records.length;
  },
});
