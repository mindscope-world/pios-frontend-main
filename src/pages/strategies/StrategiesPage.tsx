import { useQuery } from "@tanstack/react-query";
import { listStrategies, type LifecycleStage } from "../../api/strategies";
import { NullableNumber } from "../../components/ui/NullableNumber";

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

export default function StrategiesPage() {
  const strategies = useQuery({ queryKey: ["strategies"], queryFn: () => listStrategies({ page_size: 50 }) });

  return (
    <div className="rounded-[10px] border border-surface-border bg-surface-raised">
      <div className="border-b border-surface-border px-4 py-3 text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">
        Active strategies
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
                  <td className="px-2.5 py-2.5 font-semibold text-text-primary">{s.name}</td>
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
    </div>
  );
}
