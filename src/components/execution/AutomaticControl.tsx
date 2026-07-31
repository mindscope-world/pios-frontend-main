import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listBrokers } from "../../api/brokers";
import { disableAutoAllocation, enableAutoAllocation, getAutoExecutionStatus } from "../../api/autoExecution";
import { ApiError } from "../../api/client";
import { useAuthStore } from "../../stores/authStore";
import { useChannelSocket } from "../../realtime/useChannelSocket";
import { useState } from "react";

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

const DISARM_REASON_LABEL: Record<string, string> = {
  user_disarm: "Disarmed manually",
  kill_switch: "Disarmed by kill switch",
  "circuit_breaker:daily_loss": "Daily loss circuit breaker tripped",
  "circuit_breaker:drawdown": "Drawdown circuit breaker tripped",
  "circuit_breaker:max_orders": "Max daily order count reached",
};

/**
 * Automatic mode's account-level allocation control (owner feedback,
 * 2026-07-30) -- replaces the old per-symbol "pick a symbol to arm" form.
 * A single toggle arms/disarms the whole eligible symbol universe (every
 * MT5 symbol with a confirmed contract size) at once; the system decides
 * which of those to actually enter each pass based on which have a live
 * signal, ranked and sized by relative competitiveness when more than one
 * fires in the same 60s pass -- see
 * app/services/auto_execution_service.py's "Account-level capital
 * allocation" section for the full model. This control is no longer
 * scoped to whichever symbol happens to be selected on the chart --
 * Automatic mode isn't about one symbol.
 */
