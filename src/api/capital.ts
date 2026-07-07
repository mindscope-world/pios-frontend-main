import { apiFetch } from "./client";

// Mirrors app/api/v1/endpoints/capital.py exactly — neither route declares a
// Pydantic response_model, so these are hand-typed against the actual return
// dicts (capital_allocation() and trigger_rebalance()), not guessed.

export interface CapitalSlice {
  asset: string;
  target_pct: number;
  current_pct: number;
  value_usd: number;
  // HRP-vs-current gap driver — always 1.0 today (backend never adjusts it),
  // kept because the field is real and may become live later.
  gmig_modifier: number;
}

export interface CapitalAllocationOut {
  total_equity: number;
  cash_pct: number;
  deployed_pct: number;
  rebalance_needed: boolean;
  last_rebalanced_at: string;
  slices: CapitalSlice[];
}

export interface RebalanceJobOut {
  job_id: string;
}

// Computed from the CALLING USER's own positions/PnL snapshots
// (Position.user_id == current_user.id) — unlike positions/equity_curve
// elsewhere in the app, this one IS correctly scoped per-trader.
export function getCapitalAllocation() {
  return apiFetch<CapitalAllocationOut>("/capital/allocation");
}

// require_admin server-side. Synthetic: queues a BacktestJob-shaped
// placeholder row (config.type = "REBALANCE") rather than a real
// portfolio rebalance — see RebalanceJobOut's job_id is not pollable
// anywhere; there's no GET /capital/rebalance/{job_id}.
export function triggerRebalance() {
  return apiFetch<RebalanceJobOut>("/capital/rebalance", { method: "POST" });
}
