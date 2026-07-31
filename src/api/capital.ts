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
  // Why PRS reliability came back UNKNOWN (e.g. "no graded decisions yet")
  // -- null once a real tier was actually computed. Was silently dropped
  // before reaching the frontend, which just showed a bare UNKNOWN.
  prs_note: string | null;
}

export interface ClockBandsOut {
  regime: string | null;
  clocks: ClockBandRow[];
  conflict: ClockConflictOut;
  reallocation_plan: ReallocationPlanOut;
}

export interface CapitalAllocationOut {
  total_equity: number;
  // True when there's no real PnLSnapshot yet and total_equity/cash_pct are
  // a $100,000/20%-cash placeholder starting point for this endpoint's own
  // math, not a real balance -- same disclosure convention risk.ts's
  // equity_is_estimated already uses for the identical situation.
  equity_is_estimated: boolean;
  cash_pct: number;
  deployed_pct: number;
  rebalance_needed: boolean;
  // null when this account has never actually rebalanced (no real
  // KillSwitchEvent) -- was previously a fabricated "3 days ago".
  last_rebalanced_at: string | null;
  optimiser_mode: string;
  slices: CapitalSlice[];
  clock_bands: ClockBandsOut;
}

export interface RebalanceJobOut {
  job_id: string;
}

// GET /capital/rebalance/{job_id} response — the job IS a real BacktestJob
// row (rebalance_portfolio_task, backtest_worker.py, recomputes real HRP
// target weights), so this mirrors app/schemas/all_schemas.py's
// BacktestJobOut, but with full_report typed to what a REBALANCE-type job
// actually writes (target_weights/asset_exposure_usd) rather than reusing
// strategies.ts's backtest-specific BacktestFullReport shape, which doesn't
// apply here.
export type RebalanceJobStatus = "QUEUED" | "RUNNING" | "COMPLETE" | "FAILED";

export interface RebalanceJobStatusOut {
  id: string;
  status: RebalanceJobStatus;
  progress_pct: number;
  full_report: {
    type: "REBALANCE";
    target_weights: Record<string, number>;
    asset_exposure_usd: Record<string, number>;
  } | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// Computed from the CALLING USER's own positions/PnL snapshots
// (Position.user_id == current_user.id) — unlike positions/equity_curve
// elsewhere in the app, this one IS correctly scoped per-trader.
export function getCapitalAllocation() {
  return apiFetch<CapitalAllocationOut>("/capital/allocation");
}

// require_admin server-side. Queues a real HRP-recomputation job
// (rebalance_portfolio_task) tracked as a BacktestJob row (config.type ==
// "REBALANCE") — poll it via getRebalanceJob(job_id).
export function triggerRebalance() {
  return apiFetch<RebalanceJobOut>("/capital/rebalance", { method: "POST" });
}

// Scoped server-side to the job's own submitter or an admin (matching
// triggerRebalance's require_admin trigger permission) — 404s otherwise,
// same as a job that doesn't exist.
export function getRebalanceJob(jobId: string) {
  return apiFetch<RebalanceJobStatusOut>(`/capital/rebalance/${jobId}`);
}
