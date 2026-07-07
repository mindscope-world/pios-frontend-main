import { useSystemNoticeStore } from "../../stores/systemNoticeStore";

const TONE_CLASSES = {
  red: "bg-red-bg border-red-border text-red",
  amber: "bg-amber-bg border-amber-border text-amber",
  blue: "bg-blue-bg border-blue-border text-blue",
};

export function CriticalBanner() {
  const banner = useSystemNoticeStore((s) => s.banner);
  const dismiss = useSystemNoticeStore((s) => s.dismissBanner);

  if (!banner) return null;

  return (
    <div
      className={`fixed left-0 right-0 z-[550] flex items-center justify-between border-b px-5 py-2.5 text-[11.5px] md:left-[var(--side-w)] ${TONE_CLASSES[banner.tone]}`}
      style={{ top: "var(--nav-h)" }}
    >
      <span>{banner.text}</span>
      <span onClick={dismiss} className="cursor-pointer px-1.5 text-sm text-text-muted hover:text-text-primary">
        ✕
      </span>
    </div>
  );
}
