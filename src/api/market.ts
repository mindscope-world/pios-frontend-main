import { apiFetch } from "./client";

// Mirrors app/api/v1/endpoints/market.py (the top-level DB-backed market
// router — distinct from the live-exchange /intelligence/market/* routes in
// api/intelligence.ts). Everything here reads MarketTick rows already
// persisted by the ingestion pipeline, so it works even when outbound
// exchange connectivity is down — the natural complement to the live ticker.

// GET /market/ticks/{base}/{quote} — raw MarketTick ORM rows, newest first.
// No response_model on the route; fields mirror the MarketTick columns the
// serializer emits.
export interface DbMarketTick {
  id: number;
  symbol_id: number;
  price: number;
  volume: number;
  side: string | null;
  time: string;
}

export function getStoredTicks(base: string, quote: string, limit = 50) {
  return apiFetch<DbMarketTick[]>(
    `/market/ticks/${encodeURIComponent(base)}/${encodeURIComponent(quote)}?limit=${limit}`,
  );
}

export interface TickerSnapshot {
  symbol: string;
  price: number;
  change_pct: number;
}

// GET /market/tickers?symbols=A&symbols=B — latest + previous stored tick per
// requested symbol ("Powers TopBar" per the endpoint docstring). Symbols with
// no stored ticks are silently omitted from the response.
export function getTickerSnapshots(symbols: string[]) {
  const qs = new URLSearchParams();
  for (const s of symbols) qs.append("symbols", s);
  return apiFetch<TickerSnapshot[]>(`/market/tickers?${qs.toString()}`);
}

// GET /market/tickers/latest — same shape, but window-functioned across ALL
// symbols in one query; optional symbols filter.
export function getLatestTickers(symbols?: string[]) {
  const qs = new URLSearchParams();
  for (const s of symbols ?? []) qs.append("symbols", s);
  const q = qs.toString();
  return apiFetch<TickerSnapshot[]>(`/market/tickers/latest${q ? `?${q}` : ""}`);
}
