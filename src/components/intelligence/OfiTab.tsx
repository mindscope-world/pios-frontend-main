import { getOfi, isNoMarketData, isNotYetComputed } from "../../api/intelligence";
import { useCachedIntelligence } from "../../api/useIntelligence";
import { IntelligenceEmptyState } from "../ui/IntelligenceEmptyState";
import { Card, Loading, Pill, Row } from "./shared";

// Verified against app/services/intelligence/ofi_service.py's compute_ofi()
// return dict exactly — this is what intelligence_worker.py stores under
// "order_flow", which /intelligence/ofi (worker-cached) serves.
interface OfiPayload {
  symbol: string;
  db_ofi: {
    institutional_absorption?: number;
    liquidity_vacuum?: number;
    stop_hunt_probability?: number;
    vol_delta_divergence?: number;
    net_modifier?: number;
    decision?: string;
  };
  live_ofi: {
    buy_volume?: number;
    sell_volume?: number;
    net_flow?: number;
    imbalance?: number;
    block_trades?: number;
    aggressor_bias?: string;
  };
  orderbook_imbalance: number | null;
  orderbook_spread_bps: number | null;
  orderbook_liquidity: number | null;
  combined_net_modifier: number;
  final_decision: "ALLOW" | "CAUTION" | "BLOCK";
  allowed_size_lot: number;
  latency_ms: number;
}

const DECISION_TONE: Record<string, "green" | "amber" | "red"> = {
  ALLOW: "green",
  CAUTION: "amber",
  BLOCK: "red",
};

export function OfiTab({ symbol }: { symbol: string }) {
  const ofi = useCachedIntelligence(["ofi", symbol], () => getOfi(symbol));

  const o =
    ofi.data && !isNotYetComputed(ofi.data) && !isNoMarketData(ofi.data) ? (ofi.data as unknown as OfiPayload) : null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card
        title={`Order flow imbalance · ${symbol}`}
        right={o && <Pill tone={DECISION_TONE[o.final_decision] ?? "neutral"}>{o.final_decision}</Pill>}
      >
        {ofi.isPending ? (
          <Loading />
        ) : !o ? (
          <IntelligenceEmptyState reason={ofi.data && isNotYetComputed(ofi.data) ? "not_yet_computed" : "no_market_data"} symbol={symbol} />
        ) : (
          <>
            <Row label="Combined net modifier" value={o.combined_net_modifier} />
            <Row label="Allowed size" value={`${o.allowed_size_lot} lot`} />
            <Row label="Orderbook imbalance" value={o.orderbook_imbalance ?? "—"} />
            <Row label="Orderbook spread" value={o.orderbook_spread_bps != null ? `${o.orderbook_spread_bps} bps` : "—"} />
            <Row label="Orderbook liquidity" value={o.orderbook_liquidity ?? "—"} />
            <Row label="Latency" value={`${o.latency_ms} ms`} last />
          </>
        )}
      </Card>

      <Card title="Tick-history OFI (institutional flow)">
        {ofi.isPending ? (
          <Loading />
        ) : !o ? (
          <p className="text-sm text-text-muted">No data.</p>
        ) : (
          <>
            <Row label="Institutional absorption" value={o.db_ofi.institutional_absorption ?? "—"} />
            <Row label="Liquidity vacuum" value={o.db_ofi.liquidity_vacuum ?? "—"} />
            <Row label="Stop-hunt probability" value={o.db_ofi.stop_hunt_probability ?? "—"} />
            <Row label="Vol-delta divergence" value={o.db_ofi.vol_delta_divergence ?? "—"} />
            <Row label="Net modifier" value={o.db_ofi.net_modifier ?? "—"} last />
          </>
        )}
      </Card>

      <Card title="Live trade tape OFI" right={o?.live_ofi.aggressor_bias && <Pill tone="blue">{o.live_ofi.aggressor_bias}</Pill>}>
        {ofi.isPending ? (
          <Loading />
        ) : !o || Object.keys(o.live_ofi).length === 0 ? (
          <p className="text-sm text-text-muted">No live trade tape available for {symbol} right now.</p>
        ) : (
          <>
            <Row label="Buy volume" value={o.live_ofi.buy_volume ?? "—"} />
            <Row label="Sell volume" value={o.live_ofi.sell_volume ?? "—"} />
            <Row label="Net flow" value={o.live_ofi.net_flow ?? "—"} />
            <Row label="Imbalance" value={o.live_ofi.imbalance ?? "—"} />
            <Row label="Block trades" value={o.live_ofi.block_trades ?? "—"} last />
          </>
        )}
      </Card>
    </div>
  );
}
