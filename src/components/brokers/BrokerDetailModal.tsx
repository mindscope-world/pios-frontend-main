import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteBroker, getBroker, getBrokerAccount, testBroker, updateBroker } from "../../api/brokers";
import { ApiError } from "../../api/client";

export function BrokerDetailModal({ brokerId, onClose }: { brokerId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const broker = useQuery({ queryKey: ["broker", brokerId], queryFn: () => getBroker(brokerId) });

  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showAccount, setShowAccount] = useState(false);

  useEffect(() => {
    if (broker.data) {
      setName(broker.data.name);
      setIsActive(broker.data.is_active);
    }
  }, [broker.data]);

  const save = useMutation({
    mutationFn: () => updateBroker(brokerId, { name: name.trim(), is_active: isActive }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["broker", brokerId], updated);
      queryClient.invalidateQueries({ queryKey: ["brokers"] });
      setSaveError(null);
    },
    onError: (err) => {
      setSaveError(err instanceof ApiError ? (err.body as { detail?: string } | null)?.detail ?? err.message : "Update failed.");
    },
  });

  const test = useMutation({ mutationFn: () => testBroker(brokerId) });

  const account = useQuery({
    queryKey: ["broker-account", brokerId],
    queryFn: () => getBrokerAccount(brokerId),
    enabled: showAccount,
  });

  const remove = useMutation({
    mutationFn: () => deleteBroker(brokerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brokers"] });
      onClose();
    },
    onError: (err) => {
      setDeleteError(err instanceof ApiError ? (err.body as { detail?: string } | null)?.detail ?? err.message : "Delete failed.");
    },
  });

  const dirty = broker.data ? name !== broker.data.name || isActive !== broker.data.is_active : false;

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-[13px] border border-surface-border-strong bg-surface-overlay p-6">
        {broker.isPending ? (
          <p className="text-sm text-text-muted">Loading…</p>
        ) : broker.isError || !broker.data ? (
          <p className="text-sm text-red">Failed to load broker.</p>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-[family-name:var(--font-cond)] text-lg font-bold text-text-primary">{broker.data.broker_type}</h3>
              <span className="rounded-md border border-surface-border-strong px-2 py-0.5 text-[10px] font-bold text-text-faint">
                {broker.data.is_paper ? "PAPER" : "LIVE"}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center gap-2 rounded-md border border-surface-border bg-surface-raised px-3 py-2">
                <input
                  type="checkbox"
                  id="broker_active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                <label htmlFor="broker_active" className="text-xs text-text-muted">
                  Active (can be selected when placing orders)
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-md border border-surface-border bg-surface-raised p-3 text-[11.5px]">
                <ReadField label="Status" value={broker.data.status} />
                <ReadField label="Exchange id" value={broker.data.exchange_id ?? "—"} />
                <ReadField label="Latency p99" value={broker.data.latency_p99_ms != null ? `${broker.data.latency_p99_ms}ms` : "—"} />
                <ReadField label="Created" value={new Date(broker.data.created_at).toLocaleString()} />
                <div className="col-span-2">
                  <ReadField label="Last error" value={broker.data.error_message ?? "—"} />
                </div>
                {broker.data.broker_type === "MT5" && (
                  <div className="col-span-2">
                    <div className="mb-1 text-[9px] uppercase tracking-[.06em] text-text-ghost">
                      Broker id (EA bridge InpBrokerId)
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 truncate rounded border border-surface-border bg-surface-card px-2 py-1 font-mono text-[10.5px] text-text-primary">
                        {broker.data.id}
                      </code>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(broker.data.id)}
                        className="rounded-md border border-surface-border-strong px-2 py-1 text-[10px] font-semibold text-text-faint hover:text-text-primary"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {saveError && <p className="text-xs text-red">{saveError}</p>}
              <button
                onClick={() => save.mutate()}
                disabled={!dirty || save.isPending}
                className="w-full rounded-lg border border-accent-muted bg-accent/15 px-4 py-2 text-[11.5px] font-semibold text-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                {save.isPending ? "Saving…" : "Save changes"}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => test.mutate()}
                  disabled={test.isPending}
                  className="rounded-lg border border-blue-border bg-blue-bg px-4 py-2 text-[11.5px] font-semibold text-blue disabled:opacity-50"
                >
                  {test.isPending ? "Testing…" : "Test connection"}
                </button>
                <button
                  onClick={() => setShowAccount((v) => !v)}
                  className="rounded-lg border border-surface-border-strong px-4 py-2 text-[11.5px] font-semibold text-text-muted hover:text-text-primary"
                >
                  {showAccount ? "Hide account" : "View account"}
                </button>
              </div>

              {test.data && (
                <div
                  className={`rounded-md border p-3 text-[11px] ${test.data.success ? "border-green-border bg-green-bg text-green" : "border-red-border bg-red-bg text-red"}`}
                >
                  <p className="font-semibold">{test.data.success ? "Connection OK" : "Connection failed"}</p>
                  <p>{test.data.message}</p>
                  {test.data.latency_ms != null && <p>Latency: {test.data.latency_ms}ms</p>}
                </div>
              )}
              {test.isError && (
                <p className="text-xs text-red">
                  {test.error instanceof ApiError ? (test.error.body as { detail?: string } | null)?.detail ?? test.error.message : "Test failed."}
                </p>
              )}

              {showAccount && (
                <div className="rounded-md border border-surface-border bg-surface-card p-3">
                  {account.isPending ? (
                    <p className="text-[11px] text-text-muted">Loading account…</p>
                  ) : account.isError ? (
                    <p className="text-[11px] text-red">
                      {account.error instanceof ApiError
                        ? (account.error.body as { detail?: string } | null)?.detail ?? account.error.message
                        : "Failed to fetch account."}
                    </p>
                  ) : (
                    <pre className="max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[10.5px] text-text-muted">
                      {JSON.stringify(account.data, null, 2)}
                    </pre>
                  )}
                </div>
              )}

              <div className="border-t border-surface-border pt-3">
                {deleteError && <p className="mb-2 text-xs text-red">{deleteError}</p>}
                {!confirmingDelete ? (
                  <button
                    onClick={() => setConfirmingDelete(true)}
                    className="text-[11px] font-semibold text-red hover:underline"
                  >
                    Deactivate this broker
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-text-muted">Deactivate {broker.data.name}?</span>
                    <button
                      onClick={() => remove.mutate()}
                      disabled={remove.isPending}
                      className="rounded-md border border-red-border bg-red-bg px-2.5 py-1 text-[10.5px] font-semibold text-red"
                    >
                      {remove.isPending ? "…" : "Confirm"}
                    </button>
                    <button
                      onClick={() => setConfirmingDelete(false)}
                      className="rounded-md border border-surface-border-strong px-2.5 py-1 text-[10.5px] font-semibold text-text-faint"
                    >
                      Keep
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-lg border border-surface-border-strong px-4 py-2 text-[11.5px] font-semibold text-text-faint hover:border-text-faint"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[.06em] text-text-ghost">{label}</div>
      <div className="truncate text-text-primary">{value}</div>
    </div>
  );
}
