import { useAuthStore } from "../stores/authStore";
import { refreshOnce } from "../api/client";

// Deliberately NOT the native EventSource API. FRONTEND_GUIDE.md §6.2
// expected these endpoints might need a ?token= query param since
// EventSource can't set headers — verified against the live backend instead:
// both /intelligence/stream and /intelligence/notifications/stream sit
// behind the standard get_current_user dependency (app/core/deps.py), which
// is plain HTTPBearer with NO query-param fallback (unlike the /ws
// endpoint's app/core/ws_auth.py, which explicitly checks both). A `?token=`
// query param on /intelligence/stream returns 403 live. So EventSource
// cannot authenticate to either stream at all — this hand-rolled
// fetch + ReadableStream client is required, not a stylistic choice.

const API_ROOT = `${import.meta.env.VITE_API_BASE_URL as string}/api/v1`;
const RECONNECT_DELAY_MS = 2000;
const AUTH_FAILURE_RETRY_DELAY_MS = 4000;

export interface SSEEvent {
  event: string;
  data: string;
}

type EventHandler = (event: SSEEvent) => void;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRecord(record: string): SSEEvent | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of record.split("\n")) {
    if (line === "" || line.startsWith(":")) continue; // blank/comment
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join("\n") };
}

async function readStream(body: ReadableStream<Uint8Array>, onEvent: EventHandler, signal: AbortSignal) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal.aborted) return;
      const { value, done } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });

      let sepIndex: number;
      while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
        const record = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex + 2);
        const parsed = parseRecord(record);
        if (parsed) onEvent(parsed);
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
}

/**
 * Connects to a backend SSE endpoint with reconnect-with-delay (mimicking
 * native EventSource's auto-reconnect, which we can't use here — see the
 * module comment above) and a refresh-then-retry on 401/403. Returns a
 * cleanup function.
 */
export function connectSSE(path: string, onEvent: EventHandler): () => void {
  const controller = new AbortController();
  let stopped = false;

  async function run() {
    while (!stopped) {
      const token = useAuthStore.getState().accessToken;
      if (!token) {
        await sleep(RECONNECT_DELAY_MS);
        continue;
      }

      try {
        const response = await fetch(`${API_ROOT}${path}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (response.status === 401 || response.status === 403) {
          const newToken = await refreshOnce();
          if (!newToken) await sleep(AUTH_FAILURE_RETRY_DELAY_MS);
          continue;
        }

        if (!response.ok || !response.body) {
          await sleep(RECONNECT_DELAY_MS);
          continue;
        }

        await readStream(response.body, onEvent, controller.signal);
        // Stream ended (server closed it, e.g. a worker restart) — loop to reconnect.
      } catch {
        if (controller.signal.aborted) return;
        // network error — fall through to the reconnect delay below
      }

      if (!stopped) await sleep(RECONNECT_DELAY_MS);
    }
  }

  void run();

  return () => {
    stopped = true;
    controller.abort();
  };
}
