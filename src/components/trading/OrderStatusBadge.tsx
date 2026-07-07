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

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}>{status}</span>;
}
