import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getMonteCarlo } from "../../api/intelligence";
import { Card, Loading, Pill, Row } from "./shared";

// Verified against app/services/intelligence/montecarlo_service.py's
// compute_monte_carlo() — a live, per-request endpoint (not worker-cached),
// so this is fetched on-demand with a longer staleTime, not polled.
interface MonteCarloCase {
  label: "BULL" | "BASE" | "BEAR";
  return_pct: number;
  probability_pct: number;
  max_dd: number;
  description: string;
}

interface MonteCarloStressTest {
  name: string;
  trigger: string;
  expected_pnl: number;
  max_dd_pct: number;
  kill_switch_fires: boolean;
}

interface MonteCarloPayload {
  error?: string;
  symbol?: string;
  sim_count: number;
  horizon_days: number;
  p5_return_pct: number;
  p50_return_pct: number;
  p95_return_pct: number;
  histogram: { return_pct: number; count: number }[];
  cases: MonteCarloCase[];
  stress_tests: MonteCarloStressTest[];
  run_at: string;
}

const CASE_TONE: Record<string, "green" | "amber" | "red"> = { BULL: "green", BASE: "amber", BEAR: "red" };

export function MonteCarloTab({ symbol }: { symbol: string }) {
  const mc = useQuery({
    queryKey: ["monte-carlo", symbol],
    queryFn: () => getMonteCarlo({ symbol }) as unknown as Promise<MonteCarloPayload>,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const m = mc.data && !mc.data.error ? mc.data : null;

  return (
    <div className="space-y-4">
      <Card title={`Monte Carlo · ${symbol}`} right={m && <Pill tone="blue">{m.sim_count} sims · {m.horizon_days}d</Pill>}>
        {mc.isPending ? (
          <Loading />
        ) : !m ? (
          <p className="text-sm text-text-muted">
            {mc.data?.error === "insufficient_tick_data"
              ? `Not enough tick history for ${symbol} yet.`
              : mc.data?.error === "no_primary_symbol"
                ? "No primary symbol configured."
                : "Monte Carlo simulation unavailable."}
          </p>
        ) : (
          <>
            <Row label="P5 return" value={`${m.p5_return_pct}%`} />
            <Row label="P50 return (median)" value={`${m.p50_return_pct}%`} />
            <Row label="P95 return" value={`${m.p95_return_pct}%`} />
            <Row label="Run at" value={new Date(m.run_at).toLocaleString()} last />
          </>
        )}
      </Card>

      {m && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {m.cases.map((c) => (
              <Card key={c.label} title={c.label} right={<Pill tone={CASE_TONE[c.label] ?? "neutral"}>{c.probability_pct}%</Pill>}>
                <Row label="Return" value={`${c.return_pct >= 0 ? "+" : ""}${c.return_pct}%`} />
                <Row label="Max drawdown" value={`${c.max_dd}%`} last />
                <p className="mt-2 text-[11px] text-text-faint">{c.description}</p>
              </Card>
            ))}
          </div>

          <Card title="Return distribution">
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={m.histogram}>
                  <XAxis dataKey="return_pct" tick={{ fontSize: 9, fill: "#8d9fbc" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#8d9fbc" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#10141b", border: "1px solid rgba(125,155,205,.2)", fontSize: 11 }} />
                  <Bar dataKey="count" fill="#3b82f2" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Stress tests">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-[9.5px] uppercase tracking-[.06em] text-text-faint">
                  <th className="py-1 text-left">Scenario</th>
                  <th className="py-1 text-left">Trigger</th>
                  <th className="py-1 text-left">Expected P&L</th>
                  <th className="py-1 text-left">Max DD</th>
                  <th className="py-1 text-left">Kill switch</th>
                </tr>
              </thead>
              <tbody>
                {m.stress_tests.map((s) => (
                  <tr key={s.name} className="border-t border-surface-border">
                    <td className="py-1.5 font-semibold text-text-primary">{s.name}</td>
                    <td className="py-1.5 text-text-faint">{s.trigger}</td>
                    <td className={`py-1.5 font-mono ${s.expected_pnl < 0 ? "text-red" : "text-green"}`}>${s.expected_pnl.toLocaleString()}</td>
                    <td className="py-1.5 font-mono">{s.max_dd_pct}%</td>
                    <td className="py-1.5">{s.kill_switch_fires ? <Pill tone="red">FIRES</Pill> : <Pill tone="green">Managed</Pill>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
