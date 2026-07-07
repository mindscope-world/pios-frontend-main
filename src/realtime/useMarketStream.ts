import { useEffect, useRef } from "react";
import { connectSSE, type SSEEvent } from "./sse";

// Payload shapes mirror app/api/v1/endpoints/intelligence.py's
// _market_stream_generator exactly (verified against source, not guessed).
export interface MarketPriceEvent {
  symbol: string;
  price: number;
  bid: number | null;
  ask: number | null;
  spread_pct: number | null;
  change_pct: number | null;
  volume_24h: number | null;
  vwap: number | null;
  high_24h: number | null;
  low_24h: number | null;
  sources: string[];
  ts: string;
}

export interface MarketAnalyticsEvent {
  symbol: string;
  regime: string;
  regime_conf: number;
  rsi_14: number | null;
  rsi_signal: string | null;
  macd_cross: string | null;
  bb_signal: string | null;
  composite_bias: string | null;
  composite_signal: string | null;
  signal_conflict: string;
  ts: string;
}

export interface MarketWhyNotTradeEvent {
  symbol: string;
  decision: string;
  regime: string;
  title: string;
  ts: string;
}

export interface MarketStreamHandlers {
  onPrice?: (data: MarketPriceEvent) => void;
  onAnalytics?: (data: MarketAnalyticsEvent) => void;
  onWhyNotTrade?: (data: MarketWhyNotTradeEvent) => void;
  onHeartbeat?: () => void;
}

/**
 * GET /intelligence/stream — price/analytics/why-not-trade ticker feed.
 * Auto-discovers active symbols server-side if `symbols` is empty.
 * Use for a market ticker strip / live price panel (FRONTEND_GUIDE.md §6.2).
 */
export function useMarketStream(symbols: string[], handlers: MarketStreamHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const symbolsKey = symbols.join(",");

  useEffect(() => {
    const query = symbolsKey ? `?symbols=${encodeURIComponent(symbolsKey)}` : "";
    return connectSSE(`/intelligence/stream${query}`, (evt: SSEEvent) => {
      const h = handlersRef.current;
      switch (evt.event) {
        case "price":
          h.onPrice?.(JSON.parse(evt.data));
          break;
        case "analytics":
          h.onAnalytics?.(JSON.parse(evt.data));
          break;
        case "why_not_trade":
          h.onWhyNotTrade?.(JSON.parse(evt.data));
          break;
        case "heartbeat":
          h.onHeartbeat?.();
          break;
      }
    });
  }, [symbolsKey]);
}
