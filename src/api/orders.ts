import { apiFetch } from "./client";
import type {
  CancelOrderResponse,
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

export function listOrders(params: { page?: number; page_size?: number; status?: string; symbol?: string } = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.set(k, String(v));
  const s = qs.toString();
  return apiFetch<PaginatedResponse<OrderOut>>(`/orders${s ? `?${s}` : ""}`);
}

export function cancelOrder(orderId: string) {
  return apiFetch<CancelOrderResponse>(`/orders/${orderId}`, { method: "DELETE" });
}

export function getOrderFills(orderId: string) {
  return apiFetch<FillOut[]>(`/orders/${orderId}/fills`);
}

export function getOrderTca(orderId: string) {
  return apiFetch<TCAReport>(`/orders/${orderId}/tca`);
}
