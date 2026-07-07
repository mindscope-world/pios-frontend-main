import type { ReactNode } from "react";
import { useCountUp } from "./useCountUp";

export interface TerminalStat {
  label: string;
  value: number;
  format: (n: number) => string;
  color: string;
}

export function Terminal({
  title,
  lines,
  stats,
  rebooting,
}: {
  title: string;
  lines: ReactNode[];
  stats?: TerminalStat[];
  rebooting?: boolean;
}) {
  return (
    <div className={`auth-terminal ${rebooting ? "auth-reboot" : ""}`} aria-hidden="true">
      <div className="auth-terminal-bar">
        <div className="auth-tb-dot" />
        <div className="auth-tb-dot" />
        <div className="auth-tb-dot" />
        <span className="auth-tb-title">{title}</span>
      </div>
      <div className="auth-terminal-body">
        {lines.map((line, i) => (
          <div className="auth-t-line" style={{ animationDelay: `${i * 90}ms` }} key={i}>
            {line}
          </div>
        ))}
      </div>
      {stats && (
        <div className="auth-terminal-stats">
          {stats.map((s) => (
            <StatCell key={s.label} stat={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCell({ stat }: { stat: TerminalStat }) {
  const value = useCountUp(stat.value, 500);
  return (
    <div className="auth-ts">
      <div className="auth-ts-val" style={{ color: stat.color }}>
        {stat.format(value)}
      </div>
      <div className="auth-ts-lbl">{stat.label}</div>
    </div>
  );
}
