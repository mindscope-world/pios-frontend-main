import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listBrokers } from "../../api/brokers";
import { armAutoExecution, disarmAutoExecution, getAutoExecutionStatus } from "../../api/autoExecution";
import { ApiError } from "../../api/client";
import { useChannelSocket } from "../../realtime/useChannelSocket";
import type { AutoExecutionArmingOut } from "../../api/types";

const inputCls =
  "rounded-md border border-surface-border-strong bg-surface-card px-2 py-1 text-[10.5px] text-text-primary outline-none";

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

// Forex/metal rows exist under two spellings server-side (EUR/USD from the
// OANDA picker, EURUSD as the MT5-native row that arming actually resolves
// to via get_symbol_by_name -- see helpers.py's dedup comment). An armed
// row's own `symbol.symbol` always reflects whichever row it actually
// resolved to, which for MT5 is the slash-less spelling -- comparing it
// against the picker's slash-form symbol string with `===` never matches,
// so the freshly-armed row looked "not armed" on the very next refetch.
function normalizeSym(s: string): string {
  return s.replace(/\//g, "").toUpperCase();
}

const DISARM_REASON_LABEL: Record<string, string> = {
  user_disarm: "Disarmed manually",
  kill_switch: "Disarmed by kill switch",
  "circuit_breaker:daily_loss": "Daily loss circuit breaker tripped",
  "circuit_breaker:drawdown": "Drawdown circuit breaker tripped",
  "circuit_breaker:max_orders": "Max daily order count reached",
};

/**
 * Automatic mode's per-symbol arm/disarm control. Unlike Manual/Semi-auto,
 * this doesn't submit anything itself -- it just tells the background
 * engine (auto_execution_service.py, ~60s cadence) which (symbol, paper MT5
 * broker) pair to watch. Armed state is server state (GET
 * /auto-execution/status), not stored in executionModeStore -- that store
 * only tracks which control renders, not per-symbol arming.
 */
export function AutomaticControl({ symbol }: { symbol: string }) {
  const queryClient = useQueryClient();
  const [brokerId, setBrokerId] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const brokers = useQuery({ queryKey: ["brokers", "picker"], queryFn: () => listBrokers({ page_size: 50 }) });
  const paperMt5Brokers = (brokers.data?.items ?? []).filter(
    (b) => b.is_active && b.broker_type === "MT5" && b.is_paper,
  );

  const status = useQuery({
    queryKey: ["auto-execution-status"],
    queryFn: getAutoExecutionStatus,
    staleTime: 10000,
    refetchInterval: 20000, // safety net behind the WS push below
  });

  useChannelSocket("auto_execution", undefined, (msg) => {
    if (msg.event === "armed" || msg.event === "disarmed" || msg.event === "circuit_breaker_trip") {
      queryClient.invalidateQueries({ queryKey: ["auto-execution-status"] });
    }
  });

  const rowsForSymbol = (status.data ?? []).filter(
    (r) => normalizeSym(r.symbol?.symbol ?? "") === normalizeSym(symbol),
  );
  const armedRow = rowsForSymbol.find((r) => r.is_armed) ?? null;
  // Most-recently-touched row for this symbol, armed or not, so a tripped/
  // disarmed banner can show *why* even though nothing is armed right now.
  const lastRow: AutoExecutionArmingOut | null =
    rowsForSymbol.slice().sort((a, b) => (b.armed_at ?? b.created_at).localeCompare(a.armed_at ?? a.created_at))[0] ??
    null;
  const brokerName = (id: string) => brokers.data?.items.find((b) => b.id === id)?.name ?? id;

  const arm = useMutation({
    mutationFn: () => armAutoExecution({ symbol, broker_id: brokerId }),
    onSuccess: () => {
      setFeedback({ tone: "ok", text: `Armed — re-evaluating ${symbol} every 60s.` });
      queryClient.invalidateQueries({ queryKey: ["auto-execution-status"] });
    },
    onError: (err) => {
      const detail = err instanceof ApiError ? (err.body as { detail?: string } | null)?.detail ?? err.message : "Arm failed.";
      setFeedback({ tone: "err", text: detail });
    },
  });

  const disarm = useMutation({
    mutationFn: () => disarmAutoExecution({ symbol, broker_id: armedRow?.broker_id }),
    onSuccess: () => {
      setFeedback(null);
      queryClient.invalidateQueries({ queryKey: ["auto-execution-status"] });
    },
    onError: (err) => {
      const detail = err instanceof ApiError ? (err.body as { detail?: string } | null)?.detail ?? err.message : "Disarm failed.";
      setFeedback({ tone: "err", text: detail });
    },
  });

  if (!brokers.isPending && paperMt5Brokers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-surface-border-strong p-3 text-[11px] text-text-faint">
        Automatic needs an active paper MT5 broker connection — add one in Connections (type MT5, Paper trading
        checked) to arm this symbol.
      </div>
    );
  }

  // ── Armed ──────────────────────────────────────────────────────────────
  if (armedRow) {
    return (
      <div className="rounded-lg border border-green-border bg-green-bg p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-extrabold tracking-[.04em] text-green">ARMED</span>
          <span className="text-[9.5px] text-text-faint">{brokerName(armedRow.broker_id)}</span>
        </div>
        <div className="mb-2 grid grid-cols-2 gap-1.5 text-[10px] text-text-faint">
          <div>
            Armed <span className="text-text-primary">{relativeTime(armedRow.armed_at)}</span>
          </div>
          <div>
            Last checked <span className="text-text-primary">{relativeTime(armedRow.last_evaluated_at)}</span>
          </div>
          <div className="col-span-2">
            Orders fired today: <span className="text-text-primary">{armedRow.orders_fired_today}</span>
          </div>
        </div>
        <button
          disabled={disarm.isPending}
          onClick={() => disarm.mutate()}
          className="w-full rounded-lg border border-red-border bg-red-bg py-2 text-xs font-extrabold tracking-[.04em] text-red disabled:opacity-50"
        >
          {disarm.isPending ? "Disarming…" : "Disarm"}
        </button>
        {feedback && <p className={`mt-2 text-[10.5px] ${feedback.tone === "ok" ? "text-green" : "text-red"}`}>{feedback.text}</p>}
      </div>
    );
  }

  // ── Unarmed (possibly previously tripped/disarmed) ───────────────────────
  const trippedReason = lastRow?.last_disarm_reason?.startsWith("circuit_breaker:") ? lastRow.last_disarm_reason : null;

  return (
    <div className="rounded-lg border border-surface-border-strong bg-surface-overlay p-3">
      {trippedReason && (
        <div className="mb-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[10.5px] text-amber-400">
          <span className="font-bold">{DISARM_REASON_LABEL[trippedReason] ?? trippedReason}</span> —{" "}
          {relativeTime(lastRow!.disarmed_at)}. Re-arming is a fresh, explicit action; nothing re-arms on its own.
        </div>
      )}
      <div className="mb-2 text-[10px] leading-relaxed text-text-faint">
        Arms a background loop that re-checks the live decision for {symbol} every 60s, restricted to paper MT5
        brokers. For a symbol with a confirmed contract size and an order under the sign-off threshold, it submits
        without further confirmation; otherwise the order holds for a second human to approve (Orders → Pending
        sign-off) before it reaches the broker. Disarm any time.
      </div>
      <label className="mb-2 block">
        <span className="mb-0.5 block text-[9px] uppercase tracking-[.06em] text-text-ghost">Broker (paper MT5 only)</span>
        <select value={brokerId} onChange={(e) => setBrokerId(e.target.value)} className={`w-full ${inputCls}`}>
          <option value="">Select a broker…</option>
          {paperMt5Brokers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <button
        disabled={!brokerId || arm.isPending}
        onClick={() => arm.mutate()}
        className="w-full rounded-lg border border-green-border bg-green-bg py-2 text-xs font-extrabold tracking-[.04em] text-green disabled:opacity-50"
      >
        {arm.isPending ? "Arming…" : `Arm AUTO for ${symbol}`}
      </button>
      {feedback && <p className={`mt-2 text-[10.5px] ${feedback.tone === "ok" ? "text-green" : "text-red"}`}>{feedback.text}</p>}
    </div>
  );
}
