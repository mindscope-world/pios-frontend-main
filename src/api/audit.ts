import { apiFetch } from "./client";
import type { AuditEntryOut, AuditVerifyResult, PaginatedResponse } from "./types";

// Mirrors app/api/v1/endpoints/audit.py exactly. Both routes are
// require_audit (admin + compliance + quant) server-side.

export interface ListAuditParams {
  page?: number;
  page_size?: number;
  action?: string;
  resource_type?: string;
  actor_email?: string;
}

export function listAudit(params: ListAuditParams = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
  const s = qs.toString();
  return apiFetch<PaginatedResponse<AuditEntryOut>>(`/audit${s ? `?${s}` : ""}`);
}

// SHA-256 hash-chain integrity check — walks every row in id order and
// recomputes each record_hash from (action, resource_type, resource_id,
// actor_id, event_time) chained against prev_hash. Returns the first broken
// link's id, or null if the whole chain verifies.
export function verifyAuditChain() {
  return apiFetch<AuditVerifyResult>("/audit/verify");
}
