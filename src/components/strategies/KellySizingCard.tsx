import { useQuery } from "@tanstack/react-query";
import { getKellySizing } from "../../api/strategies";

const SOURCE_LABEL: Record<string, string> = {
  live_trades: "Live trade history",
  backtest_proxy: "Backtest proxy",
  unavailable: "Unavailable",
};

const SOURCE_TONE: Record<string, string> = {
  live_trades: "border-green-border bg-green-bg text-green",
  backtest_proxy: "border-amber-border bg-amber-bg text-amber",
  unavailable: "border-surface-border-strong bg-surface-overlay text-text-faint",
};

/**
 * Kelly-criterion position sizing (Guide Part VIII) — computed and reported
 * by app/services/kelly_service.py. Below the guide's own 60-live-trade
 * minimum-history override, every real strategy in this deployment falls to
 * the backtest-proxy branch shown here as "Backtest proxy", not hidden as if
 * it were the real live-trade figure. Once a strategy crosses 60 real closed
 * trades, order_service._risk_check's "kelly_position_cap" gate starts using
 * this same fraction as a real notional ceiling on new orders tagged with
 * this strategy_id — this card is read-only, the enforcement lives in the
 * order risk gate, not here.
 */
export function KellySizingCard({ strategyId }: { strategyId: string }) {
  const kelly = useQuery({ queryKey: ["kelly-sizing", strategyId], queryFn: () => getKellySizing(strategyId), staleTime: 30000 });

  return (
    <div className="rounded-[10px] border border-surface-border bg-surface-raised">
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
        <span className="text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">Kelly-criterion sizing</span>
        {kelly.data && (
          <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${SOURCE_TONE[kelly.data.source]}`}>
            {SOURCE_LABEL[kelly.data.source]}
          </span>
        )}
      </div>
      <div className="p-4">
        {kelly.isPending ? (
          <p className="text-sm text-text-muted">Loading…</p>
        ) : !kelly.data || kelly.data.kelly_fraction === null ? (
          <p className="text-[11.5px] text-text-muted">{kelly.data?.note ?? "No Kelly sizing available yet."}</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Kelly fraction" value={`${(kelly.data.kelly_fraction * 100).toFixed(2)}%`} />
              <Stat label="Win rate" value={kelly.data.win_rate != null ? `${(kelly.data.win_rate * 100).toFixed(1)}%` : "—"} />
              <Stat label="Trades" value={String(kelly.data.n_trades)} />
            </div>
            <p className="mt-3 text-[10.5px] leading-relaxed text-text-faint">{kelly.data.note}</p>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-2.5">
      <p className="text-[10px] text-text-muted">{label}</p>
      <p className="font-mono text-sm text-text-primary">{value}</p>
    </div>
  );
}
