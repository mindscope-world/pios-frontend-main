import { apiFetch } from "./client";

// Every function/param here is verified against app/api/v1/endpoints/
// intelligence.py directly (route paths, query param names, and which
// endpoints have no params at all because they auto-detect the primary
// symbol server-side) — not inferred from naming conventions.

export interface WorkerCacheError {
  error: "not_yet_computed" | "no_market_data";
  symbol?: string;
}

export type CachedIntelligence<T> = T | WorkerCacheError;

export function isNotYetComputed(data: unknown): data is WorkerCacheError {
  return !!data && typeof data === "object" && (data as WorkerCacheError).error === "not_yet_computed";
}

export function isNoMarketData(data: unknown): data is WorkerCacheError {
  return !!data && typeof data === "object" && (data as WorkerCacheError).error === "no_market_data";
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

// Payloads here are intentionally loosely typed (Record<string, unknown>):
// none of these routes declare a Pydantic response_model, so the real shape
// lives in each service file under app/services/intelligence/*. Screens built
// against a specific endpoint should narrow the type there, against that
// service's actual return dict — not guess a shape here.
type Payload = Record<string, unknown>;

// ── Worker-cached (app/workers/intelligence_worker.py populates these on a
// rolling per-symbol loop with a short Redis TTL — see _get_worker_cached in
// intelligence.py, which always returns 200 with one of:
//   - the real cached payload
//   - {"error": "not_yet_computed", "symbol": "<normalized>"} — worker hasn't
//     run for this symbol yet (or it's an unrecognized symbol — this helper
//     does NOT validate the symbol against the DB, it just normalizes it)
//   - {"error": "no_market_data"} — no symbol given and no primary symbol exists
// Poll these with a 3-5s refetchInterval; never treat the error shapes as a
// query failure. ────────────────────────────────────────────────────────────
function cachedEndpoint(path: string) {
  return (symbol?: string) => apiFetch<CachedIntelligence<Payload>>(`${path}${buildQuery({ symbol })}`);
}

export const getDecisionFeed = cachedEndpoint("/intelligence/decision/feed");
export const getRegimeCurrent = cachedEndpoint("/intelligence/regime/current");
export const getRegimeTrend = cachedEndpoint("/intelligence/regime/trend");
export const getOfi = cachedEndpoint("/intelligence/ofi");
export const getGmigSnapshot = cachedEndpoint("/intelligence/gmig/snapshot");
export const getGmigRadar = cachedEndpoint("/intelligence/gmig/radar");
export const getAdaptationFeed = cachedEndpoint("/intelligence/adaptation/feed");
export const getAdaptationActive = cachedEndpoint("/intelligence/adaptation/active");
export const getAdaptationDrift = cachedEndpoint("/intelligence/adaptation/drift");
export const getAlphaState = cachedEndpoint("/intelligence/alpha/state");
export const getAlphaDarwin = cachedEndpoint("/intelligence/alpha/darwin");
export const getFeatures = cachedEndpoint("/intelligence/features");
export const getCommandCenter = cachedEndpoint("/intelligence/command-center/current");
export const getScenarios = cachedEndpoint("/intelligence/scenarios/simulations");
export const getTraces = cachedEndpoint("/intelligence/traces");
export const getWhyNotTrade = cachedEndpoint("/intelligence/why-not-trade");

// ── Live, computed per-request (real DB + live exchange calls each call —
// no cache lag, but slower per call). Use on-demand fetch + 15-30s staleTime,
// not aggressive polling. ────────────────────────────────────────────────────

export const getDecisionCurrent = (symbol?: string) =>
  apiFetch<Payload>(`/intelligence/decision/current${buildQuery({ symbol })}`);

export const getMonteCarlo = (params: { symbol?: string; simulations?: number; horizon_days?: number } = {}) =>
  apiFetch<Payload>(`/intelligence/montecarlo${buildQuery(params)}`);

export const getMonteCarloAuto = (params: { simulations?: number; horizon_days?: number } = {}) =>
  apiFetch<Payload>(`/intelligence/montecarlo/auto${buildQuery(params)}`);

// No symbol param at all — auto-detects the primary symbol server-side.
export const getSignalConflict = () => apiFetch<Payload>("/intelligence/signal-conflict");
export const getSignalConflictAuto = () => apiFetch<Payload>("/intelligence/signal-conflict/auto");
export const getOfiAuto = () => apiFetch<Payload>("/intelligence/ofi/auto");
export const getGmigEnhanced = () => apiFetch<Payload>("/intelligence/gmig/enhanced");
export const getMarketBreadth = () => apiFetch<Payload>("/intelligence/market/breadth");

export const getOfiChart = (params: { symbol?: string; limit?: number } = {}) =>
  apiFetch<Payload>(`/intelligence/ofi/chart${buildQuery(params)}`);

export const getOfiEnhanced = (symbol?: string) =>
  apiFetch<Payload>(`/intelligence/ofi/enhanced${buildQuery({ symbol })}`);

export const getMarketOrderbook = (params: { symbol?: string; exchange?: string; depth?: number } = {}) =>
  apiFetch<Payload>(`/intelligence/market/orderbook${buildQuery(params)}`);

export const getMarketTicker = (params: { symbol?: string; exchanges?: string } = {}) =>
  apiFetch<Payload>(`/intelligence/market/ticker${buildQuery(params)}`);

export const getMarketTrades = (params: { symbol?: string; exchange?: string; limit?: number } = {}) =>
  apiFetch<Payload>(`/intelligence/market/trades${buildQuery(params)}`);

export const getMarketIndicators = (params: { symbol?: string; timeframe?: string; limit?: number } = {}) =>
  apiFetch<Payload>(`/intelligence/market/indicators${buildQuery(params)}`);

// crypto/forex/stocks are comma-separated symbol lists, NOT a single `symbol`.
export const getMarketSnapshot = (params: { crypto?: string; forex?: string; stocks?: string } = {}) =>
  apiFetch<Payload>(`/intelligence/market/snapshot${buildQuery(params)}`);

export const getMarketFunding = (symbols?: string) =>
  apiFetch<Payload>(`/intelligence/market/funding${buildQuery({ symbols })}`);

// The 8-gate Quant Core pipeline strip (FRONTEND_GUIDE.md §7 Command Center
// row) — real, computed live, returns [] if there's no primary symbol yet.
export interface QuantCoreGate {
  id: string;
  label: string;
  status: string;
  value: number | null;
  type: "confidence" | "status";
  passed: boolean;
  detail: string;
  latency_ms: number;
}

export const getQuantCoreGates = () => apiFetch<QuantCoreGate[]>("/intelligence/quant-core/gates");
