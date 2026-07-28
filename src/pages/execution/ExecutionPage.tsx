import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  getAlpacaCryptoSymbols,
  getOandaForexSymbols,
  getCommandCenter,
  getMarketOrderbook,
  getWhyNotTrade,
  isNoMarketData,
  isNotYetComputed,
} from "../../api/intelligence";
import { useCachedIntelligence } from "../../api/useIntelligence";
import { getTickerSnapshots } from "../../api/market";
import { getPortfolioMetrics, listPositions } from "../../api/positions";
import { IntelligenceEmptyState } from "../../components/ui/IntelligenceEmptyState";
import { NullableNumber } from "../../components/ui/NullableNumber";
import { formatMoney } from "../../utils/currency";
import { ModeActions } from "../../components/execution/ModeActions";
import { PriceChart } from "../../components/execution/PriceChart";
import { SymbolPickerModal } from "../../components/execution/SymbolPickerModal";
import { useChannelSocket } from "../../realtime/useChannelSocket";
import {
  useMarketStream,
  type MarketAnalyticsEvent,
  type MarketPriceEvent,
  type MarketWhyNotTradeEvent,
} from "../../realtime/useMarketStream";

// Crypto pairs are the full Alpaca-supported currency list, fetched live
// (see getAlpacaCryptoSymbols) so this always matches Alpaca's real listing
// rather than a hardcoded subset; this fallback covers the brief window
// before that loads (or the rare case Alpaca credentials aren't configured).
const DEFAULT_CRYPTO_SYMBOLS = ["BTC/USDT"];
// Forex/metals pairs are the full OANDA-tradable instrument list, fetched
// live (see getOandaForexSymbols) so this always matches the account's real
// listing rather than a hardcoded subset; this fallback covers the brief
// window before that loads (or the rare case OANDA credentials aren't
// configured). Pairs without a `symbols` DB row get live price/chart/
// orderbook but show the honest "waiting for the intelligence worker" state
// on the decision panel — same boundary behavior as unlisted crypto pairs.
const DEFAULT_FOREX_METAL_SYMBOLS = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "USD/CHF",
  "AUD/USD",
  "USD/CAD",
  "NZD/USD",
  "EUR/GBP",
  "EUR/JPY",
  "GBP/JPY",
  "XAU/USD",
  "XAG/USD",
];

// Narrowed against command_center_service.py's real return dict — see
// api/intelligence.ts's note on why these payloads stay loosely typed at
// the fetch layer.
interface CommandCenterPayload {
  symbol: string;
  decision: "ALLOW" | "BLOCK" | "WAIT" | "REDUCE";
  confidence: number;
  confidence_low: number;
  confidence_high: number;
  final_size_lot: number;
  live_market?: { price?: number | null };
  orderbook?: { liquidity_score?: number | null; spread_bps?: number | null };
  volatility?: { vol_regime?: "HIGH" | "MEDIUM" | "LOW"; annualised_vol_pct?: number | null };
  regime?: { label?: string; confidence?: number; size_mult?: number };
  risk_state?: string;
  // Entry/stop from the real proprietary strategy that owns the current
  // regime (OFI Momentum for BULL/BEAR, OU Mean Reversion for RANGE, GARCH
  // Breakout for CRISIS) — null whenever that strategy has no live entry
  // signal right now, or the regime (RECOVERY) has no owning strategy. No
  // `target`/`risk_reward` — none of the 5 strategies define a fixed
  // take-profit; basis_note describes the real exit condition instead.
  suggested_levels?: {
    entry: number;
    stop: number;
    direction: "LONG" | "SHORT";
    strategy_key: string;
    basis_note: string;
  } | null;
  // Always present (when the regime has an owning strategy) even with no
  // suggested_levels, so the UI can say *why* nothing is suggested right
  // now instead of a single unexplained blank state.
  live_strategy_signal?: {
    strategy_key: string | null;
    direction: "LONG" | "SHORT" | null;
    regime_ok: boolean;
    exit_rule: string | null;
    diagnostics: Record<string, unknown>;
  } | null;
}

interface OrderbookPayload {
  bids?: [number, number][];
  asks?: [number, number][];
  weighted_mid?: number | null;
}

