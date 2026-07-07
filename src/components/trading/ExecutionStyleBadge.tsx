import type { ExecutionStyle, OrderType } from "../../api/types";
import { isAlgorithmicOrderType } from "../../api/types";

interface ExecutionStyleBadgeProps {
  executionStyle: ExecutionStyle;
}

/**
 * Every order row must show this — execution_style is ALWAYS "INSTANT" today
 * (no slicing/algorithmic execution engine exists yet, even for TWAP/VWAP/
 * OCO/ICEBERG), so don't let a row imply real algorithmic execution.
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
 * Inline caveat copy for the order ticket when a user picks one of the four
 * label-only order types — surfaced BEFORE submission, not discovered after
 * the fact from the row badge (FRONTEND_GUIDE.md §8.1 / workplan §4).
 */
export function algorithmicOrderTypeCaveat(orderType: OrderType): string | null {
  if (!isAlgorithmicOrderType(orderType) && ["TWAP", "VWAP", "OCO", "ICEBERG"].includes(orderType)) {
    return "Executes instantly, same as Market — algorithmic execution not yet available.";
  }
  return null;
}
