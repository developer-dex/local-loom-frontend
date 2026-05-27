/**
 * Chat module Socket.IO lifecycle hook.
 *
 * Mounted once at the application root (Task 9.2 — `App.tsx`) so it runs
 * for the lifetime of any authenticated session. Owns:
 *
 *  1. Connect / disconnect driven by Redux auth state (Req 9.1, 9.2, 19.2,
 *     19.3, 22.3) — observes `auth.tokens.accessToken` and `auth.user.id`
 *     and (re)connects whenever either changes. No `tokenStorage` polling.
 *  2. AppState bridging (Req 9.3, 9.4, 17.3) — schedules a 30s grace-period
 *     disconnect on `background`, cancels it on `active`, and dispatches
 *     `resyncThunk` if the app was backgrounded for ≥60s.
 *  3. Listener wiring (Req 10, 11, 12, 13.5, 14.1, 15.1, 15.3, 20.5) —
 *     registers a single listener bag on `chatSocket.setListeners` that
 *     forwards every server event into the chat slice.
 *  4. Reconnect resync (Req 17.1, 17.2, 17.4) — dispatches `resyncThunk`
 *     and emits `chat:join` for the active conversation on every
 *     `reconnecting | disconnected → connected` transition.
 *  5. Special error flows:
 *     - `CHAT_AUTOSUBSCRIBE_FAILED`: tear down and reconnect with the
 *       current token (Req 9.7).
 *     - `CHAT_JOIN_FORBIDDEN`: clear the active conversation, drop the
 *       offending row from the list, and push an access-denied banner
 *       (Req 20.5).
 *  6. Handshake auth failure (Req 19.5) — falls out naturally: the
 *     transport's auth `connect_error` already transitions to
 *     `'disconnected'` inside `chatSocket`, and the hook does not retry
 *     unless the observed access token actually changes.
 *
 * The hook returns nothing — it is a pure side-effect mount.
 */
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { env } from '../config/env';
import { chatSocket, type ConnectionStatus } from '../api/chatSocket';
import {
  applyServerMessage,
  clearChatState,
  clearTyping,
  pushNotification,
  removeConversation,
  setActiveConversation,
  setConnectionStatus,
  setPresence,
  setReadReceipt,
  setSocketError,
  setTyping,
  upsertConversation,
} from '../store/slices/chatSlice';
import { resyncThunk } from '../store/slices/chatThunks';
import { useAppDispatch, useAppSelector } from '../store/hooks';

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Grace period before the socket disconnects after the app is backgrounded
 * (Req 9.3). Returning to the foreground inside this window cancels the
 * pending disconnect without forcing a re-handshake.
 */
const BACKGROUND_DISCONNECT_DELAY_MS = 30_000;

/**
 * Threshold above which a background-then-foreground round-trip triggers a
 * full state resync via `resyncThunk` (Req 17.3).
 */
const RESYNC_AFTER_BACKGROUND_MS = 60_000;

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Wires the {@link chatSocket} singleton to Redux auth + AppState. Mount
 * once near the navigation root so it is active for every authenticated
 * screen. Returns nothing — its side effects are dispatched actions and
 * imperative socket calls.
 */
