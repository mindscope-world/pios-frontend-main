import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { getAlpacaCryptoSymbols, getOandaForexSymbols } from "../../api/intelligence";
import { SymbolPickerModal } from "../../components/execution/SymbolPickerModal";
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

// Fallbacks only, for the brief window before the live lists below load (or
// the rare case a broker's credentials aren't configured) -- mirrors
// ExecutionPage.tsx's own DEFAULT_CRYPTO_SYMBOLS/DEFAULT_FOREX_METAL_SYMBOLS.
const DEFAULT_CRYPTO_SYMBOLS = ["BTC/USDT"];
const DEFAULT_FOREX_METAL_SYMBOLS = ["EURUSD", "XAUUSD"];

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
// hidden for the rest rather than shown but silently ignored.
const SYMBOL_SCOPED: ReadonlySet<TabId> = new Set([
  "overview",
  "regime",
  "ofi",
  "gmig",
  "montecarlo",
  "adaptation",
  "markets",
  "features",
  // Found live 2026-07-31: the gates endpoint always evaluated the
  // account-wide auto-detected primary symbol, with no way to pick a
  // different one and no indication in the UI of which symbol it was
  // even showing -- now takes a symbol param (intelligence.py's
  // quant_core_gates), so the selector belongs here like every other
  // per-symbol tab.
  "gates",
  // Found live 2026-07-31, fixed 2026-08-03: /signal-conflict had no symbol
  // param at all despite its own response already self-labeling which
  // symbol it used -- now takes one, same convention as every tab above.
  "conflict",
]);

const TAB_IDS: ReadonlySet<string> = new Set(TABS.map((t) => t.id));

