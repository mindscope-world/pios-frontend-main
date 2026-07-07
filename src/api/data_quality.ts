import { apiFetch } from "./client";
import type { PaginatedResponse } from "./types";

// Mirrors app/api/v1/endpoints/data_quality.py. quality/summary and
// quality/events are require_quant server-side (admin + quant roles) —
// gate rendering of those sections client-side to match, same pattern as
// components/risk/RiskLimitsAdmin.tsx. feeds/health, regime/{symbol}, and
// symbols are get_current_user (any authenticated role).

export const DQ_MODULES = [
  "TICK_VALIDATOR",
  "DUPLICATE_FILTER",
  "TIMESTAMP_CORRECTOR",
  "OUTLIER_DETECTOR",
  "CONTINUITY_MONITOR",
] as const;

export const DQ_SEVERITIES = ["INFO", "WARN", "ERROR", "CRITICAL"] as const;

export interface DQModuleStats {
  name: string;
  processed: string;
  pass_rate: string;
  flag_rate: string;
  reject_rate: string;
  avg_latency_ms: number;
}

export interface DQStats {
  total_ticks: number;
  pass_rate: number;
  flag_rate: number;
  reject_rate: number;
  gaps: number;
  modules: DQModuleStats[];
}

export function getDQSummary(hours = 24) {
  return apiFetch<DQStats>(`/data/quality/summary?hours=${hours}`);
}

export interface DQEvent {
  id: number;
  time: string;
  symbol_id: number | null;
  event_type: string;
  module: string;
  severity: "INFO" | "WARN" | "ERROR" | "CRITICAL";
  reason: string | null;
  resolved: boolean;
}

export function getDQEvents(params: { page?: number; page_size?: number; severity?: string; module?: string; symbol_id?: number } = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.set(k, String(v));
  const s = qs.toString();
  return apiFetch<PaginatedResponse<DQEvent>>(`/data/quality/events${s ? `?${s}` : ""}`);
}

export interface FeedHealth {
  symbol: string;
  lag_ms: number;
  dq_score: number;
  ok: boolean;
  exchange: string;
}

export function getFeedHealth() {
  return apiFetch<FeedHealth[]>("/data/feeds/health");
}

export interface RegimeState {
  symbol_id: number;
  regime_label: string;
  confidence: number;
  hmm_probs: Record<string, number> | null;
  detected_by: string;
  time: string;
}

export function getDataQualityRegime(symbol: string) {
  return apiFetch<RegimeState>(`/data/regime/${encodeURIComponent(symbol)}`);
}

export interface DQSymbol {
  id: number;
  symbol: string;
  asset_class: string;
  exchange: string;
}

export function listDQSymbols(assetClass?: string) {
  const qs = assetClass ? `?asset_class=${encodeURIComponent(assetClass)}` : "";
  return apiFetch<DQSymbol[]>(`/data/symbols${qs}`);
}
