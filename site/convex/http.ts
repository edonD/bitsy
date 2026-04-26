import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

type HttpActionHandler = Parameters<typeof httpAction>[0];

function isPipelineAuthorized(request: Request) {
  const token =
    process.env.BITSY_INTERNAL_API_TOKEN ?? process.env.CONVEX_PIPELINE_TOKEN;

  if (!token) return true;

  const authHeader = request.headers.get("authorization") ?? "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const direct = request.headers.get("x-bitsy-internal-token") ?? "";

  return bearer === token || direct === token;
}

function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function pipelineHttpAction(handler: HttpActionHandler) {
  return httpAction(async (ctx, request) => {
    if (!isPipelineAuthorized(request)) {
      return unauthorizedResponse();
    }

    return handler(ctx, request);
  });
}

// ── Mentions ───────────────────────────────────────────────────────────────

http.route({
  path: "/pipeline/mentions/store",
  method: "POST",
  handler: pipelineHttpAction(async (ctx, request) => {
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
  handler: pipelineHttpAction(async (ctx, request) => {
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
  handler: pipelineHttpAction(async (ctx, request) => {
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
  handler: pipelineHttpAction(async (ctx, request) => {
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
  handler: pipelineHttpAction(async (ctx, request) => {
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
  handler: pipelineHttpAction(async (ctx, request) => {
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
  handler: pipelineHttpAction(async (ctx) => {
    const data = await ctx.runQuery(api.training.getAll);
    return new Response(JSON.stringify({ data }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/pipeline/training/storeRun",
  method: "POST",
  handler: pipelineHttpAction(async (ctx, request) => {
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
  handler: pipelineHttpAction(async (ctx) => {
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
  handler: pipelineHttpAction(async (ctx, request) => {
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
  handler: pipelineHttpAction(async (ctx, request) => {
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
  handler: pipelineHttpAction(async (ctx, request) => {
    const body = await request.json();
    const data = await ctx.runQuery(api.apiLogs.getRecent, body);
    return new Response(JSON.stringify({ data }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ── Verify: change log ────────────────────────────────────────────────────

http.route({
  path: "/pipeline/changeLog/store",
  method: "POST",
  handler: pipelineHttpAction(async (ctx, request) => {
    const body = await request.json();
    const ids = await ctx.runMutation(api.changeLog.store, body);
    return new Response(JSON.stringify({ ids }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/pipeline/changeLog/getByBrand",
  method: "POST",
  handler: pipelineHttpAction(async (ctx, request) => {
    const body = await request.json();
    const data = await ctx.runQuery(api.changeLog.getByBrand, body);
    return new Response(JSON.stringify({ data }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/pipeline/changeLog/getAll",
  method: "POST",
  handler: pipelineHttpAction(async (ctx, request) => {
    const body = await request.json();
    const data = await ctx.runQuery(api.changeLog.getAll, body);
    return new Response(JSON.stringify({ data }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ── Execute: saved playbook artifacts ─────────────────────────────────────

http.route({
  path: "/pipeline/playbookArtifacts/store",
  method: "POST",
  handler: pipelineHttpAction(async (ctx, request) => {
    const body = await request.json();
    const ids = await ctx.runMutation(api.playbookArtifacts.store, body);
    return new Response(JSON.stringify({ ids }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/pipeline/playbookArtifacts/getByBrand",
  method: "POST",
  handler: pipelineHttpAction(async (ctx, request) => {
    const body = await request.json();
    const data = await ctx.runQuery(api.playbookArtifacts.getByBrand, body);
    return new Response(JSON.stringify({ data }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ── Browser Run daily usage tracker ───────────────────────────────────────

http.route({
  path: "/pipeline/browserUsage/record",
  method: "POST",
  handler: pipelineHttpAction(async (ctx, request) => {
    const body = await request.json();
    const id = await ctx.runMutation(api.browserUsage.record, body);
    return new Response(JSON.stringify({ id }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/pipeline/browserUsage/getForDate",
  method: "POST",
  handler: pipelineHttpAction(async (ctx, request) => {
    const body = await request.json();
    const data = await ctx.runQuery(api.browserUsage.getForDate, body);
    return new Response(JSON.stringify({ data }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/pipeline/browserUsage/getRecent",
  method: "POST",
  handler: pipelineHttpAction(async (ctx, request) => {
    const body = await request.json();
    const data = await ctx.runQuery(api.browserUsage.getRecent, body);
    return new Response(JSON.stringify({ data }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
