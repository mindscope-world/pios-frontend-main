import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAudit, verifyAuditChain } from "../../api/audit";

const PAGE_SIZE = 25;

export default function AuditPage() {
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [actorEmail, setActorEmail] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);

  const audit = useQuery({
    queryKey: ["audit", { page, action, resourceType, actorEmail }],
    queryFn: () =>
      listAudit({
        page,
        page_size: PAGE_SIZE,
        action: action || undefined,
        resource_type: resourceType || undefined,
        actor_email: actorEmail || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  // On-demand, not polled — this recomputes the SHA-256 chain over every row
  // in the table (verify_chain() in audit.py has no pagination), so it's a
  // real cost per click, not a cheap background check.
  const verify = useQuery({
    queryKey: ["audit-verify"],
    queryFn: verifyAuditChain,
    enabled: false,
  });

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[10px] border border-surface-border bg-surface-raised">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
          <span className="text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">Chain integrity</span>
          <div className="flex items-center gap-3">
            {verify.data && (
              <span className={`rounded-md border px-2.5 py-1 text-[10.5px] font-bold ${
                verify.data.chain_intact ? "border-green-border bg-green-bg text-green" : "border-red-border bg-red-bg text-red"
              }`}>
                {verify.data.chain_intact
                  ? `Chain verified ✓ · ${verify.data.total_entries} entries`
                  : `Chain broken at entry #${verify.data.broken_at_id}`}
              </span>
            )}
            <button
              onClick={() => verify.refetch()}
              disabled={verify.isFetching}
              className="rounded-md border border-blue-border bg-blue-bg px-3 py-1 text-[10.5px] font-semibold text-blue disabled:opacity-50"
            >
              {verify.isFetching ? "Verifying…" : "Verify chain"}
            </button>
          </div>
        </div>
        <p className="px-4 py-2.5 text-[10.5px] leading-relaxed text-text-faint">
          Every audit row is SHA-256 hash-chained to the previous one — a tampered or deleted row breaks the chain
          from that point forward. Verify recomputes the whole chain server-side on demand.
        </p>
      </div>

      <div className="rounded-[10px] border border-surface-border bg-surface-raised">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
          <span className="text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">Audit log</span>
          <form onSubmit={applyFilters} className="flex flex-wrap items-center gap-2">
            <input
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="Action (e.g. RISK_LIMIT_UPDATED)"
              className="w-56 rounded-md border border-surface-border-strong bg-surface-card px-2 py-1 text-[10.5px] text-text-primary outline-none"
            />
            <input
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              placeholder="Resource type"
              className="w-40 rounded-md border border-surface-border-strong bg-surface-card px-2 py-1 text-[10.5px] text-text-primary outline-none"
            />
            <input
              value={actorEmail}
              onChange={(e) => setActorEmail(e.target.value)}
              placeholder="Actor email"
              className="w-40 rounded-md border border-surface-border-strong bg-surface-card px-2 py-1 text-[10.5px] text-text-primary outline-none"
            />
            <button
              type="submit"
              className="rounded-md border border-surface-border-strong px-3 py-1 text-[10.5px] font-semibold text-text-muted hover:border-text-faint hover:text-text-primary"
            >
              Filter
            </button>
          </form>
        </div>

        {audit.isPending ? (
          <p className="p-4 text-sm text-text-muted">Loading…</p>
        ) : !audit.data || audit.data.items.length === 0 ? (
          <p className="p-4 text-sm text-text-muted">No audit entries match these filters.</p>
        ) : (
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="bg-surface-card text-[9.5px] uppercase tracking-[.06em] text-text-faint">
                <th className="px-2.5 py-2 text-left">Time</th>
                <th className="px-2.5 py-2 text-left">Actor</th>
                <th className="px-2.5 py-2 text-left">Action</th>
                <th className="px-2.5 py-2 text-left">Resource</th>
                <th className="px-2.5 py-2 text-left">Hash</th>
              </tr>
            </thead>
            <tbody>
              {audit.data.items.map((e) => (
                <Fragment key={e.id}>
                  <tr
                    onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                    className="cursor-pointer border-b border-surface-border last:border-0 hover:bg-white/[.02]"
                  >
                    <td className="px-2.5 py-2.5 font-mono text-text-faint">{new Date(e.event_time).toLocaleString()}</td>
                    <td className="px-2.5 py-2.5">{e.actor_email ?? "system"}</td>
                    <td className="px-2.5 py-2.5 font-semibold text-text-primary">{e.action}</td>
                    <td className="px-2.5 py-2.5 text-text-faint">
                      {e.resource_type}
                      {e.resource_id ? ` · ${e.resource_id.slice(0, 8)}` : ""}
                    </td>
                    <td className="px-2.5 py-2.5 font-mono text-[10px] text-text-ghost">{e.record_hash.slice(0, 12)}…</td>
                  </tr>
                  {expanded === e.id && (
                    <tr className="border-b border-surface-border bg-surface-card last:border-0">
                      <td colSpan={5} className="px-2.5 py-3">
                        <div className="grid grid-cols-2 gap-3 text-[10.5px]">
                          <div>
                            <div className="mb-1 font-semibold text-text-faint">Before</div>
                            <pre className="overflow-x-auto rounded-md bg-surface-raised p-2 text-text-muted">
                              {e.before_state ? JSON.stringify(e.before_state, null, 2) : "—"}
                            </pre>
                          </div>
                          <div>
                            <div className="mb-1 font-semibold text-text-faint">After</div>
                            <pre className="overflow-x-auto rounded-md bg-surface-raised p-2 text-text-muted">
                              {e.after_state ? JSON.stringify(e.after_state, null, 2) : "—"}
                            </pre>
                          </div>
                        </div>
                        <div className="mt-2 font-mono text-[10px] text-text-ghost">
                          hash {e.record_hash} · prev {e.prev_hash ?? "(genesis)"}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}

        {audit.data && audit.data.pages > 1 && (
          <div className="flex items-center justify-between border-t border-surface-border px-4 py-2.5 text-[10.5px] text-text-faint">
            <span>
              Page {audit.data.page} of {audit.data.pages} · {audit.data.total} entries
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
                onClick={() => setPage((p) => Math.min(audit.data!.pages, p + 1))}
                disabled={page >= audit.data.pages}
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
