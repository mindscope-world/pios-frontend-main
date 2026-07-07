import type { ReactNode } from "react";
import { authCss } from "./authTheme";
import { HomeButton } from "./HomeButton";
import { AuthTicker } from "./AuthTicker";

export function AuthShell({
  hideTicker,
  panel,
  children,
}: {
  hideTicker?: boolean;
  panel: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="auth-root">
      <style>{authCss}</style>
      <header className="auth-header">
        <HomeButton />
        {!hideTicker && <AuthTicker />}
      </header>
      <div className="auth-mobile-strip">
        <span className="auth-status-pill">System Status: Live</span>
      </div>
      <div className="auth-shell">
        <div className="auth-form-col">{children}</div>
        <div className="auth-panel-col" aria-hidden="true">
          {panel}
        </div>
      </div>
    </div>
  );
}