export default function IntelligencePage() {
  // Persisted in the URL (?symbol=&tab=), not component state -- component
  // state resets to the BTC/USDT/"overview" defaults on every remount (e.g.
  // navigating Intelligence -> Execution -> back), the same bug
  // ExecutionPage.tsx's own symbol selector had until 2026-07-30's fix
  // (final_implementation.md §14.2). This page had the identical anti-
  // pattern, just never caught by that pass since it touched ExecutionPage
  // only.
  const [searchParams, setSearchParams] = useSearchParams();

  // Full live crypto + forex/metal universe, same source and pattern
  // ExecutionPage.tsx uses -- this page used to hardcode a 3-symbol list
  // (["BTC/USDT", "EUR/USD", "XAU/USD"]) with no way to pick anything else,
  // even though the account may hold/watch any of the ~90+ real active
  // pairs (owner feedback, 2026-08-02: "ensure intelligence supports all
  // currency pairs... and have a way for users to choose").
  const cryptoSymbols = useQuery({
    queryKey: ["alpaca-crypto-symbols"],
    queryFn: getAlpacaCryptoSymbols,
    staleTime: 60 * 60 * 1000,
  });
  const CRYPTO_SYMBOLS = cryptoSymbols.data?.symbols.length
    ? cryptoSymbols.data.symbols.map((s) => s.symbol)
    : DEFAULT_CRYPTO_SYMBOLS;

  const forexSymbols = useQuery({
    queryKey: ["oanda-forex-symbols"],
    queryFn: getOandaForexSymbols,
    staleTime: 60 * 60 * 1000,
  });
  const FOREX_METAL_SYMBOLS = forexSymbols.data?.symbols.length
    ? forexSymbols.data.symbols.map((s) => s.symbol)
    : DEFAULT_FOREX_METAL_SYMBOLS;

  const ALL_SYMBOLS = [...CRYPTO_SYMBOLS, ...FOREX_METAL_SYMBOLS];
  const [picker, setPicker] = useState<"crypto" | "forex" | null>(null);

  // Persisted in the URL (?symbol=&tab=), not component state -- component
  // state resets to the BTC/USDT/"overview" defaults on every remount (e.g.
  // navigating Intelligence -> Execution -> back), the same bug
  // ExecutionPage.tsx's own symbol selector had until 2026-07-30's fix
  // (final_implementation.md §14.2). This page had the identical anti-
  // pattern, just never caught by that pass since it touched ExecutionPage
  // only.
  // null = AUTO: omit the symbol and let the backend auto-detect the primary
  // symbol server-side (every symbol-scoped endpoint supports this; OFI,
  // Monte Carlo, and Signal Conflict use their dedicated /auto routes).
  const symbolParam = searchParams.get("symbol");
  const symbol: string | null = symbolParam === "auto" ? null : symbolParam || ALL_SYMBOLS[0];
  const tabParam = searchParams.get("tab");
  const tab: TabId = (tabParam && TAB_IDS.has(tabParam) ? tabParam : "overview") as TabId;

  const setSymbol = (next: string | null) =>
    setSearchParams((prev) => {
      const merged = new URLSearchParams(prev);
      merged.set("symbol", next ?? "auto");
      return merged;
    }, { replace: true });
  const setTab = (next: TabId) =>
    setSearchParams((prev) => {
      const merged = new URLSearchParams(prev);
      merged.set("tab", next);
      return merged;
    }, { replace: true });

  const showSelector = SYMBOL_SCOPED.has(tab);

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
          <div className="flex items-center gap-1.5">
            <span className="rounded-md border border-amber-border bg-amber-bg px-3 py-1 text-[11px] font-bold text-amber">
              {symbol ?? "AUTO"}
            </span>
            <button
              onClick={() => setPicker("crypto")}
              className="rounded-md border border-surface-border-strong px-3 py-1 text-[11px] text-text-faint hover:border-text-faint hover:text-text-primary"
            >
              Crypto ▾
            </button>
            <button
              onClick={() => setPicker("forex")}
              className="rounded-md border border-surface-border-strong px-3 py-1 text-[11px] text-text-faint hover:border-text-faint hover:text-text-primary"
            >
              Forex / Metals ▾
            </button>
            <button
              onClick={() => setSymbol(null)}
              title="Let the backend auto-detect the primary symbol"
              className={`rounded-md border px-3 py-1 text-[11px] ${
                symbol === null ? "border-amber-border bg-amber-bg font-bold text-amber" : "border-surface-border-strong text-text-faint"
              }`}
            >
              AUTO
            </button>
          </div>
        )}
        {picker && (
          <SymbolPickerModal
            title={picker === "crypto" ? "Select a crypto pair" : "Select a forex / metals pair"}
            symbols={picker === "crypto" ? CRYPTO_SYMBOLS : FOREX_METAL_SYMBOLS}
            selected={symbol ?? ""}
            onSelect={setSymbol}
            onClose={() => setPicker(null)}
          />
        )}
      </div>

      {tab === "overview" && <OverviewTab symbol={symbol ?? undefined} />}
      {tab === "regime" && <RegimeTab symbol={symbol ?? undefined} />}
      {tab === "ofi" && <OfiTab symbol={symbol ?? undefined} />}
      {tab === "gmig" && <GmigTab symbol={symbol ?? undefined} />}
      {tab === "montecarlo" && <MonteCarloTab symbol={symbol ?? undefined} />}
      {tab === "conflict" && <SignalConflictTab symbol={symbol ?? undefined} />}
      {tab === "adaptation" && <AdaptationTab symbol={symbol ?? undefined} />}
      {tab === "alpha" && <AlphaDarwinTab symbol={symbol ?? undefined} />}
      {tab === "scenarios" && <ScenariosTab symbol={symbol ?? undefined} />}
      {tab === "gates" && <QuantCoreGatesTab symbol={symbol ?? undefined} />}
      {tab === "markets" && <MarketsTab symbol={symbol ?? undefined} />}
      {tab === "features" && <FeaturesTab symbol={symbol ?? undefined} />}
    </div>
  );
}
