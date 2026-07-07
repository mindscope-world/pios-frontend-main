import { getAlphaDarwin, getAlphaState, isNoMarketData, isNotYetComputed } from "../../api/intelligence";
import { useCachedIntelligence } from "../../api/useIntelligence";
import { NullableNumber } from "../ui/NullableNumber";
import { Card, Loading, Pill, Row } from "./shared";

// Verified against app/services/alpha_service.py's
// compute_alpha_factory_state()/compute_alpha_darwin() return shapes
// exactly. Both are worker-cached and computed for intelligence_worker.py's
// hardcoded system_user (Strategy.created_by == system_user.id) — this is
// real, running Darwin evolution data, just not scoped to the logged-in
// trader's own strategies.
interface AlphaEngine {
  id: string;
  name: string;
  status: "QUEUED" | "TRAINING" | "IDLE" | "ERROR";
  progress_pct: number;
  progress_label: string;
  sharpe: number | null;
}

interface AlphaStatePayload {
  next_prune_at: string;
  active_alphas: number;
  prune_threshold_sharpe: number;
  engines: AlphaEngine[];
  champion: { name: string | null; sharpe: number | null; fitness: number | null; stage: string | null };
  backtest_stats_30d: { total_runs: number; passed: number; pass_rate_pct: number; avg_sharpe: number };
}

interface DarwinCandidate {
  rank: number;
  id: string;
  name: string;
  version: string;
  generation: number;
  lifecycle_stage: string;
  sharpe: number;
  fitness_score: number;
  max_dd: number;
  win_rate: number;
  status: "CHAMPION" | "CHALLENGER" | "PROBATION" | "RETIRED";
}

const STATUS_TONE: Record<string, "green" | "amber" | "red" | "blue" | "neutral"> = {
  CHAMPION: "green",
  CHALLENGER: "blue",
  PROBATION: "amber",
  RETIRED: "neutral",
  QUEUED: "neutral",
  TRAINING: "amber",
  IDLE: "neutral",
  ERROR: "red",
};

export function AlphaDarwinTab({ symbol }: { symbol: string }) {
  const state = useCachedIntelligence(["alpha-state", symbol], () => getAlphaState(symbol));
  const darwin = useCachedIntelligence(["alpha-darwin", symbol], () => getAlphaDarwin(symbol));

  const s =
    state.data && !isNotYetComputed(state.data) && !isNoMarketData(state.data) ? (state.data as unknown as AlphaStatePayload) : null;
  const candidates: DarwinCandidate[] =
    darwin.data && !isNotYetComputed(darwin.data) && !isNoMarketData(darwin.data) ? (darwin.data as unknown as DarwinCandidate[]) : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Alpha Factory state">
          {state.isPending ? (
            <Loading />
          ) : !s ? (
            <p className="text-sm text-text-muted">No alpha factory data yet.</p>
          ) : (
            <>
              <Row label="Active alphas" value={s.active_alphas} />
              <Row label="Prune threshold (Sharpe)" value={s.prune_threshold_sharpe} />
              <Row label="Next prune" value={new Date(s.next_prune_at).toLocaleString()} />
              <Row
                label="30d backtests"
                value={`${s.backtest_stats_30d.passed}/${s.backtest_stats_30d.total_runs} passed (${s.backtest_stats_30d.pass_rate_pct}%)`}
              />
              <Row label="30d avg Sharpe" value={s.backtest_stats_30d.avg_sharpe} last />
            </>
          )}
        </Card>

        <Card title="Champion strategy">
          {state.isPending ? (
            <Loading />
          ) : !s || !s.champion.name ? (
            <p className="text-sm text-text-muted">No champion strategy yet.</p>
          ) : (
            <>
              <Row label="Name" value={s.champion.name} />
              <Row label="Sharpe" value={<NullableNumber value={s.champion.sharpe} />} />
              <Row label="Fitness" value={<NullableNumber value={s.champion.fitness} />} />
              <Row label="Stage" value={s.champion.stage ?? "—"} last />
            </>
          )}
        </Card>
      </div>

      <Card title="Darwin leaderboard">
        {darwin.isPending ? (
          <Loading />
        ) : candidates.length === 0 ? (
          <p className="text-sm text-text-muted">No Darwin candidates yet.</p>
        ) : (
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-[9.5px] uppercase tracking-[.06em] text-text-faint">
                <th className="py-1 text-left">#</th>
                <th className="py-1 text-left">Strategy</th>
                <th className="py-1 text-left">Gen</th>
                <th className="py-1 text-left">Sharpe</th>
                <th className="py-1 text-left">Fitness</th>
                <th className="py-1 text-left">Max DD</th>
                <th className="py-1 text-left">Win rate</th>
                <th className="py-1 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.id} className="border-t border-surface-border">
                  <td className="py-1.5 font-mono text-text-faint">{c.rank}</td>
                  <td className="py-1.5 font-semibold text-text-primary">
                    {c.name} <span className="text-text-faint">v{c.version}</span>
                  </td>
                  <td className="py-1.5">{c.generation}</td>
                  <td className="py-1.5 font-mono">{c.sharpe}</td>
                  <td className="py-1.5 font-mono">{c.fitness_score}</td>
                  <td className="py-1.5 font-mono">{c.max_dd}%</td>
                  <td className="py-1.5 font-mono">{(c.win_rate * 100).toFixed(0)}%</td>
                  <td className="py-1.5">
                    <Pill tone={STATUS_TONE[c.status] ?? "neutral"}>{c.status}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
