interface IntelligenceEmptyStateProps {
  reason: "not_yet_computed" | "no_market_data";
  symbol?: string;
}

/**
 * Shared "waiting for data" tile for every worker-cached /intelligence/*
 * screen (workplan §3.4) — a real empty state, not a network-error fallback.
 */
export function IntelligenceEmptyState({ reason, symbol }: IntelligenceEmptyStateProps) {
  const message =
    reason === "no_market_data"
      ? "No market data available yet."
      : `Waiting for the intelligence worker to compute ${symbol ?? "this symbol"}…`;

  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-surface-border p-6 text-center">
      <span className="h-2 w-2 animate-pulse rounded-full bg-decision-wait" />
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  );
}
