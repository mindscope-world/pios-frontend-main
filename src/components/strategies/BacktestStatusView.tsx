import { useQuery } from "@tanstack/react-query";
import { getStrategy, type PaperGateStatusLabel } from "../../api/strategies";
import { NullableNumber } from "../../components/ui/NullableNumber";

const GATE_STATUS_CLS: Record<PaperGateStatusLabel, string> = {
  not_yet_validated: "bg-surface-overlay text-text-faint border-surface-border-strong",
  backtest_in_progress: "bg-amber-bg text-amber border-amber-border",
  validated: "bg-green-bg text-green border-green-border",
  gate_failed: "bg-red-bg text-red border-red-border",
};

const GATE_STATUS_LABEL: Record<PaperGateStatusLabel, string> = {
  not_yet_validated: "Not yet validated",
  backtest_in_progress: "Backtest in progress",
  validated: "Validated",
  gate_failed: "Gate not met",
};

/**
 * Read-only counterpart to BacktestPanel for non-quant/admin roles (§3.1/3.2
 * reconciliation) — a status indicator plus the PAPER-gate threshold result,
 * no controls, no form, no Run button. Uses the same ["strategy", strategyId]
 * query key StrategyDetailPage.tsx already fetches with, so nesting this
 * inside that page costs no extra network round trip.
 */
export function BacktestStatusView({ strategyId }: { strategyId: string }) {
  const strategy = useQuery({ queryKey: ["strategy", strategyId], queryFn: () => getStrategy(strategyId) });

  return (
    <div className="rounded-[10px] border border-surface-border bg-surface-raised">
      <div className="border-b border-surface-border px-4 py-3 text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">
        Backtest status
      </div>

      {strategy.isPending ? (
        <p className="p-4 text-sm text-text-muted">Loading…</p>
      ) : !strategy.data?.paper_gate ? (
        <p className="p-4 text-sm text-text-muted">Status unavailable.</p>
      ) : (
        <div className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2.5">
            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${GATE_STATUS_CLS[strategy.data.paper_gate.status]}`}>
              {GATE_STATUS_LABEL[strategy.data.paper_gate.status]}
            </span>
            <span className="text-[10.5px] text-text-faint">{strategy.data.paper_gate.reason}</span>
          </div>

          {strategy.data.paper_gate.checks.length > 0 && (
            <div className="grid grid-cols-3 gap-2.5">
              {strategy.data.paper_gate.checks.map((check) => (
                <div key={check.name}>
                  <div className="text-[9px] uppercase tracking-[.05em] text-text-ghost">{check.label}</div>
                  <div className={`font-mono text-[11.5px] ${check.passed ? "text-green" : "text-red"}`}>
                    <NullableNumber value={check.value} /> <span className="text-text-ghost">({check.threshold_label})</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="mt-3 text-[10px] text-text-ghost">
            {strategy.data.paper_gate.based_on_job_created_at
              ? `Based on the backtest run ${new Date(strategy.data.paper_gate.based_on_job_created_at).toLocaleString()}.`
              : "No completed backtest yet."}
          </p>
        </div>
      )}
    </div>
  );
}