export function useChatSocket(): void {
  const dispatch = useAppDispatch();

  const accessToken = useAppSelector(
    (s) => s.auth.tokens?.accessToken ?? null,
  );
  const userId = useAppSelector((s) => s.auth.user?.id ?? null);
  const activeConversationId = useAppSelector(
    (s) => s.chat.activeConversationId,
  );
  const connectionStatus = useAppSelector((s) => s.chat.connectionStatus);

  // Refs hold the latest values for use inside listener callbacks /
  // AppState handlers without forcing the listener bag to be re-registered
  // on every render. Listener identity stays stable so the underlying
  // socket doesn't see churn on its `setListeners` calls.
  const accessTokenRef = useRef<string | null>(accessToken);
  const userIdRef = useRef<string | null>(userId);
  const activeConversationIdRef = useRef<string | null>(activeConversationId);

  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // ── 1. Connect / disconnect on auth changes (Req 9.1, 9.2, 19.2, 19.3) ───

  useEffect(() => {
    if (accessToken && userId) {
      // `chatSocket.connect` is idempotent for the same token and tears the
      // existing socket down + re-handshakes when the token changes
      // (Req 19.3 — refresh-driven reconnect within 5s, naturally bounded
      // by the React batch that flushed the new token into the store).
      chatSocket.connect(accessToken, env.socketBaseUrl);
    } else {
      // Either token or user id is null → logout / unauthenticated.
      // Tear down the socket and wipe chat state (Req 9.2, design
      // Property 12).
      chatSocket.disconnect();
      dispatch(clearChatState());
    }
  }, [accessToken, userId, dispatch]);

  // ── 2. Wire listener bag (registered once, reads via refs) ───────────────

  useEffect(() => {
    chatSocket.setListeners({
      // Connection status — straight passthrough into the slice. The
      // slice's `setConnectionStatus` reducer also clears `presence` on
      // any transition out of `'connected'` (Req 14.5).
      onConnectionStatus: (status: ConnectionStatus) => {
        dispatch(setConnectionStatus(status));
      },

      // Inbound message: dedup, ordering, and unread-count semantics live
      // in `applyServerMessage` (Req 10.1–10.5, 18.1–18.3).
      onMessage: (message) => {
        dispatch(
          applyServerMessage({
            message,
            activeConversationId: activeConversationIdRef.current,
            selfUserId: userIdRef.current,
          }),
        );
      },

      // Conversation upserts (Req 11.1, 11.2). The slice ignores
      // payloads with a missing/empty `conversation.id` (Req 11.4).
      onConversationUpdated: (event) => {
        if (event && event.conversation) {
          dispatch(upsertConversation(event.conversation));
        }
      },

      // Typing indicators (Req 12.4, 12.6).
      onTyping: (event) => {
        dispatch(setTyping(event));
      },
      onStopTyping: (event) => {
        dispatch(clearTyping(event));
      },

      // Read receipts (Req 13.5).
      onRead: (event) => {
        dispatch(setReadReceipt(event));
      },

      // Online / offline presence (Req 14.1; malformed events are ignored
      // by the reducer per Req 14.4).
      onOnlineStatus: (event) => {
        dispatch(setPresence(event));
      },

      // Server-pushed notifications (`notification:new`, Req 15.3). The
      // banner UI itself lives in `useChatNotifications` (Task 10.2);
      // here we just push the entry into the slice queue.
      onNotification: (event) => {
        const conversationId =
          event.data && typeof event.data === 'object'
            ? (event.data as { conversationId?: unknown }).conversationId
            : undefined;
        dispatch(
          pushNotification({
            title: typeof event.title === 'string' ? event.title : '',
            body: typeof event.body === 'string' ? event.body : '',
            conversationId:
              typeof conversationId === 'string' && conversationId.length > 0
                ? conversationId
                : undefined,
          }),
        );
      },

      // Error events — record for diagnostics, then handle the two
      // documented codes that drive UI flow.
      onError: (event) => {
        dispatch(setSocketError(event));

        const code = event.code;
        if (code === 'CHAT_AUTOSUBSCRIBE_FAILED') {
          // Req 9.7 / Task 9.1: tear down and reconnect with the current
          // token. `disconnect()` flips status to `'disconnected'`;
          // `connect()` immediately moves it back to `'connecting'` and
          // the manager handles the rest of the handshake.
          chatSocket.disconnect();
          const token = accessTokenRef.current;
          if (token) {
            chatSocket.connect(token, env.socketBaseUrl);
          }
          return;
        }

        if (code === 'CHAT_JOIN_FORBIDDEN') {
          // Req 20.5 / Task 9.1: navigate away from the active
          // conversation and surface an access-denied banner. We don't
          // call into the navigator here — the screen layer responds to
          // `activeConversationId === null` by popping the detail
          // screen. Removing the conversation also clears its message
          // bucket so a stale row can't be re-entered.
          const activeId = activeConversationIdRef.current;
          if (activeId) {
            dispatch(setActiveConversation(null));
            dispatch(removeConversation(activeId));
          }
          dispatch(
            pushNotification({
              title: 'Access denied',
              body:
                typeof event.message === 'string' && event.message.length > 0
                  ? event.message
                  : 'You no longer have access to this conversation.',
              conversationId: activeId ?? undefined,
            }),
          );
        }
      },
    });
    // The listener bag reads everything via refs, so it only needs to be
    // re-registered when `dispatch` changes (effectively never).
  }, [dispatch]);

  // ── 3. AppState bridging (Req 9.3, 9.4, 17.3) ────────────────────────────

  // Pending background-disconnect timer; non-null while the app is
  // backgrounded and inside the 30s grace window.
  const backgroundDisconnectTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  // Wall-clock at which the app most recently transitioned to background.
  // Used to compute the wasBackgroundedFor window for the resync check.
  const lastBackgroundAtRef = useRef<number | null>(null);

  useEffect(() => {
    const handleAppStateChange = (next: AppStateStatus) => {
      if (next === 'background') {
        // Schedule the 30s grace-period disconnect (Req 9.3). Capture
        // the timestamp so we can decide whether to resync on return.
        lastBackgroundAtRef.current = Date.now();
        if (backgroundDisconnectTimerRef.current) {
          clearTimeout(backgroundDisconnectTimerRef.current);
        }
        backgroundDisconnectTimerRef.current = setTimeout(() => {
          chatSocket.disconnect();
          backgroundDisconnectTimerRef.current = null;
        }, BACKGROUND_DISCONNECT_DELAY_MS);
        return;
      }

      if (next === 'active') {
        // Cancel any pending background disconnect (Req 9.3 — return
        // inside the grace window keeps the existing socket).
        if (backgroundDisconnectTimerRef.current) {
          clearTimeout(backgroundDisconnectTimerRef.current);
          backgroundDisconnectTimerRef.current = null;
        }

        // Compute background duration before we forget it.
        const lastBackgroundAt = lastBackgroundAtRef.current;
        lastBackgroundAtRef.current = null;
        const wasBackgroundedFor =
          lastBackgroundAt != null ? Date.now() - lastBackgroundAt : 0;

        // Ensure we have an active connection (Req 9.4). When the user
        // signed out while in background, accessToken is null and we
        // intentionally skip the re-handshake.
        const token = accessTokenRef.current;
        const uid = userIdRef.current;
        if (token && uid && !chatSocket.isConnected()) {
          chatSocket.connect(token, env.socketBaseUrl);
        }

        // Resync after a long-background return (Req 17.3).
        if (wasBackgroundedFor >= RESYNC_AFTER_BACKGROUND_MS) {
          void dispatch(resyncThunk());
        }
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
      if (backgroundDisconnectTimerRef.current) {
        clearTimeout(backgroundDisconnectTimerRef.current);
        backgroundDisconnectTimerRef.current = null;
      }
    };
  }, [dispatch]);

  // ── 4. Resync + chat:join on reconnect (Req 17.1, 17.2, 17.4) ────────────

  const previousConnectionStatusRef = useRef<ConnectionStatus>(
    connectionStatus,
  );

  useEffect(() => {
    const prev = previousConnectionStatusRef.current;
    const next = connectionStatus;

    if (
      next === 'connected' &&
      (prev === 'reconnecting' || prev === 'disconnected')
    ) {
      // Re-fetch the first page of conversations and the latest 100
      // messages for the active conversation (Req 17.1, 17.2). The
      // thunk handles dedup-by-id / clientMessageId on the merge.
      void dispatch(resyncThunk());

      // Re-join the active room so the server resumes routing real-time
      // events to this socket (Req 17.4).
      const activeId = activeConversationIdRef.current;
      if (activeId) {
        chatSocket.emit('chat:join', { conversationId: activeId });
      }
    }

    previousConnectionStatusRef.current = next;
  }, [connectionStatus, dispatch]);
}