export function AutomaticControl() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const patchUser = useAuthStore((s) => s.patchUser);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const enabled = Boolean(user?.preferences?.auto_allocation_enabled);

  const brokers = useQuery({ queryKey: ["brokers", "picker"], queryFn: () => listBrokers({ page_size: 50 }) });
  const paperMt5Brokers = (brokers.data?.items ?? []).filter(
    (b) => b.is_active && b.broker_type === "MT5" && b.is_paper,
  );

  const status = useQuery({
    queryKey: ["auto-execution-status"],
    queryFn: getAutoExecutionStatus,
    staleTime: 10000,
    refetchInterval: 20000, // safety net behind the WS push below
    enabled,
  });

  useChannelSocket("auto_execution", undefined, (msg) => {
    if (msg.event === "armed" || msg.event === "disarmed" || msg.event === "circuit_breaker_trip") {
      queryClient.invalidateQueries({ queryKey: ["auto-execution-status"] });
    }
  });

  const brokerName = (id: string) => brokers.data?.items.find((b) => b.id === id)?.name ?? id;
  const rows = status.data ?? [];
  const armedRows = rows.filter((r) => r.is_armed);
  // Most-recently-touched disarmed row, so a tripped-breaker banner can show
  // *why* even though nothing is armed right now.
  const lastDisarmed = rows
    .filter((r) => !r.is_armed && r.last_disarm_reason)
    .slice()
    .sort((a, b) => (b.disarmed_at ?? "").localeCompare(a.disarmed_at ?? ""))[0] ?? null;
  const trippedReason = lastDisarmed?.last_disarm_reason?.startsWith("circuit_breaker:")
    ? lastDisarmed.last_disarm_reason
    : null;

  const enable = useMutation({
    mutationFn: enableAutoAllocation,
    onSuccess: () => {
      patchUser({ preferences: { ...user?.preferences, auto_allocation_enabled: true } });
      setFeedback({ tone: "ok", text: "Automatic allocation on — scanning every eligible symbol every 60s." });
      queryClient.invalidateQueries({ queryKey: ["auto-execution-status"] });
    },
    onError: (err) => {
      const detail = err instanceof ApiError ? (err.body as { detail?: string } | null)?.detail ?? err.message : "Failed to enable.";
      setFeedback({ tone: "err", text: detail });
    },
  });

  const disable = useMutation({
    mutationFn: disableAutoAllocation,
    onSuccess: () => {
      patchUser({ preferences: { ...user?.preferences, auto_allocation_enabled: false } });
      setFeedback(null);
      queryClient.invalidateQueries({ queryKey: ["auto-execution-status"] });
    },
    onError: (err) => {
      const detail = err instanceof ApiError ? (err.body as { detail?: string } | null)?.detail ?? err.message : "Failed to disable.";
      setFeedback({ tone: "err", text: detail });
    },
  });

  if (!brokers.isPending && paperMt5Brokers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-surface-border-strong p-3 text-[11px] text-text-faint">
        Automatic needs an active paper MT5 broker connection — add one in Connections (type MT5, Paper trading
        checked) before enabling allocation.
      </div>
    );
  }

  // ── Enabled ────────────────────────────────────────────────────────────
  if (enabled) {
    return (
      <div className="rounded-lg border border-green-border bg-green-bg p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-extrabold tracking-[.04em] text-green">ALLOCATION ACTIVE</span>
          <span className="text-[9.5px] text-text-faint">
            {armedRows.length ? brokerName(armedRows[0].broker_id) : ""}
          </span>
        </div>
        <div className="mb-2 text-[10px] leading-relaxed text-text-faint">
          The system is watching every eligible symbol below and will enter — sized by relative competitiveness
          when more than one has a live signal at once — whichever actually qualifies, without further
          confirmation.
        </div>
        {armedRows.length === 0 ? (
          <div className="mb-2 rounded-md border border-surface-border-strong p-2 text-[10px] text-text-ghost">
            No eligible symbols yet — a symbol needs a confirmed MT5 contract size before it can be watched.
          </div>
        ) : (
          <table className="mb-2 w-full text-[10px]">
            <thead>
              <tr className="text-text-ghost">
                <th className="text-left font-normal">Symbol</th>
                <th className="text-left font-normal">Last checked</th>
                <th className="text-right font-normal">Fired today</th>
              </tr>
            </thead>
            <tbody>
              {armedRows.map((r) => (
                <tr key={r.id} className="text-text-primary">
                  <td className="py-0.5">{r.symbol?.symbol ?? r.id}</td>
                  <td className="py-0.5 text-text-faint">{relativeTime(r.last_evaluated_at)}</td>
                  <td className="py-0.5 text-right">{r.orders_fired_today}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button
          disabled={disable.isPending}
          onClick={() => disable.mutate()}
          className="w-full rounded-lg border border-red-border bg-red-bg py-2 text-xs font-extrabold tracking-[.04em] text-red disabled:opacity-50"
        >
          {disable.isPending ? "Disabling…" : "Disable Automatic Allocation"}
        </button>
        {feedback && <p className={`mt-2 text-[10.5px] ${feedback.tone === "ok" ? "text-green" : "text-red"}`}>{feedback.text}</p>}
      </div>
    );
  }

  // ── Disabled (possibly previously tripped) ────────────────────────────
  return (
    <div className="rounded-lg border border-surface-border-strong bg-surface-overlay p-3">
      {trippedReason && (
        <div className="mb-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[10.5px] text-amber-400">
          <span className="font-bold">{DISARM_REASON_LABEL[trippedReason] ?? trippedReason}</span> —{" "}
          {relativeTime(lastDisarmed!.disarmed_at)}. Re-enabling is a fresh, explicit action; nothing re-enables on
          its own.
        </div>
      )}
      <div className="mb-2 text-[10px] leading-relaxed text-text-faint">
        Enables a background loop that scans every symbol eligible for autonomous execution (paper MT5, confirmed
        contract size) every 60s and enters whichever have a live, directional signal right now — you don't pick
        the symbol. Capital is split proportionally across simultaneous opportunities by relative competitiveness.
        For a symbol under the sign-off threshold it submits without further confirmation; otherwise the order
        holds for a second human to approve (Orders → Pending sign-off). Disable any time.
      </div>
      <button
        disabled={enable.isPending}
        onClick={() => enable.mutate()}
        className="w-full rounded-lg border border-green-border bg-green-bg py-2 text-xs font-extrabold tracking-[.04em] text-green disabled:opacity-50"
      >
        {enable.isPending ? "Enabling…" : "Enable Automatic Allocation"}
      </button>
      {feedback && <p className={`mt-2 text-[10.5px] ${feedback.tone === "ok" ? "text-green" : "text-red"}`}>{feedback.text}</p>}
    </div>
  );
}
