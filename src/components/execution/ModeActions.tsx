import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listBrokers } from "../../api/brokers";
import { createOrder } from "../../api/orders";
import { ApiError } from "../../api/client";
import { useExecutionModeStore } from "../../stores/executionModeStore";
import { useAuthStore } from "../../stores/authStore";
import type { OrderSide } from "../../api/types";

// POST /orders is require_trade_exec (admin + trader only) server-side —
// don't show a live-looking BUY/SELL ticket to viewer/compliance/quant that
// would just 403.
const TRADE_EXEC_ROLES = new Set(["admin", "trader"]);

/**
 * Manual is the only execution mode with a real backend behind it — this
 * renders an inline order ticket that calls the real POST /orders. Semi-auto
 * and Automatic have no autonomous execution engine to hook into (see
 * stores/executionModeStore.ts), so they render an explicit "not available"
 * state rather than the mockup's simulated "Pi-OSQ entered long" activity.
 */
export function ModeActions({ symbol, suggestedQty }: { symbol: string; suggestedQty: number | null }) {
  const mode = useExecutionModeStore((s) => s.mode);
  const role = useAuthStore((s) => s.user?.role);
  const canTrade = role ? TRADE_EXEC_ROLES.has(role) : false;

  if (mode === "manual") {
    if (!canTrade) {
      return (
        <div className="rounded-lg border border-dashed border-surface-border-strong p-3 text-[11px] text-text-faint">
          Order submission is restricted to trader/admin roles — this account ({role}) has view-only access here.
        </div>
      );
    }
    return <ManualTicket symbol={symbol} suggestedQty={suggestedQty} />;
  }
  if (mode === "semi") {
    return (
      <div className="rounded-lg border border-surface-border-strong bg-surface-overlay p-3">
        <div className="mb-1 text-[11px] font-bold text-text-muted">Semi-auto not available</div>
        <div className="text-[10px] leading-relaxed text-text-faint">
          There is no autonomous execution engine in this build — Pi-OSQ cannot enter trades on its own yet. Use
          Manual mode to place orders. This mode is tracked as a future backend feature.
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-blue-border bg-blue-bg p-3 text-center">
      <div className="mb-1 text-[11px] font-extrabold tracking-[.04em] text-blue">AUTONOMOUS EXECUTION UNAVAILABLE</div>
      <div className="text-[10px] text-text-faint">No autonomous execution engine exists in the backend yet.</div>
    </div>
  );
}

function ManualTicket({ symbol, suggestedQty }: { symbol: string; suggestedQty: number | null }) {
  const queryClient = useQueryClient();
  const brokers = useQuery({ queryKey: ["brokers", "picker"], queryFn: () => listBrokers({ page_size: 50 }) });
  const activeBrokers = brokers.data?.items.filter((b) => b.is_active) ?? [];

  const [brokerId, setBrokerId] = useState("");
  const [qty, setQty] = useState(suggestedQty ? String(suggestedQty) : "0.01");
  const [feedback, setFeedback] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!brokerId && activeBrokers.length > 0) setBrokerId(activeBrokers[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBrokers.length]);

  const submit = useMutation({
    mutationFn: (side: OrderSide) =>
      createOrder({ broker_id: brokerId, symbol, side, order_type: "MARKET", qty: Number(qty) }),
    onSuccess: (order) => {
      setFeedback({ tone: "ok", text: `${order.side} order submitted — status ${order.status}.` });
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err) => {
      const detail = err instanceof ApiError ? (err.body as { detail?: string } | null)?.detail ?? err.message : "Order failed.";
      setFeedback({ tone: "err", text: detail });
    },
  });

  if (!brokers.isPending && activeBrokers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-surface-border-strong p-3 text-[11px] text-text-faint">
        No active broker connection — add one in Connections before placing orders.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex gap-1.5">
        <select
          value={brokerId}
          onChange={(e) => setBrokerId(e.target.value)}
          className="flex-1 rounded-md border border-surface-border-strong bg-surface-card px-2 py-1 text-[10.5px] text-text-primary outline-none"
        >
          {activeBrokers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <input
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="w-20 rounded-md border border-surface-border-strong bg-surface-card px-2 py-1 text-right text-[10.5px] text-text-primary outline-none"
        />
      </div>
      <div className="flex gap-1.5">
        <button
          disabled={!brokerId || submit.isPending}
          onClick={() => submit.mutate("BUY")}
          className="flex-1 rounded-lg border border-green-border bg-green-bg py-2 text-xs font-extrabold tracking-[.04em] text-green disabled:opacity-50"
        >
          BUY
        </button>
        <button
          disabled={!brokerId || submit.isPending}
          onClick={() => submit.mutate("SELL")}
          className="flex-1 rounded-lg border border-red-border bg-red-bg py-2 text-xs font-extrabold tracking-[.04em] text-red disabled:opacity-50"
        >
          SELL
        </button>
        <button
          onClick={() => setFeedback(null)}
          className="flex-1 rounded-lg border border-surface-border-strong py-2 text-xs font-semibold text-text-faint"
        >
          Decline
        </button>
      </div>
      {feedback && (
        <p className={`mt-2 text-[10.5px] ${feedback.tone === "ok" ? "text-green" : "text-red"}`}>{feedback.text}</p>
      )}
    </div>
  );
}
