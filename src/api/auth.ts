import { apiFetch } from "./client";
import type {
  LoginPayload,
  MessageResponse,
  MFASetupResponse,
  TokenPair,
  UserOut,
} from "./types";

export function login(payload: LoginPayload) {
  return apiFetch<TokenPair>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
    skipAuth: true,
  });
}

// POST /auth/register (auth.py) auto-logs-in on success (returns a TokenPair,
// same shape as /login) and always assigns role="trader" server-side
// regardless of what's sent — RegisterRequest.role is accepted by the schema
// but the endpoint hardcodes it. No email verification step exists.
export function register(payload: { full_name: string; email: string; password: string }) {
  return apiFetch<TokenPair>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
    skipAuth: true,
  });
}

export function logout(refreshToken: string) {
  return apiFetch<MessageResponse>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

export function fetchMe() {
  return apiFetch<UserOut>("/auth/me");
}

export function mfaSetup() {
  return apiFetch<MFASetupResponse>("/auth/mfa/setup", { method: "POST" });
}

export function mfaVerify(code: string) {
  return apiFetch<MessageResponse>("/auth/mfa/verify", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}
