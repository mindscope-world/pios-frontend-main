import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getEquityCurve, getPortfolioMetrics, listPositions } from "../../api/positions";
import { getRiskMetrics } from "../../api/risk";
import { NullableNumber } from "../../components/ui/NullableNumber";

export default function PortfolioPage() {
  const positions = useQuery({ queryKey: ["positions"], queryFn: listPositions, staleTime: 15000 });
  const metrics = useQuery({ queryKey: ["portfolio-metrics"], queryFn: getPortfolioMetrics, staleTime: 20000 });
  const equity = useQuery({ queryKey: ["equity-curve"], queryFn: getEquityCurve, staleTime: 30000 });
  const risk = useQuery({ queryKey: ["risk-metrics"], queryFn: getRiskMetrics, staleTime: 20000 });

  const openPositions = positions.data?.filter((p) => p.is_open) ?? [];

  const exposurePct = metrics.data ? Math.min(100, (metrics.data.total_equity > 0 ? (openPositions.reduce((s, p) => s + p.qty * p.avg_cost, 0) / metrics.data.total_equity) * 100 : 0)) : 0;
  const dailyLossPct = risk.data && risk.data.daily_loss_limit > 0 ? Math.min(100, (risk.data.daily_loss / risk.data.daily_loss_limit) * 100) : 0;
  const drawdownVsLimitPct = risk.data && risk.data.drawdown_limit > 0 ? Math.min(100, (Math.abs(risk.data.drawdown_current) / risk.data.drawdown_limit) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-[10px] border border-surface-border bg-surface-raised">
          <div className="border-b border-surface-border px-4 py-3 text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">
            Open positions
          </div>
          {openPositions.length === 0 ? (
            <p className="p-4 text-sm text-text-muted">No open positions.</p>
          ) : (
            <table className="w-full text-[11.5px]">
              <thead>
                <tr className="bg-surface-card text-[9.5px] uppercase tracking-[.06em] text-text-faint">
                  <th className="px-2.5 py-2 text-left">Symbol</th>
                  <th className="px-2.5 py-2 text-left">Side</th>
                  <th className="px-2.5 py-2 text-left">Avg cost</th>
                  <th className="px-2.5 py-2 text-left">Qty</th>
                  <th className="px-2.5 py-2 text-left">Unrealized P&L</th>
                </tr>
              </thead>
              <tbody>
                {openPositions.map((p) => (
                  <tr key={p.id} className="border-b border-surface-border last:border-0">
                    <td className="px-2.5 py-2.5">{p.symbol?.symbol ?? "—"}</td>
                    <td className={`px-2.5 py-2.5 ${p.side === "BUY" ? "text-green" : "text-red"}`}>{p.side === "BUY" ? "Long" : "Short"}</td>
                    <td className="px-2.5 py-2.5">{p.avg_cost}</td>
                    <td className="px-2.5 py-2.5">{p.qty}</td>
                    <td className={`px-2.5 py-2.5 font-semibold ${p.unrealized_pnl >= 0 ? "text-green" : "text-red"}`}>
                      {p.unrealized_pnl.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-[10px] border border-surface-border bg-surface-raised">
          <div className="border-b border-surface-border px-4 py-3 text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">
            Equity
          </div>
          <div className="h-[200px] p-3.5">
            {equity.data && equity.data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equity.data}>
                  <defs>
                    <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f2a93b" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#f2a93b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#8d9fbc" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#8d9fbc" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                  <Tooltip contentStyle={{ background: "#10141b", border: "1px solid rgba(125,155,205,.2)", fontSize: 11 }} />
                  <Area type="monotone" dataKey="value" stroke="#f2a93b" strokeWidth={2} fill="url(#equityFill)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-text-muted">No equity history yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[10px] border border-surface-border bg-surface-raised">
        <div className="border-b border-surface-border px-4 py-3 text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">
          Portfolio intelligence
        </div>
        <div className="p-4">
          <div className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-3">
            <Metric label="Sharpe" value={<NullableNumber value={metrics.data?.sharpe ?? null} />} />
            <Metric label="Win rate" value={<NullableNumber value={metrics.data?.win_rate ?? null} suffix="%" />} />
            <Metric label="Max drawdown" value={metrics.data ? `${metrics.data.max_drawdown}%` : "—"} />
            <Metric label="Realized P&L" value={metrics.data ? `$${metrics.data.realized_pnl.toFixed(2)}` : "—"} />
            <Metric label="Unrealized P&L" value={metrics.data ? `$${metrics.data.unrealized_pnl.toFixed(2)}` : "—"} />
            <Metric label="Active strategies" value={metrics.data ? String(metrics.data.active_strategies) : "—"} />
          </div>

          <ProgressRow label="Total exposure" value={`${exposurePct.toFixed(0)}% of equity`} pct={exposurePct} color="#22d97c" />
          <ProgressRow label="Daily loss limit used" value={`${dailyLossPct.toFixed(0)}%`} pct={dailyLossPct} color={dailyLossPct > 70 ? "#ef3b57" : "#22d97c"} />
          <ProgressRow label="Max drawdown vs limit" value={`${drawdownVsLimitPct.toFixed(0)}%`} pct={drawdownVsLimitPct} color={drawdownVsLimitPct > 70 ? "#ef3b57" : "#f2a93b"} />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[9px] uppercase tracking-[.06em] text-text-faint">{label}</div>
      <div className="text-[13px] font-semibold text-text-primary">{value}</div>
    </div>
  );
}

function ProgressRow({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  return (
    <div className="mt-3.5 first:mt-0">
      <div className="flex justify-between text-[11.5px]">
        <span className="text-text-faint">{label}</span>
        <span className="font-semibold text-text-primary">{value}</span>
      </div>
      <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-surface-overlay">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
