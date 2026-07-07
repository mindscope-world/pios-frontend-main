import { LIFECYCLE_ORDER, type LifecycleStage } from "../../api/strategies";

export function LifecycleStepper({ stage }: { stage: LifecycleStage }) {
  const currentIdx = LIFECYCLE_ORDER.indexOf(stage);

  return (
    <div className="flex items-center overflow-x-auto">
      {LIFECYCLE_ORDER.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={s} className="flex flex-shrink-0 items-center">
            <div
              className={`whitespace-nowrap rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.04em] ${
                active
                  ? "border-blue-border bg-blue-bg text-blue"
                  : done
                    ? "border-green-border bg-green-bg text-green"
                    : "border-surface-border-strong text-text-faint"
              }`}
            >
              {s}
            </div>
            {i < LIFECYCLE_ORDER.length - 1 && <div className={`h-px w-5 flex-shrink-0 ${done ? "bg-green-border" : "bg-surface-border-strong"}`} />}
          </div>
        );
      })}
    </div>
  );
}
