import type { ExecutionStyle, OrderType } from "../../api/types";

interface ExecutionStyleBadgeProps {
  executionStyle: ExecutionStyle;
}

/**
 * Every order row must show this — "ALGORITHMIC" (TWAP/VWAP/ICEBERG, real
 * background slice schedule), "CONDITIONAL" (STOP_LIMIT/OCO, armed app-side
 * and fired by the trigger monitor), or "INSTANT" (single broker call) is
 * the only signal of which execution path an order took.
 */
export function ExecutionStyleBadge({ executionStyle }: ExecutionStyleBadgeProps) {
  const cls =
    executionStyle === "INSTANT"
      ? "bg-surface-raised text-text-muted"
      : executionStyle === "CONDITIONAL"
        ? "bg-amber-bg text-amber"
        : "bg-decision-allow/20 text-decision-allow";
  return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${cls}`}>{executionStyle}</span>;
}

/**
 * Inline caveat copy for the order ticket when a user picks an order type
 * whose label promises behavior the backend doesn't actually have. Every
 * type now has real semantics (TWAP/VWAP/ICEBERG slice, STOP_LIMIT/OCO arm
 * and fire on trigger), so there is currently nothing to caveat — kept so a
 * future half-implemented type has an obvious slot to surface its warning.
 */
export function algorithmicOrderTypeCaveat(orderType: OrderType): string | null {
  void orderType;
  return null;
}
