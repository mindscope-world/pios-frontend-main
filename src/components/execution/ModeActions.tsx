import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listBrokers } from "../../api/brokers";
import { createOrder } from "../../api/orders";
import { ApiError } from "../../api/client";
import { useExecutionModeStore } from "../../stores/executionModeStore";
import { useAuthStore } from "../../stores/authStore";
import { isAlgorithmicOrderType, type OrderSide, type OrderType } from "../../api/types";

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
export function ModeActions({
  symbol,
  suggestedQty,
  referencePrice,
}: {
  symbol: string;
  suggestedQty: number | null;
  referencePrice?: number | null;
}) {
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
    return <ManualTicket symbol={symbol} suggestedQty={suggestedQty} referencePrice={referencePrice ?? null} />;
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

// Ticket-supported order types. STOP_LIMIT/OCO exist server-side but have no
// distinct execution semantics yet (they instant-fill like MARKET) and need a
// richer form (two prices / linked legs) — deliberately left out of the
// manual ticket until the backend gives them real behavior.
const TICKET_ORDER_TYPES: OrderType[] = ["MARKET", "LIMIT", "STOP", "TWAP", "VWAP", "ICEBERG"];

const inputCls =
  "rounded-md border border-surface-border-strong bg-surface-card px-2 py-1 text-[10.5px] text-text-primary outline-none";

function ManualTicket({
  symbol,
  suggestedQty,
  referencePrice,
}: {
  symbol: string;
  suggestedQty: number | null;
  referencePrice: number | null;
}) {
  const queryClient = useQueryClient();
  const brokers = useQuery({ queryKey: ["brokers", "picker"], queryFn: () => listBrokers({ page_size: 50 }) });
  const activeBrokers = brokers.data?.items.filter((b) => b.is_active) ?? [];

  const [brokerId, setBrokerId] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("MARKET");
  const [qty, setQty] = useState(suggestedQty ? String(suggestedQty) : "0.01");
  const [price, setPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [slices, setSlices] = useState("5");
  const [intervalSeconds, setIntervalSeconds] = useState("5");
  const [displayQty, setDisplayQty] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!brokerId && activeBrokers.length > 0) setBrokerId(activeBrokers[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBrokers.length]);

  // Prefill (and keep prefilled) from the live tick until the trader types a
  // price themselves. PaperAdapter fills at `order.price or 0`, so a blank
  // price means a $0 fill and a useless TCA row — prefill prevents that trap.
  const [priceTouched, setPriceTouched] = useState(false);
  useEffect(() => {
    if (!priceTouched && referencePrice != null) setPrice(String(referencePrice));
  }, [referencePrice, priceTouched]);
  useEffect(() => {
    setPriceTouched(false);
  }, [symbol]);

  const isAlgo = isAlgorithmicOrderType(orderType);

  const submit = useMutation({
    mutationFn: (side: OrderSide) =>
      createOrder({
        broker_id: brokerId,
        symbol,
        side,
        order_type: orderType,
        qty: Number(qty),
        price: price !== "" ? Number(price) : null,
        stop_price: orderType === "STOP" && stopPrice !== "" ? Number(stopPrice) : null,
        algo_config: isAlgo
          ? {
              slices: Number(slices) || 5,
              interval_seconds: Number(intervalSeconds) || 5,
              ...(orderType === "ICEBERG" && displayQty !== "" ? { display_qty: Number(displayQty) } : {}),
            }
          : null,
      }),
    onSuccess: (order) => {
      setFeedback({
        tone: "ok",
        text:
          order.execution_style === "ALGORITHMIC"
            ? `${order.side} ${order.order_type} submitted — slicing in background (status ${order.status}). Track it in Orders.`
            : `${order.side} order submitted — status ${order.status}.`,
      });
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

  const qtyInvalid = !(Number(qty) > 0);
  const priceRequired = orderType !== "MARKET"; // LIMIT/STOP need it; algo slices fill at it on paper brokers
  const priceInvalid = priceRequired && !(Number(price) > 0);
  const stopInvalid = orderType === "STOP" && !(Number(stopPrice) > 0);
  const disabled = !brokerId || submit.isPending || qtyInvalid || priceInvalid || stopInvalid;

  return (
    <div>
      <div className="mb-2 flex gap-1.5">
        <select value={brokerId} onChange={(e) => setBrokerId(e.target.value)} className={`min-w-0 flex-1 ${inputCls}`}>
          {activeBrokers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={orderType}
          onChange={(e) => {
            setOrderType(e.target.value as OrderType);
            setFeedback(null);
          }}
          className={`w-24 ${inputCls}`}
        >
          {TICKET_ORDER_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-2 grid grid-cols-2 gap-1.5">
        <label className="block">
          <span className="mb-0.5 block text-[9px] uppercase tracking-[.06em] text-text-ghost">Qty</span>
          <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" className={`w-full ${inputCls} text-right`} />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[9px] uppercase tracking-[.06em] text-text-ghost">
            {orderType === "LIMIT" ? "Limit price" : orderType === "STOP" ? "Exec price" : "Price"}
          </span>
          <input
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
              setPriceTouched(true);
            }}
            inputMode="decimal"
            placeholder={referencePrice != null ? String(referencePrice) : "0.00"}
            className={`w-full ${inputCls} text-right`}
          />
        </label>
        {orderType === "STOP" && (
          <label className="col-span-2 block">
            <span className="mb-0.5 block text-[9px] uppercase tracking-[.06em] text-text-ghost">Stop trigger price</span>
            <input
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              inputMode="decimal"
              className={`w-full ${inputCls} text-right`}
            />
          </label>
        )}
      </div>

      {isAlgo && (
        <div className="mb-2 rounded-md border border-surface-border bg-surface-card p-2">
          <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[.06em] text-text-ghost">
            {orderType} schedule — fills in background slices
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <label className="block">
              <span className="mb-0.5 block text-[9px] uppercase tracking-[.06em] text-text-ghost">Slices</span>
              <input value={slices} onChange={(e) => setSlices(e.target.value)} inputMode="numeric" className={`w-full ${inputCls} text-right`} />
            </label>
            <label className="block">
              <span className="mb-0.5 block text-[9px] uppercase tracking-[.06em] text-text-ghost">Interval (s)</span>
              <input
                value={intervalSeconds}
                onChange={(e) => setIntervalSeconds(e.target.value)}
                inputMode="decimal"
                className={`w-full ${inputCls} text-right`}
              />
            </label>
            {orderType === "ICEBERG" && (
              <label className="col-span-2 block">
                <span className="mb-0.5 block text-[9px] uppercase tracking-[.06em] text-text-ghost">
                  Display qty per slice (defaults to qty ÷ slices)
                </span>
                <input
                  value={displayQty}
                  onChange={(e) => setDisplayQty(e.target.value)}
                  inputMode="decimal"
                  className={`w-full ${inputCls} text-right`}
                />
              </label>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-1.5">
        <button
          disabled={disabled}
          onClick={() => submit.mutate("BUY")}
          className="flex-1 rounded-lg border border-green-border bg-green-bg py-2 text-xs font-extrabold tracking-[.04em] text-green disabled:opacity-50"
        >
          BUY
        </button>
        <button
          disabled={disabled}
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
