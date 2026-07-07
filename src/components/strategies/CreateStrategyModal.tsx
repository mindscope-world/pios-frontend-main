import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createStrategy } from "../../api/strategies";
import { ApiError } from "../../api/client";

export function CreateStrategyModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      createStrategy({
        name: name.trim(),
        hypothesis: hypothesis.trim() || null,
        description: description.trim() || null,
        tags: tagsInput.trim() ? tagsInput.split(",").map((t) => t.trim()).filter(Boolean) : null,
      }),
    onSuccess: (strategy) => {
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      onClose();
      navigate(`/strategies/${strategy.id}`);
    },
    onError: (err) => setError(err instanceof ApiError ? (err.body as { detail?: string } | null)?.detail ?? err.message : "Create failed."),
  });

  const canSubmit = name.trim().length > 0 && !create.isPending;

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-[440px] rounded-[13px] border border-surface-border-strong bg-surface-overlay p-6">
        <h3 className="mb-1 font-[family-name:var(--font-cond)] text-lg font-bold text-text-primary">New strategy</h3>
        <p className="mb-4 text-[11px] text-text-faint">Starts in the IDEA stage. A hypothesis is required before it can enter BACKTEST.</p>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mean reversion — BTC/USDT 15m"
              className="w-full rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Hypothesis</label>
            <textarea
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              rows={2}
              placeholder="What edge does this exploit, and why should it persist?"
              className="w-full rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Tags (comma-separated)</label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="mean-reversion, crypto, 15m"
              className="w-full rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
            />
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
            {create.isPending ? "Creating…" : "Create strategy"}
          </button>
        </div>
      </div>
    </div>
  );
}
