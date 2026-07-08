import { useQuery } from "@tanstack/react-query";
import { getDecisionCurrent, getTraces, getWhyNotTrade, isNoMarketData, isNotYetComputed } from "../../api/intelligence";
import { useCachedIntelligence } from "../../api/useIntelligence";
import { IntelligenceEmptyState } from "../ui/IntelligenceEmptyState";
import { Row } from "./shared";

// Verified against decision_service.py's compute_decision_current() — live,
// per-request, real authenticated user (unlike /intelligence/decision/feed,
// which reads a worker-cache key computed for a hardcoded system user and is
// deliberately NOT wired here — see roadmap-development-progress.md).
interface DecisionCurrentPayload {
  symbol: string;
  strategy_name: string;
  decision: "ALLOW" | "BLOCK" | "WAIT" | "REDUCE";
  final_size_lot: number;
  base_size_lot: number;
  confidence: number;
  confidence_low: number;
  confidence_high: number;
  signal_conflict: string;
  execution_path: string;
  risk_state: string;
  behavior_score: number;
  portfolio: { total_equity: number; total_exposure: number; exposure_pct: number; open_positions: number };
}

interface DecisionTrace {
  id: string;
  timestamp: string;
  symbol: string;
  side: "BUY" | "SELL" | "FLAT";
  decision: "ALLOW" | "BLOCK" | "REDUCE";
  confidence: number;
  size: number;
  logic_path: string;
  mitigation_strategy: string;
}

interface Constraint {
  id: string;
  icon: string;
  severity: "BLOCK" | "WARN" | "INFO";
  title: string;
  body: string;
  size_impact_pct: number;
  advisory: string;
}

interface WhyNotTradePayload {
  symbol: string;
  final_decision: "ALLOW" | "BLOCK" | "WAIT" | "REDUCE";
  net_size_lot: number;
  size_impact_pct: number;
  live_spread_bps: number | null;
  live_liquidity: number | null;
  constraints: Constraint[];
  block_count: number;
  warn_count: number;
}

const SEVERITY_TAG: Record<Constraint["severity"], string> = {
  BLOCK: "bg-red-bg text-red border-red-border",
  WARN: "bg-amber-bg text-amber border-amber-border",
  INFO: "bg-blue-bg text-blue border-blue-border",
};

const DECISION_TAG: Record<string, string> = {
  ALLOW: "bg-green-bg text-green border-green-border",
  BLOCK: "bg-red-bg text-red border-red-border",
  WAIT: "bg-amber-bg text-amber border-amber-border",
  REDUCE: "bg-amber-bg text-amber border-amber-border",
};

