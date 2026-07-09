import type { ExecutionStyle, OrderType } from "../../api/types";
import { isAlgorithmicOrderType } from "../../api/types";

interface ExecutionStyleBadgeProps {
  executionStyle: ExecutionStyle;
}

/**
 * Every order row must show this — "ALGORITHMIC" (TWAP/VWAP/ICEBERG, real
 * background slice schedule) vs "INSTANT" (single broker call) is the only
 * signal of which execution path an order took.
 */
export function ExecutionStyleBadge({ executionStyle }: ExecutionStyleBadgeProps) {
  const isInstant = executionStyle === "INSTANT";
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-medium ${
        isInstant ? "bg-surface-raised text-text-muted" : "bg-decision-allow/20 text-decision-allow"
      }`}
    >
      {executionStyle}
    </span>
  );
}

/**
 * Inline caveat copy for the order ticket when a user picks an order type
 * whose label suggests algorithmic execution the backend doesn't actually
 * have (today: only OCO) — surfaced BEFORE submission, not discovered after
 * the fact from the row badge (FRONTEND_GUIDE.md §8.1 / workplan §4).
 */
export function algorithmicOrderTypeCaveat(orderType: OrderType): string | null {
  if (!isAlgorithmicOrderType(orderType) && ["TWAP", "VWAP", "OCO", "ICEBERG"].includes(orderType)) {
    return "Executes instantly, same as Market — algorithmic execution not yet available for this type.";
  }
  return null;
}
