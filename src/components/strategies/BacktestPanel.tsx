import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listBacktestJobs, submitBacktest, type BacktestJobOut, type CostModel } from "../../api/strategies";
import { ApiError } from "../../api/client";
import { NullableNumber } from "../../components/ui/NullableNumber";

const COST_MODELS: CostModel[] = ["FULL", "ZERO_COST", "FEES_ONLY", "SLIPPAGE_ONLY"];

const STATUS_CLS: Record<string, string> = {
  QUEUED: "bg-surface-overlay text-text-faint border-surface-border-strong",
  RUNNING: "bg-amber-bg text-amber border-amber-border",
  COMPLETE: "bg-green-bg text-green border-green-border",
  FAILED: "bg-red-bg text-red border-red-border",
};

function hasActiveJob(jobs: BacktestJobOut[] | undefined) {
  return !!jobs?.some((j) => j.status === "QUEUED" || j.status === "RUNNING");
}

export function BacktestPanel({ strategyId }: { strategyId: string }) {
  const queryClient = useQueryClient();
  const jobs = useQuery({
    queryKey: ["backtest-jobs", strategyId],
    queryFn: () => listBacktestJobs(strategyId),
    refetchInterval: (query) => (hasActiveJob(query.state.data) ? 4000 : false),
  });

  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(fmt(oneYearAgo));
  const [endDate, setEndDate] = useState(fmt(today));
  const [symbolsInput, setSymbolsInput] = useState("BTC/USDT");
  const [costModel, setCostModel] = useState<CostModel>("FULL");
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: () =>
      submitBacktest(strategyId, {
        start_date: startDate,
        end_date: endDate,
        symbols: symbolsInput.split(",").map((s) => s.trim()).filter(Boolean),
        cost_model: costModel,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backtest-jobs", strategyId] });
      setError(null);
    },
    onError: (err) => setError(err instanceof ApiError ? (err.body as { detail?: string } | null)?.detail ?? err.message : "Backtest submission failed."),
  });

  const canSubmit = startDate && endDate && symbolsInput.trim().length > 0 && !submit.isPending;

  return (
    <div className="rounded-[10px] border border-surface-border bg-surface-raised">
      <div className="border-b border-surface-border px-4 py-3 text-[10.5px] font-bold uppercase tracking-[.08em] text-text-faint">
        Backtests
      </div>

      <div className="grid grid-cols-2 gap-2.5 p-4 md:grid-cols-5">
        <div>
          <label className="mb-1 block text-[10px] text-text-muted">Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-md border border-surface-border-strong bg-surface-card px-2 py-1 text-[11px] text-text-primary outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-text-muted">End date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-md border border-surface-border-strong bg-surface-card px-2 py-1 text-[11px] text-text-primary outline-none"
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-[10px] text-text-muted">Symbols (comma-separated)</label>
          <input
            value={symbolsInput}
            onChange={(e) => setSymbolsInput(e.target.value)}
            className="w-full rounded-md border border-surface-border-strong bg-surface-card px-2 py-1 text-[11px] text-text-primary outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-text-muted">Cost model</label>
          <select
            value={costModel}
            onChange={(e) => setCostModel(e.target.value as CostModel)}
            className="w-full rounded-md border border-surface-border-strong bg-surface-card px-2 py-1 text-[11px] text-text-primary outline-none"
          >
            {COST_MODELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 pb-3">
        <button
          onClick={() => submit.mutate()}
          disabled={!canSubmit}
          className="rounded-lg border border-blue-border bg-blue-bg px-4 py-1.5 text-[11px] font-semibold text-blue disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submit.isPending ? "Submitting…" : "Run backtest"}
        </button>
        {error && <span className="text-[10.5px] text-red">{error}</span>}
      </div>

      {jobs.isPending ? (
        <p className="border-t border-surface-border p-4 text-sm text-text-muted">Loading…</p>
      ) : !jobs.data || jobs.data.length === 0 ? (
        <p className="border-t border-surface-border p-4 text-sm text-text-muted">No backtests submitted yet.</p>
      ) : (
        <div className="border-t border-surface-border">
          {jobs.data.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

function JobRow({ job }: { job: BacktestJobOut }) {
  // react-query's structural sharing keeps the same `data` reference across
  // polls when an unchanged QUEUED job comes back identical — this component
  // then never re-renders on its own, so a naive Date.now() computed only at
  // render time would freeze at whatever age it happened to be on the last
  // real render (e.g. right after submission) and never flip to "stuck" as
  // real time passes. Force a local re-render every 5s while still queued so
  // the age actually advances on screen.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (job.status !== "QUEUED") return;
    const id = setInterval(() => forceTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, [job.status]);

  const ageSeconds = (Date.now() - new Date(job.created_at).getTime()) / 1000;
  const likelyStuck = job.status === "QUEUED" && ageSeconds > 15;

  return (
    <div className="border-b border-surface-border p-4 text-[11.5px] last:border-0">
      <div className="mb-2 flex flex-wrap items-center gap-2.5">
        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${STATUS_CLS[job.status]}`}>{job.status}</span>
        <span className="text-text-faint">
          {job.start_date} → {job.end_date} · {job.cost_model}
        </span>
        {job.status === "RUNNING" && <span className="text-amber">{job.progress_pct}%</span>}
        <span className="ml-auto text-[10px] text-text-ghost">{new Date(job.created_at).toLocaleString()}</span>
      </div>

      {likelyStuck && (
        <p className="mb-2 text-[10.5px] text-amber">
          Still queued after {Math.round(ageSeconds)}s — this usually means no Celery backtest worker is currently
          running to pick it up, not that anything is wrong with the request.
        </p>
      )}

      {job.status === "COMPLETE" && (
        <div className="grid grid-cols-3 gap-2.5 md:grid-cols-6">
          <Metric label="Sharpe" value={<NullableNumber value={job.sharpe_ratio} />} />
          <Metric label="Max DD" value={job.max_drawdown != null ? `${job.max_drawdown}%` : "—"} />
          <Metric label="Return" value={job.total_return != null ? `${job.total_return}%` : "—"} />
          <Metric label="Trades" value={job.trade_count ?? "—"} />
          <Metric label="Win rate" value={job.win_rate != null ? `${job.win_rate}%` : "—"} />
          <Metric label="Profit factor" value={<NullableNumber value={job.profit_factor} />} />
        </div>
      )}

      {job.status === "FAILED" && job.error_message && <p className="text-[10.5px] text-red">{job.error_message}</p>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[.05em] text-text-ghost">{label}</div>
      <div className="font-mono text-text-primary">{value}</div>
    </div>
  );
}
