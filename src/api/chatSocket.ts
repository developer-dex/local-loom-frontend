/**
 * Chat module Socket.IO client.
 *
 * Module-level singleton wrapping `socket.io-client`. Exposed via the
 * {@link chatSocket} export so React-bound hooks and Redux thunks can drive
 * the connection lifecycle without holding their own socket reference.
 *
 * Responsibilities:
 *  - Manage a single underlying socket per authenticated session
 *    ({@link ChatSocket.connect}/{@link ChatSocket.disconnect}).
 *  - Translate raw transport events into the documented
 *    {@link ConnectionStatus} state machine and surface them through a
 *    listener bag set by callers via {@link ChatSocket.setListeners}.
 *  - Wire incoming server events (`chat:message`, `chat:conversation-updated`,
 *    `chat:typing`, `chat:stop-typing`, `chat:read`, `chat:online-status`,
 *    `notification:new`, `error`) to the corresponding listener callbacks.
 *  - Provide an {@link ChatSocket.emitWithAck} helper with a default 10s
 *    timeout for `chat:send-message` and `chat:mark-read` flows.
 *
 * The singleton is intentionally framework-agnostic. React lifecycle is owned
 * by `useChatSocket` (Task 9.1); Redux state mapping is owned by `chatSlice`.
 */

import { io, type Socket } from 'socket.io-client';
import type {
  ChatConversationUpdatedEvent,
  ChatNotificationEvent,
  ChatOnlineStatusEvent,
  ChatReadEvent,
  ChatSocketError,
  ChatTypingEvent,
  MessagePayload,
} from './chatTypes';

// ─── Public types ────────────────────────────────────────────────────────────

/**
 * The four documented connection states surfaced to the rest of the app.
 *
 * Transitions (per design state diagram):
 *
 * ```
 * disconnected ─connect()──────────────► connecting
 * connecting   ─"connect"──────────────► connected
 * connecting   ─auth "connect_error"──► disconnected   (no retry)
 * connected    ─unexpected "disconnect"► reconnecting
 * reconnecting ─"reconnect"────────────► connected
 * reconnecting ─"reconnect_failed"─────► disconnected
 * connected    ─disconnect()───────────► disconnected
 * ```
 */
export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting';

/**
 * Default ack timeout for `emitWithAck` (Req 9.1 — 10s handshake/operational
 * timeout). Callers may override per-call.
 */
export const DEFAULT_ACK_TIMEOUT_MS = 10_000;

/** Maximum reconnection attempts before transitioning to `disconnected`. */
export const RECONNECTION_ATTEMPTS = 10;

/** Initial reconnection delay (1s), doubling up to the cap. */
export const RECONNECTION_DELAY_MS = 1_000;

/** Cap on per-attempt reconnection delay (30s, Req 9.5). */
export const RECONNECTION_DELAY_MAX_MS = 30_000;

/**
 * Listener bag wired by {@link ChatSocket.setListeners}. Consumers register
 * once (typically in `useChatSocket`) and the socket fans transport events
 * out through these callbacks.
 *
 * All entries are optional so tests and partial integrations can subscribe to
 * a subset without supplying no-op stubs.
 */
export type ChatSocketListeners = {
  /** Receives every {@link ConnectionStatus} transition. */
  onConnectionStatus: (status: ConnectionStatus) => void;
  /** `chat:message` server event (Req 10.1). */
  onMessage: (message: MessagePayload) => void;
  /** `chat:conversation-updated` server event (Req 11.1). */
  onConversationUpdated: (event: ChatConversationUpdatedEvent) => void;
  /** `chat:typing` server event (Req 12.4). */
  onTyping: (event: ChatTypingEvent) => void;
  /** `chat:stop-typing` server event (Req 12.6). */
  onStopTyping: (event: ChatTypingEvent) => void;
  /** `chat:read` server event (Req 13.5). */
  onRead: (event: ChatReadEvent) => void;
  /** `chat:online-status` server event (Req 14.1). */
  onOnlineStatus: (event: ChatOnlineStatusEvent) => void;
  /** `notification:new` server event (Req 15.3). */
  onNotification: (event: ChatNotificationEvent) => void;
  /** `error` server event (Req 9.7, 20.5). */
  onError: (event: ChatSocketError) => void;
};

// ─── Implementation ──────────────────────────────────────────────────────────

class AckTimeoutError extends Error {
  readonly code = 'ACK_TIMEOUT' as const;
  constructor(event: string, timeoutMs: number) {
    super(`Socket ack for "${event}" timed out after ${timeoutMs}ms`);
    this.name = 'AckTimeoutError';
  }
}

