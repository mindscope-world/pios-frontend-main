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

// V10.4 D.2 -- one clock's raw exposure vs its admin-configured band for the
// current regime. band_min_pct/band_max_pct/clamped are null/false when no
// band is configured for (clock, regime) -- clock_bands.constrain() always
// reports all 3 clocks rather than hiding an unconfigured one.
export interface ClockBandRow {
  clock: "SHORT_FLOW" | "MEDIUM_TREND" | "LONG_MACRO";
  raw_pct: number;
  band_min_pct: number | null;
  band_max_pct: number | null;
  clamped_pct: number;
  clamped: boolean;
}

// V10.3 clock-conflict reconciler (labeled MVP) -- derived from D.2's own
// constrain() output, not an invented signal. type/detail are null when no
// conflict is active.
export interface ClockConflictOut {
  conflict: boolean;
  type: "LONG_MEDIUM_CLOCK_CONFLICT" | null;
  detail: string | null;
}

// V10.4 D.3 Dynamic Reallocation Trigger (labeled MVP) -- FREEZE
// unconditionally on an active conflict, else a speed tier off the primary
// symbol's PRS reliability tier (see prs_service.py -- PRS is symbol/global
// -scoped in this codebase, not per-clock).
export interface ReallocationPlanOut {
  speed: "FREEZE" | "FAST" | "NORMAL" | "SLOW";
  reason: string;
}

export interface ClockBandsOut {
  regime: string | null;
  clocks: ClockBandRow[];
  conflict: ClockConflictOut;
  reallocation_plan: ReallocationPlanOut;
}

export interface CapitalAllocationOut {
  total_equity: number;
  cash_pct: number;
  deployed_pct: number;
  rebalance_needed: boolean;
  last_rebalanced_at: string;
  optimiser_mode: string;
  slices: CapitalSlice[];
  clock_bands: ClockBandsOut;
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
