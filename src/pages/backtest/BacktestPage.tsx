import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { gateRequirement, listStrategies } from "../../api/strategies";
import { BacktestPanel } from "../../components/strategies/BacktestPanel";

// Backtests are always run against one specific strategy
// (POST /strategies/{id}/backtest) — there's no account-wide "run a
// backtest" concept in the data model. This page is a dedicated,
// top-level-navigable entry point for that per-strategy action (previously
// only reachable by opening a strategy's detail page and scrolling past its
// lifecycle/gate-history sections), not a new backend capability.
export default function BacktestPage() {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("strategy") ?? "";

  const strategies = useQuery({ queryKey: ["strategies"], queryFn: () => listStrategies({ page_size: 50 }) });

  // Default to the first strategy once the list loads, so a user landing on
  // /backtest cold sees a working panel immediately instead of an empty picker.
  useEffect(() => {
    if (!selectedId && strategies.data && strategies.data.items.length > 0) {
      setParams({ strategy: strategies.data.items[0].id }, { replace: true });
    }
  }, [selectedId, strategies.data, setParams]);

  const selected = strategies.data?.items.find((s) => s.id === selectedId);

  return (
    <div className="space-y-4">
      <div className="rounded-[10px] border border-surface-border bg-surface-raised p-4 text-[10.5px] leading-relaxed text-text-faint">
        Walk-forward tests a strategy against real historical market data: an expanding-window split (train on the
        earlier slice, test on the next one, repeat), grading each fold's Sharpe/drawdown/win-rate independently
        rather than one number over the whole range. <span className="text-text-primary">Data source</span> — this
        app has no external historical-data import; every backtest runs against ticks this app's own live
        market-data worker has already collected (see each result's "real market data" vs "synthetic fallback" tag
        below — a synthetic result means no ticks existed yet for that date range). A{" "}
        <span className="text-text-primary">COMPLETE</span> backtest meeting the PAPER gate (
        {gateRequirement("BACKTEST" as never) ?? "Sharpe ≥ 0.8, max drawdown ≤ 15%, ≥ 200 trades"}) is required
        before a strategy can advance past the Shadow stage — see a strategy's detail page to advance it once its
        backtest passes.
      </div>

      <div className="rounded-[10px] border border-surface-border bg-surface-raised">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
          <span className="text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">Strategy</span>
          {strategies.data && strategies.data.items.length > 0 && (
            <select
              value={selectedId}
              onChange={(e) => setParams({ strategy: e.target.value })}
              className="rounded-md border border-surface-border-strong bg-surface-card px-2 py-1 text-[11px] text-text-primary outline-none"
            >
              {strategies.data.items.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.lifecycle_stage}
                </option>
              ))}
            </select>
          )}
        </div>

        {strategies.isPending ? (
          <p className="p-4 text-sm text-text-muted">Loading…</p>
        ) : !strategies.data || strategies.data.items.length === 0 ? (
          <p className="p-4 text-sm text-text-muted">
            No strategies registered yet —{" "}
            <Link to="/strategies" className="text-blue hover:underline">
              create one on the Strategies page
            </Link>{" "}
            first, then come back here to backtest it.
          </p>
        ) : selected ? (
          <div className="flex flex-wrap items-center gap-3 p-4 text-[11.5px]">
            <Link to={`/strategies/${selected.id}`} className="font-semibold text-text-primary hover:text-accent">
              {selected.name}
            </Link>
            <span className="text-text-faint">v{selected.version}</span>
            <span className="rounded-md border border-surface-border-strong px-2 py-0.5 text-[10px] font-bold text-text-faint">
              {selected.lifecycle_stage}
            </span>
          </div>
        ) : null}
      </div>

      {selectedId && <BacktestPanel strategyId={selectedId} />}
    </div>
  );
}
