import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  getDataIntegrityStatus,
  getFeedLatencyChart,
  getSlippageChart,
  getTcaSummary,
  getTicksBySymbolId,
  type FeedStatus,
} from "../../api/execution_quality";
import { listDQSymbols } from "../../api/data_quality";

const HOURS_OPTIONS = [24, 72, 168] as const;

const STALENESS_CLASSES: Record<FeedStatus["staleness"], string> = {
  OK: "bg-decision-allow/20 text-decision-allow",
  WARN: "bg-decision-wait/20 text-decision-wait",
  STALE: "bg-decision-block/20 text-decision-block",
};

export default function ExecutionQualityPage() {
  const [hours, setHours] = useState<(typeof HOURS_OPTIONS)[number]>(24);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  const integrity = useQuery({
    queryKey: ["data-integrity-status"],
    queryFn: getDataIntegrityStatus,
    staleTime: 15000,
    refetchInterval: 15000,
  });

  const latencyChart = useQuery({
    queryKey: ["feed-latency-chart", expandedSymbol],
    queryFn: () => getFeedLatencyChart([expandedSymbol!]),
    enabled: !!expandedSymbol,
    staleTime: 15000,
  });

  // GET /data/symbols covers the full active universe with numeric ids —
  // the symbol→id map that makes /market/ticks/{symbol_id} usable from here.
  const symbols = useQuery({ queryKey: ["dq-symbols"], queryFn: () => listDQSymbols(), staleTime: 300000 });
  const expandedSymbolId = symbols.data?.find((s) => s.symbol === expandedSymbol)?.id;

  const ticks = useQuery({
    queryKey: ["stored-ticks", expandedSymbolId],
    queryFn: () => getTicksBySymbolId(expandedSymbolId!, 12),
    enabled: expandedSymbolId != null,
    staleTime: 15000,
  });

  const tca = useQuery({
    queryKey: ["tca-summary", hours],
    queryFn: () => getTcaSummary(hours),
    staleTime: 30000,
  });

  const slippageChart = useQuery({
    queryKey: ["slippage-chart", hours],
    queryFn: () => getSlippageChart(hours),
    staleTime: 30000,
  });

  return (
    <div className="space-y-4">
      {/* ── Data integrity ─────────────────────────────────────────── */}
      <div className="rounded-[10px] border border-surface-border bg-surface-raised">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
          <span className="text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">
            Data integrity — feed health
          </span>
          {integrity.data && (
            <span className={`rounded px-2 py-0.5 text-[10.5px] font-semibold ${integrity.data.overall_healthy ? "bg-decision-allow/20 text-decision-allow" : "bg-decision-block/20 text-decision-block"}`}>
              {integrity.data.overall_healthy ? "All feeds healthy" : "Degraded"}
            </span>
          )}
        </div>

        {integrity.isPending ? (
          <p className="p-4 text-sm text-text-muted">Loading…</p>
        ) : !integrity.data || integrity.data.feeds.length === 0 ? (
          <p className="p-4 text-sm text-text-muted">No active symbols configured.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
              <Metric label="Overall latency" value={`${integrity.data.overall_latency_ms} ms`} />
              <Metric label="Sync drift" value={`${integrity.data.sync_drift_ms} ms`} />
              <Metric label="Staleness limit" value={`${integrity.data.staleness_limit_ms} ms`} />
              <Metric label="Feeds tracked" value={String(integrity.data.feeds.length)} />
            </div>

            <table className="w-full text-[11.5px]">
              <thead>
                <tr className="bg-surface-card text-[9.5px] uppercase tracking-[.06em] text-text-faint">
                  <th className="px-2.5 py-2 text-left">Symbol</th>
                  <th className="px-2.5 py-2 text-left">Last tick</th>
                  <th className="px-2.5 py-2 text-left">Age</th>
                  <th className="px-2.5 py-2 text-left">Sync drift</th>
                  <th className="px-2.5 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {integrity.data.feeds.map((f) => (
                  <Fragment key={f.symbol}>
                    <tr
                      onClick={() => setExpandedSymbol(expandedSymbol === f.symbol ? null : f.symbol)}
                      className="cursor-pointer border-b border-surface-border last:border-0 hover:bg-white/[.02]"
                    >
                      <td className="px-2.5 py-2.5 font-semibold text-text-primary">{f.symbol}</td>
                      <td className="px-2.5 py-2.5 font-mono text-text-faint">{new Date(f.last_tick_at).toLocaleTimeString()}</td>
                      <td className="px-2.5 py-2.5 font-mono">{f.age_ms} ms</td>
                      <td className="px-2.5 py-2.5 font-mono">{f.sync_drift_ms} ms</td>
                      <td className="px-2.5 py-2.5">
                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STALENESS_CLASSES[f.staleness]}`}>{f.staleness}</span>
                      </td>
                    </tr>
                    {expandedSymbol === f.symbol && (
                      <tr className="border-b border-surface-border last:border-0">
                        <td colSpan={5} className="bg-surface-card p-3">
                          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr]">
                            <div className="h-[140px]">
                              {latencyChart.isPending ? (
                                <p className="text-sm text-text-muted">Loading…</p>
                              ) : !latencyChart.data || latencyChart.data.length === 0 ? (
                                <p className="text-sm text-text-muted">No tick history for {f.symbol} yet.</p>
                              ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={latencyChart.data}>
                                    <XAxis dataKey="ts" tick={{ fontSize: 9, fill: "#8d9fbc" }} axisLine={false} tickLine={false} tickFormatter={(v) => new Date(v).toLocaleTimeString()} />
                                    <YAxis tick={{ fontSize: 9, fill: "#8d9fbc" }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                      contentStyle={{ background: "#10141b", border: "1px solid rgba(125,155,205,.2)", fontSize: 11 }}
                                      labelFormatter={(v) => new Date(v as string).toLocaleTimeString()}
                                    />
                                    <Line type="monotone" dataKey="latency_ms" stroke="#3b82f2" strokeWidth={2} dot={false} />
                                  </LineChart>
                                </ResponsiveContainer>
                              )}
                            </div>
                            <div>
                              <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[.06em] text-text-ghost">
                                Latest stored ticks
                              </div>
                              {ticks.isPending && expandedSymbolId != null ? (
                                <p className="text-sm text-text-muted">Loading…</p>
                              ) : !ticks.data || ticks.data.length === 0 ? (
                                <p className="text-[11px] text-text-muted">No stored ticks for {f.symbol}.</p>
                              ) : (
                                <table className="w-full text-[10.5px]">
                                  <tbody>
                                    {ticks.data.map((t) => (
                                      <tr key={t.id} className="border-t border-surface-border font-mono first:border-0">
                                        <td className="py-1 text-text-ghost">{new Date(t.time).toLocaleTimeString()}</td>
                                        <td className={`py-1 ${t.side === "BUY" ? "text-green" : t.side === "SELL" ? "text-red" : "text-text-faint"}`}>
                                          {t.side ?? "—"}
                                        </td>
                                        <td className="py-1 text-right text-text-primary">{t.price}</td>
                                        <td className="py-1 text-right text-text-muted">{t.volume}</td>
                                        <td className="py-1 text-right text-text-faint">{t.dq_result ?? ""}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* ── Execution quality / TCA ────────────────────────────────── */}
      <div className="rounded-[10px] border border-surface-border bg-surface-raised">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
          <span className="text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">
            Execution quality — your fills
          </span>
          <div className="flex gap-1.5">
            {HOURS_OPTIONS.map((h) => (
              <button
                key={h}
                onClick={() => setHours(h)}
                className={`rounded-md border px-2.5 py-1 text-[10.5px] font-semibold ${
                  hours === h ? "border-blue-border bg-blue-bg text-blue" : "border-surface-border-strong text-text-faint"
                }`}
              >
                {h}h
              </button>
            ))}
          </div>
        </div>

        {tca.isPending ? (
          <p className="p-4 text-sm text-text-muted">Loading…</p>
        ) : !tca.data || tca.data.trades.length === 0 ? (
          <p className="p-4 text-sm text-text-muted">No fills in the last {hours}h.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3 lg:grid-cols-6">
              <Metric label="Expected slippage" value={`$${tca.data.expected_slippage_usd.toFixed(2)}`} />
              <Metric
                label="Actual slippage"
                value={`$${tca.data.actual_slippage_usd.toFixed(2)}`}
                tone={tca.data.actual_slippage_usd > tca.data.expected_slippage_usd ? "red" : "green"}
              />
              <Metric label="Half spread cost" value={`$${tca.data.half_spread_usd.toFixed(2)}`} />
              <Metric label="Exchange fees" value={`$${tca.data.exchange_fee_usd.toFixed(2)}`} />
              <Metric label="Funding impact" value={`$${tca.data.funding_impact_usd.toFixed(2)}`} />
              <Metric label="Total cost" value={`${tca.data.total_cost_bps} bps`} />
            </div>

            {slippageChart.data && slippageChart.data.length > 0 && (
              <div className="h-[160px] px-4 pb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={slippageChart.data}>
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#8d9fbc" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#8d9fbc" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#10141b", border: "1px solid rgba(125,155,205,.2)", fontSize: 11 }} />
                    <Bar dataKey="expected" fill="#8d9fbc" radius={[2, 2, 0, 0]} name="Expected" />
                    <Bar dataKey="actual" fill="#3b82f2" radius={[2, 2, 0, 0]} name="Actual" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <table className="w-full text-[11.5px]">
              <thead>
                <tr className="bg-surface-card text-[9.5px] uppercase tracking-[.06em] text-text-faint">
                  <th className="px-2.5 py-2 text-left">Executed at</th>
                  <th className="px-2.5 py-2 text-left">Symbol</th>
                  <th className="px-2.5 py-2 text-left">Side</th>
                  <th className="px-2.5 py-2 text-left">Qty</th>
                  <th className="px-2.5 py-2 text-left">Entry price</th>
                  <th className="px-2.5 py-2 text-left">Expected slip</th>
                  <th className="px-2.5 py-2 text-left">Actual slip</th>
                  <th className="px-2.5 py-2 text-left">Exec score</th>
                  <th className="px-2.5 py-2 text-left">Venue</th>
                </tr>
              </thead>
              <tbody>
                {tca.data.trades.map((t, i) => (
                  <tr key={`${t.order_id}-${i}`} className="border-b border-surface-border last:border-0">
                    <td className="px-2.5 py-2.5 font-mono text-text-faint">{new Date(t.executed_at).toLocaleString()}</td>
                    <td className="px-2.5 py-2.5">{t.symbol}</td>
                    <td className={`px-2.5 py-2.5 ${t.side === "BUY" ? "text-green" : "text-red"}`}>{t.side}</td>
                    <td className="px-2.5 py-2.5 font-mono">{t.qty} {t.size_unit}</td>
                    <td className="px-2.5 py-2.5 font-mono">{t.entry_price}</td>
                    <td className="px-2.5 py-2.5 font-mono">${t.expected_slippage_usd.toFixed(4)}</td>
                    <td className={`px-2.5 py-2.5 font-mono ${t.actual_slippage_usd > t.expected_slippage_usd ? "text-red" : "text-green"}`}>
                      ${t.actual_slippage_usd.toFixed(4)}
                    </td>
                    <td className="px-2.5 py-2.5 font-mono">{t.execution_score_ai}</td>
                    <td className="px-2.5 py-2.5 text-text-faint">{t.venue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      <div className="rounded-[10px] border border-surface-border bg-surface-raised p-4 text-[10.5px] leading-relaxed text-text-faint">
        "Execution quality" above reflects your own fills only (backend scopes /execution/tca to the calling user's
        orders) — it isn't a fleet-wide aggregate across all traders. Data integrity, by contrast, is system-wide: it
        covers every active symbol's tick feed regardless of who's trading it.
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" }) {
  const toneClass = tone === "green" ? "text-green" : tone === "red" ? "text-red" : "text-text-primary";
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[9px] uppercase tracking-[.06em] text-text-faint">{label}</div>
      <div className={`text-[13px] font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}
