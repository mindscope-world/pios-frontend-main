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

export interface Candle {
  ts: number;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OhlcvPayload {
  symbol: string;
  timeframe: string;
  candles: Candle[];
  fetched_at: string;
}

// GET /intelligence/market/ohlcv — raw candles, domain-routed the same way
// as every other live market-data endpoint (OANDA/Alpaca/ccxt). Distinct
// from getMarketIndicators, which computes-and-discards candles into
// derived indicators only.
export const getMarketOhlcv = (params: { symbol: string; timeframe?: string; limit?: number }) =>
  apiFetch<OhlcvPayload>(`/intelligence/market/ohlcv${buildQuery(params)}`);

export interface AlpacaCryptoSymbol {
  symbol: string;
  base: string;
}

export interface CryptoSymbolsPayload {
  symbols: AlpacaCryptoSymbol[];
  count: number;
  fetched_at: string;
}

// GET /intelligence/market/crypto-symbols — every crypto currency Alpaca
// currently lists as tradable (one entry per base asset). Powers the
// Execution page's symbol switcher so it reflects Alpaca's real listing
// instead of a hardcoded subset; empty (not an error) without credentials.
export const getAlpacaCryptoSymbols = () =>
  apiFetch<CryptoSymbolsPayload>("/intelligence/market/crypto-symbols");

export interface OandaInstrument {
  symbol: string;
  type: "CURRENCY" | "METAL";
  // True for XAU/USD + XAG/USD when this account's real OANDA listing has
  // no metals of its own (confirmed live 2026-07-27, not a filtering bug —
  // see list_oanda_instruments' docstring). Lets the UI label these as a
  // fallback rather than presenting them as real OANDA data.
  supplemental: boolean;
}

export interface ForexSymbolsPayload {
  symbols: OandaInstrument[];
  count: number;
  fetched_at: string;
}

// GET /intelligence/market/forex-symbols — every currency pair and metal
// instrument this OANDA account currently lists as tradable, plus a labeled
// XAU/USD + XAG/USD supplement when the account itself has no metals (see
// OandaInstrument.supplemental). Same rationale as getAlpacaCryptoSymbols:
// reflects OANDA's real listing instead of a hardcoded subset (was 12
// pairs); empty (not an error) without credentials.
export const getOandaForexSymbols = () =>
  apiFetch<ForexSymbolsPayload>("/intelligence/market/forex-symbols");

// crypto/forex/stocks are comma-separated symbol lists, NOT a single `symbol`.
export const getMarketSnapshot = (params: { crypto?: string; forex?: string; stocks?: string } = {}) =>
  apiFetch<Payload>(`/intelligence/market/snapshot${buildQuery(params)}`);

export const getMarketFunding = (symbols?: string) =>
  apiFetch<Payload>(`/intelligence/market/funding${buildQuery({ symbols })}`);

// GET /intelligence/rejection-stats — 24h count of the caller's REJECTED
// orders grouped by reject_reason, plus P1/P2 risk-alert counts by category
// appended as "Risk Alert: <category>" rows (intelligence.py:rejection_stats).
export interface RejectionStat {
  reason: string;
  count_24h: number;
}

export const getRejectionStats = () => apiFetch<RejectionStat[]>("/intelligence/rejection-stats");

// GET /intelligence/calibration-digest (§3.3) — mirrors
// calibration_service.py's return dict exactly. eligible/non_eligible are
// system-wide QuantDecision counts (the worker's decisions, not yours);
// orders_placed_by_you is your own activity in the same window. No causal
// link exists between a specific decision and a specific order in this
// codebase, so approx_activity_ratio is an approximate correlate, not a
// true taken-vs-skipped rate — see the API's own `note` field.
export interface CalibrationDigest {
  window_hours: number;
  eligible_setups: number;
  non_eligible_setups: number;
  orders_placed_by_you: number;
  eligible_setups_by_symbol_id: Record<string, number>;
  approx_activity_ratio: number | null;
  note: string;
}

export const getCalibrationDigest = (hours = 24) =>
  apiFetch<CalibrationDigest>(`/intelligence/calibration-digest${buildQuery({ hours })}`);

// GET /intelligence/notifications/latest — polling snapshot of constraint
// severity across the most active symbols (distinct from the SSE
// /notifications/stream, which pushes events as they happen). Used to seed
// the alert bell on mount so it isn't empty before the first stream event.
export interface NotificationSnapshotItem {
  symbol: string;
  symbol_id: number;
  asset_class: string;
  exchange: string;
  regime: string;
  regime_conf: number;
  decision: "ALLOW" | "WARN" | "BLOCK";
  severity: "OK" | "WARN" | "BLOCK";
  feed_age_ms: number;
  tick_count: number;
  evaluated_at: string;
}

export interface NotificationSnapshot {
  notifications: NotificationSnapshotItem[];
  has_blocks: boolean;
  has_warns: boolean;
  generated_at: string;
}

export const getNotificationsLatest = (limit = 10) =>
  apiFetch<NotificationSnapshot>(`/intelligence/notifications/latest${buildQuery({ limit })}`);

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
