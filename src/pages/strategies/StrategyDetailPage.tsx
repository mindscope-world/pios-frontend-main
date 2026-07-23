import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  QUANT_ROLES,
  advanceStrategy,
  deleteStrategy,
  gateRequirement,
  getStrategy,
  nextStage,
  retireStrategy,
  updateStrategy,
} from "../../api/strategies";
import { ApiError } from "../../api/client";
import { LifecycleStepper } from "../../components/strategies/LifecycleStepper";
import { BacktestPanel } from "../../components/strategies/BacktestPanel";
import { BacktestStatusView } from "../../components/strategies/BacktestStatusView";
import { KellySizingCard } from "../../components/strategies/KellySizingCard";
import { NullableNumber } from "../../components/ui/NullableNumber";
import { useAuthStore } from "../../stores/authStore";

// Create/update/advance/retire/delete are all require_quant (admin + quant)
// server-side (app/api/v1/endpoints/strategies.py) — hide the mutating UI
// for other roles rather than let it 403. QUANT_ROLES now lives in
// api/strategies.ts, shared with BacktestPage.tsx.

// DELETE /strategies/{id} 409s for these stages server-side ("retire it
// first") — disable the button up front instead of surfacing the 409.
const UNDELETABLE_STAGES = new Set(["LIVE_SMALL", "SCALED", "MONITOR"]);

// advance_stage()'s GateFailed exception has no HTTP-translation wrapper at
// the router level (app/services/strategy_service.py:raise_http_for exists
// but strategies.py's advance() never calls it) — a failed gate currently
// 500s with a plain-text body, not the 422+detail the service was written
// to produce. Fall back to the real gate rule text when the server gives us
// nothing to show, rather than a bare "Request failed with status 500".
function describeAdvanceError(err: unknown, forStage: string): string {
  if (err instanceof ApiError) {
    const detail = (err.body as { detail?: string } | null)?.detail;
    if (detail) return detail;
  }
  const req = gateRequirement(forStage as never);
  return req
    ? `Gate check failed — the server didn't return a specific reason (a known backend gap). The requirement for this stage: ${req}`
    : "Advance failed and the server didn't return a specific reason.";
}

