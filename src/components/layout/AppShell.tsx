import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { logout as logoutRequest } from "../../api/auth";
import { ModeSwitch, ConfirmAutomaticModal } from "../execution/ModeSwitch";
import { StatusPill, Clock } from "./StatusPill";
import { AlertCenter } from "../notifications/AlertCenter";
import { CriticalBanner } from "./CriticalBanner";
import { KillSwitchArmButton, KillSwitchConfirmModal } from "../risk/KillSwitch";

interface NavItem {
  to: string;
  label: string;
  icon: string;
}
interface NavGroup {
  label: string;
  items: NavItem[];
}

// Mockup's reduction from a page-per-domain IA, plus Orders promoted back to
// a top-level destination once the order history/detail screen was built —
// positions still lives one tap in from Portfolio. Alerts/Audit were folded
// into Risk & Safety as redirects until their own screens existed; now real.
const NAV_GROUPS: NavGroup[] = [
  {
    label: "Live",
    items: [
      { to: "/execution", label: "Execution", icon: "◈" },
      { to: "/orders", label: "Orders", icon: "▤" },
      { to: "/portfolio", label: "Portfolio", icon: "⊙" },
    ],
  },
  {
    label: "On demand",
    items: [
      { to: "/intelligence", label: "Intelligence", icon: "◎" },
      { to: "/capital", label: "Capital", icon: "⊛" },
      { to: "/risk", label: "Risk & Safety", icon: "🛡" },
      { to: "/alerts", label: "Alerts", icon: "⚑" },
      { to: "/execution-quality", label: "Execution Quality", icon: "⧗" },
      { to: "/data-quality", label: "Data Quality", icon: "◫" },
    ],
  },
  {
    label: "Reference",
    items: [
      { to: "/strategies", label: "Strategies", icon: "◇" },
      { to: "/backtest", label: "Backtest", icon: "⟲" },
      { to: "/connections", label: "Connections", icon: "⟁" },
    ],
  },
];

// GET /audit is require_audit (admin + compliance + quant) server-side —
// appended conditionally below rather than listed statically so other roles
// never see a nav entry that would 403.
const AUDIT_ROLES = new Set(["admin", "compliance", "quant"]);
// Every users.py route is require_admin or self-or-admin — same pattern.
const USERS_ROLES = new Set(["admin"]);

export function AppShell() {
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();
  const [killModalOpen, setKillModalOpen] = useState(false);

  const navGroups = NAV_GROUPS.map((group) => {
    if (group.label === "On demand" && user?.role && AUDIT_ROLES.has(user.role)) {
      return { ...group, items: [...group.items, { to: "/audit", label: "Audit", icon: "📜" }] };
    }
    if (group.label === "Reference" && user?.role && USERS_ROLES.has(user.role)) {
      return { ...group, items: [...group.items, { to: "/users", label: "Users", icon: "☺" }] };
    }
    return group;
  });

  const handleLogout = async () => {
    if (refreshToken) {
      try {
        await logoutRequest(refreshToken);
      } catch {
        // best-effort — clear the local session regardless of server response
      }
    }
    clear();
  };

  return (
    <div className="min-h-screen bg-surface-base text-text-primary">
      <div
        className="fixed left-0 right-0 top-0 z-[600] flex items-center gap-[22px] border-b border-surface-border-strong bg-black/[.97] px-5 backdrop-blur-xl"
        style={{ height: "var(--nav-h)" }}
      >
        <div className="flex flex-shrink-0 items-center gap-[9px] border-r border-surface-border pr-[18px]">
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-amber font-[family-name:var(--font-cond)] text-[17px] font-bold text-surface-raised">
            π
          </div>
          <div className="font-[family-name:var(--font-ui)] text-[16px] font-extrabold leading-tight">
            Pi-OSQ
            <small className="block font-[family-name:var(--font-mono)] text-[10px] font-medium text-text-faint">
              Execution Intelligence
            </small>
          </div>
        </div>

        <ModeSwitch />
        <StatusPill />
        <AlertCenter onNavigate={(screen) => navigate(`/${screen}`)} />

        <div className="ml-auto flex items-center gap-4">
          {/* POST /risk/killswitch is require_admin server-side — hide rather
              than offer a control that would just 403 for other roles. */}
          {user?.role === "admin" && <KillSwitchArmButton onArmed={() => setKillModalOpen(true)} />}
          <Clock />
        </div>
      </div>

      <CriticalBanner />

      <aside
        className="fixed left-0 overflow-y-auto border-r border-surface-border bg-surface-raised py-4"
        style={{ top: "var(--nav-h)", width: "var(--side-w)", height: "calc(100vh - var(--nav-h))" }}
      >
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="mt-3.5 px-[18px] pb-1 text-[9px] uppercase tracking-[.1em] text-text-ghost first:mt-0">
              {group.label}
            </div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 border-l-2 px-[18px] py-2.5 text-xs transition ${
                    isActive
                      ? "border-l-amber bg-amber-bg font-bold text-amber"
                      : "border-l-transparent text-text-muted hover:bg-white/[.02] hover:text-text-primary"
                  }`
                }
              >
                <span className="w-4 flex-shrink-0 text-center text-[13px]">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="mt-6 border-t border-surface-border px-[18px] pt-3">
          <p className="truncate text-xs text-text-primary">{user?.full_name}</p>
          <p className="truncate text-xs text-text-muted">{user?.role}</p>
          <button onClick={handleLogout} className="mt-2 text-xs text-red hover:underline">
            Log out
          </button>
        </div>
      </aside>

      <main
        className="relative z-[1] p-6"
        style={{ marginLeft: "var(--side-w)", marginTop: "var(--nav-h)", minHeight: "calc(100vh - var(--nav-h))" }}
      >
        <Outlet />
      </main>

      <ConfirmAutomaticModal />
      <KillSwitchConfirmModal open={killModalOpen} onClose={() => setKillModalOpen(false)} />
    </div>
  );
}
