import { useAuthStore, getStoredRefreshToken } from "../stores/authStore";
import type { TokenPair } from "./types";

// Backend mounts the router at /api/v1 (main.py:72), on port 9000 (Dockerfile).
// An empty/unset VITE_API_BASE_URL means same-origin: the Vite dev proxy (and
// any tunnel in front of it) forwards /api to the backend, so the app works on
// localhost and on a public tunnel without re-editing .env.local per tunnel.
const API_ROOT = `${(import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ""}/api/v1`;

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `Request failed with status ${status}`);
    this.status = status;
    this.body = body;
  }
}

// Raw fetch, deliberately not routed through apiFetch, to avoid a refresh
// call ever triggering another refresh-on-401 recursively.
async function requestRefresh(refreshToken: string): Promise<TokenPair | null> {
  const response = await fetch(`${API_ROOT}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) return null;
  return (await response.json()) as TokenPair;
}

// Single in-flight refresh shared across all concurrent 401s, so a burst of
// requests doesn't fire a refresh storm (FRONTEND_GUIDE.md §4 step 4).
let refreshPromise: Promise<string | null> | null = null;

// Exported so the app shell can rehydrate a session on boot from the
// sessionStorage-backed refresh token before rendering protected routes —
// there is no persisted access_token to attach a "GET /auth/me" call to,
// since access_token deliberately never leaves memory.
export function refreshOnce(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const token = useAuthStore.getState().refreshToken ?? getStoredRefreshToken();
      if (!token) return null;
      // Preserve whichever storage this session was remembered into — the
      // refresh token rotates every call, so re-deriving "remember" from
      // where the OLD token currently lives keeps a "remembered" session
      // from silently downgrading to session-only storage on refresh.
      const remembered = localStorage.getItem("pios.refreshToken") !== null;
      const data = await requestRefresh(token);
      if (!data) {
        useAuthStore.getState().clear();
        return null;
      }
      useAuthStore.getState().setSession({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        user: data.user,
        remember: remembered,
      });
      return data.access_token;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

interface RequestOptions extends RequestInit {
  /** Skip attaching Authorization and skip the refresh-on-401 retry (login/register). */
  skipAuth?: boolean;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth, headers, ...rest } = options;

  const doFetch = (token: string | null) => {
    const finalHeaders = new Headers(headers);
    if (!finalHeaders.has("Content-Type") && rest.body) {
      finalHeaders.set("Content-Type", "application/json");
    }
    if (token && !skipAuth) finalHeaders.set("Authorization", `Bearer ${token}`);
    return fetch(`${API_ROOT}${path}`, { ...rest, headers: finalHeaders });
  };

  let response = await doFetch(useAuthStore.getState().accessToken);

  if (response.status === 401 && !skipAuth) {
    const newToken = await refreshOnce();
    if (newToken) {
      response = await doFetch(newToken);
    }
  }

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // no JSON body on this error response
    }
    const detail = (body as { detail?: string } | null)?.detail;
    throw new ApiError(response.status, body, detail);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
