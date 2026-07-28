import { getRegimeCurrent, getRegimeTrend, isNoMarketData, isNotYetComputed } from "../../api/intelligence";
import { useCachedIntelligence } from "../../api/useIntelligence";
import { IntelligenceEmptyState } from "../ui/IntelligenceEmptyState";
import { Card, Loading, Pill, Row } from "./shared";

// Verified against app/services/intelligence/regime_service.py's
// compute_regime_current() / compute_regime_trend() return dicts exactly.
interface RegimeHistoryBlock {
  regime: string;
  started_at: string;
  ended_at: string | null;
  duration_bars: number;
  avg_return: number;
}

interface RegimeCurrentPayload {
  symbol: string;
  regime: string;
  confidence: number;
  confidence_low: number;
  confidence_high: number;
  size_multiplier: number;
  duration_bars: number;
  detected_at: string;
  history: RegimeHistoryBlock[];
  live_price: number | null;
  change_pct_24h: number | null;
  technicals: {
    rsi_14: number | null;
    rsi_signal: string | null;
    macd_cross: string | null;
    composite_bias: string | null;
    bb_signal: string | null;
    atr_pct: number | null;
  };
  advisory: string;
  regime_color: string;
}

interface RegimeTrendPoint {
  ts: string;
  confidence_pct: number;
  conflict_level: number;
}

// Five real regime states (owner feedback, 2026-07-28) -- RECOVERY removed
// entirely (owner ruling 2026-07-28: not one of the five real regimes under
// any name; see workplan.md SS A/E.1). Matches regime_taxonomy.py's
// REGIME_STATES on the backend.
const REGIME_TONE: Record<string, "green" | "red" | "amber" | "blue" | "neutral"> = {
  LOW_VOL_TREND: "green",
  HIGH_VOL_TREND: "amber",
  RANGE_BOUND: "blue",
  CRISIS_LIQUIDITY: "red",
  MACRO_EVENT: "red",
};

export function RegimeTab({ symbol }: { symbol?: string }) {
  const label = symbol ?? "auto";
  const current = useCachedIntelligence(["regime-current", label], () => getRegimeCurrent(symbol));
  const trend = useCachedIntelligence(["regime-trend", label], () => getRegimeTrend(symbol));

  // compute_regime_current() has a THIRD error shape beyond the standard
  // not_yet_computed/no_market_data pair — {"error":"no_regime_data",...}
  // when the symbol has ticks but no RegimeState rows computed yet (common
  // for a freshly-added symbol). Guard on any "error" field generically, not
  // just the two known WorkerCacheError strings, or this crashes reading
  // r.history off a shape that doesn't have one.
  const hasCustomError = !!(current.data as { error?: string } | undefined)?.error;
  const r =
    current.data && !isNotYetComputed(current.data) && !isNoMarketData(current.data) && !hasCustomError
      ? (current.data as unknown as RegimeCurrentPayload)
      : null;

  const trendPoints: RegimeTrendPoint[] =
    trend.data && !isNotYetComputed(trend.data) && !isNoMarketData(trend.data) ? (trend.data as unknown as RegimeTrendPoint[]) : [];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card
        title={`Regime · ${label}`}
        right={r && <Pill tone={REGIME_TONE[r.regime] ?? "neutral"}>{r.regime}</Pill>}
      >
        {current.isPending ? (
          <Loading />
        ) : !r ? (
          hasCustomError ? (
            <p className="text-sm text-text-muted">No HMM regime detection has run for {label} yet.</p>
          ) : (
            <IntelligenceEmptyState reason={current.data && isNotYetComputed(current.data) ? "not_yet_computed" : "no_market_data"} symbol={symbol} />
          )
        ) : (
          <>
            <Row label="Confidence" value={`${r.confidence}% (${r.confidence_low}–${r.confidence_high}%)`} />
            <Row label="Size multiplier" value={`×${r.size_multiplier}`} />
            <Row label="Duration" value={`${r.duration_bars} bars`} />
            <Row label="Live price" value={r.live_price != null ? r.live_price.toLocaleString() : "—"} />
            <Row
              label="24h change"
              value={r.change_pct_24h != null ? `${r.change_pct_24h >= 0 ? "+" : ""}${r.change_pct_24h}%` : "—"}
            />
            <Row label="RSI(14)" value={r.technicals.rsi_14 != null ? `${r.technicals.rsi_14} (${r.technicals.rsi_signal ?? "—"})` : "—"} last />
            <p className="mt-3 rounded-md border border-surface-border bg-surface-card p-2.5 text-[11px] leading-relaxed text-text-muted">
              {r.advisory}
            </p>
          </>
        )}
      </Card>

      <Card title={`Regime history · ${symbol}`}>
        {current.isPending ? (
          <Loading />
        ) : !r || r.history.length === 0 ? (
          <p className="text-sm text-text-muted">No regime transitions recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {[...r.history].reverse().map((h, i) => (
              <div key={i} className="flex items-center justify-between rounded-md border border-surface-border p-2.5 text-[11px]">
                <div className="flex items-center gap-2">
                  <Pill tone={REGIME_TONE[h.regime] ?? "neutral"}>{h.regime}</Pill>
                  <span className="text-text-faint">{h.duration_bars} bars</span>
                </div>
                <span className="text-text-ghost">
                  {new Date(h.started_at).toLocaleString()}
                  {h.ended_at ? ` → ${new Date(h.ended_at).toLocaleString()}` : " → now"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title={`Confidence / conflict trend (24h) · ${symbol}`}>
        {trend.isPending ? (
          <Loading />
        ) : trendPoints.length === 0 ? (
          <p className="text-sm text-text-muted">
            {trend.data && isNotYetComputed(trend.data) ? "Waiting for the intelligence worker to compute this." : "No trend data yet."}
          </p>
        ) : (
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-[9.5px] uppercase tracking-[.06em] text-text-faint">
                <th className="py-1 text-left">Time</th>
                <th className="py-1 text-left">Confidence</th>
                <th className="py-1 text-left">Conflict</th>
              </tr>
            </thead>
            <tbody>
              {trendPoints.slice(-12).reverse().map((p, i) => (
                <tr key={i} className="border-t border-surface-border">
                  <td className="py-1.5 font-mono text-text-faint">{new Date(p.ts).toLocaleTimeString()}</td>
                  <td className="py-1.5">{p.confidence_pct}%</td>
                  <td className="py-1.5">{p.conflict_level}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
