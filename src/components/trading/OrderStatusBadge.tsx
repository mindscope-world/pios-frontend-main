import type { OrderStatus } from "../../api/types";

const STATUS_CLASSES: Record<OrderStatus, string> = {
  NEW: "bg-surface-raised text-text-muted",
  SUBMITTED: "bg-decision-wait/20 text-decision-wait",
  PARTIAL: "bg-decision-wait/20 text-decision-wait",
  FILLED: "bg-decision-allow/20 text-decision-allow",
  CANCELLED: "bg-surface-raised text-text-muted",
  REJECTED: "bg-decision-block/20 text-decision-block",
  EXPIRED: "bg-surface-raised text-text-muted",
};

// Model governance (Guide Part IX) — NEW used to be a status nothing ever
// actually landed on (submit_order always went straight to SUBMITTED); now
// an order whose notional crossed the human-signoff threshold sits at NEW
// with signoff_required=True until a second human reviews it (see
// PendingSignoffQueue). Distinguish that from a plain NEW so a trader
// doesn't read it as "about to submit" when it's actually held.
export function OrderStatusBadge({ status, signoffRequired }: { status: OrderStatus; signoffRequired?: boolean }) {
  if (status === "NEW" && signoffRequired) {
    return <span className="rounded bg-amber-bg px-1.5 py-0.5 text-xs font-medium text-amber">PENDING SIGN-OFF</span>;
  }
  return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}>{status}</span>;
}
