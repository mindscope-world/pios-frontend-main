import { apiFetch } from "./client";

// Mirrors app/api/v1/endpoints/execution_quality.py exactly — none of its
// routes declare a Pydantic response_model, so these are hand-typed against
// the actual return dicts (data_integrity_status, feed_latency_chart,
// tca_summary, slippage_chart, get_ticks_by_id). The symbol→numeric-id
// lookup for getTicksBySymbolId comes from GET /data/symbols
// (api/data_quality.ts:listDQSymbols), which covers the full active-symbol
// universe — the old "no reliable id lookup" blocker no longer applies.

export interface FeedStatus {
  symbol: string;
  // null when this symbol has never received a single tick -- render
  // "Never", not a fabricated "just now" beside a STALE badge.
  last_tick_at: string | null;
  age_ms: number;
  staleness: "OK" | "WARN" | "STALE";
  sync_drift_ms: number;
}

export interface DataIntegrityStatus {
  overall_healthy: boolean;
  overall_latency_ms: number;
  sync_drift_ms: number;
  staleness_limit_ms: number;
  feeds: FeedStatus[];
}

export interface LatencyChartPoint {
  ts: string;
  symbol: string;
  latency_ms: number;
}

export function getDataIntegrityStatus() {
  return apiFetch<DataIntegrityStatus>("/data/integrity/status");
}

export function getFeedLatencyChart(symbols: string[], samples = 20) {
  const qs = new URLSearchParams();
  for (const s of symbols) qs.append("symbol", s);
  qs.set("samples", String(samples));
  return apiFetch<LatencyChartPoint[]>(`/data/integrity/latency-chart?${qs.toString()}`);
}

export interface TcaTrade {
  order_id: string;
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
  size_unit: string;
  entry_price: number;
  expected_slippage_usd: number;
  actual_slippage_usd: number;
  execution_score_ai: number;
  venue: string;
  latency_ms: number;
  executed_at: string;
}

export interface TcaSummary {
  expected_slippage_usd: number;
  actual_slippage_usd: number;
  half_spread_usd: number;
  exchange_fee_usd: number;
  funding_impact_usd: number;
  total_cost_bps: number;
  trades: TcaTrade[];
}

// Despite the backend module docstring calling this "TCA Lite" (fleet-wide
// sounding), tca_summary() filters on Order.user_id == current_user.id
// (execution_quality.py:153) — this is the CALLING USER's own fills, not a
// fleet-wide aggregate. Copy on the page reflects that.
export function getTcaSummary(hours = 24) {
  return apiFetch<TcaSummary>(`/execution/tca?hours=${hours}`);
}

export interface SlippageChartPoint {
  label: string;
  expected: number;
  actual: number;
}

export function getSlippageChart(hours = 24) {
  return apiFetch<SlippageChartPoint[]>(`/execution/tca/slippage-chart?hours=${hours}`);
}

// GET /market/ticks/{symbol_id} (execution_quality.py's market_ticks_router)
// — latest stored ticks for a symbol by numeric DB id, newest first. price/
// volume come back as strings (the endpoint str()s its Numerics).
export interface StoredTick {
  id: number;
  time: string;
  symbol_id: number;
  price: string;
  volume: string;
  side: string | null;
  dq_result: string | null;
}

export function getTicksBySymbolId(symbolId: number, limit = 50) {
  return apiFetch<StoredTick[]>(`/market/ticks/${symbolId}?limit=${limit}`);
}
