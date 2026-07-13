import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { getMarketOhlcv } from "../../api/intelligence";

const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

// Candlestick price chart for the Execution page — lightweight-charts (the
// TradingView-authored open-source library) was already a dependency but had
// never been wired to a component; this is that chart, sourced from the
// domain-routed /intelligence/market/ohlcv (OANDA/Alpaca/ccxt per symbol).
export function PriceChart({ symbol }: { symbol: string }) {
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const ohlcv = useQuery({
    queryKey: ["ohlcv", symbol, timeframe],
    queryFn: () => getMarketOhlcv({ symbol, timeframe, limit: 200 }),
    staleTime: 15000,
    refetchInterval: 30000,
  });

  // Create the chart once per mount; resize with the container.
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "#8d9fbc",
        fontSize: 10.5,
      },
      grid: {
        vertLines: { color: "rgba(125,155,205,.08)" },
        horzLines: { color: "rgba(125,155,205,.08)" },
      },
      rightPriceScale: { borderColor: "rgba(125,155,205,.2)" },
      timeScale: { borderColor: "rgba(125,155,205,.2)", timeVisible: true },
      crosshair: { mode: 0 },
      height: 260,
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22d97c",
      downColor: "#ef3b57",
      borderVisible: false,
      wickUpColor: "#22d97c",
      wickDownColor: "#ef3b57",
    });
    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      chart.applyOptions({ width });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear immediately on symbol/timeframe change so a switch never shows the
  // *previous* selection's stale candles while the new query is in flight —
  // react-query only clears `.data` once the new response lands.
  useEffect(() => {
    seriesRef.current?.setData([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, timeframe]);

  // Push data whenever the query resolves — separate from chart creation so
  // switching symbol/timeframe updates the same chart instance instead of
  // tearing it down (avoids a visible flash on every refetch).
  useEffect(() => {
    if (!seriesRef.current || !ohlcv.data?.candles) return;
    seriesRef.current.setData(
      ohlcv.data.candles.map((c) => ({
        time: Math.floor(c.ts / 1000) as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    );
    chartRef.current?.timeScale().fitContent();
  }, [ohlcv.data]);

  const hasCandles = (ohlcv.data?.candles?.length ?? 0) > 0;

  return (
    <div className="border-t border-surface-border">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                tf === timeframe ? "bg-blue-bg text-blue" : "text-text-faint hover:text-text-primary"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
        {ohlcv.isFetching && <span className="text-[9.5px] text-text-ghost">refreshing…</span>}
      </div>
      <div className="relative">
        <div ref={containerRef} className="w-full" style={{ height: 260 }} />
        {!ohlcv.isPending && !hasCandles && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-raised/80">
            <p className="text-sm text-text-muted">No candle data for {symbol} at {timeframe} right now.</p>
          </div>
        )}
      </div>
    </div>
  );
}
