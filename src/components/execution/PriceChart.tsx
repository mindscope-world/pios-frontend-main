import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  // Esc exits fullscreen, matching every native fullscreen affordance.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const ohlcv = useQuery({
    queryKey: ["ohlcv", symbol, timeframe],
    queryFn: () => getMarketOhlcv({ symbol, timeframe, limit: 200 }),
    staleTime: 15000,
    refetchInterval: 30000,
  });

  // (Re)create the chart whenever the container element changes: fullscreen
  // renders through a portal on document.body (to escape the page layout's
  // stacking context, which the fixed z-[600] TopBar would otherwise paint
  // over), so toggling it swaps the DOM node the chart is attached to.
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
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen]);

  // Clear immediately on symbol/timeframe change so a switch never shows the
  // *previous* selection's stale candles while the new query is in flight —
  // react-query only clears `.data` once the new response lands.
  useEffect(() => {
    seriesRef.current?.setData([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, timeframe]);

  // Push data whenever the query resolves — separate from chart creation so
  // switching symbol/timeframe updates the same chart instance instead of
  // tearing it down (avoids a visible flash on every refetch). Also re-runs
  // on fullscreen toggles, which recreate the chart with an empty series.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ohlcv.data, fullscreen]);

  const hasCandles = (ohlcv.data?.candles?.length ?? 0) > 0;

  const block = (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-[950] flex flex-col bg-surface-base"
          : "border-t border-surface-border"
      }
    >
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-1">
          {fullscreen && (
            <span className="mr-2 text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">{symbol}</span>
          )}
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
        <div className="flex items-center gap-2">
          {ohlcv.isFetching && <span className="text-[9.5px] text-text-ghost">refreshing…</span>}
          <button
            onClick={() => setFullscreen((f) => !f)}
            title={fullscreen ? "Minimize (Esc)" : "Expand to full screen"}
            className="rounded border border-surface-border-strong px-2 py-0.5 text-[10px] font-semibold text-text-faint hover:border-text-faint hover:text-text-primary"
          >
            {fullscreen ? "🗕 Minimize" : "⛶ Expand"}
          </button>
        </div>
      </div>
      <div className={fullscreen ? "relative flex-1" : "relative"}>
        <div ref={containerRef} className="h-full w-full" style={fullscreen ? undefined : { height: 260 }} />
        {!ohlcv.isPending && !hasCandles && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-raised/80">
            <p className="text-sm text-text-muted">No candle data for {symbol} at {timeframe} right now.</p>
          </div>
        )}
      </div>
    </div>
  );

  // Fullscreen goes through a body portal so the fixed overlay isn't trapped
  // in the page layout's stacking context (see the chart-creation effect).
  return fullscreen ? createPortal(block, document.body) : block;
}
