import { create } from "zustand";
import type { UserOut } from "../api/types";

// access_token lives only in memory (XSS exposure on a trading terminal is a
// real-money risk — see FRONTEND_GUIDE.md §4). refresh_token has no first-party
// cookie flow from the backend, so it gets a storage fallback purely to
// survive a tab refresh; it is still cleared on logout / explicit clear().
//
// "Remember this terminal" (Login.tsx) picks WHICH storage: localStorage
// survives closing the browser entirely, sessionStorage clears when the tab
// closes. Both are cleared on logout regardless — this only controls how
// long an idle, un-logged-out session survives.
const REFRESH_TOKEN_KEY = "pios.refreshToken";

interface Session {
  accessToken: string;
  refreshToken: string;
  user: UserOut;
  remember?: boolean;
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
  setSession: ({ accessToken, refreshToken, user, remember }) => {
    if (remember) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    } else {
      sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    set({ accessToken, refreshToken, user, isHydrating: false });
  },
  setHydrated: () => set({ isHydrating: false }),
  patchUser: (patch) => set((state) => (state.user ? { user: { ...state.user, ...patch } } : state)),
  clear: () => {
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    set({ accessToken: null, refreshToken: null, user: null, isHydrating: false });
  },
}));

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY) ?? sessionStorage.getItem(REFRESH_TOKEN_KEY);
}
