import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { triggerKillSwitch } from "../../api/risk";
import { ApiError } from "../../api/client";
import { useAuthStore } from "../../stores/authStore";
import { useSystemNoticeStore } from "../../stores/systemNoticeStore";
import type { KillSwitchEventOut } from "../../api/types";

const HOLD_STEP_PCT = 4;
const HOLD_INTERVAL_MS = 28;

/**
 * Topbar hold-to-arm control (mockup's #killBtn). Holding fills the
 * background; reaching 100% opens the type-KILL confirm modal. This is the
 * only kill trigger in the app — there is no separate "arm" server state
 * (RiskMetricsOut.kill_switch_armed is a static readiness flag, not a
 * pause/resume toggle), so the hold gesture is purely a deliberate-action
 * gate in front of the real one-shot POST /risk/killswitch call.
 */
export function KillSwitchArmButton({ onArmed }: { onArmed: () => void }) {
  const [pct, setPct] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  const startHold = () => {
    setPct(0);
    let p = 0;
    intervalRef.current = setInterval(() => {
      p += HOLD_STEP_PCT;
      setPct(Math.min(p, 100));
      if (p >= 100) {
        clear();
        setPct(0);
        onArmed();
      }
    }, HOLD_INTERVAL_MS);
  };

  const cancelHold = () => {
    clear();
    setPct(0);
  };

  return (
    <div className="flex flex-shrink-0 flex-col gap-[3px]">
      <div className="text-right text-[9px] uppercase tracking-[.08em] text-text-ghost">Hold to arm · then confirm</div>
      <div
        className="relative flex select-none items-center gap-[7px] overflow-hidden rounded-lg border border-red-border bg-red-bg px-4 py-1.5 text-[11px] font-bold tracking-[.03em] text-red"
        onMouseDown={startHold}
        onMouseUp={cancelHold}
        onMouseLeave={cancelHold}
        onTouchStart={(e) => {
          e.preventDefault();
          startHold();
        }}
        onTouchEnd={cancelHold}
      >
        <div className="absolute inset-y-0 left-0 z-0 bg-red/40" style={{ width: `${pct}%` }} />
        <span className="relative z-10">⏻ KILL ALL</span>
      </div>
    </div>
  );
}

type Phase = "confirming" | "submitting" | "done";

export function KillSwitchConfirmModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mfaEnabled = useAuthStore((s) => s.user?.mfa_enabled ?? false);
  const showBanner = useSystemNoticeStore((s) => s.showBanner);
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<Phase>("confirming");
  const [reason, setReason] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [killText, setKillText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<KillSwitchEventOut | null>(null);

  if (!open) return null;

  const reset = () => {
    setPhase("confirming");
    setReason("");
    setMfaCode("");
    setKillText("");
    setError(null);
    setResult(null);
    onClose();
  };

  const canSubmit =
    killText.trim().toUpperCase() === "KILL" && reason.trim().length > 0 && (!mfaEnabled || mfaCode.trim().length > 0);

  const onConfirm = async () => {
    setPhase("submitting");
    setError(null);
    try {
      const event = await triggerKillSwitch({ reason: reason.trim(), mfa_code: mfaEnabled ? mfaCode.trim() : undefined });
      setResult(event);
      setPhase("done");
      queryClient.invalidateQueries({ queryKey: ["risk-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["kill-switch-history"] });
      showBanner({
        text: `Kill switch executed — ${event.orders_cancelled} orders cancelled, ${event.positions_closed} positions closed.`,
        tone: "red",
      });
    } catch (err) {
      const detail = err instanceof ApiError ? (err.body as { detail?: string } | null)?.detail ?? err.message : "Kill switch failed.";
      setError(detail);
      setPhase("confirming");
    }
  };

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-[380px] rounded-[13px] border border-red-border bg-surface-overlay p-6">
        {phase !== "done" ? (
          <>
            <h3 className="mb-2 font-[family-name:var(--font-cond)] text-lg font-bold text-red">Confirm kill all</h3>
            <p className="mb-3.5 text-[11.5px] leading-relaxed text-text-muted">
              This closes <strong className="text-text-primary">all open positions</strong> and cancels{" "}
              <strong className="text-text-primary">all pending orders</strong> immediately. This cannot be undone.
              Type <strong className="text-text-primary">KILL</strong> to confirm.
            </p>

            <input
              autoFocus
              type="text"
              placeholder="KILL"
              value={killText}
              onChange={(e) => setKillText(e.target.value)}
              className="mb-3.5 w-full rounded-lg border border-surface-border-strong bg-surface-card px-3 py-2 text-center font-mono tracking-[.2em] text-text-primary outline-none"
            />
            <input
              type="text"
              placeholder="Reason (required)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mb-3.5 w-full rounded-lg border border-surface-border-strong bg-surface-card px-3 py-2 text-[13px] text-text-primary outline-none"
            />
            {mfaEnabled && (
              <input
                type="text"
                inputMode="numeric"
                placeholder="Authenticator code"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                className="mb-3.5 w-full rounded-lg border border-surface-border-strong bg-surface-card px-3 py-2 text-center font-mono tracking-[.2em] text-text-primary outline-none"
              />
            )}
            {error && <p className="mb-3 text-xs text-red">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={reset}
                disabled={phase === "submitting"}
                className="flex-1 rounded-lg border border-surface-border-strong px-4 py-2 text-[11.5px] font-semibold text-text-faint hover:border-text-faint"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={!canSubmit || phase === "submitting"}
                className="flex-1 rounded-lg border border-red-border bg-red-bg px-4 py-2 text-[11.5px] font-semibold text-red disabled:cursor-not-allowed disabled:opacity-50"
              >
                {phase === "submitting" ? "Killing…" : "Kill all"}
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="mb-2 font-[family-name:var(--font-cond)] text-lg font-bold text-green">Kill switch executed</h3>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-surface-border p-3">
                <p className="text-xs text-text-muted">Orders cancelled</p>
                <p className="font-mono text-xl text-text-primary">{result?.orders_cancelled}</p>
              </div>
              <div className="rounded-lg border border-surface-border p-3">
                <p className="text-xs text-text-muted">Positions closed</p>
                <p className="font-mono text-xl text-text-primary">{result?.positions_closed}</p>
              </div>
            </div>
            <button
              onClick={reset}
              className="w-full rounded-lg border border-green-border bg-green-bg px-4 py-2 text-[11.5px] font-semibold text-green"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}
