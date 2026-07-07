import type { ReactNode } from "react";

// Shared layout primitives for the Intelligence tab screens — factored out
// once the same card/row/pill markup started repeating across Regime, OFI,
// GMIG, Monte Carlo, Signal Conflict, Adaptation, Alpha/Darwin, Scenarios,
// and Quant-Core Gates.

export function Card({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-[10px] border border-surface-border bg-surface-raised">
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
        <span className="text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">{title}</span>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function Row({ label, value, last }: { label: string; value: ReactNode; last?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 py-1.5 text-[11.5px] ${last ? "" : "border-b border-surface-border"}`}>
      <span className="text-text-faint">{label}</span>
      <span className="text-right font-semibold text-text-primary">{value}</span>
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "green" | "red" | "amber" | "blue" | "neutral" }) {
  const cls = {
    green: "bg-green-bg text-green border-green-border",
    red: "bg-red-bg text-red border-red-border",
    amber: "bg-amber-bg text-amber border-amber-border",
    blue: "bg-blue-bg text-blue border-blue-border",
    neutral: "bg-surface-overlay text-text-faint border-surface-border-strong",
  }[tone];
  return <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${cls}`}>{children}</span>;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return <p className="text-sm text-text-muted">{children}</p>;
}

export function Loading() {
  return <p className="text-sm text-text-muted">Loading…</p>;
}
