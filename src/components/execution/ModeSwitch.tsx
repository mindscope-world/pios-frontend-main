import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUser } from "../../api/users";
import { useAuthStore } from "../../stores/authStore";
import { usePendingModeStore } from "../../stores/executionModeStore";

const SEGMENTS: { m: string; label: string }[] = [
  { m: "MANUAL", label: "Manual" },
  { m: "SEMI_AUTOMATIC", label: "Semi-auto" },
  { m: "AUTOMATIC", label: "Automatic" },
];

// Header shortcut for the same account-level setting TradingModeSelector.tsx
// sets on the Execution page (User.preferences.trading_mode) -- reads/writes
// the identical field so the two controls can never show different modes.
export function ModeSwitch() {
  const user = useAuthStore((s) => s.user);
  const patchUser = useAuthStore((s) => s.patchUser);
  const queryClient = useQueryClient();
  const requestAutomatic = usePendingModeStore((s) => s.requestAutomatic);

  const mode = (user?.preferences?.trading_mode as string | undefined) ?? "SEMI_AUTOMATIC";

  const setMode = useMutation({
    mutationFn: (next: string) => {
      if (!user) throw new Error("Not signed in.");
      return updateUser(user.id, { preferences: { ...user.preferences, trading_mode: next } });
    },
    onSuccess: (updated) => {
      patchUser({ preferences: updated.preferences });
      queryClient.invalidateQueries({ queryKey: ["auto-execution"] });
    },
  });

  if (!user) return null;

  const select = (next: string) => {
    // Escalating autonomy (anything -> AUTOMATIC) requires confirmation;
    // de-escalating is instant, on purpose (recovering control under stress
    // should never be blocked).
    if (next === "AUTOMATIC" && mode !== "AUTOMATIC") {
      requestAutomatic();
      return;
    }
    setMode.mutate(next);
  };

  return (
    <div className="flex flex-col gap-[3px]">
      <div className="text-[9px] uppercase tracking-[.08em] text-text-ghost">Execution mode</div>
      <div className="flex overflow-hidden rounded-lg border border-surface-border-strong">
        {SEGMENTS.map((seg, i) => (
          <button
            key={seg.m}
            disabled={setMode.isPending}
            onClick={() => select(seg.m)}
            className={`px-3 py-1.5 text-[10.5px] transition disabled:opacity-50 ${i < SEGMENTS.length - 1 ? "border-r border-surface-border" : ""} ${
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
  const user = useAuthStore((s) => s.user);
  const patchUser = useAuthStore((s) => s.patchUser);
  const queryClient = useQueryClient();
  const pending = usePendingModeStore((s) => s.pendingAutomatic);
  const cancel = usePendingModeStore((s) => s.cancelAutomatic);
  const confirmPending = usePendingModeStore((s) => s.confirmAutomatic);

  const setMode = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("Not signed in.");
      return updateUser(user.id, { preferences: { ...user.preferences, trading_mode: "AUTOMATIC" } });
    },
    onSuccess: (updated) => {
      patchUser({ preferences: updated.preferences });
      queryClient.invalidateQueries({ queryKey: ["auto-execution"] });
      confirmPending();
    },
  });

  if (!pending) return null;

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-[380px] rounded-[13px] border border-surface-border-strong bg-surface-overlay p-6">
        <h3 className="mb-2 font-[family-name:var(--font-cond)] text-lg font-bold text-text-primary">
          Switch to automatic
        </h3>
        <p className="mb-4 text-[11.5px] leading-relaxed text-text-muted">
          Automatic runs a real background engine — <strong className="text-text-primary">paper MT5 brokers
          only</strong>, no live capital at risk. Switching this global mode doesn't arm anything by itself; you
          still separately arm each symbol you want it to trade on the Execution screen.
        </p>
        <p className="mb-4 text-[11.5px] leading-relaxed text-text-muted">
          Once a symbol is armed, it's re-evaluated against a fresh decision every{" "}
          <strong className="text-text-primary">60 seconds</strong> and can submit one entry per symbol without
          further confirmation. Three circuit breakers (daily loss, drawdown, max daily order count) auto-disarm
          every armed symbol on this account the instant any of them trips — re-arming afterward is always a fresh,
          explicit action, never automatic. You can disarm any symbol instantly at any time.
        </p>
        <div className="mt-1.5 flex gap-2">
          <button
            onClick={cancel}
            className="flex-1 rounded-lg border border-surface-border-strong px-4 py-2 text-[11.5px] font-semibold text-text-faint hover:border-text-faint"
          >
            Cancel
          </button>
          <button
            disabled={setMode.isPending}
            onClick={() => setMode.mutate()}
            className="flex-1 rounded-lg border border-green-border bg-green-bg px-4 py-2 text-[11.5px] font-semibold text-green disabled:opacity-50"
          >
            {setMode.isPending ? "Confirming…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
