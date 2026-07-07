import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DQ_MODULES,
  DQ_SEVERITIES,
  getDataQualityRegime,
  getDQEvents,
  getDQSummary,
  getFeedHealth,
  listDQSymbols,
  type DQEvent,
} from "../../api/data_quality";
import { ApiError } from "../../api/client";
import { useAuthStore } from "../../stores/authStore";

const QUANT_ROLES = new Set(["admin", "quant"]);

const SEVERITY_CLASSES: Record<DQEvent["severity"], string> = {
  INFO: "bg-surface-raised text-text-muted",
  WARN: "bg-decision-wait/20 text-decision-wait",
  ERROR: "bg-decision-block/20 text-decision-block",
  CRITICAL: "bg-red-bg text-red",
};

export default function DataQualityPage() {
  const role = useAuthStore((s) => s.user?.role);
  // GET /data/quality/summary and /data/quality/events are require_quant
  // (admin + quant) server-side — hide rather than let other roles hit a
  // bare 403 after seeing the section render.
  const canSeeQuality = role ? QUANT_ROLES.has(role) : false;

  return (
    <div className="space-y-4">
      <FeedHealthCard />
      {canSeeQuality ? (
        <>
          <DQSummaryCard />
          <DQEventsCard />
        </>
      ) : (
        <div className="rounded-[10px] border border-surface-border bg-surface-raised p-4 text-[10.5px] text-text-faint">
          Data quality summary and event log are restricted to admin/quant roles (`GET /data/quality/summary` and
          `/data/quality/events` are `require_quant` server-side).
        </div>
      )}
      <RegimeLookupCard />
    </div>
  );
}