export default function StrategyDetailPage() {
  const { strategyId = "" } = useParams();
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role ? QUANT_ROLES.has(role) : false;

  const strategy = useQuery({ queryKey: ["strategy", strategyId], queryFn: () => getStrategy(strategyId), enabled: !!strategyId });

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const [advanceNotes, setAdvanceNotes] = useState("");
  const [advancing, setAdvancing] = useState(false);
  const [advanceError, setAdvanceError] = useState<string | null>(null);

  const [retireReason, setRetireReason] = useState("");
  const [retiring, setRetiring] = useState(false);
  const [retireError, setRetireError] = useState<string | null>(null);

  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (strategy.data) {
      setName(strategy.data.name);
      setHypothesis(strategy.data.hypothesis ?? "");
      setDescription(strategy.data.description ?? "");
      setTagsInput((strategy.data.tags ?? []).join(", "));
    }
  }, [strategy.data]);

  const save = useMutation({
    mutationFn: () =>
      updateStrategy(strategyId, {
        name: name.trim(),
        hypothesis: hypothesis.trim(),
        description: description.trim(),
        tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["strategy", strategyId], updated);
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      setEditing(false);
      setEditError(null);
    },
    onError: (err) => setEditError(err instanceof ApiError ? (err.body as { detail?: string } | null)?.detail ?? err.message : "Update failed."),
  });

  const advance = useMutation({
    mutationFn: () => advanceStrategy(strategyId, advanceNotes.trim() || undefined),
    onSuccess: (updated) => {
      queryClient.setQueryData(["strategy", strategyId], updated);
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      setAdvancing(false);
      setAdvanceNotes("");
      setAdvanceError(null);
    },
    onError: (err) => setAdvanceError(describeAdvanceError(err, strategy.data?.lifecycle_stage ?? "IDEA")),
  });

  const retire = useMutation({
    mutationFn: () => retireStrategy(strategyId, retireReason.trim()),
    onSuccess: (updated) => {
      queryClient.setQueryData(["strategy", strategyId], updated);
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      setRetiring(false);
      setRetireReason("");
      setRetireError(null);
    },
    onError: (err) => setRetireError(err instanceof ApiError ? (err.body as { detail?: string } | null)?.detail ?? err.message : "Retire failed."),
  });

  const remove = useMutation({
    mutationFn: () => deleteStrategy(strategyId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["strategy", strategyId] });
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      navigate("/strategies");
    },
    onError: (err) =>
      setDeleteError(err instanceof ApiError ? (err.body as { detail?: string } | null)?.detail ?? err.message : "Delete failed."),
  });

  if (strategy.isPending) return <p className="text-sm text-text-muted">Loading…</p>;

  if (strategy.isError || !strategy.data) {
    const detail = strategy.error instanceof ApiError ? (strategy.error.body as { detail?: string } | null)?.detail ?? strategy.error.message : "Failed to load strategy.";
    return (
      <div className="space-y-3">
        <BackLink />
        <p className="rounded-lg border border-red-border bg-red-bg p-4 text-sm text-red">{detail}</p>
      </div>
    );
  }

  const s = strategy.data;
  const next = nextStage(s.lifecycle_stage);
  const gateReq = gateRequirement(s.lifecycle_stage);

  return (
    <div className="space-y-4">
      <BackLink />

      <div className="rounded-[10px] border border-surface-border bg-surface-raised">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-[family-name:var(--font-cond)] text-xl font-bold text-text-primary">{s.name}</span>
              <span className="text-[11px] text-text-faint">v{s.version} · gen {s.generation}</span>
            </div>
            {s.tags && s.tags.length > 0 && (
              <div className="mt-1 flex gap-1.5">
                {s.tags.map((t) => (
                  <span key={t} className="rounded-md bg-surface-overlay px-1.5 py-0.5 text-[9.5px] text-text-faint">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-4">
            <Field label="Fitness" value={<NullableNumber value={s.fitness_score} />} />
            <Field label="Live Sharpe" value={<NullableNumber value={s.sharpe_last} />} />
            <Field label="Paper only" value={s.is_paper_only ? "Yes" : "No"} />
          </div>
        </div>

        <div className="p-4">
          <LifecycleStepper stage={s.lifecycle_stage} />
        </div>

        {canManage && s.lifecycle_stage !== "RETIRED" && (
          <div className="border-t border-surface-border p-4">
            {next && (
              <div className="mb-3">
                {!advancing ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setAdvancing(true)}
                      className="rounded-lg border border-blue-border bg-blue-bg px-4 py-1.5 text-[11px] font-semibold text-blue"
                    >
                      Advance to {next}
                    </button>
                    {gateReq && <span className="text-[10.5px] text-text-faint">{gateReq}</span>}
                  </div>
                ) : (
                  <div className="rounded-lg border border-blue-border bg-surface-card p-3">
                    <p className="mb-2 text-[11px] text-text-muted">Advance {s.lifecycle_stage} → {next}. {gateReq}</p>
                    <textarea
                      value={advanceNotes}
                      onChange={(e) => setAdvanceNotes(e.target.value)}
                      placeholder="Notes (optional)"
                      rows={2}
                      className="mb-2 w-full rounded-md border border-surface-border-strong bg-surface-raised px-2 py-1.5 text-[11px] text-text-primary outline-none"
                    />
                    {advanceError && <p className="mb-2 text-[10.5px] text-red">{advanceError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => advance.mutate()}
                        disabled={advance.isPending}
                        className="rounded-md border border-blue-border bg-blue-bg px-3 py-1 text-[10.5px] font-semibold text-blue disabled:opacity-50"
                      >
                        {advance.isPending ? "Advancing…" : "Confirm advance"}
                      </button>
                      <button
                        onClick={() => {
                          setAdvancing(false);
                          setAdvanceError(null);
                        }}
                        className="rounded-md border border-surface-border-strong px-3 py-1 text-[10.5px] font-semibold text-text-faint"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!retiring ? (
              <button onClick={() => setRetiring(true)} className="text-[11px] font-semibold text-red hover:underline">
                Retire strategy
              </button>
            ) : (
              <div className="rounded-lg border border-red-border bg-surface-card p-3">
                <p className="mb-2 text-[11px] text-text-muted">
                  Retiring bypasses the gate checks — this is an admin/quant escape hatch, not a normal lifecycle step.
                </p>
                <input
                  value={retireReason}
                  onChange={(e) => setRetireReason(e.target.value)}
                  placeholder="Retirement reason (required)"
                  className="mb-2 w-full rounded-md border border-surface-border-strong bg-surface-raised px-2 py-1.5 text-[11px] text-text-primary outline-none"
                />
                {retireError && <p className="mb-2 text-[10.5px] text-red">{retireError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => retire.mutate()}
                    disabled={retire.isPending || retireReason.trim().length === 0}
                    className="rounded-md border border-red-border bg-red-bg px-3 py-1 text-[10.5px] font-semibold text-red disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {retire.isPending ? "Retiring…" : "Confirm retire"}
                  </button>
                  <button
                    onClick={() => {
                      setRetiring(false);
                      setRetireError(null);
                    }}
                    className="rounded-md border border-surface-border-strong px-3 py-1 text-[10.5px] font-semibold text-text-faint"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {canManage && (
          <div className="border-t border-surface-border p-4">
            {!deleting ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDeleting(true)}
                  disabled={UNDELETABLE_STAGES.has(s.lifecycle_stage)}
                  className="text-[11px] font-semibold text-text-faint hover:text-red disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Delete strategy
                </button>
                {UNDELETABLE_STAGES.has(s.lifecycle_stage) && (
                  <span className="text-[10.5px] text-text-ghost">Live strategies can't be deleted — retire first.</span>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-red-border bg-surface-card p-3">
                <p className="mb-2 text-[11px] text-text-muted">
                  Permanently delete "{s.name}" and its backtest history? Unlike retiring, this removes the record
                  entirely and cannot be undone.
                </p>
                {deleteError && <p className="mb-2 text-[10.5px] text-red">{deleteError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => remove.mutate()}
                    disabled={remove.isPending}
                    className="rounded-md border border-red-border bg-red-bg px-3 py-1 text-[10.5px] font-semibold text-red disabled:opacity-50"
                  >
                    {remove.isPending ? "Deleting…" : "Delete permanently"}
                  </button>
                  <button
                    onClick={() => {
                      setDeleting(false);
                      setDeleteError(null);
                    }}
                    className="rounded-md border border-surface-border-strong px-3 py-1 text-[10.5px] font-semibold text-text-faint"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {canManage ? <BacktestPanel strategyId={strategyId} /> : <BacktestStatusView strategyId={strategyId} />}

      <KellySizingCard strategyId={strategyId} />

      <div className="rounded-[10px] border border-surface-border bg-surface-raised">
        <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
          <span className="text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">Details</span>
          {canManage && !editing && (
            <button onClick={() => setEditing(true)} className="text-[10.5px] font-semibold text-text-faint hover:text-text-primary">
              Edit
            </button>
          )}
        </div>
        <div className="p-4">
          {editing ? (
            <div className="space-y-3">
              <LabeledInput label="Name" value={name} onChange={setName} />
              <LabeledTextarea label="Hypothesis" value={hypothesis} onChange={setHypothesis} />
              <LabeledTextarea label="Description" value={description} onChange={setDescription} />
              <LabeledInput label="Tags (comma-separated)" value={tagsInput} onChange={setTagsInput} />
              {editError && <p className="text-xs text-red">{editError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => save.mutate()}
                  disabled={save.isPending}
                  className="rounded-md border border-green-border bg-green-bg px-3 py-1.5 text-[11px] font-semibold text-green"
                >
                  {save.isPending ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditError(null);
                  }}
                  className="rounded-md border border-surface-border-strong px-3 py-1.5 text-[11px] font-semibold text-text-faint"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-[12px]">
              <p>
                <span className="text-text-faint">Hypothesis: </span>
                <span className="text-text-primary">{s.hypothesis || "—"}</span>
              </p>
              <p>
                <span className="text-text-faint">Description: </span>
                <span className="text-text-primary">{s.description || "—"}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[10px] border border-surface-border bg-surface-raised">
        <div className="border-b border-surface-border px-4 py-3 text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">
          Gate history
        </div>
        {s.gate_history.length === 0 ? (
          <p className="p-4 text-sm text-text-muted">No stage transitions yet.</p>
        ) : (
          <div className="p-4">
            {[...s.gate_history].reverse().map((g, i) => (
              <div key={i} className="border-b border-surface-border py-2 text-[11.5px] last:border-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${g.passed ? "bg-green-bg text-green" : "bg-red-bg text-red"}`}>
                    {g.passed ? "PASSED" : "FAILED"}
                  </span>
                  <span className="text-text-primary">
                    {g.from} → {g.to}
                  </span>
                  <span className="text-[10px] text-text-ghost">{new Date(g.ts).toLocaleString()}</span>
                  <span className="text-[10px] text-text-faint">by {g.actor}</span>
                </div>
                <p className="mt-1 text-text-faint">{g.reason}</p>
                {g.notes && <p className="text-[10.5px] text-text-ghost">Notes: {g.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/strategies" className="text-[11px] font-semibold text-text-faint hover:text-text-primary">
      ← Back to strategies
    </Link>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col items-end">
      <div className="text-[9px] uppercase tracking-[.05em] text-text-ghost">{label}</div>
      <div className="font-mono text-[13px] text-text-primary">{value}</div>
    </div>
  );
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-text-muted">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
      />
    </div>
  );
}

function LabeledTextarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-text-muted">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
      />
    </div>
  );
}
