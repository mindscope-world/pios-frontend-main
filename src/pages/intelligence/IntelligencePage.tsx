import { useState } from "react";
import { AdaptationTab } from "../../components/intelligence/AdaptationTab";
import { AlphaDarwinTab } from "../../components/intelligence/AlphaDarwinTab";
import { FeaturesTab } from "../../components/intelligence/FeaturesTab";
import { GmigTab } from "../../components/intelligence/GmigTab";
import { MarketsTab } from "../../components/intelligence/MarketsTab";
import { MonteCarloTab } from "../../components/intelligence/MonteCarloTab";
import { OfiTab } from "../../components/intelligence/OfiTab";
import { OverviewTab } from "../../components/intelligence/OverviewTab";
import { QuantCoreGatesTab } from "../../components/intelligence/QuantCoreGatesTab";
import { RegimeTab } from "../../components/intelligence/RegimeTab";
import { ScenariosTab } from "../../components/intelligence/ScenariosTab";
import { SignalConflictTab } from "../../components/intelligence/SignalConflictTab";

const SYMBOLS = ["BTC/USDT", "EUR/USD", "XAU/USD"];

type TabId =
  | "overview"
  | "regime"
  | "ofi"
  | "gmig"
  | "montecarlo"
  | "conflict"
  | "adaptation"
  | "alpha"
  | "scenarios"
  | "gates"
  | "markets"
  | "features";

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
  { id: "markets", label: "Markets" },
  { id: "features", label: "Features" },
];

// Tabs whose underlying endpoints take a symbol — the selector below is
// hidden for the rest rather than shown but silently ignored. "conflict" is
// symbol-less server-side but still honors AUTO (it switches to the
// /signal-conflict/auto route), so it shows the selector too.
const SYMBOL_SCOPED: ReadonlySet<TabId> = new Set([
  "overview",
  "regime",
  "ofi",
  "gmig",
  "montecarlo",
  "adaptation",
  "markets",
  "features",
]);

export default function IntelligencePage() {
  // null = AUTO: omit the symbol and let the backend auto-detect the primary
  // symbol server-side (every symbol-scoped endpoint supports this; OFI,
  // Monte Carlo, and Signal Conflict use their dedicated /auto routes).
  const [symbol, setSymbol] = useState<string | null>(SYMBOLS[0]);
  const [tab, setTab] = useState<TabId>("overview");

  const symbolChoices: (string | null)[] = [...SYMBOLS, null];
  const showSelector = SYMBOL_SCOPED.has(tab) || tab === "conflict";

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

        {showSelector && (
          <div className="flex gap-1.5">
            {symbolChoices.map((s) => (
              <button
                key={s ?? "auto"}
                onClick={() => setSymbol(s)}
                title={s === null ? "Let the backend auto-detect the primary symbol" : undefined}
                className={`rounded-md border px-3 py-1 text-[11px] ${
                  s === symbol ? "border-amber-border bg-amber-bg font-bold text-amber" : "border-surface-border-strong text-text-faint"
                }`}
              >
                {s ?? "AUTO"}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === "overview" && <OverviewTab symbol={symbol ?? undefined} />}
      {tab === "regime" && <RegimeTab symbol={symbol ?? undefined} />}
      {tab === "ofi" && <OfiTab symbol={symbol ?? undefined} />}
      {tab === "gmig" && <GmigTab symbol={symbol ?? undefined} />}
      {tab === "montecarlo" && <MonteCarloTab symbol={symbol ?? undefined} />}
      {tab === "conflict" && <SignalConflictTab auto={symbol === null} />}
      {tab === "adaptation" && <AdaptationTab symbol={symbol ?? undefined} />}
      {tab === "alpha" && <AlphaDarwinTab symbol={symbol ?? undefined} />}
      {tab === "scenarios" && <ScenariosTab symbol={symbol ?? undefined} />}
      {tab === "gates" && <QuantCoreGatesTab />}
      {tab === "markets" && <MarketsTab symbol={symbol ?? undefined} />}
      {tab === "features" && <FeaturesTab symbol={symbol ?? undefined} />}
    </div>
  );
}
