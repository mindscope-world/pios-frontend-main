import { useEffect, type ReactNode } from "react";
import { refreshOnce } from "../../api/client";
import { useAuthStore } from "../../stores/authStore";

/**
 * Runs once on app boot: attempts to rehydrate a session from the
 * sessionStorage-backed refresh token (see authStore.ts) before any
 * protected route renders. Covers the "no session at all" case explicitly,
 * since refreshOnce() only calls setSession/clear when a token was present.
 */
export function AuthBoot({ children }: { children: ReactNode }) {
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    let cancelled = false;
    refreshOnce().finally(() => {
      if (!cancelled) setHydrated();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isHydrating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base text-sm text-text-muted">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
