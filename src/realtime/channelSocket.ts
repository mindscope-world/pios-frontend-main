import { useAuthStore } from "../stores/authStore";
import { refreshOnce } from "../api/client";

// Backend contract, verified against app/api/v1/endpoints/websocket.py,
// app/core/ws_auth.py, app/services/websocket/manager.py, app/core/pubsub.py:
//
// - Auth: ws.accept() happens before the auth check, then the server reads
//   ?token=<jwt> (query param) or an Authorization: Bearer header. Browser
//   WebSocket can't set headers, so we always use the query param.
// - Protocol: {"type":"subscribe","channel":...,"symbol":...} -> server acks
//   {"type":"subscribed",...} then pushes raw channel data. {"type":"ping"}
//   -> {"type":"pong"}. There is NO "unsubscribe" message — the server only
//   ever drops a socket from every (channel,symbol) bucket it's in when the
//   whole connection closes (manager.disconnect in the endpoint's finally).
// - Message tagging: only the market_ticks/market_candles channels are
//   re-wrapped by pubsub.py into a self-tagging envelope
//   ({"channel":"ticks"|"candles","type":...,...}) before being pushed. Every
//   other one of the 32 channels is broadcast as the raw dict the publisher
//   put on Redis, with NO channel/symbol tag on the wire. That means if two
//   *different* channels are both subscribed for the *same* symbol on this
//   one shared connection, an incoming untagged message can't be routed to
//   the "correct" one with certainty — we fall back to fanning it out to
//   every listener registered for that symbol, and rely on each consumer to
//   defensively check the fields it expects. This is a real backend
//   limitation (see dispatch() below), not a client bug.

export type ChannelMessage = Record<string, unknown> & {
  channel?: string;
  symbol?: string;
  type?: string;
};

type Listener = (message: ChannelMessage) => void;

const WS_ROOT = `${import.meta.env.VITE_WS_BASE_URL as string}/api/v1/ws`;
const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 15000, 30000];
const PING_INTERVAL_MS = 20000;

function normalizeSymbol(symbol?: string | null): string {
  return (symbol ?? "").replace(/\//g, "").toUpperCase();
}

function subscriptionKey(channel: string, symbol?: string | null): string {
  return `${channel}:${normalizeSymbol(symbol)}`;
}

function splitKey(key: string): [string, string] {
  const idx = key.indexOf(":");
  return [key.slice(0, idx), key.slice(idx + 1)];
}

class ChannelSocketManager {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<Listener>>();
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private connecting = false;

  constructor() {
    // A logout must tear down the socket immediately — this is a trading
    // terminal, an authenticated push connection shouldn't outlive the
    // session it was opened under.
    useAuthStore.subscribe((state, prevState) => {
      if (!state.accessToken && prevState.accessToken) {
        this.teardown();
      }
    });
  }

  subscribe(channel: string, symbol: string | undefined, listener: Listener): () => void {
    const key = subscriptionKey(channel, symbol);
    let set = this.listeners.get(key);
    const isNewKey = !set;
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(listener);

    this.ensureConnected();
    if (isNewKey && this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscribe(channel, symbol);
    }

    return () => {
      set!.delete(listener);
      if (set!.size === 0) {
        this.listeners.delete(key);
      }
    };
  }

  private sendSubscribe(channel: string, symbol?: string) {
    this.ws?.send(JSON.stringify({ type: "subscribe", channel, symbol: symbol ?? "" }));
  }

  private ensureConnected() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    if (this.connecting) return;
    const token = useAuthStore.getState().accessToken;
    if (!token) return; // nothing to connect for until a session exists
    this.connect(token);
  }

  private connect(token: string) {
    this.connecting = true;
    const ws = new WebSocket(`${WS_ROOT}?token=${encodeURIComponent(token)}`);
    this.ws = ws;

    ws.addEventListener("open", () => {
      this.connecting = false;
      this.reconnectAttempt = 0;
      // A fresh connection has no memory of the previous one's server-side
      // subscriptions — re-issue "subscribe" for everything we're tracking.
      for (const key of this.listeners.keys()) {
        const [channel, symbol] = splitKey(key);
        this.sendSubscribe(channel, symbol);
      }
      this.startPing();
    });

    ws.addEventListener("message", (event) => this.dispatch(event.data));

    ws.addEventListener("close", (event) => {
      this.connecting = false;
      this.stopPing();
      if (this.ws !== ws) return; // superseded by a newer connection/teardown
      this.ws = null;
      if (event.code === 1008) {
        // ws_auth.py: missing/invalid/expired token — refresh before retrying.
        void this.reconnectAfterAuthFailure();
        return;
      }
      this.scheduleReconnect();
    });

    ws.addEventListener("error", () => {
      // "close" always follows "error" for browser WebSocket — let close retry.
    });
  }

  private async reconnectAfterAuthFailure() {
    const newToken = await refreshOnce();
    if (!newToken) return; // refresh failed — user needs to log in again
    this.scheduleReconnect();
  }

  private scheduleReconnect() {
    if (this.listeners.size === 0) return; // nothing active to reconnect for
    const delay = RECONNECT_DELAYS_MS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)];
    this.reconnectAttempt += 1;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.ensureConnected(), delay);
  }

  private startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, PING_INTERVAL_MS);
  }

  private stopPing() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  private dispatch(raw: string) {
    let msg: ChannelMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (msg.type === "subscribed" || msg.type === "pong") return;

    if (typeof msg.channel === "string") {
      // Self-tagged (ticks/candles) — route exactly.
      this.listeners.get(subscriptionKey(msg.channel, msg.symbol))?.forEach((fn) => fn(msg));
      return;
    }

    // Untagged — best-effort fan-out to every channel subscribed for this
    // symbol (see the class-level comment above for why this is the best a
    // client can do without a backend wire-format change).
    const symbol = normalizeSymbol(msg.symbol as string | undefined);
    const suffix = `:${symbol}`;
    for (const [key, set] of this.listeners) {
      if (key.endsWith(suffix)) set.forEach((fn) => fn(msg));
    }
  }

  private teardown() {
    this.stopPing();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.ws?.close();
    this.ws = null;
    this.listeners.clear();
    this.reconnectAttempt = 0;
  }
}

export const channelSocket = new ChannelSocketManager();
