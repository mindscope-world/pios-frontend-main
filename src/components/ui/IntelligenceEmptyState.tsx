interface IntelligenceEmptyStateProps {
  reason: "not_yet_computed" | "no_market_data";
  symbol?: string;
}

/**
 * Shared "waiting for data" tile for every worker-cached /intelligence/*
 * screen (workplan §3.4) — a real empty state, not a network-error fallback.
 *
 * "not_yet_computed" is almost never a transient loading state: the
 * intelligence worker is a SEPARATE process from the API server
 * (python -m app.workers.intelligence_worker) and needs the configured
 * system user to exist (backend docs/RUNNING.md). If this tile persists,
 * one of those two is missing — say so instead of spinning forever.
 */
export function IntelligenceEmptyState({ reason, symbol }: IntelligenceEmptyStateProps) {
  if (reason === "no_market_data") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-surface-border p-6 text-center">
        <span className="h-2 w-2 animate-pulse rounded-full bg-decision-wait" />
        <p className="text-sm text-text-muted">No market data available yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-surface-border p-6 text-center">
      <span className="h-2 w-2 animate-pulse rounded-full bg-decision-wait" />
      <p className="text-sm text-text-muted">
        Waiting for the intelligence worker to compute {symbol ?? "this symbol"}…
      </p>
      <p className="max-w-[42ch] text-[10.5px] leading-relaxed text-text-ghost">
        Still waiting after ~10s? The worker is a separate process from the API server — make sure{" "}
        <code className="rounded bg-surface-overlay px-1 py-0.5">python -m app.workers.intelligence_worker</code> is
        running and the configured system user exists (backend{" "}
        <code className="rounded bg-surface-overlay px-1 py-0.5">docs/RUNNING.md</code>).
      </p>
    </div>
  );
}
