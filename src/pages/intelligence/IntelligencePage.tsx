import { useState } from "react";
import { getTraces, getWhyNotTrade, isNoMarketData, isNotYetComputed } from "../../api/intelligence";
import { useCachedIntelligence } from "../../api/useIntelligence";
import { IntelligenceEmptyState } from "../../components/ui/IntelligenceEmptyState";

const SYMBOLS = ["BTC/USDT", "EUR/USD", "XAU/USD"];

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

export default function IntelligencePage() {
  const [symbol, setSymbol] = useState(SYMBOLS[0]);

  const traces = useCachedIntelligence(["traces", symbol], () => getTraces(symbol));
  const whyNotTrade = useCachedIntelligence(["why-not-trade", symbol], () => getWhyNotTrade(symbol));

  const traceList: DecisionTrace[] =
    traces.data && !isNotYetComputed(traces.data) && !isNoMarketData(traces.data)
      ? ((traces.data as { traces: DecisionTrace[] }).traces ?? [])
      : [];

  const wnt =
    whyNotTrade.data && !isNotYetComputed(whyNotTrade.data) && !isNoMarketData(whyNotTrade.data)
      ? (whyNotTrade.data as unknown as WhyNotTradePayload)
      : null;

  return (
    <div className="space-y-4">
      <div className="mb-1 flex gap-1.5">
        {SYMBOLS.map((s) => (
          <button
            key={s}
            onClick={() => setSymbol(s)}
            className={`rounded-md border px-3 py-1 text-[11px] ${
              s === symbol ? "border-blue-border bg-blue-bg font-bold text-blue" : "border-surface-border-strong text-text-faint"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

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

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 py-1.5 text-[11.5px] ${last ? "" : "border-b border-surface-border"}`}>
      <span className="text-text-faint">{label}</span>
      <span className="text-right font-semibold text-text-primary">{value}</span>
    </div>
  );
}
