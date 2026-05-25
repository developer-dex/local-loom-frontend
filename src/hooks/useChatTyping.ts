/**
 * React hook that wires the chat input box to the typing-indicator protocol.
 *
 * Encapsulates two pieces of behaviour required by the chat module:
 *
 *  - **Sliding-window throttle** (Req 12.1, 20.4): at most 5 `chat:typing`
 *    events per second per conversation. Excess emits are dropped locally
 *    without contacting the server.
 *  - **Idle stop-typing timer** (Req 12.2): 3 seconds after the last
 *    `onChangeText` call, a `chat:stop-typing` event is emitted.
 *  - **Explicit stop on send/navigate-away** (Req 12.3): callers invoke
 *    {@link emitStopTyping} when the user sends a message or leaves
 *    `ChatDetailScreen`. The event is only emitted if a `chat:typing` was
 *    emitted within the last 5 seconds, matching the server-side TTL.
 *
 * When `conversationId` is `null` the hook is fully inert — every callback
 * is a no-op and no timers are scheduled, so the screen can mount the hook
 * unconditionally during initial loads or guest sessions.
 */

import { useCallback, useEffect, useRef } from 'react';

import { chatSocket } from '../api/chatSocket';

/** Maximum `chat:typing` emits per rolling 1s window (Req 12.1). */
const TYPING_RATE_LIMIT_PER_SECOND = 5;

/** Sliding-window length used for throttling (1 second). */
const TYPING_WINDOW_MS = 1_000;

/** Idle delay after the last keystroke before emitting stop-typing (Req 12.2). */
const TYPING_IDLE_TIMEOUT_MS = 3_000;

/**
 * Server-side typing TTL (Req 12.3). `emitStopTyping` only contacts the
 * server when a `chat:typing` was emitted within this window.
 */
const TYPING_TTL_MS = 5_000;

export type UseChatTyping = {
  /**
   * Pass-through handler for `<TextInput onChangeText>`. Drives the throttle
   * and resets the idle timer; safe to invoke on every keystroke.
   */
  onChangeText: (text: string) => void;
  /**
   * Explicit stop-typing trigger for send/unmount paths (Req 12.3). No-op
   * when no `chat:typing` was emitted within the last 5 seconds.
   */
  emitStopTyping: () => void;
};

/**
 * Returns the typing-indicator callbacks bound to `conversationId`.
 *
 * The hook keeps its sliding-window history and idle timer on refs so the
 * returned callbacks have stable identities across renders.
 */
export function useChatTyping(conversationId: string | null): UseChatTyping {
  // Timestamps (ms since epoch) of recent `chat:typing` emits, kept ordered
  // and pruned to entries within the rolling window.
  const recentEmitsAt = useRef<number[]>([]);
  // Timestamp of the most recent `chat:typing` emit, used by emitStopTyping
  // to honour the 5s TTL guard (Req 12.3).
  const lastTypingEmittedAt = useRef<number>(0);
  // Pending idle timer that fires the 3s stop-typing emit.
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearIdleTimer = useCallback(() => {
    if (idleTimer.current !== null) {
      clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
  }, []);

  // Reset internal state when the conversation changes or the hook unmounts.
  // This prevents a stale idle timer from firing a stop-typing for a previous
  // conversation, and clears the throttle window so a fresh conversation
  // starts with a full budget.
  useEffect(() => {
    return () => {
      clearIdleTimer();
      recentEmitsAt.current = [];
      lastTypingEmittedAt.current = 0;
    };
  }, [conversationId, clearIdleTimer]);

  const onChangeText = useCallback(
    (_text: string): void => {
      if (!conversationId) return;

      const now = Date.now();

      // Sliding window: drop entries older than 1s, then check budget.
      recentEmitsAt.current = recentEmitsAt.current.filter(
        (t) => now - t < TYPING_WINDOW_MS,
      );

      if (recentEmitsAt.current.length < TYPING_RATE_LIMIT_PER_SECOND) {
        chatSocket.emit('chat:typing', { conversationId });
        recentEmitsAt.current.push(now);
        lastTypingEmittedAt.current = now;
      }
      // Excess emits (>5 within the last second) are dropped locally — no
      // server contact (Req 20.4).

      // Reset the 3s idle timer on every keystroke (Req 12.2).
      if (idleTimer.current !== null) {
        clearTimeout(idleTimer.current);
      }
      idleTimer.current = setTimeout(() => {
        idleTimer.current = null;
        chatSocket.emit('chat:stop-typing', { conversationId });
      }, TYPING_IDLE_TIMEOUT_MS);
    },
    [conversationId],
  );

  const emitStopTyping = useCallback((): void => {
    if (!conversationId) return;

    // Only contact the server if a typing event was emitted within the
    // server-side TTL (Req 12.3). Outside that window the recipient has
    // already cleared the indicator, so a redundant stop-typing is wasted.
    if (Date.now() - lastTypingEmittedAt.current < TYPING_TTL_MS) {
      chatSocket.emit('chat:stop-typing', { conversationId });
    }

    clearIdleTimer();
  }, [conversationId, clearIdleTimer]);

  return { onChangeText, emitStopTyping };
}
