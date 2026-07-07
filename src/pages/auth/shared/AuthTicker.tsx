const ITEMS: { sym: string; val: string; up: boolean; pct: string }[] = [
  { sym: "ES", val: "5,842.25", up: true, pct: "+0.42%" },
  { sym: "NQ", val: "20,614.50", up: true, pct: "+0.61%" },
  { sym: "CL", val: "78.34", up: false, pct: "-0.28%" },
  { sym: "GC", val: "2,318.80", up: true, pct: "+0.15%" },
  { sym: "BTC", val: "67,420", up: true, pct: "+1.82%" },
  { sym: "ETH", val: "3,482", up: true, pct: "+2.14%" },
  { sym: "VIX", val: "13.84", up: false, pct: "-4.20%" },
  { sym: "NVDA", val: "876.30", up: true, pct: "+3.44%" },
];

// Decorative only — same static representative snapshot as the landing
// page's ticker (LandingPage.tsx), not a live feed. Duplicated once for a
// seamless marquee loop.
export function AuthTicker() {
  const items = [...ITEMS, ...ITEMS];
  return (
    <div className="auth-ticker" aria-hidden="true">
      <div className="auth-ticker-track">
        {items.map((it, i) => (
          <div className="auth-ticker-item" key={`${it.sym}-${i}`}>
            <b>{it.sym}</b>
            <span>{it.val}</span>
            <span className={it.up ? "auth-ticker-up" : "auth-ticker-dn"}>{it.pct}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
