import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listAllFills, listOrders } from "../../api/orders";
import { useChannelSocket } from "../../realtime/useChannelSocket";
import { isTerminalOrderStatus, type OrderOut, type OrderStatus } from "../../api/types";
import { OrderStatusBadge } from "../../components/trading/OrderStatusBadge";
import { ExecutionStyleBadge } from "../../components/trading/ExecutionStyleBadge";
import { CancelOrderModal } from "../../components/orders/CancelOrderModal";
import { useAuthStore } from "../../stores/authStore";

// DELETE /orders/{id} is require_trade_exec (admin + trader) server-side —
// hide the Cancel action for other roles rather than let it 403.
const TRADE_EXEC_ROLES = new Set(["admin", "trader"]);

const STATUS_OPTIONS: (OrderStatus | "")[] = ["", "NEW", "SUBMITTED", "PARTIAL", "FILLED", "CANCELLED", "REJECTED", "EXPIRED"];

const PAGE_SIZE = 25;

export default function OrdersPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canCancel = role ? TRADE_EXEC_ROLES.has(role) : false;

  const [view, setView] = useState<"orders" | "fills">("orders");
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [symbolDraft, setSymbolDraft] = useState("");
  const [symbol, setSymbol] = useState("");
  const [page, setPage] = useState(1);
  const [fillsPage, setFillsPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<OrderOut | null>(null);

  const queryClient = useQueryClient();
  const orders = useQuery({
    queryKey: ["orders", { page, status, symbol }],
    queryFn: () => listOrders({ page, page_size: PAGE_SIZE, status: status || undefined, symbol: symbol || undefined }),
    placeholderData: (prev) => prev,
    // Slow safety-net poll behind the user-scoped "orders" WS push below.
    refetchInterval: 60000,
  });

  // GET /orders/fills/all — the account-wide fill tape, distinct from the
  // per-order fills already shown on OrderDetailPage. Only fetched while the
  // Fills view is active.
  const fills = useQuery({
    queryKey: ["fills-all", fillsPage],
    queryFn: () => listAllFills({ page: fillsPage, page_size: PAGE_SIZE }),
    placeholderData: (prev) => prev,
    enabled: view === "fills",
    refetchInterval: 60000,
  });

  // The API process publishes a user-scoped event on every order lifecycle
  // change — submit, fill, algo slice, cancel (app/services/trade_events.py).
  // The payload is a nudge, not state: invalidate and let the query refetch
  // with the current filters.
  useChannelSocket("orders", undefined, (msg) => {
    if (msg.event === "order_update") {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["fills-all"] });
    }
  });

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setSymbol(symbolDraft.trim().toUpperCase());
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[10px] border border-surface-border bg-surface-raised">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
          <div className="flex items-center gap-1.5">
            {(["orders", "fills"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md border px-3 py-1 text-[10.5px] font-bold uppercase tracking-[.06em] ${
                  view === v ? "border-blue-border bg-blue-bg text-blue" : "border-surface-border-strong text-text-faint"
                }`}
              >
                {v === "orders" ? "Order history" : "All fills"}
              </button>
            ))}
            {/* Orders are PLACED on the Execution page's ticket (ModeActions),
                not here — this page is history only. Give that a signpost. */}
            {canCancel && (
              <Link
                to="/execution"
                className="rounded-md border border-green-border bg-green-bg px-3 py-1 text-[10.5px] font-bold uppercase tracking-[.06em] text-green"
              >
                + New order
              </Link>
            )}
          </div>
          {view === "orders" && (
          <form onSubmit={applyFilters} className="flex items-center gap-2">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as OrderStatus | "");
                setPage(1);
              }}
              className="rounded-md border border-surface-border-strong bg-surface-card px-2 py-1 text-[10.5px] text-text-primary outline-none"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "" ? "All statuses" : s}
                </option>
              ))}
            </select>
            <input
              value={symbolDraft}
              onChange={(e) => setSymbolDraft(e.target.value)}
              placeholder="Symbol (e.g. BTC/USDT)"
              className="w-40 rounded-md border border-surface-border-strong bg-surface-card px-2 py-1 text-[10.5px] text-text-primary outline-none"
            />
            <button
              type="submit"
              className="rounded-md border border-surface-border-strong px-3 py-1 text-[10.5px] font-semibold text-text-muted hover:border-text-faint hover:text-text-primary"
            >
              Filter
            </button>
          </form>
          )}
        </div>

        {view === "fills" ? (
          fills.isPending ? (
            <p className="p-4 text-sm text-text-muted">Loading…</p>
          ) : !fills.data || fills.data.items.length === 0 ? (
            <p className="p-4 text-sm text-text-muted">No fills yet — they appear here as your orders execute.</p>
          ) : (
            <>
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="bg-surface-card text-[9.5px] uppercase tracking-[.06em] text-text-faint">
                    <th className="px-2.5 py-2 text-left">Filled at</th>
                    <th className="px-2.5 py-2 text-left">Side</th>
                    <th className="px-2.5 py-2 text-right">Qty</th>
                    <th className="px-2.5 py-2 text-right">Price</th>
                    <th className="px-2.5 py-2 text-right">Commission</th>
                    <th className="px-2.5 py-2 text-right">Slippage</th>
                    <th className="px-2.5 py-2 text-right">Order</th>
                  </tr>
                </thead>
                <tbody>
                  {fills.data.items.map((f) => (
                    <tr key={f.id} className="border-b border-surface-border last:border-0">
                      <td className="px-2.5 py-2.5 font-mono text-text-faint">{new Date(f.filled_at).toLocaleString()}</td>
                      <td className={`px-2.5 py-2.5 ${f.side === "BUY" ? "text-green" : "text-red"}`}>{f.side}</td>
                      <td className="px-2.5 py-2.5 text-right font-mono">{f.qty}</td>
                      <td className="px-2.5 py-2.5 text-right font-mono">{f.price}</td>
                      <td className="px-2.5 py-2.5 text-right font-mono">{f.commission}</td>
                      <td className="px-2.5 py-2.5 text-right font-mono">{f.slippage_bps != null ? `${f.slippage_bps} bps` : "—"}</td>
                      <td className="px-2.5 py-2.5 text-right">
                        <Link to={`/orders/${f.order_id}`} className="text-[10.5px] font-semibold text-text-faint hover:text-text-primary">
                          View order
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {fills.data.pages > 1 && (
                <div className="flex items-center justify-between border-t border-surface-border px-4 py-2.5 text-[10.5px] text-text-faint">
                  <span>
                    Page {fills.data.page} of {fills.data.pages} · {fills.data.total} fills
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFillsPage((p) => Math.max(1, p - 1))}
                      disabled={fillsPage <= 1}
                      className="rounded-md border border-surface-border-strong px-2.5 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setFillsPage((p) => Math.min(fills.data!.pages, p + 1))}
                      disabled={fillsPage >= fills.data.pages}
                      className="rounded-md border border-surface-border-strong px-2.5 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )
        ) : orders.isPending ? (
          <p className="p-4 text-sm text-text-muted">Loading…</p>
        ) : !orders.data || orders.data.items.length === 0 ? (
          <p className="p-4 text-sm text-text-muted">No orders match these filters.</p>
        ) : (
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="bg-surface-card text-[9.5px] uppercase tracking-[.06em] text-text-faint">
                <th className="px-2.5 py-2 text-left">Created</th>
                <th className="px-2.5 py-2 text-left">Symbol</th>
                <th className="px-2.5 py-2 text-left">Side</th>
                <th className="px-2.5 py-2 text-left">Type</th>
                <th className="px-2.5 py-2 text-left">Qty (filled)</th>
                <th className="px-2.5 py-2 text-left">Avg fill</th>
                <th className="px-2.5 py-2 text-left">Status</th>
                <th className="px-2.5 py-2 text-left">Execution</th>
                <th className="px-2.5 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.data.items.map((o) => (
                <tr key={o.id} className="border-b border-surface-border last:border-0">
                  <td className="px-2.5 py-2.5 font-mono text-text-faint">{new Date(o.created_at).toLocaleString()}</td>
                  <td className="px-2.5 py-2.5">
                    <Link to={`/orders/${o.id}`} className="font-semibold text-text-primary hover:text-accent">
                      {o.symbol?.symbol ?? "—"}
                    </Link>
                  </td>
                  <td className={`px-2.5 py-2.5 ${o.side === "BUY" ? "text-green" : "text-red"}`}>{o.side}</td>
                  <td className="px-2.5 py-2.5">{o.order_type}</td>
                  <td className="px-2.5 py-2.5 font-mono">
                    {o.filled_qty}/{o.qty}
                  </td>
                  <td className="px-2.5 py-2.5 font-mono">{o.avg_fill_price ?? "—"}</td>
                  <td className="px-2.5 py-2.5">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="px-2.5 py-2.5">
                    <ExecutionStyleBadge executionStyle={o.execution_style} />
                  </td>
                  <td className="px-2.5 py-2.5 text-right">
                    <div className="flex justify-end gap-2">
                      <Link to={`/orders/${o.id}`} className="text-[10.5px] font-semibold text-text-faint hover:text-text-primary">
                        View
                      </Link>
                      {canCancel && !isTerminalOrderStatus(o.status) && (
                        <button
                          onClick={() => setCancelTarget(o)}
                          className="text-[10.5px] font-semibold text-red hover:underline"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {view === "orders" && orders.data && orders.data.pages > 1 && (
          <div className="flex items-center justify-between border-t border-surface-border px-4 py-2.5 text-[10.5px] text-text-faint">
            <span>
              Page {orders.data.page} of {orders.data.pages} · {orders.data.total} orders
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border border-surface-border-strong px-2.5 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(orders.data!.pages, p + 1))}
                disabled={page >= orders.data.pages}
                className="rounded-md border border-surface-border-strong px-2.5 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {cancelTarget && <CancelOrderModal order={cancelTarget} onClose={() => setCancelTarget(null)} />}
    </div>
  );
}
