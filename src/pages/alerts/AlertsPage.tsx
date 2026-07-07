import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { acknowledgeAlert, acknowledgeAllAlerts, listAlerts } from "../../api/alerts";
import type { AlertSeverity } from "../../api/types";

const SEVERITY_OPTIONS: (AlertSeverity | "")[] = ["", "P1", "P2", "P3", "P4"];

const SEVERITY_CLS: Record<AlertSeverity, string> = {
  P1: "bg-red-bg text-red border-red-border",
  P2: "bg-amber-bg text-amber border-amber-border",
  P3: "bg-blue-bg text-blue border-blue-border",
  P4: "bg-surface-overlay text-text-faint border-surface-border-strong",
};

const PAGE_SIZE = 25;

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const [severity, setSeverity] = useState<AlertSeverity | "">("");
  const [acked, setAcked] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(1);

  const alerts = useQuery({
    queryKey: ["alerts", { page, severity, acked }],
    queryFn: () =>
      listAlerts({
        page,
        page_size: PAGE_SIZE,
        severity: severity || undefined,
        acked: acked === "" ? undefined : acked === "true",
      }),
    placeholderData: (prev) => prev,
    // No push channel for alert state exists server-side — plain polling.
    refetchInterval: 15000,
  });

  const ack = useMutation({
    mutationFn: (alertId: string) => acknowledgeAlert(alertId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const ackAll = useMutation({
    mutationFn: acknowledgeAllAlerts,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const unackedCount = alerts.data?.items.filter((a) => !a.is_acknowledged).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="rounded-[10px] border border-surface-border bg-surface-raised">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
          <span className="text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">Alerts</span>
          <div className="flex items-center gap-2">
            <select
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value as AlertSeverity | "");
                setPage(1);
              }}
              className="rounded-md border border-surface-border-strong bg-surface-card px-2 py-1 text-[10.5px] text-text-primary outline-none"
            >
              {SEVERITY_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "" ? "All severities" : s}
                </option>
              ))}
            </select>
            <select
              value={acked}
              onChange={(e) => {
                setAcked(e.target.value as "" | "true" | "false");
                setPage(1);
              }}
              className="rounded-md border border-surface-border-strong bg-surface-card px-2 py-1 text-[10.5px] text-text-primary outline-none"
            >
              <option value="">All statuses</option>
              <option value="false">Unacknowledged</option>
              <option value="true">Acknowledged</option>
            </select>
            {unackedCount > 0 && (
              <button
                onClick={() => ackAll.mutate()}
                disabled={ackAll.isPending}
                className="rounded-md border border-green-border bg-green-bg px-3 py-1 text-[10.5px] font-semibold text-green disabled:opacity-50"
              >
                {ackAll.isPending ? "Acknowledging…" : "Acknowledge all"}
              </button>
            )}
          </div>
        </div>

        {alerts.isPending ? (
          <p className="p-4 text-sm text-text-muted">Loading…</p>
        ) : !alerts.data || alerts.data.items.length === 0 ? (
          <p className="p-4 text-sm text-text-muted">No alerts match these filters.</p>
        ) : (
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="bg-surface-card text-[9.5px] uppercase tracking-[.06em] text-text-faint">
                <th className="px-2.5 py-2 text-left">Severity</th>
                <th className="px-2.5 py-2 text-left">Created</th>
                <th className="px-2.5 py-2 text-left">Source</th>
                <th className="px-2.5 py-2 text-left">Category</th>
                <th className="px-2.5 py-2 text-left">Title</th>
                <th className="px-2.5 py-2 text-left">Status</th>
                <th className="px-2.5 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.data.items.map((a) => (
                <tr key={a.id} className="border-b border-surface-border align-top last:border-0">
                  <td className="px-2.5 py-2.5">
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${SEVERITY_CLS[a.severity]}`}>{a.severity}</span>
                  </td>
                  <td className="px-2.5 py-2.5 font-mono text-text-faint">{new Date(a.created_at).toLocaleString()}</td>
                  <td className="px-2.5 py-2.5 text-text-faint">{a.source}</td>
                  <td className="px-2.5 py-2.5 text-text-faint">{a.category}</td>
                  <td className="px-2.5 py-2.5">
                    <div className="font-semibold text-text-primary">{a.title}</div>
                    <div className="mt-0.5 text-[10.5px] text-text-faint">{a.message}</div>
                    {a.ack_note && <div className="mt-0.5 text-[10.5px] text-text-ghost">Note: {a.ack_note}</div>}
                  </td>
                  <td className="px-2.5 py-2.5">
                    {a.is_acknowledged ? (
                      <span className="text-green">Acked{a.acknowledged_at ? ` · ${new Date(a.acknowledged_at).toLocaleString()}` : ""}</span>
                    ) : (
                      <span className="text-text-faint">Open</span>
                    )}
                  </td>
                  <td className="px-2.5 py-2.5 text-right">
                    {!a.is_acknowledged && (
                      <button
                        onClick={() => ack.mutate(a.id)}
                        disabled={ack.isPending}
                        className="text-[10.5px] font-semibold text-blue hover:underline disabled:opacity-50"
                      >
                        Acknowledge
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {alerts.data && alerts.data.pages > 1 && (
          <div className="flex items-center justify-between border-t border-surface-border px-4 py-2.5 text-[10.5px] text-text-faint">
            <span>
              Page {alerts.data.page} of {alerts.data.pages} · {alerts.data.total} alerts
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border border-surface-border-strong px-2.5 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(alerts.data!.pages, p + 1))}
                disabled={page >= alerts.data.pages}
                className="rounded-md border border-surface-border-strong px-2.5 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
