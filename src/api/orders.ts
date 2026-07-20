import { apiFetch } from "./client";
import type {
  CancelOrderResponse,
  ConfirmDecisionPayload,
  FillOut,
  OrderCreatePayload,
  OrderOut,
  PaginatedResponse,
  TCAReport,
} from "./types";

export function createOrder(payload: OrderCreatePayload) {
  return apiFetch<OrderOut>("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Semi-auto (§3.1) — POST /orders/confirm-decision. Only symbol + broker_id
// go over the wire; the backend re-derives side/qty/eligibility from the
// live decision itself (see order_service.confirm_decision).
export function confirmDecision(payload: ConfirmDecisionPayload) {
  return apiFetch<OrderOut>("/orders/confirm-decision", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listOrders(params: { page?: number; page_size?: number; status?: string; symbol?: string } = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.set(k, String(v));
  const s = qs.toString();
  return apiFetch<PaginatedResponse<OrderOut>>(`/orders${s ? `?${s}` : ""}`);
}

export function getOrder(orderId: string) {
  return apiFetch<OrderOut>(`/orders/${orderId}`);
}

export function cancelOrder(orderId: string) {
  return apiFetch<CancelOrderResponse>(`/orders/${orderId}`, { method: "DELETE" });
}

export function getOrderFills(orderId: string) {
  return apiFetch<FillOut[]>(`/orders/${orderId}/fills`);
}

// GET /orders/fills/all — every fill for the current user across all orders,
// newest first, paginated (orders.py:list_all_fills).
export function listAllFills(params: { page?: number; page_size?: number } = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.set(k, String(v));
  const s = qs.toString();
  return apiFetch<PaginatedResponse<FillOut>>(`/orders/fills/all${s ? `?${s}` : ""}`);
}

export function getOrderTca(orderId: string) {
  return apiFetch<TCAReport>(`/orders/${orderId}/tca`);
}
