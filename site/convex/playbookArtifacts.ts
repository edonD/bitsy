import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Saved Execute playbooks. One row per (brand, feature, save).
export const store = mutation({
  args: {
    records: v.array(
      v.object({
        date: v.string(),
        brand: v.string(),
        feature: v.string(),
        payload: v.any(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const ids = [];
    for (const record of args.records) {
      const id = await ctx.db.insert("playbook_artifacts", {
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
    return await ctx.db
      .query("playbook_artifacts")
      .withIndex("by_brand", (q) => q.eq("brand", args.brand))
      .order("desc")
      .take(args.limit ?? 50);
  },
});
