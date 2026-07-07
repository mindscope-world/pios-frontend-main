import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import type { Role } from "../../api/types";

interface RequireRoleProps {
  /**
   * Mirrors backend guards exactly — do not invent a separate client-side
   * taxonomy (FRONTEND_GUIDE.md §4 / workplan §3.2):
   *   - omitted            -> any authenticated role
   *   - ["admin"]          -> require_admin
   *   - ["admin","trader"] -> require_trade_exec
   */
  roles?: Role[];
}

export function RequireRole({ roles }: RequireRoleProps) {
  const user = useAuthStore((s) => s.user);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const location = useLocation();

  if (isHydrating) return null;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/execution" replace />;
  }

  return <Outlet />;
}
