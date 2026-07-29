import { create } from "zustand";

interface PendingModeState {
  pendingAutomatic: boolean;
  requestAutomatic: () => void;
  confirmAutomatic: () => void;
  cancelAutomatic: () => void;
}

// Coordinates the header's "switch to Automatic" confirmation dialog between
// ModeSwitch (the segmented control) and ConfirmAutomaticModal (rendered
// separately, at the AppShell root, so it can't just be local component
// state). The trading mode itself is NOT tracked here -- it's server state,
// User.preferences.trading_mode (see TradingModeSelector.tsx and
// app/services/trading_mode_service.py), which both this header control and
// ModeActions.tsx read directly so they can never disagree.
export const usePendingModeStore = create<PendingModeState>((set) => ({
  pendingAutomatic: false,
  requestAutomatic: () => set({ pendingAutomatic: true }),
  confirmAutomatic: () => set({ pendingAutomatic: false }),
  cancelAutomatic: () => set({ pendingAutomatic: false }),
}));
