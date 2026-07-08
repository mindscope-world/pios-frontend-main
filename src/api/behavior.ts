import { apiFetch } from "./client";

// Mirrors app/api/v1/endpoints/behavior.py exactly — real, DB-backed (derived
// from order history), not simulated. outcome_pnl in /overrides is a small
// proxy value (see the endpoint's own comment), not true realized P&L.
export interface BehaviorSession {
  score: number;
  status: "OPTIMAL" | "NORMAL" | "WARNING" | "LOCKED";
  overrides_this_hour: number;
  override_max_per_hour: number;
  deviation_from_ai_pct: number;
  trade_frequency_vs_baseline: number;
  override_reversal_rate: number;
  emotional_score: number;
  session_locked: boolean;
  lock_expires_at: string | null;
}

export function getBehaviorSession() {
  return apiFetch<BehaviorSession>("/behavior/session");
}

export interface BehaviorOverrideItem {
  id: string;
  occurred_at: string;
  ai_signal: "ALLOW" | "BLOCK";
  trader_action: "EXECUTED" | "CANCELLED MANUALLY" | "ATTEMPTED OVERRIDE";
  outcome_pnl: number;
  impact: "GOOD" | "POOR" | "BAD";
}

// GET /behavior/overrides returns {"items": [...]}, capped at 50 rows server-side.
export function getBehaviorOverrides(hours = 24) {
  return apiFetch<{ items: BehaviorOverrideItem[] }>(`/behavior/overrides?hours=${hours}`);
}

export interface BehaviorTrendPoint {
  ts: string;
  score: number;
  override_count: number;
}

// GET /behavior/trend returns a bare array (one point per hour in the window),
// not the {items: [...]} shape /overrides uses — mirrors behavior.py exactly.
export function getBehaviorTrend(hours = 24) {
  return apiFetch<BehaviorTrendPoint[]>(`/behavior/trend?hours=${hours}`);
}
