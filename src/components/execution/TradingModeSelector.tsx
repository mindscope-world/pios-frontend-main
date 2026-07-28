import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUser } from "../../api/users";
import { useAuthStore } from "../../stores/authStore";

// The three Pi-OSQ operating modes (owner feedback, 2026-07-28), as a real
// account-level setting -- User.preferences.trading_mode server-side (see
// app/services/trading_mode_service.py), not just a per-page view toggle.
// Enforced server-side in two places: order_service.derive_confirmable_order
// hard-blocks order construction entirely for MANUAL (used by both the
// semi-auto confirm endpoint and the AUTO loop), and
// auto_execution_service.arm_symbol requires AUTOMATIC before it will arm.
// Defaults to SEMI_AUTOMATIC (unset preference) -- this codebase's
// pre-existing confirm-then-transmit behavior.
const TRADING_MODES = [
  {
    value: "MANUAL",
    label: "Manual",
    description: "Full analysis and trade plan, but no order is ever constructed or transmitted.",
  },
  {
    value: "SEMI_AUTOMATIC",
    label: "Semi-Automatic",
    description: "Constructs and prepares the order; you must explicitly confirm before it's sent.",
  },
  {
    value: "AUTOMATIC",
    label: "Automatic",
    description: "Autonomous end-to-end lifecycle once armed -- required to arm the AUTO loop.",
  },
] as const;

export function TradingModeSelector() {
  const user = useAuthStore((s) => s.user);
  const patchUser = useAuthStore((s) => s.patchUser);
  const queryClient = useQueryClient();

  const currentMode = (user?.preferences?.trading_mode as string | undefined) ?? "SEMI_AUTOMATIC";

  const setMode = useMutation({
    mutationFn: (mode: string) => {
      if (!user) throw new Error("Not signed in.");
      return updateUser(user.id, { preferences: { ...user.preferences, trading_mode: mode } });
    },
    onSuccess: (updated) => {
      patchUser({ preferences: updated.preferences });
      queryClient.invalidateQueries({ queryKey: ["auto-execution"] });
    },
  });

  if (!user) return null;

  return (
    <div className="mb-2 rounded-lg border border-surface-border-strong bg-surface-overlay p-2.5">
      <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[.06em] text-text-ghost">Trading Mode</div>
      <div className="flex gap-1.5">
        {TRADING_MODES.map((m) => (
          <button
            key={m.value}
            disabled={setMode.isPending}
            title={m.description}
            onClick={() => setMode.mutate(m.value)}
            className={`flex-1 rounded-md border px-2 py-1.5 text-[10px] font-semibold disabled:opacity-50 ${
              currentMode === m.value
                ? "border-accent-muted bg-accent/15 text-accent"
                : "border-surface-border-strong text-text-faint"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[9.5px] leading-relaxed text-text-ghost">
        {TRADING_MODES.find((m) => m.value === currentMode)?.description}
      </p>
      {setMode.isError && <p className="mt-1 text-[10px] text-red">Failed to update trading mode.</p>}
    </div>
  );
}
