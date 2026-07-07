import { useExecutionModeStore, type ExecutionMode } from "../../stores/executionModeStore";

const SEGMENTS: { m: ExecutionMode; label: string }[] = [
  { m: "manual", label: "Manual" },
  { m: "semi", label: "Semi-auto" },
  { m: "automatic", label: "Automatic" },
];

export function ModeSwitch() {
  const mode = useExecutionModeStore((s) => s.mode);
  const requestMode = useExecutionModeStore((s) => s.requestMode);

  return (
    <div className="flex flex-col gap-[3px]">
      <div className="text-[9px] uppercase tracking-[.08em] text-text-ghost">Execution mode</div>
      <div className="flex overflow-hidden rounded-lg border border-surface-border-strong">
        {SEGMENTS.map((seg, i) => (
          <button
            key={seg.m}
            onClick={() => requestMode(seg.m)}
            className={`px-3 py-1.5 text-[10.5px] transition ${i < SEGMENTS.length - 1 ? "border-r border-surface-border" : ""} ${
              mode === seg.m ? "bg-blue-bg font-bold text-blue" : "text-text-faint hover:text-text-muted"
            }`}
          >
            {seg.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ConfirmAutomaticModal() {
  const pendingMode = useExecutionModeStore((s) => s.pendingMode);
  const confirm = useExecutionModeStore((s) => s.confirmPendingMode);
  const cancel = useExecutionModeStore((s) => s.cancelPendingMode);

  if (pendingMode !== "automatic") return null;

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-[380px] rounded-[13px] border border-surface-border-strong bg-surface-overlay p-6">
        <h3 className="mb-2 font-[family-name:var(--font-cond)] text-lg font-bold text-text-primary">
          Switch to automatic
        </h3>
        <p className="mb-4 text-[11.5px] leading-relaxed text-text-muted">
          There is no autonomous execution engine in this build yet — switching here will not submit trades on its
          own. This confirmation exists to preserve the intended escalation friction; the mode itself is a{" "}
          <strong className="text-text-primary">preview state</strong> until that engine ships. You can return to
          manual instantly at any time.
        </p>
        <div className="mt-1.5 flex gap-2">
          <button
            onClick={cancel}
            className="flex-1 rounded-lg border border-surface-border-strong px-4 py-2 text-[11.5px] font-semibold text-text-faint hover:border-text-faint"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            className="flex-1 rounded-lg border border-green-border bg-green-bg px-4 py-2 text-[11.5px] font-semibold text-green"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
