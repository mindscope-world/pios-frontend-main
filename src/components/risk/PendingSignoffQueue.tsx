import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listPendingSignoff, submitOrderSignoff } from "../../api/orders";
import { ApiError } from "../../api/client";
import { useAuthStore } from "../../stores/authStore";
import type { OrderOut } from "../../api/types";

// The reason submit_order recorded when it held this order (notional vs.
// threshold, or "unpriceable -- fails closed") is the last state_history
// entry's `reason` -- no separate field needed on OrderOut for this.
function holdReason(order: OrderOut): string {
  const last = order.state_history[order.state_history.length - 1];
  return last?.reason ?? "Notional impact crossed the human-signoff threshold.";
}

/**
 * Model governance (Guide Part IX) — the human-signoff approval queue.
 * Only rendered for admin/compliance (require_signoff server-side excludes
 * trader/quant, the roles that submit orders — dual control, not
 * self-service). Mirrors KillSwitch.tsx's MFA-gated confirm pattern.
 */
export function PendingSignoffQueue() {
  const role = useAuthStore((s) => s.user?.role);
  const canSignoff = role === "admin" || role === "compliance";
  const queryClient = useQueryClient();
  const queue = useQuery({
    queryKey: ["pending-signoff"],
    queryFn: listPendingSignoff,
    staleTime: 10000,
    enabled: canSignoff,
  });
  const [selected, setSelected] = useState<OrderOut | null>(null);

  if (!canSignoff) return null;

  return (
    <div className="rounded-[10px] border border-surface-border bg-surface-raised">
      <div className="flex items-center gap-1.5 border-b border-surface-border px-4 py-3 text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">
        Pending sign-off
        {!!queue.data?.length && (
          <span className="rounded-full border border-amber-border bg-amber-bg px-1.5 py-0.5 text-[9.5px] font-bold text-amber">
            {queue.data.length}
          </span>
        )}
      </div>

      {queue.isPending ? (
        <p className="p-4 text-sm text-text-muted">Loading…</p>
      ) : !queue.data || queue.data.length === 0 ? (
        <p className="p-4 text-sm text-text-muted">No orders currently held for human sign-off.</p>
      ) : (
        <table className="w-full text-[11.5px]">
          <thead>
            <tr className="bg-surface-card text-[9.5px] uppercase tracking-[.06em] text-text-faint">
              <th className="px-2.5 py-2 text-left">Symbol</th>
              <th className="px-2.5 py-2 text-left">Side</th>
              <th className="px-2.5 py-2 text-left">Qty</th>
              <th className="px-2.5 py-2 text-left">Type</th>
              <th className="px-2.5 py-2 text-left">Reason</th>
              <th className="px-2.5 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {queue.data.map((o) => (
              <tr key={o.id} className="border-b border-surface-border last:border-0">
                <td className="px-2.5 py-2.5 font-semibold text-text-primary">{o.symbol?.symbol ?? "—"}</td>
                <td className={`px-2.5 py-2.5 font-semibold ${o.side === "BUY" ? "text-green" : "text-red"}`}>{o.side}</td>
                <td className="px-2.5 py-2.5 font-mono">{o.qty}</td>
                <td className="px-2.5 py-2.5 text-text-faint">{o.order_type}</td>
                <td className="max-w-[260px] px-2.5 py-2.5 text-[10.5px] text-text-faint">{holdReason(o)}</td>
                <td className="px-2.5 py-2.5 text-right">
                  <button
                    onClick={() => setSelected(o)}
                    className="rounded-md border border-blue-border bg-blue-bg px-3 py-1 text-[10.5px] font-semibold text-blue"
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="border-t border-surface-border px-4 py-2.5 text-[10px] leading-relaxed text-text-faint">
        An order lands here when its notional impact crosses the <span className="font-mono">human_signoff_threshold_usd</span> risk
        limit (see Risk limits above). Dual control is enforced server-side — the order's own submitter cannot approve or reject it here,
        even as an admin.
      </p>

      {selected && (
        <SignoffReviewModal
          order={selected}
          onClose={() => setSelected(null)}
          onDone={() => {
            queryClient.invalidateQueries({ queryKey: ["pending-signoff"] });
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

function SignoffReviewModal({ order, onClose, onDone }: { order: OrderOut; onClose: () => void; onDone: () => void }) {
  const mfaEnabled = useAuthStore((s) => s.user?.mfa_enabled ?? false);
  const [reason, setReason] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const act = useMutation({
    mutationFn: (approved: boolean) =>
      submitOrderSignoff(order.id, { approved, reason: reason.trim(), mfa_code: mfaEnabled ? mfaCode.trim() : undefined }),
    onSuccess: onDone,
    onError: (err) => setError(err instanceof ApiError ? (err.body as { detail?: string } | null)?.detail ?? err.message : "Sign-off failed."),
  });

  const canSubmit = reason.trim().length > 0 && (!mfaEnabled || mfaCode.trim().length > 0) && !act.isPending;

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-[420px] rounded-[13px] border border-surface-border-strong bg-surface-overlay p-6">
        <h3 className="mb-2 font-[family-name:var(--font-cond)] text-lg font-bold text-text-primary">Review sign-off</h3>
        <p className="mb-3.5 text-[11.5px] leading-relaxed text-text-muted">
          {order.side} {order.qty} {order.symbol?.symbol ?? ""} ({order.order_type}) —{" "}
          <span className="text-text-faint">{holdReason(order)}</span>
        </p>

        <input
          autoFocus
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
            onClick={onClose}
            disabled={act.isPending}
            className="flex-1 rounded-lg border border-surface-border-strong px-4 py-2 text-[11.5px] font-semibold text-text-faint hover:border-text-faint"
          >
            Cancel
          </button>
          <button
            onClick={() => act.mutate(false)}
            disabled={!canSubmit}
            className="flex-1 rounded-lg border border-red-border bg-red-bg px-4 py-2 text-[11.5px] font-semibold text-red disabled:cursor-not-allowed disabled:opacity-50"
          >
            {act.isPending ? "Working…" : "Reject"}
          </button>
          <button
            onClick={() => act.mutate(true)}
            disabled={!canSubmit}
            className="flex-1 rounded-lg border border-green-border bg-green-bg px-4 py-2 text-[11.5px] font-semibold text-green disabled:cursor-not-allowed disabled:opacity-50"
          >
            {act.isPending ? "Working…" : "Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}
