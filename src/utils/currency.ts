// A value that's nonzero but rounds away at 2 decimals ($0.00) is
// indistinguishable from a genuinely-zero or stuck value. The
// mark-to-market job (backend app/services/position_marks.py) can
// legitimately produce real unrealized P&L in the sub-cent range --
// a near-breakeven position, or a dust-sized qty -- so silently
// rounding it to "0.00" reads as broken when it isn't. Falls back to
// enough precision to show the value is real instead of hiding it.
export function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return "0.00";
  const abs = Math.abs(value);
  if (abs !== 0 && abs < 0.005) {
    const precise = abs.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
    return `${value < 0 ? "-" : ""}${precise}`;
  }
  return value.toFixed(2);
}
