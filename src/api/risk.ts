import { apiFetch } from "./client";
import type {
  CapitalPreservationStatusOut,
  KillSwitchEventOut,
  KillSwitchPayload,
  MessageResponse,
  RiskLimitCreatePayload,
  RiskLimitOut,
  RiskMetricsOut,
} from "./types";

export function getRiskMetrics() {
  return apiFetch<RiskMetricsOut>("/risk/metrics");
}

export function getCapitalPreservationStatus() {
  return apiFetch<CapitalPreservationStatusOut>("/risk/capital-preservation");
}

export function listRiskLimits() {
  return apiFetch<RiskLimitOut[]>("/risk/limits");
}

export function createRiskLimit(payload: RiskLimitCreatePayload) {
  return apiFetch<RiskLimitOut>("/risk/limits", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateRiskLimit(limitId: number, payload: Partial<Pick<RiskLimitCreatePayload, "limit_value" | "breach_action">> & { is_active?: boolean }) {
  return apiFetch<RiskLimitOut>(`/risk/limits/${limitId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteRiskLimit(limitId: number) {
  return apiFetch<MessageResponse>(`/risk/limits/${limitId}`, { method: "DELETE" });
}

// This is the single most destructive action in the app (cancels all orders,
// closes all positions) — see components/risk/KillSwitchModal.tsx for the
// confirm-with-consequences UI this is meant to be called from.
export function triggerKillSwitch(payload: KillSwitchPayload) {
  return apiFetch<KillSwitchEventOut>("/risk/killswitch", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getKillSwitchHistory() {
  return apiFetch<KillSwitchEventOut[]>("/risk/killswitch/history");
}