function FeedHealthCard() {
  const feeds = useQuery({
    queryKey: ["dq-feed-health"],
    queryFn: getFeedHealth,
    staleTime: 10000,
    refetchInterval: 10000,
  });

  const okCount = feeds.data?.filter((f) => f.ok).length ?? 0;

  return (
    <div className="rounded-[10px] border border-surface-border bg-surface-raised">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
        <span className="text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">Feed health</span>
        {feeds.data && (
          <span className={`rounded px-2 py-0.5 text-[10.5px] font-semibold ${okCount === feeds.data.length ? "bg-decision-allow/20 text-decision-allow" : "bg-decision-block/20 text-decision-block"}`}>
            {okCount}/{feeds.data.length} OK
          </span>
        )}
      </div>
      {feeds.isPending ? (
        <p className="p-4 text-sm text-text-muted">Loading…</p>
      ) : !feeds.data || feeds.data.length === 0 ? (
        <p className="p-4 text-sm text-text-muted">No active symbols configured.</p>
      ) : (
        <table className="w-full text-[11.5px]">
          <thead>
            <tr className="bg-surface-card text-[9.5px] uppercase tracking-[.06em] text-text-faint">
              <th className="px-2.5 py-2 text-left">Symbol</th>
              <th className="px-2.5 py-2 text-left">Exchange</th>
              <th className="px-2.5 py-2 text-left">Lag</th>
              <th className="px-2.5 py-2 text-left">DQ score</th>
              <th className="px-2.5 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {feeds.data.map((f) => (
              <tr key={f.symbol} className="border-b border-surface-border last:border-0">
                <td className="px-2.5 py-2.5 font-semibold text-text-primary">{f.symbol}</td>
                <td className="px-2.5 py-2.5 text-text-faint">{f.exchange}</td>
                <td className="px-2.5 py-2.5 font-mono">{f.lag_ms} ms</td>
                <td className="px-2.5 py-2.5 font-mono">{f.dq_score.toFixed(1)}</td>
                <td className="px-2.5 py-2.5">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${f.ok ? "bg-decision-allow/20 text-decision-allow" : "bg-decision-block/20 text-decision-block"}`}>
                    {f.ok ? "OK" : "DEGRADED"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const HOURS_OPTIONS = [24, 72, 168] as const;

function DQSummaryCard() {
  const [hours, setHours] = useState<(typeof HOURS_OPTIONS)[number]>(24);
  const summary = useQuery({
    queryKey: ["dq-summary", hours],
    queryFn: () => getDQSummary(hours),
    staleTime: 30000,
  });

  return (
    <div className="rounded-[10px] border border-surface-border bg-surface-raised">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
        <span className="text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">Data quality summary</span>
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

      {summary.isPending ? (
        <p className="p-4 text-sm text-text-muted">Loading…</p>
      ) : !summary.data ? (
        <p className="p-4 text-sm text-text-muted">No data quality summary available.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-5">
            <Metric label="Total ticks" value={summary.data.total_ticks.toLocaleString()} />
            <Metric label="Pass rate" value={`${summary.data.pass_rate}%`} tone="green" />
            <Metric label="Flag rate" value={`${summary.data.flag_rate}%`} tone={summary.data.flag_rate > 5 ? "red" : undefined} />
            <Metric label="Reject rate" value={`${summary.data.reject_rate}%`} tone={summary.data.reject_rate > 2 ? "red" : undefined} />
            <Metric label="Gaps detected" value={String(summary.data.gaps)} tone={summary.data.gaps > 0 ? "red" : undefined} />
          </div>

          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="bg-surface-card text-[9.5px] uppercase tracking-[.06em] text-text-faint">
                <th className="px-2.5 py-2 text-left">Module</th>
                <th className="px-2.5 py-2 text-left">Processed</th>
                <th className="px-2.5 py-2 text-left">Pass rate</th>
                <th className="px-2.5 py-2 text-left">Flag rate</th>
                <th className="px-2.5 py-2 text-left">Reject rate</th>
                <th className="px-2.5 py-2 text-left">Avg latency</th>
              </tr>
            </thead>
            <tbody>
              {summary.data.modules.map((m) => (
                <tr key={m.name} className="border-b border-surface-border last:border-0">
                  <td className="px-2.5 py-2.5 font-semibold text-text-primary">{m.name}</td>
                  <td className="px-2.5 py-2.5 font-mono">{m.processed}</td>
                  <td className="px-2.5 py-2.5 font-mono text-green">{m.pass_rate}</td>
                  <td className="px-2.5 py-2.5 font-mono">{m.flag_rate}</td>
                  <td className="px-2.5 py-2.5 font-mono">{m.reject_rate}</td>
                  <td className="px-2.5 py-2.5 font-mono">{m.avg_latency_ms} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function DQEventsCard() {
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState<string>("");
  const [module, setModule] = useState<string>("");

  const events = useQuery({
    queryKey: ["dq-events", page, severity, module],
    queryFn: () => getDQEvents({ page, page_size: 20, severity: severity || undefined, module: module || undefined }),
    staleTime: 15000,
  });

  return (
    <div className="rounded-[10px] border border-surface-border bg-surface-raised">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
        <span className="text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">Data quality events</span>
        <div className="flex gap-1.5">
          <select
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-surface-border-strong bg-surface-base px-2 py-1 text-[10.5px] text-text-primary"
          >
            <option value="">All severities</option>
            {DQ_SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={module}
            onChange={(e) => {
              setModule(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-surface-border-strong bg-surface-base px-2 py-1 text-[10.5px] text-text-primary"
          >
            <option value="">All modules</option>
            {DQ_MODULES.map((m) => (
              <option key={m} value={m}>
                {m.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      {events.isPending ? (
        <p className="p-4 text-sm text-text-muted">Loading…</p>
      ) : !events.data || events.data.items.length === 0 ? (
        <p className="p-4 text-sm text-text-muted">No data quality events{severity || module ? " match these filters." : "."}</p>
      ) : (
        <>
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="bg-surface-card text-[9.5px] uppercase tracking-[.06em] text-text-faint">
                <th className="px-2.5 py-2 text-left">Time</th>
                <th className="px-2.5 py-2 text-left">Module</th>
                <th className="px-2.5 py-2 text-left">Event</th>
                <th className="px-2.5 py-2 text-left">Severity</th>
                <th className="px-2.5 py-2 text-left">Reason</th>
                <th className="px-2.5 py-2 text-left">Resolved</th>
              </tr>
            </thead>
            <tbody>
              {events.data.items.map((e) => (
                <tr key={e.id} className="border-b border-surface-border last:border-0">
                  <td className="px-2.5 py-2.5 font-mono text-text-faint">{new Date(e.time).toLocaleString()}</td>
                  <td className="px-2.5 py-2.5">{e.module.replace(/_/g, " ")}</td>
                  <td className="px-2.5 py-2.5 text-text-faint">{e.event_type}</td>
                  <td className="px-2.5 py-2.5">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${SEVERITY_CLASSES[e.severity]}`}>{e.severity}</span>
                  </td>
                  <td className="px-2.5 py-2.5 text-text-faint">{e.reason ?? "—"}</td>
                  <td className="px-2.5 py-2.5">{e.resolved ? <span className="text-green">Yes</span> : <span className="text-text-faint">No</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-3 text-[10.5px] text-text-faint">
            <span>
              Page {events.data.page} of {events.data.pages} ({events.data.total} total)
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border border-surface-border-strong px-2.5 py-1 font-semibold disabled:opacity-40"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= events.data.pages}
                className="rounded-md border border-surface-border-strong px-2.5 py-1 font-semibold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RegimeLookupCard() {
  const symbols = useQuery({ queryKey: ["dq-symbols"], queryFn: () => listDQSymbols(), staleTime: 60000 });
  const [symbol, setSymbol] = useState<string>("");

  const regime = useQuery({
    queryKey: ["dq-regime", symbol],
    queryFn: () => getDataQualityRegime(symbol),
    enabled: !!symbol,
    retry: false,
  });

  return (
    <div className="rounded-[10px] border border-surface-border bg-surface-raised">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
        <span className="text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">Regime lookup</span>
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="rounded-md border border-surface-border-strong bg-surface-base px-2 py-1 text-[10.5px] text-text-primary"
        >
          <option value="">Select a symbol…</option>
          {symbols.data?.map((s) => (
            <option key={s.id} value={s.symbol}>
              {s.symbol}
            </option>
          ))}
        </select>
      </div>

      {!symbol ? (
        <p className="p-4 text-sm text-text-muted">Pick a symbol to look up its latest detected regime.</p>
      ) : regime.isPending ? (
        <p className="p-4 text-sm text-text-muted">Loading…</p>
      ) : regime.isError ? (
        <p className="p-4 text-sm text-text-muted">
          {regime.error instanceof ApiError && regime.error.status === 404
            ? `No regime data for ${symbol} yet.`
            : "Failed to load regime data."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
          <Metric label="Regime" value={regime.data.regime_label} />
          <Metric label="Confidence" value={`${(regime.data.confidence * 100).toFixed(1)}%`} />
          <Metric label="Detected by" value={regime.data.detected_by} />
          <Metric label="As of" value={new Date(regime.data.time).toLocaleString()} />
        </div>
      )}
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
