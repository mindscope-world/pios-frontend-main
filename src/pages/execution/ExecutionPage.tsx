import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  getCommandCenter,
  getMarketOrderbook,
  getWhyNotTrade,
  isNoMarketData,
  isNotYetComputed,
} from "../../api/intelligence";
import { useCachedIntelligence } from "../../api/useIntelligence";
import { getPortfolioMetrics, listPositions } from "../../api/positions";
import { IntelligenceEmptyState } from "../../components/ui/IntelligenceEmptyState";
import { NullableNumber } from "../../components/ui/NullableNumber";
import { ModeActions } from "../../components/execution/ModeActions";

const SYMBOLS = ["BTC/USDT", "EUR/USD", "XAU/USD"];

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

export default function ExecutionPage() {
  const [symbol, setSymbol] = useState(SYMBOLS[0]);
  const navigate = useNavigate();

  const commandCenter = useCachedIntelligence(["command-center", symbol], () => getCommandCenter(symbol));
  const whyNotTrade = useCachedIntelligence(["why-not-trade", symbol], () => getWhyNotTrade(symbol));
  const orderbook = useQuery({
    queryKey: ["orderbook", symbol],
    queryFn: () => getMarketOrderbook({ symbol }) as Promise<OrderbookPayload>,
    refetchInterval: 8000,
  });
  const portfolioMetrics = useQuery({ queryKey: ["portfolio-metrics"], queryFn: getPortfolioMetrics, staleTime: 20000 });
  const positions = useQuery({ queryKey: ["positions"], queryFn: listPositions, staleTime: 15000 });

  const cc = commandCenter.data && !isNotYetComputed(commandCenter.data) && !isNoMarketData(commandCenter.data)
    ? (commandCenter.data as unknown as CommandCenterPayload)
    : null;

  const openPositions = positions.data?.filter((p) => p.is_open) ?? [];
  const unrealizedTotal = openPositions.reduce((sum, p) => sum + p.unrealized_pnl, 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex gap-1.5">
          {SYMBOLS.map((s) => (
            <button
              key={s}
              onClick={() => setSymbol(s)}
              className={`rounded-md border px-3.5 py-1.5 text-[11.5px] ${
                s === symbol ? "border-blue-border bg-blue-bg font-bold text-blue" : "border-surface-border-strong text-text-faint"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
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
            <span className="text-[10.5px] text-text-faint">
              Weighted mid {orderbook.data?.weighted_mid != null ? orderbook.data.weighted_mid.toLocaleString() : "—"}
            </span>
          </div>
          <div className="p-3.5">
            {cc?.live_market?.price != null ? (
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
                <p className="mb-2.5 text-[10px] leading-relaxed text-text-ghost">
                  Concrete entry/stop/target/R:R levels aren't computed by the backend yet — this shows the real
                  ALLOW/BLOCK gate decision and sizing instead.
                </p>
                <ModeActions symbol={symbol} suggestedQty={cc.final_size_lot} />
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
            <Row label="Unrealized P&L" value={`$${unrealizedTotal.toFixed(2)}`} tone={unrealizedTotal >= 0 ? "pos" : "neg"} last />
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
