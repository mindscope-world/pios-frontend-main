import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getOrder, getOrderFills, getOrderTca } from "../../api/orders";
import { ApiError } from "../../api/client";
import { isTerminalOrderStatus } from "../../api/types";
import { OrderStatusBadge } from "../../components/trading/OrderStatusBadge";
import { ExecutionStyleBadge } from "../../components/trading/ExecutionStyleBadge";
import { CancelOrderModal } from "../../components/orders/CancelOrderModal";
import { useAuthStore } from "../../stores/authStore";

const TRADE_EXEC_ROLES = new Set(["admin", "trader"]);

export default function OrderDetailPage() {
  const { orderId = "" } = useParams();
  const role = useAuthStore((s) => s.user?.role);
  const canCancel = role ? TRADE_EXEC_ROLES.has(role) : false;
  const [cancelling, setCancelling] = useState(false);

  // No push channel for order/fill state changes exists server-side (see
  // roadmap-development-progress.md) — plain polling stopgap.
  const order = useQuery({ queryKey: ["order", orderId], queryFn: () => getOrder(orderId), enabled: !!orderId, refetchInterval: 15000 });
  const fills = useQuery({ queryKey: ["order-fills", orderId], queryFn: () => getOrderFills(orderId), enabled: !!orderId, refetchInterval: 15000 });
  // 404s with "No fills for order" until at least one fill exists — a real
  // empty state (see Card below), not a network error.
  const tca = useQuery({
    queryKey: ["order-tca", orderId],
    queryFn: () => getOrderTca(orderId),
    enabled: !!orderId,
    retry: false,
    refetchInterval: 15000,
  });

  if (order.isPending) return <p className="text-sm text-text-muted">Loading…</p>;

  if (order.isError) {
    const detail = order.error instanceof ApiError ? (order.error.body as { detail?: string } | null)?.detail ?? order.error.message : "Failed to load order.";
    return (
      <div className="space-y-3">
        <BackLink />
        <p className="rounded-lg border border-red-border bg-red-bg p-4 text-sm text-red">{detail}</p>
      </div>
    );
  }

  const o = order.data!;

  return (
    <div className="space-y-4">
      <BackLink />

      <div className="rounded-[10px] border border-surface-border bg-surface-raised">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="font-[family-name:var(--font-cond)] text-xl font-bold text-text-primary">
              {o.symbol?.symbol ?? "—"}
            </span>
            <span className={`text-sm font-semibold ${o.side === "BUY" ? "text-green" : "text-red"}`}>{o.side}</span>
            <OrderStatusBadge status={o.status} />
            <ExecutionStyleBadge executionStyle={o.execution_style} />
          </div>
          {canCancel && !isTerminalOrderStatus(o.status) && (
            <button
              onClick={() => setCancelling(true)}
              className="rounded-lg border border-red-border bg-red-bg px-3 py-1.5 text-[11px] font-semibold text-red"
            >
              Cancel order
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
          <Field label="Order type" value={o.order_type} />
          <Field label="Time in force" value={o.time_in_force} />
          <Field label="Qty (filled)" value={`${o.filled_qty}/${o.qty}`} />
          <Field label="Price" value={o.price ?? "—"} />
          <Field label="Avg fill price" value={o.avg_fill_price ?? "—"} />
          <Field label="Client order id" value={o.client_order_id ?? "—"} />
          <Field label="Broker order id" value={o.broker_order_id ?? "—"} />
          <Field label="Reject reason" value={o.reject_reason ?? "—"} />
          <Field label="Created" value={new Date(o.created_at).toLocaleString()} />
          <Field label="Submitted" value={o.submitted_at ? new Date(o.submitted_at).toLocaleString() : "—"} />
          <Field label="Filled" value={o.filled_at ? new Date(o.filled_at).toLocaleString() : "—"} />
        </div>
      </div>

      <div className="rounded-[10px] border border-surface-border bg-surface-raised">
        <div className="border-b border-surface-border px-4 py-3 text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">
          State history
        </div>
        {o.state_history.length === 0 ? (
          <p className="p-4 text-sm text-text-muted">No transitions recorded.</p>
        ) : (
          <div className="p-4">
            {o.state_history.map((ev, i) => (
              <div key={i} className="flex gap-3 border-b border-surface-border py-2 text-[11.5px] last:border-0">
                <span className="w-40 flex-shrink-0 font-mono text-text-faint">{new Date(ev.at).toLocaleString()}</span>
                <span className="text-text-primary">
                  {ev.from ?? "—"} → <strong>{ev.to}</strong>
                </span>
                {ev.reason && <span className="text-text-faint">({ev.reason})</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-[10px] border border-surface-border bg-surface-raised">
        <div className="border-b border-surface-border px-4 py-3 text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">
          Fills
        </div>
        {fills.isPending ? (
          <p className="p-4 text-sm text-text-muted">Loading…</p>
        ) : !fills.data || fills.data.length === 0 ? (
          <p className="p-4 text-sm text-text-muted">No fills yet.</p>
        ) : (
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="bg-surface-card text-[9.5px] uppercase tracking-[.06em] text-text-faint">
                <th className="px-2.5 py-2 text-left">Filled at</th>
                <th className="px-2.5 py-2 text-left">Side</th>
                <th className="px-2.5 py-2 text-left">Qty</th>
                <th className="px-2.5 py-2 text-left">Price</th>
                <th className="px-2.5 py-2 text-left">Commission</th>
                <th className="px-2.5 py-2 text-left">Slippage (bps)</th>
                <th className="px-2.5 py-2 text-left">Funding cost</th>
                <th className="px-2.5 py-2 text-left">Total cost</th>
              </tr>
            </thead>
            <tbody>
              {fills.data.map((f) => (
                <tr key={f.id} className="border-b border-surface-border last:border-0">
                  <td className="px-2.5 py-2.5 font-mono text-text-faint">{new Date(f.filled_at).toLocaleString()}</td>
                  <td className={`px-2.5 py-2.5 ${f.side === "BUY" ? "text-green" : "text-red"}`}>{f.side}</td>
                  <td className="px-2.5 py-2.5 font-mono">{f.qty}</td>
                  <td className="px-2.5 py-2.5 font-mono">{f.price}</td>
                  <td className="px-2.5 py-2.5 font-mono">{f.commission}</td>
                  <td className="px-2.5 py-2.5 font-mono">{f.slippage_bps ?? "—"}</td>
                  <td className="px-2.5 py-2.5 font-mono">{f.funding_cost}</td>
                  <td className="px-2.5 py-2.5 font-mono">{f.total_cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-[10px] border border-surface-border bg-surface-raised">
        <div className="border-b border-surface-border px-4 py-3 text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">
          Transaction cost analysis
        </div>
        {tca.isPending ? (
          <p className="p-4 text-sm text-text-muted">Loading…</p>
        ) : tca.isError ? (
          <p className="p-4 text-sm text-text-muted">TCA isn't available until this order has at least one fill.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
            <Field label="Total fills" value={tca.data.total_fills} />
            <Field label="Total qty" value={tca.data.total_qty} />
            <Field label="Avg fill price" value={tca.data.avg_fill_price} />
            <Field label="Commission total" value={tca.data.commission_total} />
            <Field label="Avg slippage (bps)" value={tca.data.slippage_bps_avg ?? "—"} />
            <Field label="Avg spread cost (bps)" value={tca.data.spread_cost_bps_avg ?? "—"} />
            <Field label="Funding cost total" value={tca.data.funding_cost_total} />
            <Field label="Total cost" value={tca.data.total_cost} />
          </div>
        )}
      </div>

      {cancelling && <CancelOrderModal order={o} onClose={() => setCancelling(false)} />}
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/orders" className="text-[11px] font-semibold text-text-faint hover:text-text-primary">
      ← Back to order history
    </Link>
  );
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[9px] uppercase tracking-[.06em] text-text-faint">{label}</div>
      <div className="font-mono text-[13px] text-text-primary">{value}</div>
    </div>
  );
}
