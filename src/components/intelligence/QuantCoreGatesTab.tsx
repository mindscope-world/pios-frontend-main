import { useQuery } from "@tanstack/react-query";
import { getQuantCoreGates } from "../../api/intelligence";
import { NullableNumber } from "../ui/NullableNumber";
import { Card, Loading, Pill } from "./shared";

export function QuantCoreGatesTab() {
  const gates = useQuery({
    queryKey: ["quant-core-gates"],
    queryFn: getQuantCoreGates,
    staleTime: 20000,
    refetchInterval: 20000,
  });

  const list = gates.data ?? [];

  return (
    <Card title="Quant Core — 8-gate pipeline" right={list.length > 0 && <Pill tone={list.every((g) => g.passed) ? "green" : "amber"}>{list.filter((g) => g.passed).length}/{list.length} passed</Pill>}>
      {gates.isPending ? (
        <Loading />
      ) : list.length === 0 ? (
        <p className="text-sm text-text-muted">No primary symbol configured yet — the gate pipeline has nothing to evaluate.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-4">
          {list.map((g) => (
            <div key={g.id} className="rounded-md border border-surface-border p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-text-primary">{g.label}</span>
                <Pill tone={g.passed ? "green" : "red"}>{g.status}</Pill>
              </div>
              <div className="text-[10.5px] text-text-faint">
                {g.type === "confidence" ? <NullableNumber value={g.value} suffix="%" /> : g.value ?? "—"}
              </div>
              <p className="mt-1 text-[10px] text-text-ghost">{g.detail}</p>
              <p className="mt-1 text-[9.5px] text-text-ghost">{g.latency_ms}ms</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