/**
 * Internal connection-state holder. Kept on the instance instead of derived
 * from `socket.connected` so that the `connecting`/`reconnecting` distinction
 * (which the raw transport does not surface) can be reported faithfully.
 */
type InternalState = {
  socket: Socket | null;
  status: ConnectionStatus;
  /** Token used for the current/last connect attempt — used to detect changes. */
  currentToken: string | null;
  /** Set true once a `connect` event has fired since the last `connect()` call. */
  hasConnectedAtLeastOnce: boolean;
};

class ChatSocket {
  private state: InternalState = {
    socket: null,
    status: 'disconnected',
    currentToken: null,
    hasConnectedAtLeastOnce: false,
  };

  private listeners: Partial<ChatSocketListeners> = {};

  /**
   * Establishes a new authenticated socket connection.
   *
   * - If a socket already exists and the token hasn't changed, this is a no-op.
   * - If a socket exists with a different token (refresh-driven reconnect,
   *   Req 19.3), the old socket is torn down before a new one is created.
   *
   * Emits `connecting` synchronously so callers observe a deterministic
   * transition before any transport event lands.
   */
  connect(token: string, baseUrl: string): void {
    if (
      this.state.socket &&
      this.state.currentToken === token &&
      (this.state.status === 'connected' ||
        this.state.status === 'connecting' ||
        this.state.status === 'reconnecting')
    ) {
      // Same token + active socket — nothing to do.
      return;
    }

    // Tear down any existing socket so we don't leak listeners / handles.
    this.teardownSocket();

    this.state.currentToken = token;
    this.state.hasConnectedAtLeastOnce = false;

    const socket = io(baseUrl, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: RECONNECTION_ATTEMPTS,
      reconnectionDelay: RECONNECTION_DELAY_MS,
      reconnectionDelayMax: RECONNECTION_DELAY_MAX_MS,
      transports: ['websocket'],
    });

    this.state.socket = socket;
    this.wireTransportEvents(socket);
    this.wireServerEvents(socket);

