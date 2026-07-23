import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createRiskLimit, deleteRiskLimit, listRiskLimits, updateRiskLimit } from "../../api/risk";
import { ApiError } from "../../api/client";
import type { RiskLimitOut } from "../../api/types";

// Only these limit_type values are actually read anywhere server-side
// (app/services/order_service.py's pre-trade risk gate reads
// "max_position_usd" and "capital_preservation_goal";
// app/services/risk_service.py's metrics computation reads
// "daily_loss_limit" and "max_drawdown_pct" for display thresholds).
// Any other limit_type would be stored but silently never enforced or
// shown — so the form only offers the values that actually do something.
const LIMIT_TYPES = [
  { value: "max_position_usd", label: "Max position (USD)", note: "Blocks order submission over this notional — the only limit type the order risk gate actually enforces." },
  { value: "daily_loss_limit", label: "Daily loss limit", note: "Shown as a threshold on the Risk metrics tile — not currently enforced as a trading block." },
  { value: "max_drawdown_pct", label: "Max drawdown (%)", note: "Shown as the drawdown_limit on the Risk metrics tile — not currently enforced as a trading block." },
  { value: "capital_preservation_goal", label: "Capital preservation goal (equity $)", note: "Once account equity reaches this target, breach_action decides what happens — see below. Surfaced on the Risk page's Capital preservation card." },
];

const BREACH_ACTIONS = ["ALERT", "BLOCK", "KILL_SWITCH"];

export function RiskLimitsAdmin() {
  const queryClient = useQueryClient();
  const limits = useQuery({ queryKey: ["risk-limits"], queryFn: listRiskLimits, staleTime: 15000 });
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="rounded-[10px] border border-surface-border bg-surface-raised">
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
        <span className="text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">Risk limits (admin)</span>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-md border border-green-border bg-green-bg px-3 py-1 text-[10.5px] font-semibold text-green"
        >
          + Add limit
        </button>
      </div>

      {limits.isPending ? (
        <p className="p-4 text-sm text-text-muted">Loading…</p>
      ) : !limits.data || limits.data.length === 0 ? (
        <p className="p-4 text-sm text-text-muted">No risk limits configured — orders fall back to the .env defaults.</p>
      ) : (
        <table className="w-full text-[11.5px]">
          <thead>
            <tr className="bg-surface-card text-[9.5px] uppercase tracking-[.06em] text-text-faint">
              <th className="px-2.5 py-2 text-left">Name</th>
              <th className="px-2.5 py-2 text-left">Type</th>
              <th className="px-2.5 py-2 text-left">Value</th>
              <th className="px-2.5 py-2 text-left">Current</th>
              <th className="px-2.5 py-2 text-left">Breach action</th>
              <th className="px-2.5 py-2 text-left">Active</th>
              <th className="px-2.5 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {limits.data.map((l) => (
              <LimitRow key={l.id} limit={l} />
            ))}
          </tbody>
        </table>
      )}

      <p className="border-t border-surface-border px-4 py-2.5 text-[10px] leading-relaxed text-text-faint">
        breach_action only actually changes behavior for <span className="font-mono">capital_preservation_goal</span>:
        ALERT is informational only, BLOCK/KILL_SWITCH block new order submission once the goal is met (existing
        positions are never auto-closed). For the other three limit types it's still stored but not yet branched on.
      </p>

      {showCreate && (
        <CreateLimitModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ["risk-limits"] });
            queryClient.invalidateQueries({ queryKey: ["capital-preservation"] });
          }}
        />
      )}
    </div>
  );
}

