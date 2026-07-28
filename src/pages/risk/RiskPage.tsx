import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getRiskMetrics, getKillSwitchHistory, getCapitalPreservationStatus } from "../../api/risk";
import { getBehaviorSession, getBehaviorOverrides, getBehaviorTrend } from "../../api/behavior";
import { NullableNumber } from "../../components/ui/NullableNumber";
import { RiskLimitsAdmin } from "../../components/risk/RiskLimitsAdmin";
import { PendingSignoffQueue } from "../../components/risk/PendingSignoffQueue";
import { useAuthStore } from "../../stores/authStore";

const HOURS_OPTIONS = [24, 72, 168] as const;

const IMPACT_TONE: Record<string, string> = {
  GOOD: "text-green",
  POOR: "text-amber",
  BAD: "text-red",
};

const STATUS_TONE: Record<string, string> = {
  OPTIMAL: "text-green",
  NORMAL: "text-green",
  WARNING: "text-amber",
  LOCKED: "text-red",
};

export default function RiskPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  const metrics = useQuery({ queryKey: ["risk-metrics"], queryFn: getRiskMetrics, staleTime: 20000 });
  const capPreservation = useQuery({ queryKey: ["capital-preservation"], queryFn: getCapitalPreservationStatus, staleTime: 20000 });
  const behavior = useQuery({ queryKey: ["behavior-session"], queryFn: getBehaviorSession, staleTime: 20000 });
  const [behaviorHours, setBehaviorHours] = useState<(typeof HOURS_OPTIONS)[number]>(24);
  const behaviorTrend = useQuery({ queryKey: ["behavior-trend", behaviorHours], queryFn: () => getBehaviorTrend(behaviorHours), staleTime: 30000 });
  const behaviorOverrides = useQuery({ queryKey: ["behavior-overrides", behaviorHours], queryFn: () => getBehaviorOverrides(behaviorHours), staleTime: 30000 });
  // GET /risk/killswitch/history is require_admin server-side — only fetch
  // for admins to avoid a guaranteed 403 for everyone else.
  const killLog = useQuery({ queryKey: ["kill-switch-history"], queryFn: getKillSwitchHistory, staleTime: 15000, enabled: isAdmin });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="VaR 95%"
          value={metrics.data?.var95 ?? null}
          badge={
            metrics.data?.var_source === "fallback_estimate"
              ? "Estimated"
              : metrics.data?.var_source === "garch_parametric"
                ? "GARCH est."
                : undefined
          }
        />
        <Stat label="Drawdown / Limit" value={metrics.data?.drawdown_current ?? null} suffix={metrics.data ? `% / ${metrics.data.drawdown_limit}%` : ""} />
        <Stat label="Leverage" value={metrics.data?.leverage ?? null} />
        <Stat label="Daily Loss / Limit" value={metrics.data?.daily_loss ?? null} suffix={metrics.data ? ` / ${metrics.data.daily_loss_limit}` : ""} />
      </div>
      {metrics.data?.equity_is_estimated && (
        <p className="-mt-1 text-[10.5px] leading-relaxed text-amber-400">
          No real balance history yet for this account — VaR/CVaR above are computed off a placeholder $100,000
          equity, not your real account balance. This will resolve once at least one trade has filled.
        </p>
      )}

      <div className="rounded-[10px] border border-surface-border bg-surface-raised">
        <div className="border-b border-surface-border px-4 py-3 text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">
          Capital preservation
        </div>
        <div className="p-4">
          {!capPreservation.data ? (
            <p className="text-sm text-text-muted">Loading…</p>
          ) : !capPreservation.data.configured ? (
            <p className="text-[11.5px] leading-relaxed text-text-faint">
              No capital-preservation goal is configured. {isAdmin ? "Set one below (Risk limits → limit type" : "An admin can set one (Risk limits → limit type"}{" "}
              <span className="font-mono text-text-muted">capital_preservation_goal</span>).
            </p>
          ) : (
            <>
              <Row
                label="Goal"
                value={`$${capPreservation.data.goal_equity!.toLocaleString()} equity`}
              />
              <Row
                label="Current equity"
                value={`$${capPreservation.data.current_equity!.toLocaleString()} (${capPreservation.data.progress_pct}%)`}
              />
              <div className="my-2 h-1.5 overflow-hidden rounded-full bg-surface-overlay">
                <div
                  className={`h-full rounded-full ${capPreservation.data.goal_met ? "bg-green" : "bg-blue"}`}
                  style={{ width: `${Math.min(100, capPreservation.data.progress_pct ?? 0)}%` }}
                />
              </div>
              <Row
                label="Stopping zone"
                value={capPreservation.data.goal_met ? "Active — goal met" : "Not active"}
                tone={capPreservation.data.goal_met ? "pos" : undefined}
              />
              <Row
                label="New orders"
                value={capPreservation.data.blocks_new_orders ? "Blocked" : "Allowed"}
                tone={capPreservation.data.blocks_new_orders ? "neg" : "pos"}
                last
              />
              <p className="mt-3 text-[10.5px] leading-relaxed text-text-faint">
                {capPreservation.data.breach_action === "ALERT"
                  ? "Breach action is ALERT — informational only, new orders are never blocked by this goal."
                  : "Once the goal is met, new order submission is blocked to preserve the gains that reached it. Existing open positions are never touched automatically — closing them is still a manual decision."}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-[10px] border border-surface-border bg-surface-raised">
          <div className="border-b border-surface-border px-4 py-3 text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">
            System status
          </div>
          <div className="p-4">
            {/* kill_switch_armed is a static readiness flag (there is no
               server-side pause/resume toggle -- POST /risk/killswitch is a
               one-shot cancel-and-close action), not a live armed/disarmed
               state. "Ready"/"Unavailable" avoids implying otherwise. */}
            <Row label="Kill switch" value={metrics.data ? (metrics.data.kill_switch_armed ? "Ready" : "Unavailable") : "—"} tone={metrics.data?.kill_switch_armed ? "pos" : "neg"} />
            <Row label="Triggers today" value={metrics.data ? String(metrics.data.triggers_today) : "—"} last />
            <p className="mt-3 text-[10.5px] leading-relaxed text-text-faint">
              The kill control lives in the topbar (hold to arm, then confirm) and fires a real one-shot cancel-all /
              close-all action — there is no separate paused/defensive server state to resume from today.
            </p>
          </div>
        </div>

        <div className="rounded-[10px] border border-surface-border bg-surface-raised">
          <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
            <span className="text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">Trader state</span>
            <span className="text-[10px] text-text-faint">Self-calibration, not review</span>
          </div>
          <div className="p-4">
            {behavior.data ? (
              <>
                <TraderBar label="Discipline" value={`${behavior.data.score}%`} pct={behavior.data.score} tone={STATUS_TONE[behavior.data.status]} />
                <TraderBar
                  label="Session status"
                  value={behavior.data.status}
                  pct={behavior.data.score}
                  tone={STATUS_TONE[behavior.data.status]}
                />
                <TraderBar
                  label="Overtrading (freq vs. baseline)"
                  value={`${behavior.data.trade_frequency_vs_baseline.toFixed(2)}×`}
                  pct={Math.min(100, behavior.data.trade_frequency_vs_baseline * 40)}
                  tone={behavior.data.trade_frequency_vs_baseline > 1.5 ? "text-amber" : "text-green"}
                />
                <TraderBar
                  label="Override pattern"
                  value={`${behavior.data.overrides_this_hour}/hr · max ${behavior.data.override_max_per_hour}`}
                  pct={Math.min(100, (behavior.data.overrides_this_hour / behavior.data.override_max_per_hour) * 100)}
                  tone={behavior.data.overrides_this_hour > behavior.data.override_max_per_hour / 2 ? "text-amber" : "text-green"}
                />
                <TraderBar
                  label="Emotional pressure"
                  value={`${(behavior.data.emotional_score * 100).toFixed(0)}%`}
                  pct={behavior.data.emotional_score * 100}
                  tone={behavior.data.emotional_score > 0.5 ? "text-amber" : "text-green"}
                  last
                />
                <details className="mt-3">
                  <summary className="cursor-pointer text-[11px] text-blue">What does this track?</summary>
                  <p className="mt-2 text-[11px] leading-relaxed text-text-muted">
                    These signals are derived from your order history — override/reversal rate, trade frequency vs.
                    your own rolling baseline, and a composite emotional-pressure score. Nothing here changes how the
                    system trades, and it is not shared externally.
                  </p>
                </details>
              </>
            ) : (
              <p className="text-sm text-text-muted">Loading…</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[10px] border border-surface-border bg-surface-raised">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
          <span className="text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">Behavior history</span>
          <div className="flex gap-1.5">
            {HOURS_OPTIONS.map((h) => (
              <button
                key={h}
                onClick={() => setBehaviorHours(h)}
                className={`rounded-md border px-2.5 py-1 text-[10.5px] font-semibold ${
                  behaviorHours === h ? "border-blue-border bg-blue-bg text-blue" : "border-surface-border-strong text-text-faint"
                }`}
              >
                {h}h
              </button>
            ))}
          </div>
        </div>
        <div className="h-[160px] p-3.5">
          {behaviorTrend.data && behaviorTrend.data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={behaviorTrend.data}>
                <defs>
                  <linearGradient id="behaviorScoreFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3ba25f" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3ba25f" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="ts"
                  tick={{ fontSize: 10, fill: "#8d9fbc" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(ts: string) => new Date(ts).toUTCString().slice(17, 22)}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#8d9fbc" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#10141b", border: "1px solid rgba(125,155,205,.2)", fontSize: 11 }}
                  labelFormatter={(ts) => new Date(String(ts)).toUTCString().slice(0, 22)}
                  formatter={(value) => [value, "Score"]}
                />
                <Area type="monotone" dataKey="score" stroke="#3ba25f" strokeWidth={2} fill="url(#behaviorScoreFill)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-text-muted">No behavior history yet.</p>
          )}
        </div>
        <div className="border-t border-surface-border">
          {!behaviorOverrides.data || behaviorOverrides.data.items.length === 0 ? (
            <p className="p-4 text-sm text-text-muted">No overrides in this window.</p>
          ) : (
            <table className="w-full text-[11.5px]">
              <thead>
                <tr className="bg-surface-card text-[9.5px] uppercase tracking-[.06em] text-text-faint">
                  <th className="px-2.5 py-2 text-left">Time</th>
                  <th className="px-2.5 py-2 text-left">AI signal</th>
                  <th className="px-2.5 py-2 text-left">Trader action</th>
                  <th className="px-2.5 py-2 text-left">Outcome P&amp;L</th>
                  <th className="px-2.5 py-2 text-left">Impact</th>
                </tr>
              </thead>
              <tbody>
                {behaviorOverrides.data.items.map((o) => (
                  <tr key={o.id} className="border-b border-surface-border last:border-0">
                    <td className="px-2.5 py-2.5">{new Date(o.occurred_at).toUTCString().slice(17, 22)} UTC</td>
                    <td className="px-2.5 py-2.5">
                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${o.ai_signal === "ALLOW" ? "border-green-border bg-green-bg text-green" : "border-red-border bg-red-bg text-red"}`}>
                        {o.ai_signal}
                      </span>
                    </td>
                    <td className="px-2.5 py-2.5">{o.trader_action}</td>
                    <td className={`px-2.5 py-2.5 font-semibold ${o.outcome_pnl >= 0 ? "text-green" : "text-red"}`}>
                      {o.outcome_pnl >= 0 ? "+" : ""}
                      {o.outcome_pnl.toFixed(2)}
                    </td>
                    <td className={`px-2.5 py-2.5 font-semibold ${IMPACT_TONE[o.impact]}`}>{o.impact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="rounded-[10px] border border-surface-border bg-surface-raised">
        <div className="border-b border-surface-border px-4 py-3 text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">
          Kill log
        </div>
        {!isAdmin ? (
          <p className="p-4 text-sm text-text-muted">Visible to admins only.</p>
        ) : !killLog.data || killLog.data.length === 0 ? (
          <p className="p-4 text-sm text-text-muted">No kill switch events yet.</p>
        ) : (
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="bg-surface-card text-[9.5px] uppercase tracking-[.06em] text-text-faint">
                <th className="px-2.5 py-2 text-left">Time</th>
                <th className="px-2.5 py-2 text-left">Trigger</th>
                <th className="px-2.5 py-2 text-left">Reason</th>
                <th className="px-2.5 py-2 text-left">Cancelled / Closed</th>
                <th className="px-2.5 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {killLog.data.map((k) => (
                <tr key={k.id} className="border-b border-surface-border last:border-0">
                  <td className="px-2.5 py-2.5">{new Date(k.created_at).toUTCString().slice(17, 22)} UTC</td>
                  <td className="px-2.5 py-2.5">
                    <span className="rounded-md border border-blue-border bg-blue-bg px-2 py-0.5 text-[10px] font-bold text-blue">{k.trigger_source}</span>
                  </td>
                  <td className="px-2.5 py-2.5">{k.reason}</td>
                  <td className="px-2.5 py-2.5">
                    {k.orders_cancelled} / {k.positions_closed}
                  </td>
                  <td className="px-2.5 py-2.5">{k.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PendingSignoffQueue />

      {isAdmin && <RiskLimitsAdmin />}

      <div className="rounded-[10px] border border-surface-border bg-surface-raised p-4 text-[11.5px] leading-relaxed text-text-faint">
        Alerts live in the bell icon at the top of every screen, so they're visible no matter where you are, not just
        here. Critical events also interrupt with a banner; everything else stays a passive count until you choose to
        look.
      </div>
    </div>
  );
}

function Stat({ label, value, suffix = "", badge }: { label: string; value: number | null; suffix?: string; badge?: string }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-3">
      <div className="flex items-center justify-between gap-1.5">
        <p className="text-xs text-text-muted">{label}</p>
        {badge && (
          <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[8.5px] uppercase tracking-[.05em] text-amber-400">
            {badge}
          </span>
        )}
      </div>
      <p className="font-mono text-lg text-text-primary">
        <NullableNumber value={value} />
        {suffix}
      </p>
    </div>
  );
}

function Row({ label, value, tone, last }: { label: string; value: string; tone?: "pos" | "neg"; last?: boolean }) {
  const toneClass = tone === "pos" ? "text-green" : tone === "neg" ? "text-red" : "text-text-primary";
  return (
    <div className={`flex justify-between py-1.5 text-[11.5px] ${last ? "" : "border-b border-surface-border"}`}>
      <span className="text-text-faint">{label}</span>
      <span className={`font-semibold ${toneClass}`}>{value}</span>
    </div>
  );
}

function TraderBar({ label, value, pct, tone, last }: { label: string; value: string; pct: number; tone: string; last?: boolean }) {
  return (
    <div className={last ? "" : "mb-3"}>
      <div className="mb-1 flex justify-between text-[11px]">
        <span className="text-text-faint">{label}</span>
        <span className={`font-bold ${tone}`}>{value}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-surface-overlay">
        <div className={`h-full rounded-full ${tone.replace("text-", "bg-")}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
    </div>
  );
}
