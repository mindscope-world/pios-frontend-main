import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCapitalAllocation, triggerRebalance, type ClockBandsOut } from "../../api/capital";
import { useAuthStore } from "../../stores/authStore";

export default function CapitalPage() {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  // POST /capital/rebalance is require_admin server-side.
  const canRebalance = role === "admin";
  const [rebalanceResult, setRebalanceResult] = useState<string | null>(null);

  const allocation = useQuery({
    queryKey: ["capital-allocation"],
    queryFn: getCapitalAllocation,
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const rebalance = useMutation({
    mutationFn: triggerRebalance,
    onSuccess: (res) => {
      setRebalanceResult(res.job_id);
      queryClient.invalidateQueries({ queryKey: ["capital-allocation"] });
    },
  });

  const a = allocation.data;

  return (
    <div className="space-y-4">
      <div className="rounded-[10px] border border-surface-border bg-surface-raised">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
          <span className="text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">Capital allocation</span>
          {canRebalance && (
            <button
              onClick={() => rebalance.mutate()}
              disabled={rebalance.isPending}
              className="rounded-md border border-blue-border bg-blue-bg px-3 py-1 text-[10.5px] font-semibold text-blue disabled:opacity-50"
            >
              {rebalance.isPending ? "Queuing…" : "Trigger rebalance"}
            </button>
          )}
        </div>

        {allocation.isPending ? (
          <p className="p-4 text-sm text-text-muted">Loading…</p>
        ) : !a ? (
          <p className="p-4 text-sm text-text-muted">No allocation data available.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
              <Metric label="Total equity" value={`$${a.total_equity.toLocaleString()}`} />
              <Metric label="Cash %" value={`${a.cash_pct}%`} />
              <Metric label="Deployed %" value={`${a.deployed_pct}%`} />
              <Metric
                label="Rebalance"
                value={a.rebalance_needed ? "Needed" : "On target"}
                tone={a.rebalance_needed ? "amber" : "green"}
              />
            </div>
            <p className="px-4 pb-3 text-[10.5px] text-text-faint">
              Last rebalanced {new Date(a.last_rebalanced_at).toLocaleString()}
            </p>

            {rebalanceResult && (
              <p className="mx-4 mb-3 rounded-md border border-blue-border bg-blue-bg p-2.5 text-[10.5px] text-blue">
                Rebalance queued — job {rebalanceResult}. This creates a placeholder record server-side; there's no
                status endpoint to poll it (see api/capital.ts).
              </p>
            )}

            <table className="w-full text-[11.5px]">
              <thead>
                <tr className="bg-surface-card text-[9.5px] uppercase tracking-[.06em] text-text-faint">
                  <th className="px-2.5 py-2 text-left">Asset</th>
                  <th className="px-2.5 py-2 text-left">Target %</th>
                  <th className="px-2.5 py-2 text-left">Current %</th>
                  <th className="px-2.5 py-2 text-left">Value (USD)</th>
                  <th className="px-2.5 py-2 text-left">Drift</th>
                </tr>
              </thead>
              <tbody>
                {a.slices.map((s) => {
                  const drift = s.current_pct - s.target_pct;
                  return (
                    <tr key={s.asset} className="border-b border-surface-border last:border-0">
                      <td className="px-2.5 py-2.5 font-semibold text-text-primary">{s.asset}</td>
                      <td className="px-2.5 py-2.5 font-mono">{s.target_pct}%</td>
                      <td className="px-2.5 py-2.5 font-mono">{s.current_pct}%</td>
                      <td className="px-2.5 py-2.5 font-mono">${s.value_usd.toLocaleString()}</td>
                      <td className={`px-2.5 py-2.5 font-mono font-semibold ${Math.abs(drift) > 5 ? "text-amber" : "text-text-faint"}`}>
                        {drift >= 0 ? "+" : ""}
                        {drift.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>

      <div className="rounded-[10px] border border-surface-border bg-surface-raised p-4 text-[10.5px] leading-relaxed text-text-faint">
        Target % is a {a?.optimiser_mode ?? "HRP"}-weighted allocation computed from recent per-asset tick return
        correlations (app/services/quant_engine.py), scaled to your currently deployed capital — not a simple
        equal-weight split. Drift beyond ±5% is what the backend's own rebalance_needed flag treats as out of target.
      </div>

      {a?.clock_bands && <ClockBandsCard clockBands={a.clock_bands} />}
    </div>
  );
}

function ClockBandsCard({ clockBands }: { clockBands: ClockBandsOut }) {
  const { regime, clocks, conflict, reallocation_plan } = clockBands;

  return (
    <div className="rounded-[10px] border border-surface-border bg-surface-raised">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
        <span className="text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">
          Alpha clock bands {regime && <span className="font-normal normal-case text-text-muted">— {regime}</span>}
        </span>
        <ReallocationBadge plan={reallocation_plan} />
      </div>

      {conflict.conflict && (
        <p className="mx-4 mt-3 rounded-md border border-red-border bg-red-bg p-2.5 text-[10.5px] text-red">
          {conflict.type} — {conflict.detail}
        </p>
      )}

      <table className="w-full text-[11.5px]">
        <thead>
          <tr className="bg-surface-card text-[9.5px] uppercase tracking-[.06em] text-text-faint">
            <th className="px-2.5 py-2 text-left">Clock</th>
            <th className="px-2.5 py-2 text-left">Raw %</th>
            <th className="px-2.5 py-2 text-left">Band</th>
            <th className="px-2.5 py-2 text-left">Clamped %</th>
          </tr>
        </thead>
        <tbody>
          {clocks.map((c) => (
            <tr key={c.clock} className="border-b border-surface-border last:border-0">
              <td className="px-2.5 py-2.5 font-semibold text-text-primary">{c.clock}</td>
              <td className="px-2.5 py-2.5 font-mono">{c.raw_pct}%</td>
              <td className="px-2.5 py-2.5 font-mono text-text-faint">
                {c.band_min_pct === null ? "unconfigured" : `${c.band_min_pct}–${c.band_max_pct}%`}
              </td>
              <td className={`px-2.5 py-2.5 font-mono font-semibold ${c.clamped ? "text-amber" : "text-text-faint"}`}>
                {c.clamped_pct}%{c.clamped && " (clamped)"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="px-4 py-3 text-[10.5px] leading-relaxed text-text-faint">
        Reallocation speed: <span className="font-semibold text-text-primary">{reallocation_plan.speed}</span> —{" "}
        {reallocation_plan.reason}
      </p>
    </div>
  );
}

function ReallocationBadge({ plan }: { plan: { speed: string } }) {
  const toneClass =
    plan.speed === "FREEZE"
      ? "border-red-border bg-red-bg text-red"
      : plan.speed === "FAST"
        ? "border-green-border bg-green-bg text-green"
        : plan.speed === "SLOW"
          ? "border-amber-border bg-amber-bg text-amber"
          : "border-surface-border-strong text-text-faint";
  return (
    <span className={`rounded-md border px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[.06em] ${toneClass}`}>
      {plan.speed}
    </span>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "green" | "amber" }) {
  const toneClass = tone === "green" ? "text-green" : tone === "amber" ? "text-amber" : "text-text-primary";
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[9px] uppercase tracking-[.06em] text-text-faint">{label}</div>
      <div className={`text-[13px] font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}
