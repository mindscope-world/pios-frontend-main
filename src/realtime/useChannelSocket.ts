import { useEffect, useRef } from "react";
import { channelSocket, type ChannelMessage } from "./channelSocket";

/**
 * Declarative subscription to one (channel, symbol) pair over the single
 * shared /api/v1/ws connection. Multiple components/screens can each call
 * this independently — they multiplex over one physical socket instead of
 * opening one per component (FRONTEND_GUIDE.md §6.1).
 *
 * symbol is optional: several channels are account/global-scoped rather than
 * per-symbol (e.g. command_center, risk_metrics, positions) — omit it and
 * the manager subscribes with symbol "" to match.
 */
export function useChannelSocket(
  channel: string,
  symbol: string | undefined,
  onMessage: (message: ChannelMessage) => void,
) {
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    return channelSocket.subscribe(channel, symbol, (msg) => handlerRef.current(msg));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, symbol]);
}
