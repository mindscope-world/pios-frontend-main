import { useEffect, useRef } from "react";
import { connectSSE, type SSEEvent } from "./sse";

// Event shapes mirror app/api/v1/endpoints/intelligence.py's
// _notification_generator exactly (verified against source).
export type NotificationEvent =
  | { event: "why_not_trade"; data: { type: "BLOCK" | "CLEAR"; symbol: string; decision: string; regime: string; title: string; body: string; ts: string } }
  | { event: "regime_change"; data: { symbol: string; from_regime: string; to_regime: string; confidence: number; title: string; ts: string } }
  | { event: "feed_stale"; data: { symbol: string; age_ms: number; title: string; ts: string } }
  | { event: "kill_switch"; data: { severity: "CRITICAL"; title: string; body: string; ts: string } };

/**
 * GET /intelligence/notifications/stream — push notifications for
 * constraint changes, regime shifts, feed staleness, kill-switch events.
 * Use for a toast/notification center, decoupled from dashboard state
 * (FRONTEND_GUIDE.md §6.3) — see components/notifications/ToastCenter.tsx.
 */
export function useNotificationStream(onNotification: (event: NotificationEvent) => void) {
  const handlerRef = useRef(onNotification);
  handlerRef.current = onNotification;

  useEffect(() => {
    return connectSSE("/intelligence/notifications/stream", (evt: SSEEvent) => {
      if (evt.event === "heartbeat") return;
      try {
        handlerRef.current({ event: evt.event, data: JSON.parse(evt.data) } as NotificationEvent);
      } catch {
        // non-JSON payload — ignore
      }
    });
  }, []);
}
