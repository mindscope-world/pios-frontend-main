import { useState } from "react";
import { getFeatures, isNoMarketData, isNotYetComputed } from "../../api/intelligence";
import { useCachedIntelligence } from "../../api/useIntelligence";
import { IntelligenceEmptyState } from "../ui/IntelligenceEmptyState";
import { Card, Loading, Pill, Row } from "./shared";

// Mirrors features_service.compute_features()'s return dict — the ML feature
// store snapshot (OFI / Volatility / Regime / Portfolio groups), worker-cached
// under the "features" key. The endpoint's server-side `category` filter isn't
// reachable through the worker cache (it caches the unfiltered set), so the
// category chips below filter client-side — same result, no extra round trip.
interface FeatureItem {
  id: string;
  name: string;
  category: string;
  value: number;
  unit: string;
  importance: number;
  drift_pct: number;
  updated_at: string;
}

interface FeaturesPayload {
  error?: string;
  features: FeatureItem[];
  count: number;
  primary_symbol: string | null;
  live_price: number | null;
  market_bias: string | null;
  categories: string[];
  top_features: FeatureItem[];
  fetched_at: string;
}

const BIAS_TONE: Record<string, "green" | "red" | "amber"> = {
  BULLISH: "green",
  BEARISH: "red",
  NEUTRAL: "amber",
};

function DriftBadge({ drift }: { drift: number }) {
  if (Math.abs(drift) < 0.5) return <span className="text-text-ghost">stable</span>;
  return <span className={drift > 0 ? "text-amber" : "text-blue"}>{drift > 0 ? "+" : ""}{drift}%</span>;
}

export function FeaturesTab({ symbol }: { symbol?: string }) {
  const label = symbol ?? "auto";
  const [category, setCategory] = useState<string | null>(null);
  const features = useCachedIntelligence(["features", label], () => getFeatures(symbol));

  const payloadError = (features.data as { error?: string } | undefined)?.error;
  const f =
    features.data && !isNotYetComputed(features.data) && !isNoMarketData(features.data) && !payloadError
      ? (features.data as unknown as FeaturesPayload)
      : null;

  const visible = f ? (category ? f.features.filter((x) => x.category === category) : f.features) : [];

  return (
    <div className="space-y-4">
      <Card
        title={`Feature store · ${f?.primary_symbol ?? label}`}
        right={
          f?.market_bias && (
            <span className="flex items-center gap-1.5">
              {f.live_price != null && <span className="font-mono text-[10.5px] text-text-faint">{f.live_price.toLocaleString()}</span>}
              <Pill tone={BIAS_TONE[f.market_bias] ?? "neutral"}>{f.market_bias}</Pill>
            </span>
          )
        }
      >
        {features.isPending ? (
          <Loading />
        ) : !f ? (
          payloadError ? (
            <p className="text-sm text-text-muted">Feature computation failed server-side: {payloadError}</p>
          ) : (
            <IntelligenceEmptyState
              reason={features.data && isNotYetComputed(features.data) ? "not_yet_computed" : "no_market_data"}
              symbol={symbol}
            />
          )
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-1.5">
              <button
                onClick={() => setCategory(null)}
                className={`rounded-md border px-2.5 py-1 text-[10.5px] font-semibold ${
                  category === null ? "border-blue-border bg-blue-bg text-blue" : "border-surface-border-strong text-text-faint"
                }`}
              >
                All ({f.count})
              </button>
              {f.categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-md border px-2.5 py-1 text-[10.5px] font-semibold ${
                    category === c ? "border-blue-border bg-blue-bg text-blue" : "border-surface-border-strong text-text-faint"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {visible.length === 0 ? (
              <p className="text-sm text-text-muted">No features in this category right now.</p>
            ) : (
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-[9.5px] uppercase tracking-[.06em] text-text-faint">
                    <th className="py-1 text-left">Feature</th>
                    <th className="py-1 text-left">Category</th>
                    <th className="py-1 text-right">Value</th>
                    <th className="py-1 text-right">Importance</th>
                    <th className="py-1 text-right">Drift</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((x) => (
                    <tr key={x.id} className="border-t border-surface-border">
                      <td className="py-1.5 font-semibold text-text-primary">{x.name}</td>
                      <td className="py-1.5 text-text-faint">{x.category}</td>
                      <td className="py-1.5 text-right font-mono">
                        {x.value.toLocaleString()} <span className="text-text-ghost">{x.unit}</span>
                      </td>
                      <td className="py-1.5 text-right font-mono">
                        <span className="inline-block h-1.5 w-14 overflow-hidden rounded-full bg-surface-overlay align-middle">
                          <span
                            className="block h-full rounded-full bg-blue"
                            style={{ width: `${Math.min(100, x.importance * 100)}%` }}
                          />
                        </span>
                        <span className="ml-1.5">{x.importance}</span>
                      </td>
                      <td className="py-1.5 text-right font-mono">
                        <DriftBadge drift={x.drift_pct} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </Card>

      {f && f.top_features.length > 0 && (
        <Card title="Top features by importance">
          <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
            {f.top_features.map((x, i) => (
              <Row
                key={x.id}
                label={`${i + 1}. ${x.name}`}
                value={`${x.value.toLocaleString()} ${x.unit} · imp ${x.importance}`}
                last={i >= f.top_features.length - 2}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