function LimitRow({ limit }: { limit: RiskLimitOut }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [limitValue, setLimitValue] = useState(String(limit.limit_value));
  const [breachAction, setBreachAction] = useState(limit.breach_action);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => updateRiskLimit(limit.id, { limit_value: Number(limitValue), breach_action: breachAction }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risk-limits"] });
      queryClient.invalidateQueries({ queryKey: ["capital-preservation"] });
      setEditing(false);
      setError(null);
    },
    onError: (err) => setError(err instanceof ApiError ? (err.body as { detail?: string } | null)?.detail ?? err.message : "Update failed."),
  });

  const deactivate = useMutation({
    mutationFn: () => deleteRiskLimit(limit.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risk-limits"] });
      queryClient.invalidateQueries({ queryKey: ["capital-preservation"] });
    },
    onError: (err) => setError(err instanceof ApiError ? (err.body as { detail?: string } | null)?.detail ?? err.message : "Deactivate failed."),
  });

  if (editing) {
    return (
      <tr className="border-b border-surface-border bg-surface-card last:border-0">
        <td className="px-2.5 py-2.5 font-semibold text-text-primary">{limit.name}</td>
        <td className="px-2.5 py-2.5 text-text-faint">{limit.limit_type}</td>
        <td className="px-2.5 py-2.5">
          <input
            value={limitValue}
            onChange={(e) => setLimitValue(e.target.value)}
            className="w-24 rounded-md border border-surface-border-strong bg-surface-raised px-2 py-1 text-[11px] text-text-primary outline-none"
          />
        </td>
        <td className="px-2.5 py-2.5 text-text-faint">{limit.current_value ?? "—"}</td>
        <td className="px-2.5 py-2.5">
          <select
            value={breachAction}
            onChange={(e) => setBreachAction(e.target.value)}
            className="rounded-md border border-surface-border-strong bg-surface-raised px-2 py-1 text-[11px] text-text-primary outline-none"
          >
            {BREACH_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </td>
        <td className="px-2.5 py-2.5">{limit.is_active ? "Yes" : "No"}</td>
        <td className="px-2.5 py-2.5 text-right">
          <div className="flex justify-end gap-2">
            {error && <span className="text-red">{error}</span>}
            <button onClick={() => save.mutate()} disabled={save.isPending} className="font-semibold text-green hover:underline">
              Save
            </button>
            <button onClick={() => setEditing(false)} className="font-semibold text-text-faint hover:underline">
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-surface-border last:border-0">
      <td className="px-2.5 py-2.5 font-semibold text-text-primary">{limit.name}</td>
      <td className="px-2.5 py-2.5 text-text-faint">{limit.limit_type}</td>
      <td className="px-2.5 py-2.5 font-mono">{limit.limit_value}</td>
      <td className="px-2.5 py-2.5 font-mono text-text-faint">{limit.current_value ?? "—"}</td>
      <td className="px-2.5 py-2.5">
        <span className="rounded-md border border-blue-border bg-blue-bg px-2 py-0.5 text-[10px] font-bold text-blue">{limit.breach_action}</span>
      </td>
      <td className="px-2.5 py-2.5">{limit.is_active ? "Yes" : "No"}</td>
      <td className="px-2.5 py-2.5 text-right">
        <div className="flex justify-end gap-2">
          {error && <span className="text-[10.5px] text-red">{error}</span>}
          <button onClick={() => setEditing(true)} className="text-[10.5px] font-semibold text-text-faint hover:text-text-primary">
            Edit
          </button>
          {limit.is_active && (
            <button onClick={() => deactivate.mutate()} disabled={deactivate.isPending} className="text-[10.5px] font-semibold text-red hover:underline">
              Deactivate
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function CreateLimitModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [limitType, setLimitType] = useState(LIMIT_TYPES[0].value);
  const [limitValue, setLimitValue] = useState("");
  const [breachAction, setBreachAction] = useState("ALERT");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      createRiskLimit({
        name: name.trim(),
        scope: "global",
        limit_type: limitType,
        limit_value: Number(limitValue),
        breach_action: breachAction,
      }),
    onSuccess: () => {
      onCreated();
      onClose();
    },
    onError: (err) => setError(err instanceof ApiError ? (err.body as { detail?: string } | null)?.detail ?? err.message : "Create failed."),
  });

  const canSubmit = name.trim().length > 0 && limitValue.trim().length > 0 && !isNaN(Number(limitValue)) && !create.isPending;

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-[420px] rounded-[13px] border border-surface-border-strong bg-surface-overlay p-6">
        <h3 className="mb-4 font-[family-name:var(--font-cond)] text-lg font-bold text-text-primary">Add risk limit</h3>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Global max position"
              className="w-full rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Limit type</label>
            <select
              value={limitType}
              onChange={(e) => setLimitType(e.target.value)}
              className="w-full rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none"
            >
              {LIMIT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[10.5px] leading-relaxed text-text-faint">{LIMIT_TYPES.find((t) => t.value === limitType)?.note}</p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Limit value</label>
            <input
              value={limitValue}
              onChange={(e) => setLimitValue(e.target.value)}
              placeholder={
                limitType === "max_position_usd" ? "e.g. 20000" :
                limitType === "max_drawdown_pct" ? "e.g. 15" :
                limitType === "capital_preservation_goal" ? "e.g. 150000" :
                "e.g. 5000"
              }
              className="w-full rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Breach action</label>
            <select
              value={breachAction}
              onChange={(e) => setBreachAction(e.target.value)}
              className="w-full rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none"
            >
              {BREACH_ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-xs text-red">{error}</p>}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            disabled={create.isPending}
            className="flex-1 rounded-lg border border-surface-border-strong px-4 py-2 text-[11.5px] font-semibold text-text-faint hover:border-text-faint"
          >
            Cancel
          </button>
          <button
            onClick={() => create.mutate()}
            disabled={!canSubmit}
            className="flex-1 rounded-lg border border-green-border bg-green-bg px-4 py-2 text-[11.5px] font-semibold text-green disabled:cursor-not-allowed disabled:opacity-50"
          >
            {create.isPending ? "Creating…" : "Add limit"}
          </button>
        </div>
      </div>
    </div>
  );
}
