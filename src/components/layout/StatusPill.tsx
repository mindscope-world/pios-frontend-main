import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRiskMetrics } from "../../api/risk";

/**
 * There is no server-side "trading paused / defensive mode" concept today —
 * POST /risk/killswitch is a one-shot cancel-and-close action, not a state
 * toggle (RiskMetricsOut.kill_switch_armed is a static readiness flag). This
 * pill is deliberately scoped to what's real: armed-readiness + how many
 * times it fired today, not a simulated system status.
 */
export function StatusPill() {
  const metrics = useQuery({ queryKey: ["risk-metrics"], queryFn: getRiskMetrics, staleTime: 15000, refetchInterval: 15000 });

  const armed = metrics.data?.kill_switch_armed ?? true;
  const triggers = metrics.data?.triggers_today ?? 0;
  const elevated = !armed || triggers > 0;

  return (
    <div
      className={`flex items-center gap-[7px] rounded-lg border px-3.5 py-1.5 text-[10.5px] font-semibold ${
        elevated ? "border-red-border bg-red-bg text-red" : "border-green-border bg-green-bg text-green"
      }`}
    >
      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${elevated ? "" : "animate-pulse"} bg-current`} />
      <span>{elevated ? (armed ? "Elevated" : "Unavailable") : "Nominal"}</span>
      <span className="font-normal text-text-faint">
        {armed ? `Kill switch ready · ${triggers} trigger${triggers === 1 ? "" : "s"} today` : "Kill switch unavailable"}
      </span>
    </div>
  );
}

export function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <div className="flex-shrink-0 text-[10.5px] text-text-faint">{now.toUTCString().slice(17, 25)} UTC</div>;
}
