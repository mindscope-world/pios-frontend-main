import { apiFetch } from "./client";
import type { PaginatedResponse } from "./types";

// Mirrors app/models/all_models.py:29 StageEnum exactly.
export type LifecycleStage = "IDEA" | "RESEARCH" | "BACKTEST" | "PAPER" | "LIVE_SMALL" | "SCALED" | "MONITOR" | "RETIRED";

// app/services/strategy_service.py:LIFECYCLE_ORDER — advance() always moves
// exactly one stage forward (there is no "jump to stage X"), so the UI only
// ever needs "what's next", not an arbitrary target picker.
export const LIFECYCLE_ORDER: LifecycleStage[] = [
  "IDEA",
  "RESEARCH",
  "BACKTEST",
  "PAPER",
  "LIVE_SMALL",
  "SCALED",
  "MONITOR",
  "RETIRED",
];

export function nextStage(stage: LifecycleStage): LifecycleStage | null {
  const i = LIFECYCLE_ORDER.indexOf(stage);
  return i >= 0 && i < LIFECYCLE_ORDER.length - 1 ? LIFECYCLE_ORDER[i + 1] : null;
}

// Human-readable gate requirement for the NEXT stage, mirroring
// strategy_service.py's _check_gate exactly — shown before the user clicks
// Advance, not just discovered from a failure after the fact.
export function gateRequirement(stage: LifecycleStage): string | null {
  const next = nextStage(stage);
  if (next === "BACKTEST") return "Requires a non-empty hypothesis.";
  if (next === "PAPER") return "Requires a COMPLETE backtest with Sharpe ≥ 0.8, max drawdown ≤ 15%, and ≥ 200 trades.";
  if (next === "LIVE_SMALL" || next === "SCALED") {
    return "Requires a COMPLETE backtest meeting the PAPER gate, and is_paper_only must be cleared by an admin.";
  }
  return null;
}

export interface GateHistoryEntry {
  from: string;
  to: string;
  passed: boolean;
  reason: string;
  ts: string;
  actor: string;
  notes: string | null;
}

export interface StrategyOut {
  id: string;
  name: string;
  version: string;
  lifecycle_stage: LifecycleStage;
  generation: number;
  parent_id: string | null;
  hypothesis: string | null;
  description?: string | null;
  fitness_score: number | null;
  sharpe_last: number | null;
  risk_profile: Record<string, unknown>;
  config: Record<string, unknown>;
  is_paper_only: boolean;
  tags: string[] | null;
  gate_history: GateHistoryEntry[];
  deployed_at: string | null;
  retired_at: string | null;
  retirement_reason: string | null;
  created_at: string;
}

export interface StrategyCreatePayload {
  name: string;
  hypothesis?: string | null;
  description?: string | null;
  tags?: string[] | null;
}

export interface StrategyUpdatePayload {
  name?: string;
  hypothesis?: string;
  description?: string;
  tags?: string[];
}

export type BacktestStatus = "QUEUED" | "RUNNING" | "COMPLETE" | "FAILED";
export type CostModel = "FULL" | "ZERO_COST" | "FEES_ONLY" | "SLIPPAGE_ONLY";

export interface BacktestJobCreatePayload {
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  symbols: string[];
  cost_model?: CostModel;
}

export interface BacktestJobOut {
  id: string;
  strategy_id: string;
  status: BacktestStatus;
  progress_pct: number;
  start_date: string;
  end_date: string;
  cost_model: CostModel;
  sharpe_ratio: number | null;
  max_drawdown: number | null;
  total_return: number | null;
  trade_count: number | null;
  win_rate: number | null;
  profit_factor: number | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  // Not in BacktestJobOut's response_model on the backend (celery_task_id
  // isn't serialized) — kept optional here in case a future response adds it.
  celery_task_id?: string | null;
}

export function listStrategies(params: { page?: number; page_size?: number; stage?: string } = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.set(k, String(v));
  const s = qs.toString();
  return apiFetch<PaginatedResponse<StrategyOut>>(`/strategies${s ? `?${s}` : ""}`);
}

export function getStrategy(strategyId: string) {
  return apiFetch<StrategyOut>(`/strategies/${strategyId}`);
}

export function createStrategy(payload: StrategyCreatePayload) {
  return apiFetch<StrategyOut>("/strategies", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateStrategy(strategyId: string, payload: StrategyUpdatePayload) {
  return apiFetch<StrategyOut>(`/strategies/${strategyId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// POST /{id}/advance moves exactly one lifecycle stage forward and is
// gate-checked server-side — see gateRequirement() above for what each gate
// actually needs. A failed gate currently 500s with no JSON body instead of
// the clean 422 the service layer's raise_http_for() was written to produce
// (verified live: app/api/v1/endpoints/strategies.py's advance() doesn't
// call it) — callers must treat a body-less error as "gate failed, reason
// unknown" rather than assuming failure never happens.
export function advanceStrategy(strategyId: string, notes?: string) {
  return apiFetch<StrategyOut>(`/strategies/${strategyId}/advance`, {
    method: "POST",
    body: JSON.stringify({ notes: notes || null }),
  });
}

export function retireStrategy(strategyId: string, notes: string) {
  return apiFetch<StrategyOut>(`/strategies/${strategyId}/retire`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  });
}

export function deleteStrategy(strategyId: string) {
  return apiFetch<{ message: string }>(`/strategies/${strategyId}`, { method: "DELETE" });
}

export function submitBacktest(strategyId: string, payload: BacktestJobCreatePayload) {
  return apiFetch<BacktestJobOut>(`/strategies/${strategyId}/backtest`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listBacktestJobs(strategyId: string) {
  return apiFetch<BacktestJobOut[]>(`/strategies/${strategyId}/backtest`);
}

export function getBacktestJob(jobId: string) {
  return apiFetch<BacktestJobOut>(`/strategies/backtest/${jobId}`);
}
