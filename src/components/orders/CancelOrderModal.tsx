import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelOrder } from "../../api/orders";
import { ApiError } from "../../api/client";
import type { OrderOut } from "../../api/types";

/**
 * Shared cancel-confirm modal used by OrdersPage (row action) and
 * OrderDetailPage. DELETE /orders/{id} 409s on an already-terminal order —
 * the trigger button is disabled before this ever opens (see
 * isTerminalOrderStatus), so this modal only ever fires on a live order.
 */
export function CancelOrderModal({ order, onClose }: { order: OrderOut; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const cancel = useMutation({
    mutationFn: () => cancelOrder(order.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", order.id] });
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      onClose();
    },
    onError: (err) => {
      const detail = err instanceof ApiError ? (err.body as { detail?: string } | null)?.detail ?? err.message : "Cancel failed.";
      setError(detail);
    },
  });

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-[380px] rounded-[13px] border border-surface-border-strong bg-surface-overlay p-6">
        <h3 className="mb-2 font-[family-name:var(--font-cond)] text-lg font-bold text-text-primary">Cancel order</h3>
        <p className="mb-4 text-[11.5px] leading-relaxed text-text-muted">
          Cancel the{" "}
          <strong className="text-text-primary">
            {order.side} {order.qty} {order.symbol?.symbol ?? "—"}
          </strong>{" "}
          order ({order.order_type}, status {order.status})? This cannot be undone.
        </p>
        {error && <p className="mb-3 text-xs text-red">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={cancel.isPending}
            className="flex-1 rounded-lg border border-surface-border-strong px-4 py-2 text-[11.5px] font-semibold text-text-faint hover:border-text-faint"
          >
            Keep order
          </button>
          <button
            onClick={() => cancel.mutate()}
            disabled={cancel.isPending}
            className="flex-1 rounded-lg border border-red-border bg-red-bg px-4 py-2 text-[11.5px] font-semibold text-red disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancel.isPending ? "Cancelling…" : "Cancel order"}
          </button>
        </div>
      </div>
    </div>
  );
}
