import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// ── Mentions ───────────────────────────────────────────────────────────────

http.route({
  path: "/pipeline/mentions/store",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const ids = await ctx.runMutation(api.mentions.store, body);
    return new Response(JSON.stringify({ ids }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/pipeline/mentions/getByDate",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const data = await ctx.runQuery(api.mentions.getByDate, body);
    return new Response(JSON.stringify({ data }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ── Signals ────────────────────────────────────────────────────────────────

http.route({
  path: "/pipeline/signals/store",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const ids = await ctx.runMutation(api.signals.store, body);
    return new Response(JSON.stringify({ ids }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/pipeline/signals/getByDate",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const data = await ctx.runQuery(api.signals.getByDate, body);
    return new Response(JSON.stringify({ data }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/pipeline/signals/getByBrand",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const data = await ctx.runQuery(api.signals.getByBrand, body);
    return new Response(JSON.stringify({ data }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ── Training ───────────────────────────────────────────────────────────────

http.route({
  path: "/pipeline/training/storeSamples",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const ids = await ctx.runMutation(api.training.storeSamples, body);
    return new Response(JSON.stringify({ ids }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/pipeline/training/getAll",
  method: "POST",
  handler: httpAction(async (ctx) => {
    const data = await ctx.runQuery(api.training.getAll);
    return new Response(JSON.stringify({ data }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/pipeline/training/storeRun",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const id = await ctx.runMutation(api.training.storeRun, body);
    return new Response(JSON.stringify({ id }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/pipeline/training/getLatestRun",
  method: "POST",
  handler: httpAction(async (ctx) => {
    const data = await ctx.runQuery(api.training.getLatestRun);
    return new Response(JSON.stringify({ data }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ── Logs ───────────────────────────────────────────────────────────────────

http.route({
  path: "/pipeline/logs/add",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const id = await ctx.runMutation(api.logs.addLog, body);
    return new Response(JSON.stringify({ id }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ── API Logs ──────────────────────────────────────────────────────────────

http.route({
  path: "/pipeline/apiLogs/store",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const ids = await ctx.runMutation(api.apiLogs.store, body);
    return new Response(JSON.stringify({ ids }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/pipeline/apiLogs/getRecent",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const data = await ctx.runQuery(api.apiLogs.getRecent, body);
    return new Response(JSON.stringify({ data }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
