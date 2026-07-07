import { apiFetch } from "./client";
import type { PaginatedResponse } from "./types";

// Mirrors app/models/all_models.py:29 StageEnum exactly.
export type LifecycleStage = "IDEA" | "RESEARCH" | "BACKTEST" | "PAPER" | "LIVE_SMALL" | "SCALED" | "MONITOR" | "RETIRED";

export interface StrategyOut {
  id: string;
  name: string;
  version: string;
  lifecycle_stage: LifecycleStage;
  generation: number;
  hypothesis: string | null;
  fitness_score: number | null;
  sharpe_last: number | null;
  tags: string[] | null;
  created_at: string;
}

export function listStrategies(params: { page?: number; page_size?: number } = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.set(k, String(v));
  const s = qs.toString();
  return apiFetch<PaginatedResponse<StrategyOut>>(`/strategies${s ? `?${s}` : ""}`);
}
