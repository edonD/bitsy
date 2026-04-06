import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Add a log entry to the pipeline logs
export const addLog = mutation({
  args: {
    timestamp: v.string(),
    step: v.string(), // "1A", "1B", "1C", etc
    message: v.string(),
    status: v.string(), // "pending", "success", "error"
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("pipeline_logs", {
      timestamp: args.timestamp,
      step: args.step,
      message: args.message,
      status: args.status,
      data: args.data || null,
      createdAt: Date.now(),
    });
  },
});

// Get all logs for a specific step
export const getLogsByStep = query({
  args: {
    step: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pipeline_logs")
      .withIndex("by_step", (q) => q.eq("step", args.step))
      .order("desc")
      .collect();
  },
});

// Get all recent logs (last N entries)
export const getRecentLogs = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pipeline_logs")
      .order("desc")
      .take(args.limit);
  },
});

// Get all logs
export const getAllLogs = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("pipeline_logs")
      .order("desc")
      .take(1000);
  },
});

// Clear logs
export const clearLogs = mutation({
  handler: async (ctx) => {
    const logs = await ctx.db.query("pipeline_logs").collect();
    for (const log of logs) {
      await ctx.db.delete(log._id);
    }
    return logs.length;
  },
});
