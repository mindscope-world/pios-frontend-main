import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listStrategies, type LifecycleStage } from "../../api/strategies";
import { NullableNumber } from "../../components/ui/NullableNumber";
import { CreateStrategyModal } from "../../components/strategies/CreateStrategyModal";
import { useAuthStore } from "../../stores/authStore";

const STAGE_TAG: Record<LifecycleStage, { label: string; cls: string }> = {
  IDEA: { label: "Idea", cls: "bg-surface-overlay text-text-faint border-surface-border-strong" },
  RESEARCH: { label: "Research", cls: "bg-blue-bg text-blue border-blue-border" },
  BACKTEST: { label: "Shadow", cls: "bg-amber-bg text-amber border-amber-border" },
  PAPER: { label: "Paper", cls: "bg-blue-bg text-blue border-blue-border" },
  LIVE_SMALL: { label: "Live", cls: "bg-green-bg text-green border-green-border" },
  SCALED: { label: "Live", cls: "bg-green-bg text-green border-green-border" },
  MONITOR: { label: "Monitor", cls: "bg-amber-bg text-amber border-amber-border" },
  RETIRED: { label: "Retired", cls: "bg-surface-overlay text-text-faint border-surface-border-strong" },
};

// POST /strategies is require_quant (admin + trader) server-side — hide
// "New strategy" for other roles rather than let it 403.
const QUANT_ROLES = new Set(["admin", "quant"]);

export default function StrategiesPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canCreate = role ? QUANT_ROLES.has(role) : false;
  const strategies = useQuery({ queryKey: ["strategies"], queryFn: () => listStrategies({ page_size: 50 }) });
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="rounded-[10px] border border-surface-border bg-surface-raised">
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
        <span className="text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">Active strategies</span>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-md border border-green-border bg-green-bg px-3 py-1 text-[10.5px] font-semibold text-green"
          >
            + New strategy
          </button>
        )}
      </div>
      {strategies.isPending ? (
        <p className="p-4 text-sm text-text-muted">Loading…</p>
      ) : !strategies.data || strategies.data.items.length === 0 ? (
        <p className="p-4 text-sm text-text-muted">No strategies registered yet.</p>
      ) : (
        <table className="w-full text-[11.5px]">
          <thead>
            <tr className="bg-surface-card text-[9.5px] uppercase tracking-[.06em] text-text-faint">
              <th className="px-2.5 py-2 text-left">Strategy</th>
              <th className="px-2.5 py-2 text-left">Version</th>
              <th className="px-2.5 py-2 text-left">Status</th>
              <th className="px-2.5 py-2 text-left">Live Sharpe</th>
            </tr>
          </thead>
          <tbody>
            {strategies.data.items.map((s) => {
              const tag = STAGE_TAG[s.lifecycle_stage];
              return (
                <tr key={s.id} className="border-b border-surface-border last:border-0">
                  <td className="px-2.5 py-2.5">
                    <Link to={`/strategies/${s.id}`} className="font-semibold text-text-primary hover:text-accent">
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-2.5 py-2.5 text-text-faint">{s.version}</td>
                  <td className="px-2.5 py-2.5">
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${tag.cls}`}>{tag.label}</span>
                  </td>
                  <td className="px-2.5 py-2.5">
                    <NullableNumber value={s.sharpe_last} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showCreate && <CreateStrategyModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
