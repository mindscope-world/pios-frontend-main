import { create } from "zustand";

export type ExecutionMode = "manual" | "semi" | "automatic";

// Manual is the only mode with a real backend behind it today: every order
// is user-initiated via POST /orders (see api/orders.ts). There is no
// autonomous order-submission engine, so semi/automatic have nothing to
// execute against yet — the UI still offers the switch (per the client
// design) but renders an honest "not available" state instead of simulating
// trade activity. Tracked as a future backend feature in
// pios-backend-main/development-priorities.md.
export const MODE_HAS_BACKEND: Record<ExecutionMode, boolean> = {
  manual: true,
  semi: false,
  automatic: false,
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
