"use client";

// ════════════════════════════════════════════════════════════════════════
// DEBUG PANEL — DEV ONLY, REMOVE BEFORE LAUNCH
// To remove: delete this file, and delete the 2 lines marked "DEBUG PANEL"
// in simulator/page.tsx (one import, one <DebugPanel /> render)
// ════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useRef } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ApiLog {
  _id: string;
  _creationTime: number;
  date: string;
  query: string;
  model: string;
  sample: number;
  prompt_sent?: string;
  raw_response?: string;
  parsed_brands?: { brands_mentioned?: { brand: string; position: number; sentiment: string }[] };
  status: string;
  error?: string;
}

interface FetchEvent {
  id: string;
  time: number;
  method: string;
  url: string;
  status?: number;
  duration?: number;
  error?: string;
  requestBody?: string;
  responseBody?: string;
  inFlight: boolean;
}

type Tab = "fetch" | "backend" | "health";

// Global store — so we never miss a fetch regardless of panel open state
const fetchStore: FetchEvent[] = [];
let listeners: Array<() => void> = [];
let patched = false;

function notifyListeners() {
  listeners.forEach((l) => l());
}

function patchFetch() {
  if (patched || typeof window === "undefined") return;
  patched = true;

  // Keep a reference so the DebugPanel can call it directly
  // without triggering the interceptor (avoids self-spam).
  const origFetch = window.fetch;
  (window as Window & { __debugOrigFetch?: typeof fetch }).__debugOrigFetch = origFetch.bind(window);

  window.fetch = async function patchedFetch(input, init) {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method || (typeof input !== "string" && !(input instanceof URL) ? input.method : "GET") || "GET";

    // Only track backend calls
    const isBackend = url.includes(API) || url.includes("/api/simulations");
    if (!isBackend) return origFetch(input, init);

    // Skip tracking if marked as debug-panel internal
    if (init?.headers && "x-debug-internal" in (init.headers as Record<string, string>)) {
      return origFetch(input, init);
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const startTime = Date.now();
    let reqBody: string | undefined;
    if (init?.body && typeof init.body === "string") {
      reqBody = init.body.slice(0, 2000);
    }

    // Add pending event
    const pendingEvent: FetchEvent = {
      id, time: startTime, method, url, inFlight: true, requestBody: reqBody,
    };
    fetchStore.unshift(pendingEvent);
    if (fetchStore.length > 50) fetchStore.length = 50;
    notifyListeners();

    // Helper: replace event in store with new object (forces React to re-render)
    const replaceEvent = (newEvent: FetchEvent) => {
      const idx = fetchStore.findIndex((e) => e.id === id);
      if (idx >= 0) fetchStore[idx] = newEvent;
      notifyListeners();
    };

    try {
      const resp = await origFetch(input, init);
      let responseBody: string | undefined;
      try {
        const clone = resp.clone();
        const text = await clone.text();
        responseBody = text.slice(0, 2000);
      } catch {
        // ignore
      }

      replaceEvent({
        ...pendingEvent,
        inFlight: false,
        status: resp.status,
        duration: Date.now() - startTime,
        responseBody,
      });

      return resp;
    } catch (err) {
      replaceEvent({
        ...pendingEvent,
        inFlight: false,
        duration: Date.now() - startTime,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  };
}

// DebugPanel's own fetches — bypass the interceptor
function debugFetch(url: string): Promise<Response> {
  if (typeof window === "undefined") return Promise.reject("no window");
  const w = window as Window & { __debugOrigFetch?: typeof fetch };
  const f = w.__debugOrigFetch || window.fetch;
  return f(url, { headers: { "x-debug-internal": "1" } });
}

export function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("fetch");
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [health, setHealth] = useState<{ ok: boolean; latency?: number; error?: string; lastCheck?: number }>({ ok: false });
  const [fetches, setFetches] = useState<FetchEvent[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const mounted = useRef(false);

  // Patch fetch on mount and subscribe
  useEffect(() => {
    if (!mounted.current) {
      patchFetch();
      mounted.current = true;
    }
    const listener = () => setFetches([...fetchStore]);
    listeners.push(listener);
    listener();
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  // Poll backend
  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      const startTime = Date.now();
      try {
        // debugFetch bypasses the interceptor so we don't pollute our own fetch log
        const r = await debugFetch(`${API}/api/simulations/status`);
        const latency = Date.now() - startTime;
        if (!r.ok) {
          setHealth({ ok: false, error: `HTTP ${r.status}`, latency, lastCheck: Date.now() });
          return;
        }
        const statusData = await r.json();
        setStatus(statusData);
        setHealth({ ok: true, latency, lastCheck: Date.now() });

        const l = await debugFetch(`${API}/api/simulations/logs?limit=30`);
        const logsData = await l.json();
        setLogs(logsData.logs ?? []);
      } catch (e) {
        setHealth({
          ok: false,
          error: e instanceof Error ? e.message : String(e),
          lastCheck: Date.now(),
        });
      }
    };

    fetchData();
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 1500);
    return () => clearInterval(interval);
  }, [open, autoRefresh]);

  const modelColor: Record<string, string> = {
    chatgpt: "#10a37f",
    claude: "#d97706",
    gemini: "#4285f4",
  };

  const statusColor: Record<string, string> = {
    success: "#059669",
    error: "#e11d48",
    parse_error: "#d97706",
    pending: "#6b7280",
    extraction_conflict: "#d97706",
  };

  const inFlightCount = fetches.filter((f) => f.inFlight).length;
  const errorCount = fetches.filter((f) => !f.inFlight && (f.error || (f.status && f.status >= 400))).length;

  function methodColor(m: string) {
    if (m === "GET") return "text-blue-400";
    if (m === "POST") return "text-green-400";
    if (m === "OPTIONS") return "text-gray-500";
    return "text-white";
  }

  function statusColorForHttp(s?: number) {
    if (!s) return "text-gray-500";
    if (s < 300) return "text-green-400";
    if (s < 400) return "text-blue-400";
    if (s < 500) return "text-amber-400";
    return "text-red-400";
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-black px-4 py-2 font-mono text-xs font-bold text-white shadow-2xl hover:bg-gray-800 transition-colors"
        style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}
      >
        <span className="relative flex h-2 w-2">
          <span className={`absolute inline-flex h-full w-full rounded-full ${inFlightCount > 0 ? "animate-ping bg-yellow-400" : autoRefresh && open ? "animate-ping bg-red-400" : "bg-red-500"} opacity-75`} />
          <span className={`relative inline-flex h-2 w-2 rounded-full ${inFlightCount > 0 ? "bg-yellow-500" : "bg-red-500"}`} />
        </span>
        DEV
        {inFlightCount > 0 && <span className="text-yellow-400">{inFlightCount}</span>}
        {errorCount > 0 && !open && <span className="text-red-400">!{errorCount}</span>}
        <span className="text-gray-400">{open ? "×" : "↗"}</span>
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed top-0 right-0 bottom-0 z-40 w-[540px] bg-[#0a0a0a] text-gray-200 shadow-2xl flex flex-col font-mono text-xs"
          style={{ boxShadow: "-20px 0 60px rgba(0,0,0,0.5)" }}
        >
          {/* Header */}
          <div className="border-b border-gray-800 px-4 py-3 flex items-center justify-between bg-gradient-to-r from-red-950/40 to-transparent">
            <div>
              <p className="font-bold text-red-400 tracking-widest text-[10px]">DEBUG PANEL</p>
              <p className="text-gray-500 text-[10px]">Live API monitor · DEV ONLY</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`rounded px-2 py-1 text-[10px] font-bold ${
                  autoRefresh ? "bg-green-500/20 text-green-400" : "bg-gray-800 text-gray-500"
                }`}
              >
                {autoRefresh ? "● LIVE" : "○ PAUSED"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded bg-gray-800 px-2 py-1 text-[10px] font-bold text-gray-400 hover:bg-gray-700"
              >
                CLOSE
              </button>
            </div>
          </div>

          {/* Health bar */}
          <div className={`px-4 py-2 border-b border-gray-800 text-[10px] ${
            health.ok ? "bg-green-950/30" : "bg-red-950/30"
          }`}>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${health.ok ? "bg-green-500" : "bg-red-500 animate-pulse"}`}
                />
                <span className={health.ok ? "text-green-400" : "text-red-400"}>
                  {health.ok ? `Backend OK (${health.latency}ms)` : `Backend ${health.error || "unreachable"}`}
                </span>
              </span>
              <span className="text-gray-600">|</span>
              <span className="text-gray-500">{API}</span>
              {health.lastCheck && (
                <>
                  <span className="text-gray-600">|</span>
                  <span className="text-gray-500">{Math.floor((Date.now() - health.lastCheck) / 1000)}s ago</span>
                </>
              )}
            </div>
          </div>

          {/* Backend status */}
          {status && (
            <div className="px-4 py-2 border-b border-gray-800 bg-gray-900/30">
              <div className="flex items-center gap-3 text-[10px] text-gray-400 flex-wrap">
                <span>
                  Samples: <span className="text-white">{String(status.training_sample_count ?? 0)}</span>
                </span>
                <span className="text-gray-600">|</span>
                <span>
                  Model: <span className="text-white">{status.model_trained ? "trained" : "none"}</span>
                </span>
                {typeof status.model_r2 === "number" && (
                  <>
                    <span className="text-gray-600">|</span>
                    <span>
                      R²: <span className="text-white">{(status.model_r2 as number).toFixed(3)}</span>
                    </span>
                  </>
                )}
                <span className="text-gray-600">|</span>
                <span>
                  Obs today: <span className="text-white">{String(status.observation_count ?? 0)}</span>
                </span>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-gray-800 bg-gray-900/20">
            {(["fetch", "backend", "health"] as Tab[]).map((t) => {
              const labels: Record<Tab, string> = {
                fetch: `FETCH (${fetches.length})`,
                backend: `BACKEND LOGS (${logs.length})`,
                health: "HEALTH",
              };
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 px-3 py-2 text-[10px] font-bold tracking-wider transition-colors ${
                    tab === t ? "text-white bg-gray-800/50 border-b-2 border-red-500" : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {labels[t]}
                </button>
              );
            })}
          </div>

          {/* ─── FETCH TAB — browser fetch interceptor ─── */}
          {tab === "fetch" && (
            <div className="flex-1 overflow-y-auto">
              {fetches.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 text-[11px]">
                  No browser fetches yet.
                  <br />
                  <br />
                  Click anything in the simulator that talks to the backend.
                  <br />
                  <span className="text-gray-600">Intercepts all calls to {API}</span>
                </div>
              ) : (
                <div className="divide-y divide-gray-900">
                  {fetches.map((f) => {
                    const isExpanded = expanded === f.id;
                    const path = f.url.replace(API, "").replace(/\?.*/, "");
                    const age = Math.floor((Date.now() - f.time) / 1000);
                    const ageLabel = age < 60 ? `${age}s` : `${Math.floor(age / 60)}m`;

                    return (
                      <div key={f.id}>
                        <button
                          onClick={() => setExpanded(isExpanded ? null : f.id)}
                          className={`w-full text-left px-3 py-2 hover:bg-gray-900/50 transition-colors ${f.inFlight ? "bg-yellow-950/20" : ""}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`shrink-0 font-bold w-12 ${methodColor(f.method)}`}>{f.method}</span>
                            <span className="flex-1 truncate text-gray-300 text-[11px]">{path}</span>
                            {f.inFlight ? (
                              <span className="shrink-0 text-yellow-400 text-[9px] font-bold">
                                <span className="animate-pulse">●</span> pending
                              </span>
                            ) : (
                              <span className={`shrink-0 text-[10px] font-bold ${statusColorForHttp(f.status)}`}>
                                {f.error ? "FAIL" : f.status}
                              </span>
                            )}
                            <span className="shrink-0 text-gray-600 w-14 text-right text-[10px]">
                              {f.duration ? `${f.duration}ms` : ageLabel}
                            </span>
                          </div>
                          {f.error && (
                            <div className="ml-14 mt-1 text-[10px] text-red-400 truncate">{f.error}</div>
                          )}
                        </button>

                        {isExpanded && (
                          <div className="bg-gray-950 px-4 py-3 space-y-3 border-t border-gray-900">
                            <div>
                              <p className="text-[9px] font-bold text-gray-500 tracking-wider mb-1">URL</p>
                              <pre className="text-[10px] text-gray-400 bg-black/50 p-2 rounded whitespace-pre-wrap break-all">
                                {f.url}
                              </pre>
                            </div>
                            {f.requestBody && (
                              <div>
                                <p className="text-[9px] font-bold text-gray-500 tracking-wider mb-1">REQUEST BODY</p>
                                <pre className="text-[10px] text-gray-400 bg-black/50 p-2 rounded whitespace-pre-wrap max-h-32 overflow-y-auto">
                                  {f.requestBody}
                                </pre>
                              </div>
                            )}
                            {f.responseBody && (
                              <div>
                                <p className="text-[9px] font-bold text-gray-500 tracking-wider mb-1">
                                  RESPONSE BODY {f.status && `(${f.status})`}
                                </p>
                                <pre className="text-[10px] text-gray-400 bg-black/50 p-2 rounded whitespace-pre-wrap max-h-48 overflow-y-auto">
                                  {f.responseBody}
                                </pre>
                              </div>
                            )}
                            {f.error && (
                              <div>
                                <p className="text-[9px] font-bold text-red-500 tracking-wider mb-1">ERROR</p>
                                <pre className="text-[10px] text-red-400 bg-red-950/30 p-2 rounded">{f.error}</pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── BACKEND LOGS TAB — LLM API logs from Convex ─── */}
          {tab === "backend" && (
            <div className="flex-1 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 text-[11px]">
                  No backend LLM logs yet.
                  <br />
                  <span className="text-gray-600">These are prompts sent to ChatGPT/Claude/Gemini.</span>
                </div>
              ) : (
                <div className="divide-y divide-gray-900">
                  {logs.map((log) => {
                    const isExpanded = expanded === `backend-${log._id}`;
                    const mentioned = log.parsed_brands?.brands_mentioned ?? [];
                    const color = modelColor[log.model] || "#888";
                    const sColor = statusColor[log.status] || "#888";
                    const age = Math.floor((Date.now() - log._creationTime) / 1000);
                    const ageLabel = age < 60 ? `${age}s` : age < 3600 ? `${Math.floor(age / 60)}m` : `${Math.floor(age / 3600)}h`;

                    return (
                      <div key={log._id}>
                        <button
                          onClick={() => setExpanded(isExpanded ? null : `backend-${log._id}`)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-900/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="shrink-0 h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                            <span className="shrink-0 text-gray-500 w-8">{log.model.slice(0, 3).toUpperCase()}</span>
                            <span className="shrink-0 text-gray-600 w-6 text-[10px]">s{log.sample}</span>
                            <span className="flex-1 truncate text-gray-300 text-[11px]">{log.query}</span>
                            <span
                              className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold"
                              style={{ backgroundColor: `${sColor}20`, color: sColor }}
                            >
                              {log.status}
                            </span>
                            <span className="shrink-0 text-gray-600 w-10 text-right text-[10px]">{ageLabel}</span>
                          </div>
                          {mentioned.length > 0 && !isExpanded && (
                            <div className="mt-1 ml-12 flex flex-wrap gap-1">
                              {mentioned.slice(0, 5).map((m) => (
                                <span key={m.brand} className="rounded bg-gray-800 px-1.5 py-0.5 text-[9px] text-gray-400">
                                  #{m.position} {m.brand}
                                </span>
                              ))}
                              {mentioned.length > 5 && (
                                <span className="text-[9px] text-gray-600">+{mentioned.length - 5}</span>
                              )}
                            </div>
                          )}
                        </button>

                        {isExpanded && (
                          <div className="bg-gray-950 px-4 py-3 space-y-3 border-t border-gray-900">
                            <div>
                              <p className="text-[9px] font-bold text-gray-500 tracking-wider mb-1">PROMPT</p>
                              <pre className="text-[10px] text-gray-400 bg-black/50 p-2 rounded whitespace-pre-wrap max-h-24 overflow-y-auto">
                                {log.prompt_sent?.slice(0, 500)}
                              </pre>
                            </div>
                            {log.raw_response && (
                              <div>
                                <p className="text-[9px] font-bold text-gray-500 tracking-wider mb-1">RESPONSE</p>
                                <pre className="text-[10px] text-gray-400 bg-black/50 p-2 rounded whitespace-pre-wrap max-h-40 overflow-y-auto">
                                  {log.raw_response.slice(0, 800)}
                                </pre>
                              </div>
                            )}
                            {mentioned.length > 0 && (
                              <div>
                                <p className="text-[9px] font-bold text-gray-500 tracking-wider mb-1">PARSED ({mentioned.length})</p>
                                <div className="space-y-1">
                                  {mentioned.map((m) => (
                                    <div key={m.brand} className="flex items-center justify-between bg-black/50 px-2 py-1 rounded">
                                      <span className="text-gray-300 text-[11px]">#{m.position} {m.brand}</span>
                                      <span className="text-[9px] font-bold" style={{
                                        color: m.sentiment === "positive" ? "#10b981" : m.sentiment === "negative" ? "#ef4444" : "#6b7280",
                                      }}>
                                        {m.sentiment}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {log.error && (
                              <div>
                                <p className="text-[9px] font-bold text-red-500 tracking-wider mb-1">ERROR</p>
                                <pre className="text-[10px] text-red-400 bg-red-950/30 p-2 rounded">{log.error}</pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── HEALTH TAB ─── */}
          {tab === "health" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-[11px]">
              <div className={`rounded p-3 ${health.ok ? "bg-green-950/30 border border-green-900" : "bg-red-950/30 border border-red-900"}`}>
                <p className="font-bold text-[10px] tracking-wider mb-2">
                  {health.ok ? "● BACKEND CONNECTED" : "○ BACKEND UNREACHABLE"}
                </p>
                <div className="space-y-1 text-gray-300">
                  <div>URL: <span className="text-white">{API}</span></div>
                  {health.latency !== undefined && <div>Latency: <span className="text-white">{health.latency}ms</span></div>}
                  {health.error && <div>Error: <span className="text-red-400">{health.error}</span></div>}
                  {health.lastCheck && <div>Last check: <span className="text-white">{Math.floor((Date.now() - health.lastCheck) / 1000)}s ago</span></div>}
                </div>
              </div>

              <div className="rounded p-3 bg-gray-900/50 border border-gray-800">
                <p className="font-bold text-[10px] tracking-wider mb-2 text-gray-400">FETCH SUMMARY</p>
                <div className="space-y-1 text-gray-300">
                  <div>Total: <span className="text-white">{fetches.length}</span></div>
                  <div>In flight: <span className="text-yellow-400">{inFlightCount}</span></div>
                  <div>Errors: <span className="text-red-400">{errorCount}</span></div>
                  <div>Avg latency: <span className="text-white">
                    {fetches.filter((f) => f.duration).length > 0
                      ? `${Math.round(fetches.filter((f) => f.duration).reduce((s, f) => s + (f.duration || 0), 0) / fetches.filter((f) => f.duration).length)}ms`
                      : "—"}
                  </span></div>
                </div>
              </div>

              <div className="rounded p-3 bg-gray-900/50 border border-gray-800">
                <p className="font-bold text-[10px] tracking-wider mb-2 text-gray-400">QUICK CHECKS</p>
                <div className="space-y-2">
                  <button
                    onClick={async () => {
                      try {
                        const r = await debugFetch(`${API}/api/simulations/status`);
                        alert(`Status endpoint: HTTP ${r.status}`);
                      } catch (e) {
                        alert(`FAILED: ${e instanceof Error ? e.message : String(e)}`);
                      }
                    }}
                    className="w-full text-left rounded bg-black/50 px-3 py-2 text-[10px] text-blue-400 hover:bg-gray-800 transition-colors"
                  >
                    → Test GET /status (bypass interceptor)
                  </button>
                  <a
                    href={`${API}/docs`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded bg-black/50 px-3 py-2 text-[10px] text-blue-400 hover:bg-gray-800 transition-colors"
                  >
                    → Open FastAPI /docs
                  </a>
                </div>
              </div>

              <div className="rounded p-3 bg-gray-900/50 border border-gray-800">
                <p className="font-bold text-[10px] tracking-wider mb-2 text-gray-400">IF BACKEND ISN&apos;T RESPONDING</p>
                <div className="space-y-1 text-gray-400 text-[10px]">
                  <div>1. Check terminal: <span className="text-white">cd backend</span></div>
                  <div>2. Run: <span className="text-white">./venv/Scripts/python.exe -m uvicorn api.app:app --host 0.0.0.0 --port 8000</span></div>
                  <div>3. Check: port 8000 should be listening</div>
                  <div>4. CORS allows: localhost:3000, 3001, 3099</div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-800 px-4 py-2 bg-gray-900/50 flex items-center justify-between text-[9px] text-gray-500">
            <span>Auto-refresh 1.5s · Fetch interceptor active</span>
            <button
              onClick={() => { fetchStore.length = 0; setFetches([]); }}
              className="text-gray-400 hover:text-white"
            >
              clear fetches
            </button>
          </div>
        </div>
      )}
    </>
  );
}
