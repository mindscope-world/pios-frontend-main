import { useQuery } from "@tanstack/react-query";
import {
  getMarketBreadth,
  getMarketFunding,
  getMarketIndicators,
  getMarketSnapshot,
  getMarketTicker,
  getMarketTrades,
} from "../../api/intelligence";
import { getLatestTickers, getStoredTicks } from "../../api/market";
import { Card, Loading, Pill, Row } from "./shared";

// Payload shapes verified against app/services/market_data_service.py's
// return dicts (get_live_ticker / get_recent_trades / get_multi_asset_snapshot
// / get_market_breadth / get_funding_rates) and intelligence.py's
// /market/trades + /market/indicators wrappers. Every one of these is a live
// per-request exchange call (KuCoin/OKX/Kraken/Bybit, OANDA for forex,
// yfinance for equities) — fetched on-demand with generous staleTime, never
// polled aggressively.

interface TickerPayload {
  symbol: string;
  error?: string;
  last: number | null;
  bid: number | null;
  ask: number | null;
  spread_pct: number | null;
  vwap: number | null;
  high_24h: number | null;
  low_24h: number | null;
  volume_24h: number | null;
  change_pct_24h: number | null;
  sources?: string[];
  cross_venue_prices?: Record<string, number | null>;
}

interface TradeRow {
  id: string;
  time: string;
  price: number;
  amount: number;
  side: string;
  is_block_trade?: boolean;
}

interface TradesPayload {
  symbol: string;
  trades: TradeRow[];
  summary: {
    total_trades?: number;
    buy_volume?: number;
    sell_volume?: number;
    imbalance?: number;
    aggressor_bias?: string;
    block_trades?: number;
  };
}

interface IndicatorsPayload {
  symbol: string;
  error?: string;
  timeframe: string;
  data_points: number;
  indicators: Record<string, number | string | null>;
  advisory: string;
}

interface SnapshotAsset {
  symbol: string;
  asset_class: string;
  price: number | null;
  change_pct: number | null;
  up: boolean;
  exchange: string;
}

interface BreadthPayload {
  crypto?: {
    btc_24h_pct: number;
    eth_24h_pct: number;
    sol_24h_pct: number;
    btc_dominance_signal: string;
    market_momentum: string;
  };
  equities?: {
    spx_price: number;
    vix: number;
    vix_regime: string;
    ten_yr_yield: number;
    risk_tone: string;
  };
}

interface FundingRow {
  symbol: string;
  exchange: string;
  funding_rate_8h_pct: number;
  annualized_pct: number;
  sentiment: string;
}

const BIAS_TONE = (v?: string): "green" | "red" | "amber" | "neutral" =>
  !v ? "neutral" : v.includes("BUY") || v.includes("BULL") || v.includes("RISK_ON") ? "green" : v.includes("SELL") || v.includes("BEAR") || v.includes("RISK_OFF") || v.includes("FEAR") ? "red" : "amber";

// The indicator dict has ~25 keys — surface the headline set rather than a
// wall of numbers; the advisory string carries the composite read.
const HEADLINE_INDICATORS: { key: string; label: string }[] = [
  { key: "rsi_14", label: "RSI (14)" },
  { key: "macd_cross", label: "MACD cross" },
  { key: "bb_signal", label: "Bollinger" },
  { key: "atr_14", label: "ATR (14)" },
  { key: "vwap", label: "VWAP" },
  { key: "obv", label: "OBV" },
  { key: "composite_bias", label: "Composite bias" },
  { key: "composite_signal", label: "Composite signal" },
];

