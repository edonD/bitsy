import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const join = mutation({
  args: {
    email: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if already signed up
    const existing = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existing) {
      return { id: existing._id, alreadyExists: true };
    }

    const id = await ctx.db.insert("waitlist", {
      email: args.email.toLowerCase(),
      source: args.source ?? "website",
      createdAt: Date.now(),
    });

    return { id, alreadyExists: false };
  },
});

export const count = query({
  handler: async (ctx) => {
    const all = await ctx.db.query("waitlist").collect();
    return all.length;
  },
});

export const getAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("waitlist").order("desc").collect();
  },
});
