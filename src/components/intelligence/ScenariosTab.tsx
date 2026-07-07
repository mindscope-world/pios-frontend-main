import { getScenarios, isNoMarketData, isNotYetComputed } from "../../api/intelligence";
import { useCachedIntelligence } from "../../api/useIntelligence";
import { IntelligenceEmptyState } from "../ui/IntelligenceEmptyState";
import { Card, Loading, Pill, Row } from "./shared";

// Verified against app/services/intelligence/scenarios_service.py's
// compute_scenarios() — worker-cached under "scenarios"
// (/intelligence/scenarios/simulations), auto-detects the primary symbol.
interface ScenarioCard {
  label: string;
  return_val: string;
  probability: number;
  description: string;
  type: string;
}

interface ScenarioStress {
  scenario: string;
  trigger: string;
  pnl: number;
  drawdown: number;
  status: "KILL_SWITCH" | "MANAGED";
}

interface ScenariosPayload {
  error?: string;
  symbol?: string;
  cards: ScenarioCard[];
  stress_tests: ScenarioStress[];
  p5: number | null;
  p50: number | null;
  p95: number | null;
  sim_count: number;
  vol_engine: string;
}

const CARD_TONE: Record<string, "green" | "amber" | "red"> = { bull: "green", base: "amber", bear: "red" };

export function ScenariosTab({ symbol }: { symbol: string }) {
  const scenarios = useCachedIntelligence(["scenarios", symbol], () => getScenarios(symbol));

  const d =
    scenarios.data && !isNotYetComputed(scenarios.data) && !isNoMarketData(scenarios.data)
      ? (scenarios.data as unknown as ScenariosPayload)
      : null;

  return (
    <div className="space-y-4">
      <Card title="Scenario summary" right={d && <Pill tone="blue">{d.sim_count} sims · {d.vol_engine}</Pill>}>
        {scenarios.isPending ? (
          <Loading />
        ) : !d || d.error ? (
          <IntelligenceEmptyState reason={scenarios.data && isNotYetComputed(scenarios.data) ? "not_yet_computed" : "no_market_data"} symbol={symbol} />
        ) : (
          <>
            <Row label="P5" value={d.p5 != null ? `${d.p5}%` : "—"} />
            <Row label="P50" value={d.p50 != null ? `${d.p50}%` : "—"} />
            <Row label="P95" value={d.p95 != null ? `${d.p95}%` : "—"} last />
          </>
        )}
      </Card>

      {d && !d.error && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {d.cards.map((c) => (
              <Card key={c.label} title={c.label} right={<Pill tone={CARD_TONE[c.type] ?? "neutral"}>{c.probability}%</Pill>}>
                <Row label="Return" value={c.return_val} last />
                <p className="mt-2 text-[11px] text-text-faint">{c.description}</p>
              </Card>
            ))}
          </div>

          <Card title="Stress tests">
            {d.stress_tests.length === 0 ? (
              <p className="text-sm text-text-muted">No stress tests computed.</p>
            ) : (
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-[9.5px] uppercase tracking-[.06em] text-text-faint">
                    <th className="py-1 text-left">Scenario</th>
                    <th className="py-1 text-left">Trigger</th>
                    <th className="py-1 text-left">P&L</th>
                    <th className="py-1 text-left">Drawdown</th>
                    <th className="py-1 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {d.stress_tests.map((s, i) => (
                    <tr key={i} className="border-t border-surface-border">
                      <td className="py-1.5 font-semibold text-text-primary">{s.scenario}</td>
                      <td className="py-1.5 text-text-faint">{s.trigger}</td>
                      <td className={`py-1.5 font-mono ${s.pnl < 0 ? "text-red" : "text-green"}`}>${s.pnl.toLocaleString()}</td>
                      <td className="py-1.5 font-mono">{s.drawdown}%</td>
                      <td className="py-1.5">
                        <Pill tone={s.status === "KILL_SWITCH" ? "red" : "green"}>{s.status}</Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
