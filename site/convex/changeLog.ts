import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Record one shipped change to a brand's content/site. The backend computes
// `baseline_rate` from whatever it has at save time; the attribution endpoint
// reads it back later to compare against the 14-day-after mention rate.
export const store = mutation({
  args: {
    records: v.array(
      v.object({
        date: v.string(),
        brand: v.string(),
        feature: v.string(),
        description: v.string(),
        shipped_at: v.number(),
        predicted_lift: v.optional(v.number()),
        baseline_rate: v.optional(v.number()),
        context: v.optional(v.any()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const ids = [];
    for (const record of args.records) {
      const id = await ctx.db.insert("change_log", {
        ...record,
        createdAt: Date.now(),
      });
      ids.push(id);
    }
    return ids;
  },
});

export const getByBrand = query({
  args: { brand: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("change_log")
      .withIndex("by_brand", (q) => q.eq("brand", args.brand))
      .order("desc")
      .take(args.limit ?? 50);
    return rows;
  },
});

export const getAll = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db.query("change_log").order("desc").take(args.limit ?? 100);
  },
});
