import { useEffect, useRef, useState } from "react";
import { getNotificationsLatest, type NotificationSnapshotItem } from "../../api/intelligence";
import { useNotificationStream, type NotificationEvent } from "../../realtime/useNotificationStream";
import { useSystemNoticeStore } from "../../stores/systemNoticeStore";

interface AlertItem {
  id: string;
  tone: "info" | "warn" | "critical";
  tagLabel: string;
  text: string;
  ts: string;
}

const MAX_ALERTS = 20;

function toAlertItem(evt: NotificationEvent): AlertItem {
  const id = `${evt.event}-${evt.data.ts}-${Math.random()}`;
  switch (evt.event) {
    case "kill_switch":
      return { id, tone: "critical", tagLabel: "Critical", text: evt.data.body, ts: evt.data.ts };
    case "why_not_trade":
      return {
        id,
        tone: evt.data.type === "BLOCK" ? "warn" : "info",
        tagLabel: evt.data.type === "BLOCK" ? "Risk" : "Opportunity",
        text: evt.data.title,
        ts: evt.data.ts,
      };
    case "regime_change":
      return { id, tone: "info", tagLabel: "Intelligence", text: evt.data.title, ts: evt.data.ts };
    case "feed_stale":
      return { id, tone: "warn", tagLabel: "Data", text: evt.data.title, ts: evt.data.ts };
  }
}

const TAG_CLASSES: Record<AlertItem["tone"], string> = {
  info: "bg-blue-bg text-blue border-blue-border",
  warn: "bg-amber-bg text-amber border-amber-border",
  critical: "bg-red-bg text-red border-red-border",
};

// GET /intelligence/notifications/latest — one-shot severity snapshot across
// the most active symbols, used to seed the bell on mount so it isn't empty
// until the first SSE stream event arrives. Only non-OK entries become items
// (an all-clear snapshot is not an alert). Snapshot rows are informational,
// never "critical" — the critical banner stays reserved for real stream
// events (kill switch).
function snapshotToItems(items: NotificationSnapshotItem[]): AlertItem[] {
  return items
    .filter((n) => n.severity !== "OK")
    .map((n) => ({
      id: `snapshot-${n.symbol}-${n.evaluated_at}`,
      tone: "warn" as const,
      tagLabel: n.severity === "BLOCK" ? "Blocked" : "Watch",
      text: `${n.symbol}: ${n.decision} — regime ${n.regime} (${n.regime_conf}%), feed age ${Math.round(n.feed_age_ms)}ms`,
      ts: n.evaluated_at,
    }));
}

export function AlertCenter({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const showBanner = useSystemNoticeStore((s) => s.showBanner);

  useNotificationStream((evt) => {
    const item = toAlertItem(evt);
    setAlerts((prev) => [item, ...prev].slice(0, MAX_ALERTS));
    if (item.tone === "critical") {
      showBanner({ text: item.text, tone: "red" });
    }
  });

  // Seed once on mount from the REST snapshot; live stream items then stack
  // on top. Appended behind any stream items that raced in first.
  useEffect(() => {
    let cancelled = false;
    getNotificationsLatest(10)
      .then((snap) => {
        if (cancelled) return;
        const seeded = snapshotToItems(snap.notifications);
        if (seeded.length > 0) setAlerts((prev) => [...prev, ...seeded].slice(0, MAX_ALERTS));
      })
      .catch(() => {}); // seeding is best-effort — the stream still populates the bell
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const criticalCount = alerts.filter((a) => a.tone === "critical").length;
  const badgeCount = criticalCount > 0 ? criticalCount : alerts.length;

  return (
    <div ref={rootRef} className="relative flex-shrink-0">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="relative flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-surface-border-strong text-text-muted"
      >
        🔔
        {badgeCount > 0 && (
          <span
            className={`absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-lg px-1 text-[9px] font-extrabold ${
              criticalCount > 0 ? "bg-red text-white" : "bg-amber text-surface-raised"
            }`}
          >
            {badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-11 z-[700] w-[300px] overflow-hidden rounded-[10px] border border-surface-border-strong bg-surface-card shadow-2xl">
          <div className="border-b border-surface-border px-3.5 py-2.5 text-[10.5px] font-bold uppercase tracking-[.06em] text-text-faint">
            Alerts
          </div>
          {alerts.length === 0 ? (
            <div className="p-3.5 text-[11px] text-text-faint">No alerts yet this session.</div>
          ) : (
            alerts.map((a) => (
              <div
                key={a.id}
                onClick={() => {
                  onNavigate(a.tone === "critical" ? "risk" : "intelligence");
                  setOpen(false);
                }}
                className={`flex cursor-pointer items-start gap-2 border-b border-surface-border px-3.5 py-2.5 text-[11px] hover:bg-white/[.02] ${
                  a.tone === "critical" ? "border-l-2 border-l-red" : ""
                }`}
              >
                <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${TAG_CLASSES[a.tone]}`}>
                  {a.tagLabel}
                </span>
                <div className="leading-relaxed text-text-muted">{a.text}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
