import { getAdaptationActive, getAdaptationDrift, getAdaptationFeed, isNoMarketData, isNotYetComputed } from "../../api/intelligence";
import { useCachedIntelligence } from "../../api/useIntelligence";
import { Card, Loading, Pill, Row } from "./shared";

// Verified against app/services/intelligence/adaptation_service.py's
// compute_adaptation_feed()/_active()/_drift() return shapes exactly. These
// are system-wide (built from ALL completed backtest jobs / regime states,
// no user filtering server-side), not scoped to the logged-in trader.
interface AdaptationEvent {
  id: string;
  type: string;
  icon: string;
  title: string;
  detail: string;
  delta: string;
  delta_positive: boolean;
  occurred_at: string;
}

interface AdaptationActiveParam {
  parameter: string;
  change: string;
  direction: "UP" | "DOWN" | "NEUTRAL";
}

interface AdaptationDriftPoint {
  ts: string;
  live_sharpe: number | null;
  backtest_sharpe: number;
  confidence_pct: number | null;
}

const DIRECTION_TONE: Record<string, "green" | "red" | "neutral"> = { UP: "green", DOWN: "red", NEUTRAL: "neutral" };

export function AdaptationTab({ symbol }: { symbol?: string }) {
  const feed = useCachedIntelligence(["adaptation-feed", symbol], () => getAdaptationFeed(symbol));
  const active = useCachedIntelligence(["adaptation-active", symbol], () => getAdaptationActive(symbol));
  const drift = useCachedIntelligence(["adaptation-drift", symbol], () => getAdaptationDrift(symbol));

  const events: AdaptationEvent[] =
    feed.data && !isNotYetComputed(feed.data) && !isNoMarketData(feed.data)
      ? ((feed.data as unknown as { items: AdaptationEvent[] }).items ?? [])
      : [];
  const activeParams: AdaptationActiveParam[] =
    active.data && !isNotYetComputed(active.data) && !isNoMarketData(active.data) ? (active.data as unknown as AdaptationActiveParam[]) : [];
  const driftPoints: AdaptationDriftPoint[] =
    drift.data && !isNotYetComputed(drift.data) && !isNoMarketData(drift.data) ? (drift.data as unknown as AdaptationDriftPoint[]) : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Adaptation feed">
          {feed.isPending ? (
            <Loading />
          ) : events.length === 0 ? (
            <p className="text-sm text-text-muted">No adaptation events recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {events.slice(0, 10).map((e) => (
                <div key={e.id} className="rounded-md border border-surface-border p-2.5 text-[11px]">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-semibold text-text-primary">
                      {e.icon} {e.title}
                    </span>
                    <span className={e.delta_positive ? "text-green" : "text-red"}>{e.delta}</span>
                  </div>
                  <p className="text-text-faint">{e.detail}</p>
                  <p className="mt-1 text-[10px] text-text-ghost">{new Date(e.occurred_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Active parameter adaptations">
          {active.isPending ? (
            <Loading />
          ) : activeParams.length === 0 ? (
            <p className="text-sm text-text-muted">No active adaptations.</p>
          ) : (
            <div className="space-y-1">
              {activeParams.map((p, i) => (
                <Row
                  key={i}
                  label={p.parameter}
                  value={<Pill tone={DIRECTION_TONE[p.direction] ?? "neutral"}>{p.change}</Pill>}
                  last={i === activeParams.length - 1}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="Model drift — live vs. backtest Sharpe">
        {drift.isPending ? (
          <Loading />
        ) : driftPoints.length === 0 ? (
          <p className="text-sm text-text-muted">No drift data yet.</p>
        ) : (
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-[9.5px] uppercase tracking-[.06em] text-text-faint">
                <th className="py-1 text-left">Time</th>
                <th className="py-1 text-left">Live Sharpe</th>
                <th className="py-1 text-left">Backtest Sharpe</th>
                <th className="py-1 text-left">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {driftPoints.map((p, i) => (
                <tr key={i} className="border-t border-surface-border">
                  <td className="py-1.5 font-mono text-text-faint">{new Date(p.ts).toLocaleString()}</td>
                  <td className="py-1.5 font-mono">{p.live_sharpe ?? "—"}</td>
                  <td className="py-1.5 font-mono">{p.backtest_sharpe}</td>
                  <td className="py-1.5">{p.confidence_pct != null ? `${p.confidence_pct}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
