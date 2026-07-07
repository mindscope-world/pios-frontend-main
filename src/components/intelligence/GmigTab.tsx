import { getGmigRadar, getGmigSnapshot, isNoMarketData, isNotYetComputed } from "../../api/intelligence";
import { useCachedIntelligence } from "../../api/useIntelligence";
import { Card, Loading, Pill, Row } from "./shared";

// Verified against app/services/intelligence/cross_market_service.py's
// compute_gmig_snapshot() / compute_gmig_radar(). Both only look at
// asset_class == "forex" symbols server-side — with a crypto primary symbol
// these come back empty, which is real (no forex correlation set to show),
// not a loading/error state.
interface GmigRelationship {
  id: string;
  assets: string;
  signal: string;
  causality: number;
  direction: "SUPPORTIVE" | "HEADWIND" | "NEUTRAL" | "CAUTIONARY";
  implication: string;
  size_modifier_pct: number;
}

interface GmigModifier {
  symbol: string;
  modifier: number;
  reason: string;
}

interface GmigSnapshotPayload {
  relationships: GmigRelationship[];
  modifiers: GmigModifier[];
  gnn_confidence: number;
}

interface GmigRadarPoint {
  asset: string;
  correlation: number;
  gmig_causality: number;
}

const DIRECTION_TONE: Record<string, "green" | "red" | "amber" | "neutral"> = {
  SUPPORTIVE: "green",
  HEADWIND: "red",
  NEUTRAL: "neutral",
  CAUTIONARY: "amber",
};

export function GmigTab({ symbol }: { symbol: string }) {
  const snapshot = useCachedIntelligence(["gmig-snapshot", symbol], () => getGmigSnapshot(symbol));
  const radar = useCachedIntelligence(["gmig-radar", symbol], () => getGmigRadar(symbol));

  const s =
    snapshot.data && !isNotYetComputed(snapshot.data) && !isNoMarketData(snapshot.data)
      ? (snapshot.data as unknown as GmigSnapshotPayload)
      : null;
  const radarPoints: GmigRadarPoint[] =
    radar.data && !isNotYetComputed(radar.data) && !isNoMarketData(radar.data) ? (radar.data as unknown as GmigRadarPoint[]) : [];

  return (
    <div className="space-y-4">
      <div className="rounded-[9px] border border-blue-border bg-blue-bg p-3 text-[11px] leading-relaxed text-blue">
        GMIG (Global Macro Inter-market Graph) only computes cross-asset relationships between forex symbols. If
        your primary symbol is crypto, these tiles will be empty — that's real, not a loading state.
      </div>

      <Card title={`Cross-market relationships`} right={s && <Pill tone="blue">GNN confidence {(s.gnn_confidence * 100).toFixed(0)}%</Pill>}>
        {snapshot.isPending ? (
          <Loading />
        ) : !s || s.relationships.length === 0 ? (
          <p className="text-sm text-text-muted">No forex cross-market relationships available right now.</p>
        ) : (
          <div className="space-y-2">
            {s.relationships.map((r) => (
              <div key={r.id} className="rounded-md border border-surface-border p-2.5 text-[11px]">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-semibold text-text-primary">{r.assets}</span>
                  <Pill tone={DIRECTION_TONE[r.direction] ?? "neutral"}>{r.direction}</Pill>
                </div>
                <Row label="Signal" value={r.signal} />
                <Row label="Causality" value={r.causality} />
                <Row label="Size modifier" value={`${r.size_modifier_pct >= 0 ? "+" : ""}${r.size_modifier_pct}%`} last />
                <p className="mt-1 text-text-faint">{r.implication}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Per-symbol size modifiers">
          {snapshot.isPending ? (
            <Loading />
          ) : !s || s.modifiers.length === 0 ? (
            <p className="text-sm text-text-muted">No modifiers available.</p>
          ) : (
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-[9.5px] uppercase tracking-[.06em] text-text-faint">
                  <th className="py-1 text-left">Symbol</th>
                  <th className="py-1 text-left">Modifier</th>
                  <th className="py-1 text-left">Reason</th>
                </tr>
              </thead>
              <tbody>
                {s.modifiers.map((m) => (
                  <tr key={m.symbol} className="border-t border-surface-border">
                    <td className="py-1.5 font-semibold text-text-primary">{m.symbol}</td>
                    <td className="py-1.5 font-mono">×{m.modifier}</td>
                    <td className="py-1.5 text-text-faint">{m.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title={`Correlation radar · vs. ${symbol}`}>
          {radar.isPending ? (
            <Loading />
          ) : radarPoints.length === 0 ? (
            <p className="text-sm text-text-muted">No radar data — needs a forex primary symbol.</p>
          ) : (
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-[9.5px] uppercase tracking-[.06em] text-text-faint">
                  <th className="py-1 text-left">Asset</th>
                  <th className="py-1 text-left">Correlation</th>
                  <th className="py-1 text-left">GMIG causality</th>
                </tr>
              </thead>
              <tbody>
                {radarPoints.map((p) => (
                  <tr key={p.asset} className="border-t border-surface-border">
                    <td className="py-1.5 font-semibold text-text-primary">{p.asset}</td>
                    <td className="py-1.5 font-mono">{p.correlation}</td>
                    <td className="py-1.5 font-mono">{p.gmig_causality}</td>
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