export function OverviewTab({ symbol }: { symbol: string }) {
  const traces = useCachedIntelligence(["traces", symbol], () => getTraces(symbol));
  const whyNotTrade = useCachedIntelligence(["why-not-trade", symbol], () => getWhyNotTrade(symbol));
  const decisionCurrent = useQuery({
    queryKey: ["decision-current", symbol],
    queryFn: () => getDecisionCurrent(symbol) as unknown as Promise<DecisionCurrentPayload>,
    staleTime: 20000,
    refetchOnWindowFocus: false,
  });
  const dc = decisionCurrent.data && !(decisionCurrent.data as { error?: string }).error ? decisionCurrent.data : null;

  const traceList: DecisionTrace[] =
    traces.data && !isNotYetComputed(traces.data) && !isNoMarketData(traces.data)
      ? ((traces.data as { traces: DecisionTrace[] }).traces ?? [])
      : [];

  // compute_why_not_trade() has a third error shape beyond the standard
  // not_yet_computed/no_market_data pair — {"error":"no_primary_symbol",...}
  // — see why_not_trade_service.py:27. Guard on any "error" field generically
  // or this crashes reading wnt.constraints off a shape that doesn't have one.
  const whyNotTradeError = (whyNotTrade.data as { error?: string } | undefined)?.error;
  const wnt =
    whyNotTrade.data && !isNotYetComputed(whyNotTrade.data) && !isNoMarketData(whyNotTrade.data) && !whyNotTradeError
      ? (whyNotTrade.data as unknown as WhyNotTradePayload)
      : null;

  return (
    <div className="space-y-4">
      <div className="flex gap-2.5 rounded-[9px] border border-blue-border bg-blue-bg p-3 text-[11.5px] leading-relaxed text-blue">
        This is the explain-it layer. Nothing here is shown automatically — it exists for the times you go looking
        for a reason, not for routine monitoring.
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-[10px] border border-surface-border bg-surface-raised">
          <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
            <span className="text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">
              Decision trace · {symbol} · recent orders
            </span>
          </div>
          {traces.isPending ? (
            <p className="p-4 text-sm text-text-muted">Loading…</p>
          ) : traceList.length === 0 ? (
            <div className="p-4">
              {traces.data && isNotYetComputed(traces.data) ? (
                <IntelligenceEmptyState reason="not_yet_computed" symbol={symbol} />
              ) : (
                <p className="text-sm text-text-muted">No recent orders to trace for {symbol}.</p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-surface-border">
              {traceList.slice(0, 6).map((t) => (
                <div key={t.id} className="p-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11.5px] font-semibold text-text-primary">
                      {t.side} {t.size}
                    </span>
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${DECISION_TAG[t.decision]}`}>{t.decision}</span>
                  </div>
                  <Row label="Confidence" value={`${t.confidence}%`} />
                  <Row label="Logic path" value={t.logic_path} />
                  <Row label="Mitigation" value={t.mitigation_strategy} last />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[10px] border border-surface-border bg-surface-raised">
          <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
            <span className="text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">Why not trade · {symbol}</span>
            {wnt && <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${DECISION_TAG[wnt.final_decision]}`}>{wnt.final_decision}</span>}
          </div>
          <div className="p-4">
            {whyNotTrade.isPending ? (
              <p className="text-sm text-text-muted">Loading…</p>
            ) : !wnt ? (
              <IntelligenceEmptyState reason={whyNotTrade.data && isNotYetComputed(whyNotTrade.data) ? "not_yet_computed" : "no_market_data"} symbol={symbol} />
            ) : (
              <>
                <Row label="Size impact" value={`${wnt.size_impact_pct}%`} />
                <Row label="Live spread" value={wnt.live_spread_bps != null ? `${wnt.live_spread_bps} bps` : "—"} />
                <Row label="Liquidity score" value={wnt.live_liquidity != null ? `${wnt.live_liquidity}` : "—"} />
                <Row label="Blocking / warning constraints" value={`${wnt.block_count} block · ${wnt.warn_count} warn`} last />
                {wnt.constraints.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-[11px] text-blue">Full constraint reasoning</summary>
                    <div className="mt-2 space-y-2">
                      {wnt.constraints.map((c) => (
                        <div key={c.id} className="rounded-md border border-surface-border p-2.5 text-[11px]">
                          <div className="mb-1 flex items-center gap-1.5">
                            <span className={`rounded border px-1.5 py-0.5 text-[9.5px] font-bold ${SEVERITY_TAG[c.severity]}`}>
                              {c.severity}
                            </span>
                            <span className="font-semibold text-text-primary">{c.title}</span>
                          </div>
                          <p className="text-text-muted">{c.body}</p>
                          <p className="mt-1 text-text-faint">{c.advisory}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[10px] border border-surface-border bg-surface-raised">
        <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
          <span className="text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">Live decision pipeline · {symbol}</span>
          {dc && <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${DECISION_TAG[dc.decision]}`}>{dc.decision}</span>}
        </div>
        <div className="p-4">
          {decisionCurrent.isPending ? (
            <p className="text-sm text-text-muted">Loading…</p>
          ) : !dc ? (
            <p className="text-sm text-text-muted">Live decision pipeline unavailable for {symbol} right now.</p>
          ) : (
            <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-2">
              <div>
                <Row label="Strategy" value={dc.strategy_name} />
                <Row label="Size (final / base)" value={`${dc.final_size_lot} / ${dc.base_size_lot} lot`} />
                <Row label="Confidence" value={`${dc.confidence}% (${dc.confidence_low}–${dc.confidence_high}%)`} />
                <Row label="Signal conflict" value={dc.signal_conflict} />
                <Row label="Risk state" value={dc.risk_state} last />
              </div>
              <div>
                <Row label="Behavior score" value={`${dc.behavior_score}%`} />
                <Row label="Portfolio equity" value={`$${dc.portfolio.total_equity.toLocaleString()}`} />
                <Row label="Exposure" value={`${dc.portfolio.exposure_pct}% · ${dc.portfolio.open_positions} open`} last />
              </div>
              <p className="col-span-full mt-2 rounded-md border border-surface-border bg-surface-card p-2.5 font-mono text-[10.5px] text-text-faint">
                {dc.execution_path}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[10px] border border-surface-border-strong bg-surface-raised">
        <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
          <span className="text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">Calibration digest</span>
          <span className="text-[10px] text-text-faint">Not available yet</span>
        </div>
        <div className="p-4 text-[11.5px] leading-relaxed text-text-muted">
          There is no backend aggregation today for "eligible setups taken vs. skipped" or a rejection-reason
          breakdown across a rolling window — the two cards above (decision trace, why-not-trade) are the real,
          per-symbol reasoning the backend currently produces. A calibration digest would need a new aggregation
          endpoint; tracked as a future backend feature rather than shown here with invented numbers.
        </div>
      </div>
    </div>
  );
}
