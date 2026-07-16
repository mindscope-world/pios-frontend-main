import { useMemo, useState } from "react";
import type { TickerSnapshot } from "../../api/market";

/**
 * Category symbol picker for the Execution page — opened from the "Crypto" /
 * "Forex / Metals" buttons, replacing the old 38-chip wall. Lists every pair
 * in the category with a search filter; picking one selects it and closes.
 * Same overlay pattern as CancelOrderModal/BrokerDetailModal.
 */
export function SymbolPickerModal({
  title,
  symbols,
  selected,
  onSelect,
  onClose,
  snapshotFor,
}: {
  title: string;
  symbols: string[];
  selected: string;
  onSelect: (symbol: string) => void;
  onClose: () => void;
  snapshotFor: (symbol: string) => TickerSnapshot | undefined;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    return q ? symbols.filter((s) => s.toUpperCase().includes(q)) : symbols;
  }, [symbols, search]);

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex max-h-[70vh] w-full max-w-[520px] flex-col rounded-[13px] border border-surface-border-strong bg-surface-overlay p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-[family-name:var(--font-cond)] text-lg font-bold text-text-primary">{title}</h3>
          <button onClick={onClose} className="rounded px-2 py-0.5 text-sm text-text-faint hover:text-text-primary" aria-label="Close">
            ✕
          </button>
        </div>
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search pairs…"
          className="mb-3 w-full rounded-lg border border-surface-border-strong bg-surface-raised px-3 py-2 text-[12px] text-text-primary placeholder:text-text-ghost focus:border-blue-border focus:outline-none"
        />
        <div className="grid flex-1 grid-cols-2 content-start gap-1.5 overflow-y-auto pr-1 sm:grid-cols-3">
          {filtered.map((s) => {
            const snap = snapshotFor(s);
            return (
              <button
                key={s}
                onClick={() => {
                  onSelect(s);
                  onClose();
                }}
                className={`rounded-md border px-3 py-2 text-left text-[11.5px] ${
                  s === selected ? "border-blue-border bg-blue-bg font-bold text-blue" : "border-surface-border-strong text-text-faint hover:border-text-faint hover:text-text-primary"
                }`}
              >
                {s}
                {snap && (
                  <span className="mt-0.5 block font-mono text-[9.5px] font-normal">
                    {snap.price.toLocaleString()}{" "}
                    <span className={snap.change_pct >= 0 ? "text-green" : "text-red"}>
                      {snap.change_pct >= 0 ? "+" : ""}
                      {snap.change_pct}%
                    </span>
                  </span>
                )}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-full py-6 text-center text-sm text-text-muted">No pairs match "{search}".</p>
          )}
        </div>
      </div>
    </div>
  );
}
