import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { listBrokers } from "../../api/brokers";

const STATUS_STYLE: Record<string, { dot: string; tag: string; label: string }> = {
  CONNECTED: { dot: "bg-green", tag: "bg-green-bg text-green border-green-border", label: "Live" },
  ERROR: { dot: "bg-amber", tag: "bg-amber-bg text-amber border-amber-border", label: "Degraded" },
  PENDING_AUTH: { dot: "bg-amber", tag: "bg-amber-bg text-amber border-amber-border", label: "Pending auth" },
  DISCONNECTED: { dot: "bg-text-ghost", tag: "bg-red-bg text-red border-red-border", label: "Disconnected" },
};

export default function ConnectionsPage() {
  const brokers = useQuery({ queryKey: ["brokers", "connections"], queryFn: () => listBrokers({ page_size: 50 }) });

  return (
    <div className="space-y-4">
      <div className="rounded-[10px] border border-surface-border bg-surface-raised">
        <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
          <span className="text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">Execution connections</span>
          <span className="text-[10px] text-text-faint">Execution reliability is a risk variable</span>
        </div>
        <div className="p-2">
          {brokers.isPending ? (
            <p className="p-3 text-sm text-text-muted">Loading…</p>
          ) : !brokers.data || brokers.data.items.length === 0 ? (
            <p className="p-3 text-sm text-text-muted">No brokers connected yet.</p>
          ) : (
            brokers.data.items.map((b) => {
              const style = STATUS_STYLE[b.status] ?? STATUS_STYLE.DISCONNECTED;
              return (
                <div key={b.id} className="flex items-center justify-between border-b border-surface-border px-2.5 py-2.5 text-[11.5px] last:border-0">
                  <div className="flex items-center gap-2 font-semibold text-text-primary">
                    <span className={`h-[7px] w-[7px] flex-shrink-0 rounded-full ${style.dot}`} />
                    {b.name}
                    {b.is_paper && <span className="text-[9px] font-normal text-text-faint">(paper)</span>}
                  </div>
                  <div className="flex gap-4">
                    <Meta label="Latency" value={b.latency_p99_ms != null ? `${b.latency_p99_ms}ms` : "—"} />
                    <Meta label="Status" value={<span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${style.tag}`}>{style.label}</span>} />
                  </div>
                </div>
              );
            })
          )}
        </div>
        <p className="border-t border-surface-border px-4 py-2.5 text-[10px] leading-relaxed text-text-faint">
          Per-broker order success rate isn't tracked by the backend yet (fills aren't currently rolled up by broker),
          so it's left off this row rather than shown as an invented number.
        </p>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col items-end">
      <div className="text-[9px] uppercase tracking-[.05em] text-text-ghost">{label}</div>
      <div className="text-[11.5px] font-semibold text-text-primary">{value}</div>
    </div>
  );
}
