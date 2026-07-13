import { apiFetch } from "./client";
import type {
  BrokerCreatePayload,
  BrokerOut,
  BrokerTestResult,
  MessageResponse,
  PaginatedResponse,
} from "./types";

export function listBrokers(params: { page?: number; page_size?: number } = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.set(k, String(v));
  const s = qs.toString();
  return apiFetch<PaginatedResponse<BrokerOut>>(`/brokers${s ? `?${s}` : ""}`);
}

export function createBroker(payload: BrokerCreatePayload) {
  return apiFetch<BrokerOut>("/brokers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getBroker(brokerId: string) {
  return apiFetch<BrokerOut>(`/brokers/${brokerId}`);
}

export function updateBroker(brokerId: string, payload: Partial<Pick<BrokerCreatePayload, "name" | "config">> & { is_active?: boolean }) {
  return apiFetch<BrokerOut>(`/brokers/${brokerId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteBroker(brokerId: string) {
  return apiFetch<MessageResponse>(`/brokers/${brokerId}`, { method: "DELETE" });
}

export function testBroker(brokerId: string) {
  return apiFetch<BrokerTestResult>(`/brokers/${brokerId}/test`, { method: "POST" });
}

export function getBrokerAccount(brokerId: string) {
  return apiFetch<Record<string, unknown>>(`/brokers/${brokerId}/account`);
}

export interface BrokerReconciliationItem {
  symbol: string;
  broker_qty: number;
  app_qty: number;
  drift_qty: number;
  status: "MATCHED" | "DRIFT" | "BROKER_ONLY" | "APP_ONLY";
}

export interface BrokerReconciliation {
  broker_id: string;
  in_sync: boolean;
  items: BrokerReconciliationItem[];
  note: string;
  generated_at: string;
}

export function getBrokerReconciliation(brokerId: string) {
  return apiFetch<BrokerReconciliation>(`/brokers/${brokerId}/reconciliation`);
}

export interface AdoptHoldingResult {
  adopted: boolean;
  symbol: string;
  side: string;
  qty: number;
  avg_cost: number;
  adopted_at: string;
}

export function adoptBrokerHolding(brokerId: string, symbol: string) {
  return apiFetch<AdoptHoldingResult>(`/brokers/${brokerId}/reconciliation/adopt`, {
    method: "POST",
    body: JSON.stringify({ symbol }),
  });
}
