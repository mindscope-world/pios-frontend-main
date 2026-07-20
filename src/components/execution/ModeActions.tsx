import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listBrokers } from "../../api/brokers";
import { createOrder, confirmDecision } from "../../api/orders";
import { ApiError } from "../../api/client";
import { useExecutionModeStore } from "../../stores/executionModeStore";
import { useAuthStore } from "../../stores/authStore";
import { isAlgorithmicOrderType, isConditionalOrderType, type OrderSide, type OrderType } from "../../api/types";

// Same regime->direction proxy as the backend's prs_service.REGIME_DIRECTION
// (and confirm_decision, which is the actual source of truth server-side —
// this copy is display-only, so the button's enabled state matches what the
// backend will decide, but the backend re-derives it independently rather
// than trusting this).
const REGIME_DIRECTION_DISPLAY: Record<string, "LONG" | "SHORT"> = { BULL: "LONG", BEAR: "SHORT" };

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
  decision,
  regimeLabel,
}: {
  symbol: string;
  suggestedQty: number | null;
  referencePrice?: number | null;
  decision?: "ALLOW" | "BLOCK" | "WAIT" | "REDUCE";
  regimeLabel?: string | null;
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
    if (!canTrade) {
      return (
        <div className="rounded-lg border border-dashed border-surface-border-strong p-3 text-[11px] text-text-faint">
          Order submission is restricted to trader/admin roles — this account ({role}) has view-only access here.
        </div>
      );
    }
    return <SemiAutoConfirm symbol={symbol} decision={decision} regimeLabel={regimeLabel ?? null} />;
  }
  return (
    <div className="rounded-lg border border-blue-border bg-blue-bg p-3 text-center">
      <div className="mb-1 text-[11px] font-extrabold tracking-[.04em] text-blue">AUTONOMOUS EXECUTION UNAVAILABLE</div>
      <div className="text-[10px] text-text-faint">No autonomous execution engine exists in the backend yet.</div>
    </div>
  );
}

// Ticket-supported order types — all eight now have real backend semantics:
// MARKET/LIMIT/STOP single-shot, TWAP/VWAP/ICEBERG background slicing, and
// STOP_LIMIT/OCO armed app-side and fired by the trigger monitor
// (app/services/conditional_orders.py).
const TICKET_ORDER_TYPES: OrderType[] = ["MARKET", "LIMIT", "STOP", "STOP_LIMIT", "OCO", "TWAP", "VWAP", "ICEBERG"];

const inputCls =
  "rounded-md border border-surface-border-strong bg-surface-card px-2 py-1 text-[10.5px] text-text-primary outline-none";