export function MarketsTab({ symbol }: { symbol?: string }) {
  const label = symbol ?? "auto";

  const ticker = useQuery({
    queryKey: ["market-ticker", label],
    queryFn: () => getMarketTicker({ symbol }) as unknown as Promise<TickerPayload>,
    staleTime: 15000,
    refetchInterval: 15000,
  });
  const trades = useQuery({
    queryKey: ["market-trades", label],
    queryFn: () => getMarketTrades({ symbol, limit: 30 }) as unknown as Promise<TradesPayload>,
    staleTime: 20000,
    refetchOnWindowFocus: false,
  });
  const indicators = useQuery({
    queryKey: ["market-indicators", label],
    queryFn: () => getMarketIndicators({ symbol, timeframe: "1h" }) as unknown as Promise<IndicatorsPayload>,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
  const snapshot = useQuery({
    queryKey: ["market-snapshot"],
    queryFn: () => getMarketSnapshot() as unknown as Promise<{ assets: SnapshotAsset[] }>,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
  const breadth = useQuery({
    queryKey: ["market-breadth"],
    queryFn: () => getMarketBreadth() as unknown as Promise<BreadthPayload>,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
  const funding = useQuery({
    queryKey: ["market-funding"],
    queryFn: () => getMarketFunding() as unknown as Promise<{ funding_rates: FundingRow[]; interpretation: string }>,
    staleTime: 120000,
    refetchOnWindowFocus: false,
  });

  // DB-backed market data (app/api/v1/endpoints/market.py) — reads persisted
  // MarketTick rows, so these render even when live exchange calls above are
  // unreachable. Complements, not duplicates, the live cards.
  const dbTickers = useQuery({
    queryKey: ["db-tickers"],
    queryFn: () => getLatestTickers(),
    staleTime: 15000,
    refetchInterval: 15000,
  });
  const [base, quote] = (symbol ?? "").split("/");
  const dbTicks = useQuery({
    queryKey: ["db-ticks", symbol],
    queryFn: () => getStoredTicks(base, quote, 15),
    enabled: !!base && !!quote,
    staleTime: 15000,
    refetchInterval: 15000,
  });

  const t = ticker.data && !ticker.data.error ? ticker.data : null;
  const ind = indicators.data && !indicators.data.error ? indicators.data : null;

  return (
    <div className="space-y-4">
      {/* Cross-asset snapshot strip */}
      <Card title="Cross-asset snapshot" right={snapshot.data && <Pill tone="blue">{snapshot.data.assets.length} assets</Pill>}>
        {snapshot.isPending ? (
          <Loading />
        ) : !snapshot.data || snapshot.data.assets.length === 0 ? (
          <p className="text-sm text-text-muted">No cross-asset data available right now.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {snapshot.data.assets.map((a) => (
              <div key={`${a.asset_class}-${a.symbol}`} className="rounded-md border border-surface-border bg-surface-card px-2.5 py-1.5">
                <div className="text-[10px] font-bold text-text-primary">{a.symbol}</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-[11px] text-text-muted">{a.price?.toLocaleString() ?? "—"}</span>
                  {a.change_pct != null && (
                    <span className={`text-[10px] font-semibold ${a.up ? "text-green" : "text-red"}`}>
                      {a.up ? "+" : ""}
                      {a.change_pct.toFixed(2)}%
                    </span>
                  )}
                </div>
                <div className="text-[8.5px] uppercase tracking-[.05em] text-text-ghost">{a.asset_class} · {a.exchange}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Live cross-venue ticker */}
        <Card
          title={`Live ticker · ${t?.symbol ?? label}`}
          right={t?.sources && t.sources.length > 0 && <Pill tone="blue">{t.sources.join(" · ")}</Pill>}
        >
          {ticker.isPending ? (
            <Loading />
          ) : !t ? (
            <p className="text-sm text-text-muted">
              {ticker.data?.error === "oanda_credentials_missing"
                ? "Forex ticker needs OANDA credentials configured server-side."
                : "Live ticker unavailable right now."}
            </p>
          ) : (
            <>
              <Row label="Last" value={t.last?.toLocaleString() ?? "—"} />
              <Row label="Best bid / ask" value={`${t.bid?.toLocaleString() ?? "—"} / ${t.ask?.toLocaleString() ?? "—"}`} />
              <Row label="Spread" value={t.spread_pct != null ? `${t.spread_pct}%` : "—"} />
              <Row label="VWAP" value={t.vwap?.toLocaleString() ?? "—"} />
              <Row label="24h high / low" value={`${t.high_24h?.toLocaleString() ?? "—"} / ${t.low_24h?.toLocaleString() ?? "—"}`} />
              <Row label="24h volume" value={t.volume_24h?.toLocaleString() ?? "—"} />
              <Row
                label="24h change"
                value={
                  t.change_pct_24h != null ? (
                    <span className={t.change_pct_24h >= 0 ? "text-green" : "text-red"}>
                      {t.change_pct_24h >= 0 ? "+" : ""}
                      {t.change_pct_24h}%
                    </span>
                  ) : (
                    "—"
                  )
                }
                last={!t.cross_venue_prices}
              />
              {t.cross_venue_prices && (
                <Row
                  label="Venue prices"
                  value={Object.entries(t.cross_venue_prices)
                    .map(([ex, px]) => `${ex} ${px?.toLocaleString() ?? "—"}`)
                    .join(" · ")}
                  last
                />
              )}
            </>
          )}
        </Card>

        {/* Technical indicators */}
        <Card
          title={`Indicators · ${ind?.symbol ?? label} · ${ind?.timeframe ?? "1h"}`}
          right={
            ind?.indicators.composite_bias != null && (
              <Pill tone={BIAS_TONE(String(ind.indicators.composite_bias))}>{String(ind.indicators.composite_bias)}</Pill>
            )
          }
        >
          {indicators.isPending ? (
            <Loading />
          ) : !ind ? (
            <p className="text-sm text-text-muted">Not enough candle history to compute indicators.</p>
          ) : (
            <>
              {HEADLINE_INDICATORS.map(({ key, label: l }, i) => {
                const v = ind.indicators[key];
                return (
                  <Row
                    key={key}
                    label={l}
                    value={v == null ? "—" : typeof v === "number" ? v.toLocaleString() : String(v)}
                    last={i === HEADLINE_INDICATORS.length - 1}
                  />
                );
              })}
              <p className="mt-2 rounded-md border border-surface-border bg-surface-card p-2.5 text-[10.5px] text-text-faint">
                {ind.advisory}
              </p>
            </>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Trade tape */}
        <Card
          title={`Trade tape · ${trades.data?.symbol ?? label}`}
          right={trades.data?.summary?.aggressor_bias && <Pill tone={BIAS_TONE(trades.data.summary.aggressor_bias)}>{trades.data.summary.aggressor_bias}</Pill>}
        >
          {trades.isPending ? (
            <Loading />
          ) : !trades.data || trades.data.trades.length === 0 ? (
            <p className="text-sm text-text-muted">No recent trades available for {label}.</p>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap gap-3 text-[10.5px] text-text-faint">
                <span>{trades.data.summary.total_trades ?? trades.data.trades.length} trades</span>
                <span className="text-green">buy vol {trades.data.summary.buy_volume ?? "—"}</span>
                <span className="text-red">sell vol {trades.data.summary.sell_volume ?? "—"}</span>
                <span>imbalance {trades.data.summary.imbalance ?? "—"}</span>
                <span>{trades.data.summary.block_trades ?? 0} block</span>
              </div>
              <div className="max-h-[240px] overflow-y-auto">
                <table className="w-full text-[10.5px]">
                  <tbody>
                    {trades.data.trades.slice(0, 30).map((tr) => (
                      <tr key={tr.id || tr.time} className="border-t border-surface-border font-mono">
                        <td className="py-1 text-text-ghost">{new Date(tr.time).toLocaleTimeString("en-US", { hour12: false })}</td>
                        <td className={`py-1 ${tr.side === "BUY" ? "text-green" : tr.side === "SELL" ? "text-red" : "text-text-faint"}`}>
                          {tr.side}
                        </td>
                        <td className="py-1 text-right text-text-primary">{tr.price.toLocaleString()}</td>
                        <td className="py-1 text-right text-text-muted">{tr.amount}</td>
                        <td className="py-1 text-right">{tr.is_block_trade && <Pill tone="amber">block</Pill>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>

        <div className="space-y-4">
          {/* Market breadth */}
          <Card
            title="Market breadth"
            right={breadth.data?.equities?.risk_tone && <Pill tone={BIAS_TONE(breadth.data.equities.risk_tone)}>{breadth.data.equities.risk_tone}</Pill>}
          >
            {breadth.isPending ? (
              <Loading />
            ) : !breadth.data || (!breadth.data.crypto && !breadth.data.equities) ? (
              <p className="text-sm text-text-muted">Breadth data unavailable right now.</p>
            ) : (
              <>
                {breadth.data.crypto && (
                  <>
                    <Row label="BTC 24h" value={`${breadth.data.crypto.btc_24h_pct}%`} />
                    <Row label="ETH / SOL 24h" value={`${breadth.data.crypto.eth_24h_pct}% / ${breadth.data.crypto.sol_24h_pct}%`} />
                    <Row label="Dominance signal" value={breadth.data.crypto.btc_dominance_signal} />
                    <Row label="Crypto momentum" value={breadth.data.crypto.market_momentum} last={!breadth.data.equities} />
                  </>
                )}
                {breadth.data.equities && (
                  <>
                    <Row label="S&P 500" value={breadth.data.equities.spx_price.toLocaleString()} />
                    <Row label="VIX" value={`${breadth.data.equities.vix} (${breadth.data.equities.vix_regime})`} />
                    <Row label="10Y yield" value={`${breadth.data.equities.ten_yr_yield}%`} last />
                  </>
                )}
              </>
            )}
          </Card>

          {/* Funding rates */}
          <Card title="Perp funding rates">
            {funding.isPending ? (
              <Loading />
            ) : !funding.data || funding.data.funding_rates.length === 0 ? (
              <p className="text-sm text-text-muted">No funding data (perp venues unreachable).</p>
            ) : (
              <>
                <table className="w-full text-[10.5px]">
                  <thead>
                    <tr className="text-[9px] uppercase tracking-[.06em] text-text-faint">
                      <th className="py-1 text-left">Symbol</th>
                      <th className="py-1 text-left">Venue</th>
                      <th className="py-1 text-right">8h rate</th>
                      <th className="py-1 text-right">Annualized</th>
                      <th className="py-1 text-right">Bias</th>
                    </tr>
                  </thead>
                  <tbody>
                    {funding.data.funding_rates.map((f) => (
                      <tr key={`${f.exchange}-${f.symbol}`} className="border-t border-surface-border">
                        <td className="py-1.5 font-semibold text-text-primary">{f.symbol}</td>
                        <td className="py-1.5 text-text-faint">{f.exchange}</td>
                        <td className={`py-1.5 text-right font-mono ${f.funding_rate_8h_pct >= 0 ? "text-green" : "text-red"}`}>
                          {f.funding_rate_8h_pct}%
                        </td>
                        <td className="py-1.5 text-right font-mono">{f.annualized_pct}%</td>
                        <td className="py-1.5 text-right">
                          <Pill tone={f.sentiment === "LONG_BIAS" ? "green" : "red"}>{f.sentiment}</Pill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-[10px] text-text-ghost">{funding.data.interpretation}</p>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* DB-backed market data — persisted ticks, independent of live exchange reachability */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Stored tickers (DB)" right={dbTickers.data && <Pill tone="blue">{dbTickers.data.length} symbols</Pill>}>
          {dbTickers.isPending ? (
            <Loading />
          ) : !dbTickers.data || dbTickers.data.length === 0 ? (
            <p className="text-sm text-text-muted">No ticks persisted yet — start the ingestion pipeline.</p>
          ) : (
            <table className="w-full text-[10.5px]">
              <tbody>
                {dbTickers.data.map((t) => (
                  <tr key={t.symbol} className="border-t border-surface-border font-mono first:border-0">
                    <td className="py-1.5 font-sans font-semibold text-text-primary">{t.symbol}</td>
                    <td className="py-1.5 text-right text-text-primary">{t.price?.toLocaleString()}</td>
                    <td className={`py-1.5 text-right ${t.change_pct >= 0 ? "text-green" : "text-red"}`}>
                      {t.change_pct >= 0 ? "+" : ""}
                      {t.change_pct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title={`Stored tick tape · ${symbol ?? "select a symbol"}`}>
          {!base || !quote ? (
            <p className="text-sm text-text-muted">Pick a symbol above to see its persisted tick history.</p>
          ) : dbTicks.isPending ? (
            <Loading />
          ) : !dbTicks.data || dbTicks.data.length === 0 ? (
            <p className="text-sm text-text-muted">No stored ticks for {symbol} yet.</p>
          ) : (
            <table className="w-full text-[10.5px]">
              <tbody>
                {dbTicks.data.map((t) => (
                  <tr key={t.id} className="border-t border-surface-border font-mono first:border-0">
                    <td className="py-1 text-text-ghost">{new Date(t.time).toLocaleTimeString("en-US", { hour12: false })}</td>
                    <td className={`py-1 ${t.side === "BUY" ? "text-green" : t.side === "SELL" ? "text-red" : "text-text-faint"}`}>
                      {t.side ?? "—"}
                    </td>
                    <td className="py-1 text-right text-text-primary">{Number(t.price).toLocaleString()}</td>
                    <td className="py-1 text-right text-text-muted">{Number(t.volume)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
