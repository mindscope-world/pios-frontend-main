import { useState } from "react";
import { AdaptationTab } from "../../components/intelligence/AdaptationTab";
import { AlphaDarwinTab } from "../../components/intelligence/AlphaDarwinTab";
import { GmigTab } from "../../components/intelligence/GmigTab";
import { MonteCarloTab } from "../../components/intelligence/MonteCarloTab";
import { OfiTab } from "../../components/intelligence/OfiTab";
import { OverviewTab } from "../../components/intelligence/OverviewTab";
import { QuantCoreGatesTab } from "../../components/intelligence/QuantCoreGatesTab";
import { RegimeTab } from "../../components/intelligence/RegimeTab";
import { ScenariosTab } from "../../components/intelligence/ScenariosTab";
import { SignalConflictTab } from "../../components/intelligence/SignalConflictTab";

const SYMBOLS = ["BTC/USDT", "EUR/USD", "XAU/USD"];

type TabId = "overview" | "regime" | "ofi" | "gmig" | "montecarlo" | "conflict" | "adaptation" | "alpha" | "scenarios" | "gates";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "regime", label: "Regime" },
  { id: "ofi", label: "OFI" },
  { id: "gmig", label: "GMIG" },
  { id: "montecarlo", label: "Monte Carlo" },
  { id: "conflict", label: "Signal Conflict" },
  { id: "adaptation", label: "Adaptation Feed" },
  { id: "alpha", label: "Alpha / Darwin" },
  { id: "scenarios", label: "Scenarios" },
  { id: "gates", label: "Quant-Core Gates" },
];

// Tabs whose underlying endpoints are auto-detect / no-symbol server-side
// (see each Tab component's own doc comment) — the symbol selector below is
// hidden for these rather than shown but silently ignored.
const SYMBOL_SCOPED: ReadonlySet<TabId> = new Set(["overview", "regime", "ofi", "gmig", "montecarlo", "adaptation"]);

export default function IntelligencePage() {
  const [symbol, setSymbol] = useState(SYMBOLS[0]);
  const [tab, setTab] = useState<TabId>("overview");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-md border px-3 py-1 text-[11px] ${
                t.id === tab ? "border-blue-border bg-blue-bg font-bold text-blue" : "border-surface-border-strong text-text-faint"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {SYMBOL_SCOPED.has(tab) && (
          <div className="flex gap-1.5">
            {SYMBOLS.map((s) => (
              <button
                key={s}
                onClick={() => setSymbol(s)}
                className={`rounded-md border px-3 py-1 text-[11px] ${
                  s === symbol ? "border-amber-border bg-amber-bg font-bold text-amber" : "border-surface-border-strong text-text-faint"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === "overview" && <OverviewTab symbol={symbol} />}
      {tab === "regime" && <RegimeTab symbol={symbol} />}
      {tab === "ofi" && <OfiTab symbol={symbol} />}
      {tab === "gmig" && <GmigTab symbol={symbol} />}
      {tab === "montecarlo" && <MonteCarloTab symbol={symbol} />}
      {tab === "conflict" && <SignalConflictTab />}
      {tab === "adaptation" && <AdaptationTab symbol={symbol} />}
      {tab === "alpha" && <AlphaDarwinTab symbol={symbol} />}
      {tab === "scenarios" && <ScenariosTab symbol={symbol} />}
      {tab === "gates" && <QuantCoreGatesTab />}
    </div>
  );
}
