import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Upsert usage for a given day. The backend calls this after every
// Cloudflare Browser Run call that returns browserSecondsUsed.
export const record = mutation({
  args: {
    date: v.string(),
    seconds_delta: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("browser_usage_daily")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        seconds_used: (existing.seconds_used ?? 0) + args.seconds_delta,
        request_count: (existing.request_count ?? 0) + 1,
        last_updated: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("browser_usage_daily", {
      date: args.date,
      seconds_used: args.seconds_delta,
      request_count: 1,
      last_updated: Date.now(),
    });
  },
});

export const getForDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("browser_usage_daily")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();
  },
});

export const getRecent = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("browser_usage_daily")
      .order("desc")
      .take(args.days ?? 30);
  },
});
