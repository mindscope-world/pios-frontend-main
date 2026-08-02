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
//
// "invalid" (401/403 — the backend explicitly rejected this token) and
// "transient" (5xx / network failure — the request never got a real
// answer) used to be treated identically: any non-2xx cleared the session
// and bounced to login. Found 2026-08-02: under the same DB connection-
// pool contention documented elsewhere in this project, `/auth/refresh`
// intermittently 500s on a perfectly valid, unexpired refresh token —
// which read to the user as "hit Refresh, got sent back to login."
type RefreshOutcome =
  | { kind: "ok"; data: TokenPair }
  | { kind: "invalid" }
  | { kind: "transient" };

async function requestRefresh(refreshToken: string): Promise<RefreshOutcome> {
  try {
    const response = await fetch(`${API_ROOT}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (response.status === 401 || response.status === 403) return { kind: "invalid" };
    if (!response.ok) return { kind: "transient" };
    return { kind: "ok", data: (await response.json()) as TokenPair };
  } catch {
    return { kind: "transient" }; // network failure, not a rejection
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Single in-flight refresh shared across all concurrent 401s, so a burst of
// requests doesn't fire a refresh storm (FRONTEND_GUIDE.md §4 step 4).
let refreshPromise: Promise<string | null> | null = null;

// Exported so the app shell can rehydrate a session on boot from the
// sessionStorage-backed refresh token before rendering protected routes —
// there is no persisted access_token to attach a "GET /auth/me" call to,
// since access_token deliberately never leaves memory.
// Backoff between transient-failure retries — short enough that a real
// user isn't left staring at "Loading…" for long, long enough to ride out
// a brief DB-pool stall (found taking single-digit seconds to clear, not
// minutes, when this was last measured live).
const TRANSIENT_RETRY_DELAYS_MS = [1000, 2000];

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

      let outcome = await requestRefresh(token);
      for (const delay of TRANSIENT_RETRY_DELAYS_MS) {
        if (outcome.kind !== "transient") break;
        await sleep(delay);
        outcome = await requestRefresh(token);
      }

      if (outcome.kind === "invalid") {
        // The backend explicitly rejected this token (revoked/expired) —
        // there is genuinely no session to keep.
        useAuthStore.getState().clear();
        return null;
      }
      if (outcome.kind === "transient") {
        // Still unreachable after retries — do NOT clear an existing,
        // possibly-still-valid session over a backend outage. On a fresh
        // page load there's no session to preserve (accessToken/user start
        // null every boot, only refreshOnce() repopulates them), so this
        // still surfaces as "not logged in" for that case — an honest
        // consequence of the backend being unreachable, not a bug to mask.
        return null;
      }

      useAuthStore.getState().setSession({
        accessToken: outcome.data.access_token,
        refreshToken: outcome.data.refresh_token,
        user: outcome.data.user,
        remember: remembered,
      });
      return outcome.data.access_token;
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