const DECISION_STYLES: Record<string, string> = {
  ALLOW: "bg-green-bg text-green border-green-border",
  BLOCK: "bg-red-bg text-red border-red-border",
  WAIT: "bg-amber-bg text-amber border-amber-border",
  REDUCE: "bg-amber-bg text-amber border-amber-border",
};

function normalizeSym(s: string): string {
  return s.replace(/\//g, "").toUpperCase();
}

export default function ExecutionPage() {
  const [symbol, setSymbol] = useState(DEFAULT_CRYPTO_SYMBOLS[0]);
  const [picker, setPicker] = useState<"crypto" | "forex" | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Full Alpaca crypto currency list — cached an hour both client- and
  // server-side since Alpaca's listing changes rarely (see the backend's
  // list_alpaca_crypto_symbols docstring for the dedup-by-base rationale).
  const cryptoSymbols = useQuery({
    queryKey: ["alpaca-crypto-symbols"],
    queryFn: getAlpacaCryptoSymbols,
    staleTime: 60 * 60 * 1000,
  });
  const CRYPTO_SYMBOLS = cryptoSymbols.data?.symbols.length
    ? cryptoSymbols.data.symbols.map((s) => s.symbol)
    : DEFAULT_CRYPTO_SYMBOLS;

  // Full OANDA-tradable currency-pair + metal list — cached an hour both
  // client- and server-side (see the backend's list_oanda_instruments
  // docstring for the type-filter rationale).
  const forexSymbols = useQuery({
    queryKey: ["oanda-forex-symbols"],
    queryFn: getOandaForexSymbols,
    staleTime: 60 * 60 * 1000,
  });
  const FOREX_METAL_SYMBOLS = forexSymbols.data?.symbols.length
    ? forexSymbols.data.symbols.map((s) => s.symbol)
    : DEFAULT_FOREX_METAL_SYMBOLS;

  const SYMBOLS = [...CRYPTO_SYMBOLS, ...FOREX_METAL_SYMBOLS];

  const commandCenter = useCachedIntelligence(["command-center", symbol], () => getCommandCenter(symbol));
  const whyNotTrade = useCachedIntelligence(["why-not-trade", symbol], () => getWhyNotTrade(symbol));
  const orderbook = useQuery({
    queryKey: ["orderbook", symbol],
    queryFn: () => getMarketOrderbook({ symbol }) as Promise<OrderbookPayload>,
    refetchInterval: 8000,
  });
  const portfolioMetrics = useQuery({ queryKey: ["portfolio-metrics"], queryFn: getPortfolioMetrics, staleTime: 20000, refetchInterval: 20000 });
  const positions = useQuery({ queryKey: ["positions"], queryFn: listPositions, staleTime: 15000, refetchInterval: 15000 });

  // GET /market/tickers — DB-persisted last price + change per symbol,
  // decorating the symbol switcher ("Powers TopBar" per the endpoint's own
  // docstring). Distinct from the SSE live ticker, which only covers the
  // currently selected symbol.
  const tickerSnapshots = useQuery({
    queryKey: ["ticker-snapshots"],
    queryFn: () => getTickerSnapshots(SYMBOLS),
    staleTime: 10000,
    refetchInterval: 10000,
  });
  const snapshotFor = (s: string) => tickerSnapshots.data?.find((t) => t.symbol === s);

  // Live push on top of the 4s poll above — /api/v1/ws's "command_center"
  // channel is fed by the same system-computed snapshot the REST cache read
  // serves (app/api/v1/endpoints/intelligence.py's command-center/current
  // reads the identical `command_center:{symbol}` Redis key
  // app/workers/intelligence_worker.py publishes to) — pushing it into the
  // query cache is a straight latency win, not a different data source, so
  // there's no correctness gap here unlike positions/equity_curve (see
  // roadmap-development-progress.md's real-time wiring notes for why those
  // two are NOT wired the same way — they're computed for a hardcoded
  // system user, not the logged-in trader).
  useChannelSocket("command_center", symbol, (msg) => {
    // Untagged channel — stay defensive per channelSocket.ts's own doc: only
    // accept messages that actually look like a command-center payload.
    if (typeof msg.decision === "string" || "error" in msg) {
      queryClient.setQueryData(["command-center", symbol], msg);
    }
  });

  // User-scoped push from the API process (app/services/trade_events.py):
  // fills/cancels now net into *this trader's* Position rows server-side, so
  // a positions event is a real signal to refetch, not the system-user
  // snapshot the worker broadcasts on per-symbol buckets.
  useChannelSocket("positions", undefined, (msg) => {
    if (msg.event === "position_update") {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-metrics"] });
    }
  });

  // SSE live price ticker (/intelligence/stream) — independent of the
  // worker-cache above, updates on every tick rather than the ~4s poll.
  const [livePrice, setLivePrice] = useState<MarketPriceEvent | null>(null);
  // Live technicals strip, additive-only: this is new UI, not a replacement
  // for any REST-sourced field, so there's no cache to clobber (unlike the
  // stream's why_not_trade sub-feed, which runs an independent regime
  // heuristic over the globally busiest symbols rather than the requested
  // one — deliberately NOT wired into the why-not-trade card below, which
  // stays sourced from getWhyNotTrade(symbol) only).
  const [analytics, setAnalytics] = useState<MarketAnalyticsEvent | null>(null);
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<string | null>(null);
  // The stream's why_not_trade sub-feed runs its own regime heuristic over
  // the globally busiest symbols — NOT necessarily the selected one — so it
  // renders as a clearly-labeled "stream pulse" chip carrying its own symbol,
  // never merged into the per-symbol getWhyNotTrade(symbol) card below.
  const [streamPulse, setStreamPulse] = useState<MarketWhyNotTradeEvent | null>(null);
  useEffect(() => {
    setLivePrice(null);
    setAnalytics(null);
    setLastHeartbeatAt(null);
    setStreamPulse(null);
  }, [symbol]);
  useMarketStream([symbol], {
    onPrice: (data) => {
      if (normalizeSym(data.symbol) === normalizeSym(symbol)) setLivePrice(data);
    },
    onAnalytics: (data) => {
      if (normalizeSym(data.symbol) === normalizeSym(symbol)) setAnalytics(data);
    },
    onWhyNotTrade: (data) => setStreamPulse(data),
    onHeartbeat: () => setLastHeartbeatAt(new Date().toLocaleTimeString("en-US", { hour12: false })),
  });

  const cc = commandCenter.data && !isNotYetComputed(commandCenter.data) && !isNoMarketData(commandCenter.data)
    ? (commandCenter.data as unknown as CommandCenterPayload)
    : null;
  // Regime/Volatility/Liquidity below all go blank together when `cc` is
  // null — worth saying why, since a bare "—" reads as a missing feature
  // rather than the transient worker-cache-miss it usually is (the
  // background intelligence_worker.py polls each symbol on a rolling
  // cadence; a just-selected or rarely-viewed symbol can be a few seconds
  // to minutes behind).
  const ccBlankReason = !cc && commandCenter.data
    ? isNotYetComputed(commandCenter.data)
      ? "not_yet_computed"
      : "no_market_data"
    : null;

  const openPositions = positions.data?.filter((p) => p.is_open) ?? [];
  const unrealizedTotal = openPositions.reduce((sum, p) => sum + p.unrealized_pnl, 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md border border-blue-border bg-blue-bg px-3.5 py-1.5 text-[11.5px] font-bold text-blue">
            {symbol}
            {snapshotFor(symbol) && (
              <span className="ml-1.5 font-mono text-[9.5px] font-normal">
                {snapshotFor(symbol)!.price.toLocaleString()}{" "}
                <span className={snapshotFor(symbol)!.change_pct >= 0 ? "text-green" : "text-red"}>
                  {snapshotFor(symbol)!.change_pct >= 0 ? "+" : ""}
                  {snapshotFor(symbol)!.change_pct}%
                </span>
              </span>
            )}
          </span>
          <button
            onClick={() => setPicker("crypto")}
            className="rounded-md border border-surface-border-strong px-3.5 py-1.5 text-[11.5px] text-text-faint hover:border-text-faint hover:text-text-primary"
          >
            Crypto ▾
          </button>
          <button
            onClick={() => setPicker("forex")}
            className="rounded-md border border-surface-border-strong px-3.5 py-1.5 text-[11.5px] text-text-faint hover:border-text-faint hover:text-text-primary"
          >
            Forex / Metals ▾
          </button>
        </div>
        {picker && (
          <SymbolPickerModal
            title={picker === "crypto" ? "Select a crypto pair" : "Select a forex / metals pair"}
            symbols={picker === "crypto" ? CRYPTO_SYMBOLS : FOREX_METAL_SYMBOLS}
            selected={symbol}
            onSelect={setSymbol}
            onClose={() => setPicker(null)}
            snapshotFor={snapshotFor}
          />
        )}
        <div className="flex gap-5">
          <PerfItem label="Win rate" value={<NullableNumber value={portfolioMetrics.data?.win_rate ?? null} suffix="%" />} tone="green" />
          <PerfItem label="Sharpe" value={<NullableNumber value={portfolioMetrics.data?.sharpe ?? null} />} tone="amber" />
          <PerfItem
            label="Drawdown"
            value={portfolioMetrics.data ? `${portfolioMetrics.data.max_drawdown}%` : "—"}
            tone="amber"
          />
          <PerfItem label="Equity" value={portfolioMetrics.data ? `$${portfolioMetrics.data.total_equity.toLocaleString()}` : "—"} />
        </div>
      </div>

      {ccBlankReason && (
        <p className="mb-1.5 text-[10px] leading-relaxed text-text-ghost">
          {ccBlankReason === "not_yet_computed"
            ? "Waiting for the intelligence worker's next pass on this symbol — regime/volatility/liquidity below will populate shortly."
            : "No market data available for this symbol yet."}
        </p>
      )}
      <div className="mb-3.5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <RegimeCell label="Regime" value={cc?.regime?.label ?? "—"} sub={cc?.regime ? `size ×${cc.regime.size_mult}` : ""} tone="green" />
        <RegimeCell label="Volatility" value={cc?.volatility?.vol_regime ?? "—"} sub={cc?.volatility?.annualised_vol_pct != null ? `${cc.volatility.annualised_vol_pct}% ann.` : ""} tone="amber" />
        <RegimeCell
          label="Liquidity"
          value={cc?.orderbook?.liquidity_score != null ? (cc.orderbook.liquidity_score > 60 ? "Healthy" : "Thin") : "—"}
          sub={cc?.orderbook?.spread_bps != null ? `${cc.orderbook.spread_bps} bps spread` : ""}
          tone="green"
        />
        <RegimeCell label="System confidence" value={cc?.confidence != null ? `${cc.confidence}%` : "—"} sub={cc ? `${cc.confidence_low}–${cc.confidence_high}% range` : ""} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2.1fr_1fr]">
        <div className="rounded-[10px] border border-surface-border bg-surface-raised">
          <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
            <span className="text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">{symbol} · live</span>
            <span className="flex items-center gap-3 text-[10.5px] text-text-faint">
              <span>Weighted mid {orderbook.data?.weighted_mid != null ? orderbook.data.weighted_mid.toLocaleString() : "—"}</span>
              {lastHeartbeatAt && (
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green" /> stream {lastHeartbeatAt}
                </span>
              )}
            </span>
          </div>
          <div className="p-3.5">
            {livePrice != null ? (
              <div className="flex items-baseline gap-2 py-6 text-center justify-center">
                <span className="font-[family-name:var(--font-cond)] text-4xl font-semibold text-text-primary">
                  {livePrice.price.toLocaleString()}
                </span>
                <span className="flex items-center gap-1 text-xs text-green">
                  <span className="h-1.5 w-1.5 rounded-full bg-green" /> live
                </span>
                {livePrice.change_pct != null && (
                  <span className={`text-xs ${livePrice.change_pct >= 0 ? "text-green" : "text-red"}`}>
                    {livePrice.change_pct >= 0 ? "+" : ""}
                    {livePrice.change_pct.toFixed(2)}%
                  </span>
                )}
              </div>
            ) : cc?.live_market?.price != null ? (
              <div className="flex items-baseline gap-2 py-6 text-center justify-center">
                <span className="font-[family-name:var(--font-cond)] text-4xl font-semibold text-text-primary">
                  {cc.live_market.price.toLocaleString()}
                </span>
                <span className="text-xs text-text-faint">last</span>
              </div>
            ) : commandCenter.isPending ? (
              <p className="py-10 text-center text-sm text-text-muted">Loading…</p>
            ) : commandCenter.data && isNotYetComputed(commandCenter.data) ? (
              <IntelligenceEmptyState reason="not_yet_computed" symbol={symbol} />
            ) : (
              <IntelligenceEmptyState reason="no_market_data" />
            )}
          </div>
          {(analytics || streamPulse) && (
            <div className="flex flex-wrap gap-1.5 border-t border-surface-border px-4 py-2.5">
              {analytics && (
                <>
                  <AnalyticsChip label={analytics.regime} sub={`${analytics.regime_conf}%`} />
                  {analytics.rsi_14 != null && <AnalyticsChip label={`RSI ${analytics.rsi_14.toFixed(1)}`} sub={analytics.rsi_signal ?? undefined} />}
                  {analytics.macd_cross && <AnalyticsChip label={`MACD ${analytics.macd_cross}`} />}
                  {analytics.bb_signal && <AnalyticsChip label={`BB ${analytics.bb_signal}`} />}
                  {analytics.composite_bias && (
                    <AnalyticsChip
                      label={analytics.composite_bias}
                      sub={analytics.composite_signal != null ? analytics.composite_signal.toFixed(2) : undefined}
                      tone={analytics.composite_bias.includes("BULL") ? "green" : analytics.composite_bias.includes("BEAR") ? "red" : undefined}
                    />
                  )}
                  {analytics.signal_conflict && analytics.signal_conflict !== "NONE" && (
                    <AnalyticsChip label={`conflict: ${analytics.signal_conflict}`} tone="amber" />
                  )}
                </>
              )}
              {streamPulse && (
                <AnalyticsChip
                  label={`pulse ${streamPulse.symbol}: ${streamPulse.decision}`}
                  sub={streamPulse.regime}
                  tone={streamPulse.decision === "ALLOW" ? "green" : streamPulse.decision === "BLOCK" ? "red" : "amber"}
                />
              )}
            </div>
          )}
          <PriceChart symbol={symbol} />
          {(orderbook.data?.asks ?? []).slice(0, 2).reverse().map(([px, sz], i) => (
            <div key={`ask-${i}`} className="flex justify-between border-t border-surface-border px-4 py-1.5 text-[11px]">
              <span className="font-bold text-red">{px.toLocaleString()}</span>
              <span>ask · {sz}</span>
            </div>
          ))}
          {(orderbook.data?.bids ?? []).slice(0, 2).map(([px, sz], i) => (
            <div key={`bid-${i}`} className="flex justify-between border-t border-surface-border px-4 py-1.5 text-[11px]">
              <span className="font-bold text-green">{px.toLocaleString()}</span>
              <span>bid · {sz}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="rounded-[10px] border border-surface-border bg-surface-raised p-4">
            <div className="mb-2 font-[family-name:var(--font-cond)] text-xl font-semibold">{symbol}</div>
            {cc ? (
              <>
                <div className={`mb-3.5 inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-extrabold ${DECISION_STYLES[cc.decision]}`}>
                  {cc.decision}
                </div>
                <div className="mb-3.5 grid grid-cols-2 gap-x-3.5 gap-y-1.5">
                  <RiskCell label="Confidence" value={`${cc.confidence}%`} />
                  <RiskCell label="Size" value={`${cc.final_size_lot} lot`} />
                  <RiskCell label="Regime" value={cc.regime?.label ?? "—"} />
                  <RiskCell label="Risk state" value={cc.risk_state ?? "—"} tone={cc.risk_state === "CRITICAL" ? "neg" : cc.risk_state === "ELEVATED" ? "hi" : "pos"} />
                </div>
                {cc.suggested_levels ? (
                  <div className="mb-2.5 grid grid-cols-2 gap-x-3.5 gap-y-1.5 rounded-md border border-dashed border-surface-border-strong p-2.5">
                    <RiskCell label="Entry" value={cc.suggested_levels.entry.toLocaleString()} />
                    <RiskCell label="Stop" value={cc.suggested_levels.stop.toLocaleString()} tone="neg" />
                    <RiskCell label="Strategy" value={cc.suggested_levels.strategy_key} />
                    <p className="col-span-2 text-[10px] leading-relaxed text-text-ghost">{cc.suggested_levels.basis_note}</p>
                  </div>
                ) : cc.live_strategy_signal?.strategy_key ? (
                  <p className="mb-2.5 text-[10px] leading-relaxed text-text-ghost">
                    No live entry signal right now from {cc.live_strategy_signal.strategy_key} (the strategy that
                    owns the {cc.regime?.label ?? "current"} regime). {cc.live_strategy_signal.exit_rule ?? ""}
                  </p>
                ) : (
                  <p className="mb-2.5 text-[10px] leading-relaxed text-text-ghost">
                    Concrete entry/stop levels aren't available for {symbol} right now — insufficient tick history,
                    or the current regime ({cc.regime?.label ?? "unknown"}) has no strategy wired in for direction.
                  </p>
                )}
                <ModeActions
                  symbol={symbol}
                  suggestedQty={cc.final_size_lot}
                  referencePrice={livePrice?.price ?? cc.live_market?.price ?? null}
                  decision={cc.decision}
                  regimeLabel={cc.regime?.label ?? null}
                />
              </>
            ) : commandCenter.isPending ? (
              <p className="text-sm text-text-muted">Loading…</p>
            ) : (
              <IntelligenceEmptyState reason={commandCenter.data && isNotYetComputed(commandCenter.data) ? "not_yet_computed" : "no_market_data"} symbol={symbol} />
            )}
          </div>

          <div
            className="cursor-pointer rounded-[10px] border border-surface-border bg-surface-raised p-4 transition hover:border-surface-border-strong"
            onClick={() => navigate("/portfolio")}
          >
            <Row label="Open positions" value={`${openPositions.length} open`} />
            <Row label="Unrealized P&L" value={`$${formatMoney(unrealizedTotal)}`} tone={unrealizedTotal >= 0 ? "pos" : "neg"} last />
          </div>

          <div className="rounded-[10px] border border-surface-border bg-surface-raised p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text-faint">
                {whyNotTrade.data && !isNotYetComputed(whyNotTrade.data) && !isNoMarketData(whyNotTrade.data)
                  ? "Curious why?"
                  : "Reasoning not ready yet"}
              </span>
              <a onClick={() => navigate("/intelligence")} className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-text-faint hover:text-blue">
                Intelligence →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PerfItem({ label, value, tone }: { label: string; value: ReactNode; tone?: "green" | "amber" }) {
  const toneClass = tone === "green" ? "text-green" : tone === "amber" ? "text-amber" : "text-text-primary";
  return (
    <div className="flex flex-col items-end">
      <div className="mb-0.5 text-[9px] uppercase tracking-[.06em] text-text-faint">{label}</div>
      <div className={`font-[family-name:var(--font-cond)] text-lg font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function RegimeCell({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "green" | "amber" }) {
  const toneClass = tone === "green" ? "text-green" : tone === "amber" ? "text-amber" : "text-text-primary";
  return (
    <div className="rounded-[9px] border border-surface-border bg-surface-raised px-3.5 py-2.5">
      <div className="mb-1 text-[9px] uppercase tracking-[.07em] text-text-ghost">{label}</div>
      <div className={`text-[13px] font-bold ${toneClass}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[9.5px] text-text-faint">{sub}</div>}
    </div>
  );
}

function AnalyticsChip({ label, sub, tone }: { label: string; sub?: string; tone?: "green" | "red" | "amber" }) {
  const toneClass = tone === "green" ? "border-green-border bg-green-bg text-green" : tone === "red" ? "border-red-border bg-red-bg text-red" : tone === "amber" ? "border-amber-border bg-amber-bg text-amber" : "border-surface-border-strong text-text-faint";
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold ${toneClass}`}>
      {label}
      {sub && <span className="font-normal opacity-70">· {sub}</span>}
    </span>
  );
}

function RiskCell({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" | "hi" }) {
  const toneClass = tone === "pos" ? "text-green" : tone === "neg" ? "text-red" : tone === "hi" ? "text-amber" : "text-text-primary";
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[9px] uppercase tracking-[.06em] text-text-faint">{label}</div>
      <div className={`text-[13px] font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function Row({ label, value, tone, last }: { label: string; value: string; tone?: "pos" | "neg"; last?: boolean }) {
  const toneClass = tone === "pos" ? "text-green" : tone === "neg" ? "text-red" : "text-text-primary";
  return (
    <div className={`flex justify-between py-2 text-[11.5px] ${last ? "" : "border-b border-surface-border"}`}>
      <span className="text-text-faint">{label}</span>
      <span className={`font-semibold ${toneClass}`}>{value}</span>
    </div>
  );
}
