import { apiFetch } from "./client";
import type { PaginatedResponse, UserOut } from "./types";

// Mirrors app/api/v1/endpoints/users.py. list/create/deactivate are
// require_admin server-side; get/update allow a user to act on themselves
// too, but this admin screen only ever calls them for other users, so it's
// gated as admin-only end to end (routes.tsx wraps /users in RequireRole).

export function listUsers(params: { page?: number; page_size?: number; role?: string } = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.set(k, String(v));
  const s = qs.toString();
  return apiFetch<PaginatedResponse<UserOut>>(`/users${s ? `?${s}` : ""}`);
}

export interface UserCreatePayload {
  email: string;
  password: string;
  full_name: string;
  role: string;
}

export function createUser(payload: UserCreatePayload) {
  return apiFetch<UserOut>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface UserUpdatePayload {
  full_name?: string;
  role?: string;
  is_active?: boolean;
  preferences?: Record<string, unknown>;
}

export function updateUser(userId: string, payload: UserUpdatePayload) {
  return apiFetch<UserOut>(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// Soft delete: sets is_active=false server-side (app/api/v1/endpoints/users.py
// deactivate_user). Blocks self-deactivation with a 400 — mirrored client-side
// by disabling the button on the current user's own row.
export function deactivateUser(userId: string) {
  return apiFetch<{ message: string }>(`/users/${userId}`, { method: "DELETE" });
}
