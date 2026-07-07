import { create } from "zustand";
import type { UserOut } from "../api/types";

// access_token lives only in memory (XSS exposure on a trading terminal is a
// real-money risk — see FRONTEND_GUIDE.md §4). refresh_token has no first-party
// cookie flow from the backend, so it gets a sessionStorage fallback purely to
// survive a tab refresh; it is still cleared on logout / explicit clear().
const REFRESH_TOKEN_KEY = "pios.refreshToken";

interface Session {
  accessToken: string;
  refreshToken: string;
  user: UserOut;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserOut | null;
  isHydrating: boolean;
  setSession: (session: Session) => void;
  setHydrated: () => void;
  patchUser: (patch: Partial<UserOut>) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isHydrating: true,
  setSession: ({ accessToken, refreshToken, user }) => {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    set({ accessToken, refreshToken, user, isHydrating: false });
  },
  setHydrated: () => set({ isHydrating: false }),
  patchUser: (patch) => set((state) => (state.user ? { user: { ...state.user, ...patch } } : state)),
  clear: () => {
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    set({ accessToken: null, refreshToken: null, user: null, isHydrating: false });
  },
}));

export function getStoredRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY);
}