    this.setStatus('connecting');
  }

  /**
   * Tears down the underlying socket and transitions to `disconnected`.
   * Safe to call when no socket exists.
   */
  disconnect(): void {
    const wasActive = this.state.socket !== null;
    this.teardownSocket();
    if (wasActive || this.state.status !== 'disconnected') {
      this.setStatus('disconnected');
    }
  }

  /**
   * Replaces the listener bag. The latest call wins — partial maps are merged
   * onto the existing set so a caller can register listeners incrementally
   * (e.g. add `onMessage` after the initial wiring).
   */
  setListeners(partial: Partial<ChatSocketListeners>): void {
    this.listeners = { ...this.listeners, ...partial };
  }

  /**
   * Fires a fire-and-forget event. No-op when the socket is absent so
   * callers can emit unconditionally during reconnection without guarding.
   */
  emit(event: string, payload?: unknown): void {
    if (!this.state.socket) return;
    if (payload === undefined) {
      this.state.socket.emit(event);
      return;
    }
    this.state.socket.emit(event, payload);
  }

  /**
   * Emits `event` and resolves with the server's ack payload, or rejects with
   * an {@link AckTimeoutError} when no ack arrives within `timeoutMs`.
   *
   * Rejects immediately when the socket is not currently connected so callers
   * can fall back to the REST transport without waiting out the timeout.
   */
  emitWithAck<TAck>(
    event: string,
    payload?: unknown,
    timeoutMs: number = DEFAULT_ACK_TIMEOUT_MS,
  ): Promise<TAck> {
    const socket = this.state.socket;
    if (!socket || !socket.connected) {
      return Promise.reject(
        new Error(`Cannot emit "${event}" — socket is not connected`),
      );
    }

    return new Promise<TAck>((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new AckTimeoutError(event, timeoutMs));
      }, timeoutMs);

      const ackHandler = (ack: TAck): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(ack);
      };

      if (payload === undefined) {
        socket.emit(event, ackHandler);
      } else {
        socket.emit(event, payload, ackHandler);
      }
    });
  }

  /** Whether the underlying socket is currently in the connected state. */
  isConnected(): boolean {
    return this.state.socket?.connected === true;
  }

  /** Read-only view of the current `ConnectionStatus`. */
  getStatus(): ConnectionStatus {
    return this.state.status;
  }

  // ─── Private wiring ────────────────────────────────────────────────────────

  /**
   * Wires socket / manager events to {@link ConnectionStatus} transitions per
   * the design state diagram.
   *
   * Transport-level events come from two sources in socket.io v4:
   *  - `socket` itself emits `connect`, `connect_error`, `disconnect`.
   *  - `socket.io` (the Manager) emits `reconnect_attempt`, `reconnect`,
   *    `reconnect_failed`, `reconnect_error`.
   */
  private wireTransportEvents(socket: Socket): void {
    socket.on('connect', () => {
      this.state.hasConnectedAtLeastOnce = true;
      this.setStatus('connected');
    });

    socket.on('disconnect', (reason) => {
      // `io client disconnect` corresponds to an explicit disconnect() call —
      // we've already published `disconnected` from the disconnect path, so
      // ignore the duplicate.
      if (reason === 'io client disconnect') return;
      // Any other reason is an unexpected drop; the manager will start
      // retrying. Surface `reconnecting` so the UI can show the banner.
      this.setStatus('reconnecting');
    });

    socket.on('connect_error', (err) => {
      // `socket.active` is `false` once the manager has stopped attempting
      // reconnects (initial handshake rejected by middleware, or budget
      // exhausted). Treat that as a fatal/auth failure per Req 19.5 and stop
      // emitting further status updates until the caller re-`connect()`s.
      if (!socket.active) {
        // Forward as an error for diagnostic logging, then disconnect so the
        // manager doesn't sit in a half-open state.
        this.listeners.onError?.({
          message: err?.message ?? 'Connection refused',
        });
        this.teardownSocket();
        this.setStatus('disconnected');
        return;
      }
      // Otherwise the manager is still retrying — surface reconnecting if we
      // were ever connected; the initial-handshake case stays in `connecting`.
      if (this.state.hasConnectedAtLeastOnce) {
        this.setStatus('reconnecting');
      }
    });

    // Manager-level reconnect events. Guarded with optional chaining because
    // the typed-events declaration on `socket.io` doesn't include them by
    // name in every build of socket.io-client.
    const manager = socket.io;
    manager.on('reconnect_attempt', () => {
      this.setStatus('reconnecting');
    });
    manager.on('reconnect', () => {
      this.state.hasConnectedAtLeastOnce = true;
      this.setStatus('connected');
    });
    manager.on('reconnect_failed', () => {
      // Retry budget exhausted — stop attempting until the next connect().
      this.teardownSocket();
      this.setStatus('disconnected');
    });
  }

  /** Wires the documented server-emitted events to listener callbacks. */
  private wireServerEvents(socket: Socket): void {
    socket.on('chat:message', (message: MessagePayload) => {
      this.listeners.onMessage?.(message);
    });
    socket.on(
      'chat:conversation-updated',
      (event: ChatConversationUpdatedEvent) => {
        this.listeners.onConversationUpdated?.(event);
      },
    );
    socket.on('chat:typing', (event: ChatTypingEvent) => {
      this.listeners.onTyping?.(event);
    });
    socket.on('chat:stop-typing', (event: ChatTypingEvent) => {
      this.listeners.onStopTyping?.(event);
    });
    socket.on('chat:read', (event: ChatReadEvent) => {
      this.listeners.onRead?.(event);
    });
    socket.on('chat:online-status', (event: ChatOnlineStatusEvent) => {
      this.listeners.onOnlineStatus?.(event);
    });
    socket.on('notification:new', (event: ChatNotificationEvent) => {
      this.listeners.onNotification?.(event);
    });
    socket.on('error', (event: ChatSocketError) => {
      this.listeners.onError?.(event);
    });
  }

  /**
   * Updates the cached status and notifies the listener bag iff the value
   * actually changed. Idempotent for repeated transitions to the same state.
   */
  private setStatus(next: ConnectionStatus): void {
    if (this.state.status === next) return;
    this.state.status = next;
    this.listeners.onConnectionStatus?.(next);
  }

  private teardownSocket(): void {
    const socket = this.state.socket;
    if (!socket) return;
    try {
      socket.removeAllListeners();
      socket.io.removeAllListeners();
      socket.disconnect();
    } catch {
      // Defensive — never throw from teardown.
    }
    this.state.socket = null;
    this.state.currentToken = null;
    this.state.hasConnectedAtLeastOnce = false;
  }
}

// ─── Exports ─────────────────────────────────────────────────────────────────

/** Singleton instance used throughout the chat module. */
export const chatSocket = new ChatSocket();

/** Class export for tests that need an isolated instance with a fake transport. */
export { ChatSocket };
