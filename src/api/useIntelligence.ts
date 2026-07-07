import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type { CachedIntelligence } from "./intelligence";

// Workplan §3.4: 16 of 38 /intelligence/* routes are worker-cached
// (short Redis TTL, populated on a rolling per-symbol loop by
// app/workers/intelligence_worker.py) — poll these, don't fetch on-demand.
// The other ~16 are computed live per request (real DB + live exchange
// calls) — fetch on-demand with a longer staleTime, not aggressive polling.
const CACHED_REFETCH_INTERVAL_MS = 4000; // within the 3000-5000ms band
const LIVE_STALE_TIME_MS = 20000; // within the 15-30s band

/**
 * For the 16 worker-cached endpoints. The {"error":"not_yet_computed"|
 * "no_market_data"} shape is a normal 200 response (see
 * app/api/v1/endpoints/intelligence.py:_get_worker_cached, which never
 * raises) — it is valid `data`, not a query error. Branch on it with
 * isNotYetComputed()/isNoMarketData() from api/intelligence.ts, never on
 * `query.isError`.
 */
export function useCachedIntelligence<T>(
  queryKey: unknown[],
  queryFn: () => Promise<CachedIntelligence<T>>,
  options: Partial<UseQueryOptions<CachedIntelligence<T>>> = {},
) {
  return useQuery({
    queryKey,
    queryFn,
    refetchInterval: CACHED_REFETCH_INTERVAL_MS,
    ...options,
  });
}

/**
 * For the ~16 live, computed-per-request endpoints. These hit a real DB and
 * sometimes live exchange calls per call (1-3s latency is normal) — fetch
 * on-demand rather than polling, with a staleTime long enough to avoid
 * refetch storms on refocus/remount.
 */
export function useLiveIntelligence<T>(
  queryKey: unknown[],
  queryFn: () => Promise<T>,
  options: Partial<UseQueryOptions<T>> = {},
) {
  return useQuery({
    queryKey,
    queryFn,
    staleTime: LIVE_STALE_TIME_MS,
    refetchOnWindowFocus: false,
    ...options,
  });
}
