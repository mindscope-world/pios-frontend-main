import { apiFetch } from "./client";
import type { AlertOut, MessageResponse, PaginatedResponse } from "./types";

// Mirrors app/api/v1/endpoints/alerts.py exactly. Distinct from
// realtime/useNotificationStream.ts's SSE toast feed (AlertCenter) — that's a
// live push of the same underlying events; this is the persistent,
// filterable, acknowledgeable record of them.

export interface ListAlertsParams {
  page?: number;
  page_size?: number;
  severity?: string;
  acked?: boolean;
  source?: string;
}

export function listAlerts(params: ListAlertsParams = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.set(k, String(v));
  const s = qs.toString();
  return apiFetch<PaginatedResponse<AlertOut>>(`/alerts${s ? `?${s}` : ""}`);
}

export function getAlert(alertId: string) {
  return apiFetch<AlertOut>(`/alerts/${alertId}`);
}

export function acknowledgeAlert(alertId: string, note?: string) {
  return apiFetch<AlertOut>(`/alerts/${alertId}/acknowledge`, {
    method: "POST",
    body: JSON.stringify({ note: note ?? null }),
  });
}

export function acknowledgeAllAlerts() {
  return apiFetch<MessageResponse>("/alerts/acknowledge-all", { method: "POST" });
}
