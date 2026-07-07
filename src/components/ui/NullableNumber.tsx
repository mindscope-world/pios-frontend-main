interface NullableNumberProps {
  value: number | null;
  format?: (value: number) => string;
  suffix?: string;
  className?: string;
}

/**
 * Renders a real empty state ("—") for nullable backend metrics like
 * PortfolioMetricsOut.sharpe / .win_rate — null means "insufficient data",
 * NOT zero. Never coerce to 0 (workplan §4 / FRONTEND_GUIDE.md §8.3).
 */
export function NullableNumber({ value, format, suffix = "", className = "" }: NullableNumberProps) {
  if (value === null) {
    return <span className={`font-mono text-text-muted ${className}`}>—</span>;
  }
  const text = format ? format(value) : value.toString();
  return (
    <span className={`font-mono ${className}`}>
      {text}
      {suffix}
    </span>
  );
}
