import { create } from "zustand";

interface Banner {
  text: string;
  tone: "red" | "amber" | "blue";
}

interface SystemNoticeState {
  banner: Banner | null;
  showBanner: (banner: Banner) => void;
  dismissBanner: () => void;
}

// Drives the dismissible full-width interrupt banner (mockup's .critbanner) —
// reserved for boundary events (kill switch fired, critical alert) per the
// design thesis: silence at a boundary reads as malfunction, not intelligence.
export const useSystemNoticeStore = create<SystemNoticeState>((set) => ({
  banner: null,
  showBanner: (banner) => set({ banner }),
  dismissBanner: () => set({ banner: null }),
}));