// Semi-auto (§3.1, labeled MVP): one click confirms the *current live*
// decision, restricted to MT5 brokers (the suggested size is
// lot-denominated — see order_service.confirm_decision for why that
// can't be generalized to other brokers' unit conventions without
// inventing a conversion). The button is inert unless decision === ALLOW
// and the regime gives a directional bias — this mirrors, but does not
// replace, the backend's own re-derivation: what's shown here is a
// preview of what confirm-decision will do, not the source of truth.
function SemiAutoConfirm({
  symbol,
  decision,
  regimeLabel,
}: {
  symbol: string;
  decision?: "ALLOW" | "BLOCK" | "WAIT" | "REDUCE";
  regimeLabel: string | null;
}) {
  const queryClient = useQueryClient();
  const brokers = useQuery({ queryKey: ["brokers", "picker"], queryFn: () => listBrokers({ page_size: 50 }) });
  const mt5Brokers = (brokers.data?.items ?? []).filter((b) => b.is_active && b.broker_type === "MT5");

  const [brokerId, setBrokerId] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    setFeedback(null);
    // Deliberately do NOT auto-select a broker here — confirm always
    // requires the trader to explicitly pick which broker gets the order.
  }, [symbol]);

  const direction = regimeLabel ? REGIME_DIRECTION_DISPLAY[regimeLabel] : undefined;
  const impliedSide: OrderSide | null = direction === "LONG" ? "BUY" : direction === "SHORT" ? "SELL" : null;

  const confirm = useMutation({
    mutationFn: () => confirmDecision({ symbol, broker_id: brokerId }),
    onSuccess: (order) => {
      if (order.status === "REJECTED") {
        setFeedback({ tone: "err", text: `${order.side} order REJECTED — ${order.reject_reason ?? "no reason reported by the broker"}` });
      } else {
        setFeedback({ tone: "ok", text: `${order.side} order submitted — status ${order.status}, qty ${order.qty}.` });
      }
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err) => {
      const detail = err instanceof ApiError ? (err.body as { detail?: string } | null)?.detail ?? err.message : "Confirm failed.";
      setFeedback({ tone: "err", text: detail });
    },
  });

  if (!brokers.isPending && mt5Brokers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-surface-border-strong p-3 text-[11px] text-text-faint">
        Semi-auto confirm needs an active MT5 broker connection — the suggested size is lot-denominated and only
        has a defined meaning for MT5 today. Add one in Connections, or use Manual mode for other brokers.
      </div>
    );
  }

  const blockedReason =
    decision !== "ALLOW"
      ? `Decision is ${decision ?? "unknown"}, not ALLOW — nothing to confirm.`
      : !impliedSide
        ? `Regime ${regimeLabel ?? "unknown"} gives no directional bias — nothing to confirm.`
        : !brokerId
          ? "Pick a broker to confirm against."
          : null;

  return (
    <div className="rounded-lg border border-surface-border-strong bg-surface-overlay p-3">
      <div className="mb-2 text-[10px] leading-relaxed text-text-faint">
        Confirms the <em>current live</em> decision, re-derived server-side at the moment you click — not whatever
        was last rendered here. {impliedSide ? (
          <>Implied side: <span className="font-bold text-text-primary">{impliedSide}</span> (regime {regimeLabel} → {direction}-biased).</>
        ) : (
          <>No directional bias from the current regime ({regimeLabel ?? "unknown"}).</>
        )}
      </div>

      <label className="mb-2 block">
        <span className="mb-0.5 block text-[9px] uppercase tracking-[.06em] text-text-ghost">Broker (MT5 only)</span>
        <select value={brokerId} onChange={(e) => setBrokerId(e.target.value)} className={`w-full ${inputCls}`}>
          <option value="">Select a broker…</option>
          {mt5Brokers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>

      <button
        disabled={!!blockedReason || confirm.isPending}
        onClick={() => confirm.mutate()}
        className={`w-full rounded-lg border py-2 text-xs font-extrabold tracking-[.04em] disabled:opacity-50 ${
          impliedSide === "SELL" ? "border-red-border bg-red-bg text-red" : "border-green-border bg-green-bg text-green"
        }`}
      >
        {confirm.isPending ? "Confirming…" : impliedSide ? `Confirm ${impliedSide}` : "Confirm"}
      </button>
      {blockedReason && <p className="mt-1.5 text-[10px] text-text-ghost">{blockedReason}</p>}
      {feedback && <p className={`mt-2 text-[10.5px] ${feedback.tone === "ok" ? "text-green" : "text-red"}`}>{feedback.text}</p>}
    </div>
  );
}

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
  const [qty, setQty] = useState("");
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
  // price themselves. PaperAdapter now resolves a blank price from the live
  // ticker (and rejects if none exists), but prefilling still shows the
  // trader the expected fill and seeds LIMIT/STOP with a sane level.
  const [priceTouched, setPriceTouched] = useState(false);
  useEffect(() => {
    if (!priceTouched && referencePrice != null) setPrice(String(referencePrice));
  }, [referencePrice, priceTouched]);
  useEffect(() => {
    setPriceTouched(false);
  }, [symbol]);

  // suggestedQty (final_size_lot) is an MT5-lot-denominated risk-sizing
  // number, not a broker-agnostic quantity — feeding it straight into a
  // non-MT5 broker's qty field submits nonsense (e.g. 0.075592 "units" on
  // OANDA, which needs whole base-currency units). Only auto-fill it for
  // MT5 brokers; every other broker type starts blank so the trader enters
  // a real quantity in that broker's own units.
  const selectedBroker = activeBrokers.find((b) => b.id === brokerId);
  const isLotBased = selectedBroker?.broker_type === "MT5";
  const qtyUnitLabel = !selectedBroker ? "qty" : isLotBased ? "lots" : selectedBroker.broker_type === "OANDA" ? "units" : "qty";
  const [qtyTouched, setQtyTouched] = useState(false);
  useEffect(() => {
    if (qtyTouched) return;
    setQty(isLotBased && suggestedQty ? String(suggestedQty) : "");
  }, [isLotBased, suggestedQty, qtyTouched]);
  useEffect(() => {
    setQtyTouched(false);
  }, [symbol]);

  const isAlgo = isAlgorithmicOrderType(orderType);
  const isConditional = isConditionalOrderType(orderType);
  const needsStop = orderType === "STOP" || isConditional;

  const submit = useMutation({
    mutationFn: (side: OrderSide) =>
      createOrder({
        broker_id: brokerId,
        symbol,
        side,
        order_type: orderType,
        qty: Number(qty),
        price: price !== "" ? Number(price) : null,
        stop_price: needsStop && stopPrice !== "" ? Number(stopPrice) : null,
        algo_config: isAlgo
          ? {
              slices: Number(slices) || 5,
              interval_seconds: Number(intervalSeconds) || 5,
              ...(orderType === "ICEBERG" && displayQty !== "" ? { display_qty: Number(displayQty) } : {}),
            }
          : null,
      }),
    onSuccess: (order) => {
      if (order.status === "REJECTED") {
        // The API returns 200 with a REJECTED order (broker-side rejections
        // like "market closed" land here, not in onError) — surface the why.
        setFeedback({
          tone: "err",
          text: `${order.side} order REJECTED — ${order.reject_reason ?? "no reason reported by the broker"}`,
        });
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        return;
      }
      setFeedback({
        tone: "ok",
        text:
          order.execution_style === "ALGORITHMIC"
            ? `${order.side} ${order.order_type} submitted — slicing in background (status ${order.status}). Track it in Orders.`
            : order.execution_style === "CONDITIONAL"
              ? order.order_type === "OCO"
                ? `${order.side} OCO armed — limit leg at ${order.price}, stop leg at ${stopPrice}; whichever fills cancels the other. Track both legs in Orders.`
                : `${order.side} STOP_LIMIT armed — triggers at ${stopPrice}, then executes as a LIMIT at ${order.price}. Track it in Orders.`
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
  const stopInvalid = needsStop && !(Number(stopPrice) > 0);
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
          <span className="mb-0.5 block text-[9px] uppercase tracking-[.06em] text-text-ghost">Qty ({qtyUnitLabel})</span>
          <input
            value={qty}
            onChange={(e) => {
              setQty(e.target.value);
              setQtyTouched(true);
            }}
            inputMode="decimal"
            placeholder={isLotBased ? "0.01" : "0"}
            className={`w-full ${inputCls} text-right`}
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[9px] uppercase tracking-[.06em] text-text-ghost">
            {orderType === "LIMIT" || orderType === "STOP_LIMIT"
              ? "Limit price"
              : orderType === "OCO"
                ? "Limit-leg price"
                : orderType === "STOP"
                  ? "Exec price"
                  : "Price"}
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
        {needsStop && (
          <label className="col-span-2 block">
            <span className="mb-0.5 block text-[9px] uppercase tracking-[.06em] text-text-ghost">
              {orderType === "OCO" ? "Stop-leg trigger price" : "Stop trigger price"}
            </span>
            <input
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              inputMode="decimal"
              className={`w-full ${inputCls} text-right`}
            />
          </label>
        )}
      </div>

      {isConditional && (
        <p className="mb-2 text-[9.5px] leading-relaxed text-text-ghost">
          {orderType === "OCO"
            ? "Arms two linked legs: a LIMIT at the limit-leg price and a stop at the trigger — whichever fills first cancels the other."
            : "Rests until the market crosses the stop trigger, then executes as a LIMIT at the limit price."}
        </p>
      )}

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
