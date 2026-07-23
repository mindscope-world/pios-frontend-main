import { create } from "zustand";

export type ExecutionMode = "manual" | "semi" | "automatic";

// Manual: user-initiated via POST /orders. Semi: one-click "confirm the
// live decision" via POST /orders/confirm-decision (§3.1) — the backend
// re-derives side/qty/eligibility server-side, so this is real order
// submission, not a simulation; see order_service.confirm_decision for the
// exact (labeled-MVP) rules it fires under. Automatic: a real background
// engine now exists (POST /auto-execution/arm) — paper MT5 brokers only,
// per-symbol arming, three circuit breakers; see AutomaticControl.tsx.
// This flag just means "the mode has a real backend" — per-symbol armed
// state itself is server state (GET /auto-execution/status via react-query),
// deliberately not duplicated into this store.
export const MODE_HAS_BACKEND: Record<ExecutionMode, boolean> = {
  manual: true,
  semi: true,
  automatic: true,
};

interface ExecutionModeState {
  mode: ExecutionMode;
  pendingMode: ExecutionMode | null;
  requestMode: (mode: ExecutionMode) => void;
  confirmPendingMode: () => void;
  cancelPendingMode: () => void;
}

export const useExecutionModeStore = create<ExecutionModeState>((set, get) => ({
  mode: "manual",
  pendingMode: null,
  requestMode: (mode) => {
    const current = get().mode;
    // Escalating autonomy (anything -> automatic) requires confirmation;
    // de-escalating (-> manual) is instant, on purpose (mockup's asymmetric
    // friction: recovering control under stress should never be blocked).
    if (mode === "automatic" && current !== "automatic") {
      set({ pendingMode: mode });
      return;
    }
    set({ mode, pendingMode: null });
  },
  confirmPendingMode: () => set((state) => ({ mode: state.pendingMode ?? state.mode, pendingMode: null })),
  cancelPendingMode: () => set({ pendingMode: null }),
}));
