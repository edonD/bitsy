import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const store = mutation({
  args: {
    records: v.array(
      v.object({
        date: v.string(),
        query: v.string(),
        model: v.string(),
        sample: v.number(),
        prompt_sent: v.string(),
        raw_response: v.optional(v.string()),
        parsed_brands: v.optional(v.any()),
        status: v.string(),
        error: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const ids = [];
    for (const record of args.records) {
      const id = await ctx.db.insert("api_logs", {
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
      .query("api_logs")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .order("desc")
      .collect();
  },
});

export const getRecent = query({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("api_logs")
      .order("desc")
      .take(args.limit);
  },
});
