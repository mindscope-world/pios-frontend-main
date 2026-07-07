import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBroker } from "../../api/brokers";
import { ApiError } from "../../api/client";
import { supportsLiveTrading, type BrokerType } from "../../api/types";

const BROKER_TYPES: BrokerType[] = ["ALPACA", "BINANCE", "CCXT", "IBKR", "OANDA", "LMAX", "MT5", "CUSTOM"];

/**
 * POST /brokers. Only ALPACA/BINANCE/CCXT have a real adapter
 * (app/services/broker_service.py ADAPTER_MAP) — every other broker_type
 * gets 422 UnsupportedBrokerError unless is_paper=true. Disable the live
 * toggle client-side for those types instead of letting the user hit that
 * 422 (FRONTEND_GUIDE.md §5).
 */
export function BrokerFormModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [brokerType, setBrokerType] = useState<BrokerType>("ALPACA");
  const [exchangeId, setExchangeId] = useState("");
  const [isPaper, setIsPaper] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [accountId, setAccountId] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [clientId, setClientId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const liveCapable = supportsLiveTrading(brokerType);
  const effectiveIsPaper = liveCapable ? isPaper : true;

  const create = useMutation({
    mutationFn: () =>
      createBroker({
        name: name.trim(),
        broker_type: brokerType,
        exchange_id: exchangeId.trim() || null,
        is_paper: effectiveIsPaper,
        credentials: {
          api_key: apiKey.trim() || null,
          api_secret: apiSecret.trim() || null,
          account_id: accountId.trim() || null,
          passphrase: passphrase.trim() || null,
          host: host.trim() || null,
          port: port.trim() ? Number(port) : null,
          client_id: clientId.trim() ? Number(clientId) : null,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brokers"] });
      onClose();
    },
    onError: (err) => {
      const detail = err instanceof ApiError ? (err.body as { detail?: string } | null)?.detail ?? err.message : "Broker creation failed.";
      setError(detail);
    },
  });

  const canSubmit = name.trim().length > 0 && !create.isPending;

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-[460px] overflow-y-auto rounded-[13px] border border-surface-border-strong bg-surface-overlay p-6">
        <h3 className="mb-4 font-[family-name:var(--font-cond)] text-lg font-bold text-text-primary">Add broker connection</h3>

        <div className="space-y-3">
          <LabeledInput label="Name" value={name} onChange={setName} placeholder="e.g. Alpaca — paper" />

          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Broker type</label>
            <select
              value={brokerType}
              onChange={(e) => setBrokerType(e.target.value as BrokerType)}
              className="w-full rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none"
            >
              {BROKER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                  {!supportsLiveTrading(t) ? " (simulated fills only)" : ""}
                </option>
              ))}
            </select>
          </div>

          {brokerType === "CCXT" && <LabeledInput label="Exchange id (ccxt)" value={exchangeId} onChange={setExchangeId} placeholder="e.g. binance, kraken" />}

          <div className="flex items-center gap-2 rounded-md border border-surface-border bg-surface-raised px-3 py-2">
            <input
              type="checkbox"
              id="is_paper"
              checked={effectiveIsPaper}
              disabled={!liveCapable}
              onChange={(e) => setIsPaper(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            <label htmlFor="is_paper" className="text-xs text-text-muted">
              Paper trading (simulated fills)
            </label>
          </div>
          {!liveCapable && (
            <p className="text-[10.5px] leading-relaxed text-amber">
              {brokerType} has no real adapter — connections are forced to paper/simulated fills, live trading is not available for this
              broker type.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <LabeledInput label="API key" value={apiKey} onChange={setApiKey} type="password" />
            <LabeledInput label="API secret" value={apiSecret} onChange={setApiSecret} type="password" />
            <LabeledInput label="Account id" value={accountId} onChange={setAccountId} />
            <LabeledInput label="Passphrase" value={passphrase} onChange={setPassphrase} type="password" />
            {brokerType === "IBKR" && (
              <>
                <LabeledInput label="Host" value={host} onChange={setHost} placeholder="127.0.0.1" />
                <LabeledInput label="Port" value={port} onChange={setPort} placeholder="7497" />
                <LabeledInput label="Client id" value={clientId} onChange={setClientId} />
              </>
            )}
          </div>

          {error && <p className="text-xs text-red">{error}</p>}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            disabled={create.isPending}
            className="flex-1 rounded-lg border border-surface-border-strong px-4 py-2 text-[11.5px] font-semibold text-text-faint hover:border-text-faint"
          >
            Cancel
          </button>
          <button
            onClick={() => create.mutate()}
            disabled={!canSubmit}
            className="flex-1 rounded-lg border border-green-border bg-green-bg px-4 py-2 text-[11.5px] font-semibold text-green disabled:cursor-not-allowed disabled:opacity-50"
          >
            {create.isPending ? "Creating…" : "Add broker"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-text-muted">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
        autoComplete="off"
      />
    </div>
  );
}
