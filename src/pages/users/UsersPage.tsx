import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createUser, deactivateUser, listUsers, updateUser } from "../../api/users";
import { ApiError } from "../../api/client";
import type { Role, UserOut } from "../../api/types";
import { useAuthStore } from "../../stores/authStore";

const ROLES: Role[] = ["admin", "trader", "quant", "viewer", "compliance"];

export default function UsersPage() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);

  const users = useQuery({
    queryKey: ["users", page, roleFilter],
    queryFn: () => listUsers({ page, page_size: 20, role: roleFilter || undefined }),
    staleTime: 15000,
  });

  return (
    <div className="space-y-4">
      <div className="rounded-[10px] border border-surface-border bg-surface-raised">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
          <span className="text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">Users</span>
          <div className="flex gap-1.5">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-surface-border-strong bg-surface-base px-2 py-1 text-[10.5px] text-text-primary"
            >
              <option value="">All roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-md border border-green-border bg-green-bg px-3 py-1 text-[10.5px] font-semibold text-green"
            >
              + Add user
            </button>
          </div>
        </div>

        {users.isPending ? (
          <p className="p-4 text-sm text-text-muted">Loading…</p>
        ) : !users.data || users.data.items.length === 0 ? (
          <p className="p-4 text-sm text-text-muted">No users match these filters.</p>
        ) : (
          <>
            <table className="w-full text-[11.5px]">
              <thead>
                <tr className="bg-surface-card text-[9.5px] uppercase tracking-[.06em] text-text-faint">
                  <th className="px-2.5 py-2 text-left">Name</th>
                  <th className="px-2.5 py-2 text-left">Email</th>
                  <th className="px-2.5 py-2 text-left">Role</th>
                  <th className="px-2.5 py-2 text-left">Status</th>
                  <th className="px-2.5 py-2 text-left">MFA</th>
                  <th className="px-2.5 py-2 text-left">Last login</th>
                  <th className="px-2.5 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.data.items.map((u) => (
                  <UserRow key={u.id} user={u} isSelf={u.id === currentUserId} />
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-4 py-3 text-[10.5px] text-text-faint">
              <span>
                Page {users.data.page} of {users.data.pages} ({users.data.total} total)
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-md border border-surface-border-strong px-2.5 py-1 font-semibold disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= users.data.pages}
                  className="rounded-md border border-surface-border-strong px-2.5 py-1 font-semibold disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ["users"] })}
        />
      )}
    </div>
  );
}

function UserRow({ user, isSelf }: { user: UserOut; isSelf: boolean }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState<Role>(user.role);
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["users"] });

  const saveRole = useMutation({
    mutationFn: () => updateUser(user.id, { role }),
    onSuccess: () => {
      invalidate();
      setEditing(false);
      setError(null);
    },
    onError: (err) => setError(err instanceof ApiError ? (err.body as { detail?: string } | null)?.detail ?? err.message : "Update failed."),
  });

  // Deactivating goes through DELETE (the dedicated endpoint — writes a
  // USER_DEACTIVATED audit entry and blocks self-deactivation server-side).
  // Reactivating has no DELETE equivalent, so it goes through PATCH
  // is_active=true instead (writes USER_UPDATED). One button, two routes.
  const toggleActive = useMutation({
    mutationFn: async () => {
      if (user.is_active) await deactivateUser(user.id);
      else await updateUser(user.id, { is_active: true });
    },
    onSuccess: invalidate,
    onError: (err) =>
      setError(err instanceof ApiError ? (err.body as { detail?: string } | null)?.detail ?? err.message : "Update failed."),
  });

  return (
    <tr className="border-b border-surface-border last:border-0">
      <td className="px-2.5 py-2.5 font-semibold text-text-primary">
        {user.full_name}
        {isSelf && <span className="ml-1.5 text-[9.5px] font-normal text-text-faint">(you)</span>}
      </td>
      <td className="px-2.5 py-2.5 text-text-faint">{user.email}</td>
      <td className="px-2.5 py-2.5">
        {editing ? (
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="rounded-md border border-surface-border-strong bg-surface-raised px-2 py-1 text-[11px] text-text-primary outline-none"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        ) : (
          <span className="rounded-md border border-blue-border bg-blue-bg px-2 py-0.5 text-[10px] font-bold text-blue">{user.role}</span>
        )}
      </td>
      <td className="px-2.5 py-2.5">
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${user.is_active ? "bg-decision-allow/20 text-decision-allow" : "bg-decision-block/20 text-decision-block"}`}>
          {user.is_active ? "Active" : "Deactivated"}
        </span>
      </td>
      <td className="px-2.5 py-2.5 text-text-faint">{user.mfa_enabled ? "On" : "Off"}</td>
      <td className="px-2.5 py-2.5 font-mono text-text-faint">{user.last_login_at ? new Date(user.last_login_at).toLocaleString() : "Never"}</td>
      <td className="px-2.5 py-2.5 text-right">
        <div className="flex items-center justify-end gap-2">
          {error && <span className="text-[10.5px] text-red">{error}</span>}
          {editing ? (
            <>
              <button onClick={() => saveRole.mutate()} disabled={saveRole.isPending} className="text-[10.5px] font-semibold text-green hover:underline">
                Save
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setRole(user.role);
                }}
                className="text-[10.5px] font-semibold text-text-faint hover:text-text-primary"
              >
                Cancel
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="text-[10.5px] font-semibold text-text-faint hover:text-text-primary">
              Edit role
            </button>
          )}
          <button
            onClick={() => toggleActive.mutate()}
            disabled={toggleActive.isPending || isSelf}
            title={isSelf ? "Can't deactivate yourself" : undefined}
            className={`text-[10.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
              user.is_active ? "text-red hover:underline" : "text-text-faint hover:text-text-primary"
            }`}
          >
            {user.is_active ? "Deactivate" : "Reactivate"}
          </button>
        </div>
      </td>
    </tr>
  );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => createUser({ email: email.trim(), password, full_name: fullName.trim(), role }),
    onSuccess: () => {
      onCreated();
      onClose();
    },
    onError: (err) => setError(err instanceof ApiError ? (err.body as { detail?: string } | null)?.detail ?? err.message : "Create failed."),
  });

  const canSubmit = email.trim().length > 0 && password.length >= 8 && fullName.trim().length > 0 && !create.isPending;

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-[420px] rounded-[13px] border border-surface-border-strong bg-surface-overlay p-6">
        <h3 className="mb-4 font-[family-name:var(--font-cond)] text-lg font-bold text-text-primary">Add user</h3>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Full name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Jordan Lee"
              className="w-full rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. jordan@example.com"
              className="w-full rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="w-full rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-xs text-red">{error}</p>}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            disabled={create.isPending}
            className="flex-1 rounded-lg border border-surface-border-strong px-4 py-2 text-[11.5px] font-semibold text-text-faint hover:border-text-faint"
          >
            Cancel
          </button>
          <button
            onClick={() => create.mutate()}
            disabled={!canSubmit}
            className="flex-1 rounded-lg border border-green-border bg-green-bg px-4 py-2 text-[11.5px] font-semibold text-green disabled:cursor-not-allowed disabled:opacity-50"
          >
            {create.isPending ? "Creating…" : "Add user"}
          </button>
        </div>
      </div>
    </div>
  );
}
