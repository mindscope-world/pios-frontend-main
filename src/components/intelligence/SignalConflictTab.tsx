import { useQuery } from "@tanstack/react-query";
import { getSignalConflict } from "../../api/intelligence";
import { Card, Loading, Pill, Row } from "./shared";

// Verified against app/services/intelligence/signal_conflict_service.py's
// compute_signal_conflict() — live, takes an optional `symbol` (auto-detects
// the primary symbol when omitted), same convention as every other
// symbol-scoped tab (OFI, Monte Carlo, ...). Previously had no symbol param
// at all despite its own response already self-labeling which symbol it
// used — fixed 2026-08-03.
interface SignalConflictPayload {
  error?: string;
  symbol?: string;
  level: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  confidence_penalty_pct: number;
  conflicting_signals: { signal_a: string; signal_b: string; detail: string }[];
  momentum?: { m5: number; m20: number; m60: number };
  regime?: string;
}

const LEVEL_TONE: Record<string, "green" | "amber" | "red" | "neutral"> = {
  NONE: "green",
  LOW: "amber",
  MEDIUM: "amber",
  HIGH: "red",
};

export function SignalConflictTab({ symbol }: { symbol?: string }) {
  const sc = useQuery({
    queryKey: ["signal-conflict", symbol ?? "auto"],
    queryFn: () => getSignalConflict(symbol) as unknown as Promise<SignalConflictPayload>,
    staleTime: 20000,
    refetchOnWindowFocus: false,
  });

  const d = sc.data;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card
        title={d?.symbol ? `Signal conflict · ${d.symbol}` : "Signal conflict"}
        right={d && <Pill tone={LEVEL_TONE[d.level] ?? "neutral"}>{d.level}</Pill>}
      >
        {sc.isPending ? (
          <Loading />
        ) : !d ? (
          <p className="text-sm text-text-muted">Signal conflict data unavailable.</p>
        ) : (
          <>
            <Row label="Confidence penalty" value={`-${d.confidence_penalty_pct}%`} />
            <Row label="Regime" value={d.regime ?? "—"} />
            {d.momentum && (
              <>
                <Row label="Momentum (5)" value={`${d.momentum.m5 >= 0 ? "+" : ""}${d.momentum.m5}%`} />
                <Row label="Momentum (20)" value={`${d.momentum.m20 >= 0 ? "+" : ""}${d.momentum.m20}%`} />
                <Row label="Momentum (60)" value={`${d.momentum.m60 >= 0 ? "+" : ""}${d.momentum.m60}%`} last />
              </>
            )}
          </>
        )}
      </Card>

      <Card title="Conflicting signal pairs">
        {sc.isPending ? (
          <Loading />
        ) : !d || (d.conflicting_signals ?? []).length === 0 ? (
          <p className="text-sm text-text-muted">No conflicting signals detected right now.</p>
        ) : (
          <div className="space-y-2">
            {(d.conflicting_signals ?? []).map((c, i) => (
              <div key={i} className="rounded-md border border-surface-border p-2.5 text-[11px]">
                <div className="font-semibold text-text-primary">
                  {c.signal_a} vs {c.signal_b}
                </div>
                <p className="mt-1 text-text-faint">{c.detail}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
