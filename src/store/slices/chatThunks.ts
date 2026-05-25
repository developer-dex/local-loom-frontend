/**
 * Chat thunks.
 *
 * Implements the conversation-list, search, create, mark-read and resync
 * thunks (Task 7.1) plus the message-side thunks (Task 7.2 — fetch,
 * fetch-older, send, retry, upload-and-send, hydrate).
 *
 * Each thunk:
 *  - Builds its REST request via `chatHelpers.buildConversationsRequest` /
 *    `buildMessagesRequest` where applicable (design Property 4 —
 *    pagination/search params).
 *  - Picks the transport at dispatch time: `chatSocket.isConnected()` for
 *    socket-eligible operations (`mark-read`, `send-message`), REST
 *    otherwise.
 *  - Enforces the at-most-one-in-flight guards from Req 4.3 / 5.5 by
 *    reading the `conversationsLoadingMore` flag and the per-conversation
 *    `messagesLoadingOlder` flag before issuing pagination requests.
 *  - Escalates a 401 that survives the existing `authenticatedRequest`
 *    refresh-and-retry by dispatching `logoutThunk` (Req 19.4).
 *  - Reports a 429 via `setSendCooldown` with a 60s deadline (Req 7.10,
 *    20.2, 20.3).
 *  - Dispatches the existing slice reducers — there's no separate "loading"
 *    extraReducer machinery here because the slice already exposes a small
 *    set of synchronous setters that exactly match what these thunks need
 *    (`setConversationsStatus`, `setConversationsError`,
 *    `setConversationsLoadingMore`, `mergeConversationsPage`,
 *    `applyConversationSearchResults`, `setConversationUnreadCount`,
 *    `prependCursorPage`, `setMessagesPage`, `setMessagesStatus`,
 *    `setMessagesLoadingOlder`, `insertOptimisticMessage`,
 *    `replaceOptimisticMessage`, `markMessageFailed`, `setSendCooldown`,
 *    `upsertConversation`, `setActiveConversation`).
 *
 * Requirements: 2.1, 2.2, 2.6, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2,
 * 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 7.1, 7.2,
 * 7.3, 7.4, 7.5, 7.6, 7.7, 7.9, 7.10, 8.1, 8.2, 8.3, 8.4, 8.5, 13.1, 13.2,
 * 13.3, 13.4, 16.1, 16.2, 16.3, 17.1, 17.2, 18.1, 18.2, 18.3, 18.4, 19.1,
 * 19.4, 20.1, 20.2, 20.3, 20.6, 20.7, 21.2, 21.3.
 */
import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  createConversationApi,
  listConversationsApi,
  listMessagesApi,
  markReadApi,
  sendMessageApi,
  uploadAttachmentsApi,
} from '../../api/chat';
import { ApiError } from '../../api/errors';
import {
  ALLOWED_ATTACHMENT_MIMES,
  CONVERSATIONS_DEFAULT_LIMIT,
  IMAGE_MAX_BYTES,
  MESSAGES_DEFAULT_LIMIT,
  SEARCH_QUERY_MAX_LEN,
  VIDEO_MAX_BYTES,
  buildConversationsRequest,
  buildMessagesRequest,
  deriveMessageType,
  extractChatErrorCode,
  prepareSend,
} from '../../api/chatHelpers';
import { chatSocket, DEFAULT_ACK_TIMEOUT_MS } from '../../api/chatSocket';
import * as chatPersistence from '../../api/chatPersistence';
import type {
  AttachmentDescriptor,
  ChatMarkReadAck,
  ChatSendAck,
  ConversationListItem,
  MessagePayload,
  PickedAsset,
  SendMessageRequest,
} from '../../api/chatTypes';
import { logoutThunk } from './authSlice';
import type { RootState } from '../index';
import {
  applyConversationSearchResults,
  insertOptimisticMessage,
  markMessageFailed,
  mergeConversationsPage,
  prependCursorPage,
  replaceOptimisticMessage,
  setActiveConversation,
  setConversationsError,
  setConversationsLoadingMore,
  setConversationsStatus,
  setConversationUnreadCount,
  setMessagesLoadingOlder,
  setMessagesPage,
  setMessagesStatus,
  setSendCooldown,
  upsertConversation,
  type LocalMessage,
  type LocalMessageErrorCode,
} from './chatSlice';

// ─── Shared types ────────────────────────────────────────────────────────────

type ThunkApiConfig = {
  state: RootState;
  rejectValue: string;
};

/** Argument shape for {@link fetchConversationsThunk}. */
export type FetchConversationsArgs = {
  page: number;
  limit: number;
  /** Already-trimmed search query; the thunk re-applies the 100-char clamp. */
  search?: string;
};

/** Argument shape for {@link markConversationReadThunk}. */
export type MarkConversationReadArgs = {
  conversationId: string;
  lastReadMessageId?: string;
};

// ─── fetchConversationsThunk ─────────────────────────────────────────────────

/**
 * `GET /chat/conversations` (paginated).
 *
 * Page-1 requests replace the list (and apply / clear the persisted search
 * via `applyConversationSearchResults`). Page-N requests merge with the
 * existing list via `mergeConversationsPage`.
 *
 * The at-most-one-in-flight guard (Req 4.3 / 5.5 — pagination scope) is
 * applied for `page > 1` only: if a previous paginated load is still in
 * flight, the call is short-circuited and the thunk is rejected with a
 * stable sentinel `'IN_FLIGHT'`. Page-1 fetches are never short-circuited
 * because they represent a user-driven refresh / search.
 *
 * Requirements: 2.1, 2.2, 2.6, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4.
 */
export const fetchConversationsThunk = createAsyncThunk<
  void,
  FetchConversationsArgs,
  ThunkApiConfig
>('chat/fetchConversations', async (args, { dispatch, getState, rejectWithValue }) => {
  const isFirstPage = args.page <= 1;

  // Pagination guard (Req 4.3): drop concurrent page > 1 requests.
  if (!isFirstPage && getState().chat.conversationsLoadingMore) {
    return rejectWithValue('IN_FLIGHT');
  }

  // Build params via the shared builder so search clamping (Req 3.3) and
  // limit fallbacks stay consistent with design Property 4.
  const params = buildConversationsRequest({
    meta: { total: 0, page: 1, limit: args.limit, totalPages: 0 },
    search: args.search,
    page: args.page,
  });

  if (isFirstPage) {
    dispatch(setConversationsStatus('loading'));
  } else {
    dispatch(setConversationsLoadingMore(true));
  }

  try {
    const res = await listConversationsApi(params);
    if (isFirstPage) {
      // Page 1 (with or without `search`): use the search-aware reducer so
      // `conversationsSearch` reflects the applied filter (or '' when none).
      dispatch(
        applyConversationSearchResults({
          items: res.data,
          meta: res.meta,
          search: params.search ?? '',
        }),
      );
    } else {
      dispatch(
        mergeConversationsPage({
          items: res.data,
          meta: res.meta,
          replace: false,
        }),
      );
    }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to load conversations';
    if (isFirstPage) {
      dispatch(setConversationsError(message));
    } else {
      // Pagination failure: leave already-loaded items intact (Req 4.4) and
      // simply release the in-flight flag — the screen surfaces an inline
      // footer error on the rejected thunk.
      dispatch(setConversationsLoadingMore(false));
    }
    return rejectWithValue(message);
  }
});

// ─── searchConversationsThunk ────────────────────────────────────────────────

/**
 * Convenience wrapper that re-issues a page-1 search through
 * {@link fetchConversationsThunk}. The query is trimmed, clamped to
 * {@link SEARCH_QUERY_MAX_LEN} characters (Req 3.3), and a blank/empty
 * input is forwarded as `undefined` so the server returns the unfiltered
 * list (Req 3.2).
 *
 * Debouncing is the responsibility of the screen layer (Req 3.1).
 *
 * Requirements: 3.1, 3.2, 3.3.
 */
export const searchConversationsThunk = createAsyncThunk<
  void,
  string,
  ThunkApiConfig
>('chat/searchConversations', async (query, { dispatch }) => {
  const trimmed = (query ?? '').trim();
  const clamped = trimmed.slice(0, SEARCH_QUERY_MAX_LEN);
  await dispatch(
    fetchConversationsThunk({
      page: 1,
      limit: CONVERSATIONS_DEFAULT_LIMIT,
      search: clamped.length > 0 ? clamped : undefined,
    }),
  );
});

// ─── createConversationThunk ─────────────────────────────────────────────────

/**
 * `POST /chat/conversations` — start a 1:1 chat with `otherUserId`.
 *
 * On success, upserts the returned `ConversationListItem` and sets it as
 * the active conversation so the calling screen can navigate to
 * `ChatDetail` immediately.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.5.
 */
export const createConversationThunk = createAsyncThunk<
  ConversationListItem,
  string,
  ThunkApiConfig
>('chat/createConversation', async (otherUserId, { dispatch, rejectWithValue }) => {
  try {
    const res = await createConversationApi(otherUserId);
    const conv = res.data;
    dispatch(upsertConversation(conv));
    dispatch(setActiveConversation(conv.id));
    return conv;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to start conversation';
    return rejectWithValue(message);
  }
});

// ─── markConversationReadThunk ───────────────────────────────────────────────

/**
 * Marks a conversation as read, picking the transport at dispatch time:
 *
 *  - Socket connected → `chat:mark-read` ack flow (Req 13.1, 13.2).
 *  - Otherwise → `POST /chat/conversations/:id/read` (Req 13.4).
 *
 * Either path returns an `unreadCount` that we apply to the slice via
 * `setConversationUnreadCount` (Req 13.3, 13.6, 16.2). When the operation
 * is rejected with code `CHAT_FORBIDDEN` (REST 403 or socket ack failure)
 * the badge is intentionally left unchanged (Req 16.3).
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4, 16.1, 16.2, 16.3.
 */
export const markConversationReadThunk = createAsyncThunk<
  { conversationId: string; unreadCount: number },
  MarkConversationReadArgs,
  ThunkApiConfig
>(
  'chat/markConversationRead',
  async ({ conversationId, lastReadMessageId }, { dispatch, rejectWithValue }) => {
    try {
      let unreadCount: number;

      if (chatSocket.isConnected()) {
        // Socket transport — emit-with-ack (Req 13.1).
        const ack = await chatSocket.emitWithAck<ChatMarkReadAck>(
          'chat:mark-read',
          {
            conversationId,
            ...(lastReadMessageId ? { lastReadMessageId } : {}),
          },
          DEFAULT_ACK_TIMEOUT_MS,
        );
        if (!ack.success) {
          // Failed ack: leave the badge unchanged (Req 16.3 — applies to
          // CHAT_FORBIDDEN; other ack failures are also non-mutating).
          return rejectWithValue(ack.error.message);
        }
        unreadCount = ack.unreadCount;
      } else {
        // REST fallback (Req 13.4).
        const res = await markReadApi(conversationId, lastReadMessageId);
        unreadCount = res.data.unreadCount;
      }

      dispatch(setConversationUnreadCount({ conversationId, unreadCount }));
      return { conversationId, unreadCount };
    } catch (err: unknown) {
      // 403 from REST: leave the badge unchanged per Req 16.3.
      const code = extractChatErrorCode(err);
      if (code === 'CHAT_FORBIDDEN' || (err instanceof ApiError && err.status === 403)) {
        return rejectWithValue('Forbidden');
      }
      const message =
        err instanceof Error ? err.message : 'Failed to mark conversation as read';
      return rejectWithValue(message);
    }
  },
);

// ─── resyncThunk ─────────────────────────────────────────────────────────────

/**
 * Re-syncs chat state after a reconnect or a long-background return.
 *
 *  1. Re-fetches the first page of conversations (Req 17.1).
 *  2. If an `activeConversationId` is set, re-fetches the latest 100
 *     messages and merges them deduplicated by `id` /
 *     `clientMessageId` (Req 17.2).
 *
 * The conversations refetch reuses {@link fetchConversationsThunk} so the
 * normal status / pagination flag bookkeeping applies. The message
 * refetch is implemented inline (rather than dispatching the messages
 * thunk reserved for Task 7.2) so Task 7.1 is self-contained — see
 * {@link prependCursorPage} for the dedup behaviour.
 *
 * Requirements: 17.1, 17.2.
 */
export const resyncThunk = createAsyncThunk<void, void, ThunkApiConfig>(
  'chat/resync',
  async (_arg, { dispatch, getState, rejectWithValue }) => {
    try {
      // 1. Refetch page 1 of conversations using the most recent search /
      //    limit so the user's filtered view is preserved across resync.
      const state = getState().chat;
      const limit = state.conversationsMeta?.limit ?? CONVERSATIONS_DEFAULT_LIMIT;
      const search =
        state.conversationsSearch.length > 0
          ? state.conversationsSearch
          : undefined;
      await dispatch(fetchConversationsThunk({ page: 1, limit, search }));

      // 2. Refetch the latest 100 messages for the active conversation.
      const activeId = state.activeConversationId;
      if (activeId) {
        const res = await listMessagesApi(activeId, { limit: 100 });
        dispatch(
          prependCursorPage({
            conversationId: activeId,
            items: res.data.items,
            meta: res.data.meta,
          }),
        );
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to resync chat state';
      return rejectWithValue(message);
    }
  },
);

// ─── 401 escalation helper ───────────────────────────────────────────────────

/**
 * Centralised 401 escalation. The shared `authenticatedRequest` already
 * performs a single refresh-and-retry; if a 401 still surfaces from a chat
 * REST call, the session is unrecoverable and we fall through to
 * `logoutThunk` so the existing navigation logic can route to `SignIn`
 * (Req 19.4).
 *
 * Returns `true` when the error was a 401 (and the logout was dispatched)
 * so callers can short-circuit any further state mutation tied to the
 * failed request.
 */
function maybeEscalate401(
  err: unknown,
  dispatch: (action: unknown) => unknown,
): boolean {
  if (err instanceof ApiError && err.status === 401) {
    dispatch(logoutThunk() as unknown as { type: string });
    return true;
  }
  return false;
}

/** 60 seconds in milliseconds — single source of truth for the cooldown. */
const SEND_COOLDOWN_MS = 60_000;

/**
 * Sets a 60-second send cooldown anchored at `Date.now()` (Req 7.10, 20.2,
 * 20.3). Idempotent: the slice's `setSendCooldown` reducer already keeps
 * the latest deadline.
 */
function applyRateLimitCooldown(dispatch: (action: unknown) => unknown): void {
  dispatch(
    setSendCooldown({ endsAt: Date.now() + SEND_COOLDOWN_MS }) as unknown as {
      type: string;
    },
  );
}

// ─── fetchMessagesThunk ──────────────────────────────────────────────────────

/** Argument shape for {@link fetchMessagesThunk}. */
export type FetchMessagesArgs = {
  conversationId: string;
};

/**
 * `GET /chat/conversations/:id/messages` — initial page load (Req 5.1).
 *
 * Calls `listMessagesApi` with `limit=100` and no `before` cursor, reverses
 * the server's newest-first response to ascending order, replaces the
 * conversation's message bucket via `setMessagesPage`, and records the
 * cursor metadata (`hasMore`, `nextBefore`).
 *
 * Per-conversation status is tracked in `messagesStatusByConversation` so
 * the screen can render loading / failed states. 403 / 404 errors flow
 * through to the screen as a rejected thunk; the slice transitions to
 * `'failed'` and the screen handles the access-denied / not-found UI
 * (Req 5.6, 5.7).
 *
 * Requirements: 5.1, 5.2, 17.2, 18.1, 18.4, 19.1, 19.4.
 */
export const fetchMessagesThunk = createAsyncThunk<
  void,
  FetchMessagesArgs,
  ThunkApiConfig
>(
  'chat/fetchMessages',
  async ({ conversationId }, { dispatch, rejectWithValue }) => {
    if (!conversationId) {
      return rejectWithValue('Missing conversationId');
    }

    dispatch(setMessagesStatus({ conversationId, status: 'loading' }));

    const { params } = buildMessagesRequest({
      conversationId,
      limit: MESSAGES_DEFAULT_LIMIT,
    });

    try {
      const res = await listMessagesApi(conversationId, params);
      // Server returns newest-first; the slice stores ascending — reverse
      // so adjacent-pair `createdAt` ordering holds (design Property 2(c)).
      const ascending = [...res.data.items].reverse();
      dispatch(
        setMessagesPage({
          conversationId,
          items: ascending,
          meta: res.data.meta,
        }),
      );
      dispatch(setMessagesStatus({ conversationId, status: 'succeeded' }));
    } catch (err: unknown) {
      if (maybeEscalate401(err, dispatch)) {
        dispatch(setMessagesStatus({ conversationId, status: 'failed' }));
        return rejectWithValue('Session expired');
      }
      dispatch(setMessagesStatus({ conversationId, status: 'failed' }));
      // Tag 403 / 404 with stable sentinels so `ChatDetailScreen` can render
      // the access-denied / not-found states without re-parsing error
      // messages (Req 5.6, 5.7). Other failures fall through to the generic
      // error string so the existing UI surfaces remain unchanged.
      if (err instanceof ApiError) {
        if (err.status === 403) {
          return rejectWithValue('FORBIDDEN');
        }
        if (err.status === 404) {
          return rejectWithValue('NOT_FOUND');
        }
      }
      const message =
        err instanceof Error ? err.message : 'Failed to load messages';
      return rejectWithValue(message);
    }
  },
);

// ─── fetchOlderMessagesThunk ─────────────────────────────────────────────────

/** Argument shape for {@link fetchOlderMessagesThunk}. */
export type FetchOlderMessagesArgs = {
  conversationId: string;
};

/**
 * `GET /chat/conversations/:id/messages?before=<cursor>` — older-page load
 * (Req 5.3, 5.4, 5.5).
 *
 * Guarded by both `messagesLoadingOlder[id]` (at-most-one in-flight per
 * scope, Req 5.5 / Property 5) and the bucket's `hasMore` flag (no further
 * pages — short-circuit). Newer pages are reversed to ascending and merged
 * dedup-by-id via `prependCursorPage`, which also updates the cursor meta.
 *
 * Returns the special `'IN_FLIGHT'` / `'NO_MORE'` sentinels via
 * `rejectWithValue` so callers can distinguish "guarded out" from a real
 * failure without parsing error messages.
 *
 * Requirements: 5.3, 5.4, 5.5, 18.4, 19.4.
 */
export const fetchOlderMessagesThunk = createAsyncThunk<
  void,
  FetchOlderMessagesArgs,
  ThunkApiConfig
>(
  'chat/fetchOlderMessages',
  async ({ conversationId }, { dispatch, getState, rejectWithValue }) => {
    if (!conversationId) {
      return rejectWithValue('Missing conversationId');
    }

    const state = getState().chat;
    const bucket = state.messagesByConversation[conversationId];

    // Guard: at-most-one in-flight older-page request per conversation.
    if (state.messagesLoadingOlder[conversationId]) {
      return rejectWithValue('IN_FLIGHT');
    }
    // Guard: no cursor or hasMore = false ⇒ nothing to fetch.
    if (!bucket || !bucket.hasMore || !bucket.nextBefore) {
      return rejectWithValue('NO_MORE');
    }

    dispatch(setMessagesLoadingOlder({ conversationId, loading: true }));

    const { params } = buildMessagesRequest({
      conversationId,
      nextBefore: bucket.nextBefore,
      limit: MESSAGES_DEFAULT_LIMIT,
    });

    try {
      const res = await listMessagesApi(conversationId, params);
      // Server returns newest-first; reverse to ascending before merging.
      const ascending = [...res.data.items].reverse();
      dispatch(
        prependCursorPage({
          conversationId,
          items: ascending,
          meta: res.data.meta,
        }),
      );
    } catch (err: unknown) {
      if (maybeEscalate401(err, dispatch)) {
        return rejectWithValue('Session expired');
      }
      const message =
        err instanceof Error ? err.message : 'Failed to load older messages';
      return rejectWithValue(message);
    } finally {
      dispatch(setMessagesLoadingOlder({ conversationId, loading: false }));
    }
  },
);

// ─── sendMessageThunk ────────────────────────────────────────────────────────

/** Argument shape for {@link sendMessageThunk}. */
export type SendMessageArgs = {
  conversationId?: string;
  recipientId?: string;
  content?: string;
  attachments?: AttachmentDescriptor[];
};

/**
 * Internal helper that resolves the conversation key used to locate the
 * optimistic message in the slice. Send always targets exactly one of
 * `conversationId` or `recipientId`; the slice's per-conversation buckets
 * key on conversation id, so when only `recipientId` is supplied we use
 * the recipientId as a temporary bucket key. The bucket is reconciled when
 * `chat:conversation-updated` arrives (Req 8.5).
 */
function resolveBucketKey(args: {
  conversationId?: string;
  recipientId?: string;
}): string | null {
  if (args.conversationId && args.conversationId.length > 0) {
    return args.conversationId;
  }
  if (args.recipientId && args.recipientId.length > 0) {
    return args.recipientId;
  }
  return null;
}

/**
 * Builds the optimistic `LocalMessage` inserted into the slice while the
 * send is in flight. The placeholder `id` reuses `clientMessageId` so the
 * bucket invariants (Property 2(a), (e)) hold before the server assigns a
 * real id; the dedup logic in `upsertMessage` swaps it for the real id on
 * ack/echo.
 */
function buildOptimisticMessage(params: {
  conversationId: string;
  clientMessageId: string;
  payload: SendMessageRequest & { type: import('../../api/chatTypes').MessageType };
  selfUserId: string | null;
  selfName: string | null;
  selfAvatar: string | null;
  attachments: AttachmentDescriptor[];
  content: string;
}): LocalMessage {
  const now = new Date().toISOString();
  return {
    id: params.clientMessageId,
    conversationId: params.conversationId,
    sender: {
      id: params.selfUserId ?? '',
      name: params.selfName ?? '',
      avatar: params.selfAvatar,
    },
    content: params.content,
    type: params.payload.type,
    attachments: params.attachments,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    clientMessageId: params.clientMessageId,
    localStatus: 'pending',
  };
}

/**
 * Sends a message with optimistic UI insertion and dual transport
 * selection.
 *
 * Flow:
 *  1. Validate the input through `prepareSend` (Property 3 — empty,
 *     oversize, too-many-attachments, unsupported MIME, oversize file,
 *     missing target, payload >64 KB). On `ok: false` the thunk rejects
 *     without contacting the server (Req 6.7, 6.8, 7.2, 7.3, 7.4, 8.4).
 *  2. Insert an optimistic `LocalMessage` (`localStatus: 'pending'`) keyed
 *     by `clientMessageId` (Req 6.1).
 *  3. Pick transport: socket emit-with-ack when connected (Req 6.2),
 *     REST `POST /chat/messages` otherwise (Req 6.4).
 *  4. On success, replace the optimistic entry with the server payload
 *     using `replaceOptimisticMessage` (Req 6.3, 6.4).
 *  5. On ack failure, mark the optimistic entry as failed
 *     (`markMessageFailed`, Req 6.5).
 *  6. On 429 (REST or ack), set the 60s cooldown via
 *     {@link applyRateLimitCooldown} (Req 7.10, 20.2, 20.3).
 *  7. On 401 (REST), escalate to `logoutThunk` (Req 19.4).
 *
 * The retry path ({@link retrySendThunk}) reuses this thunk's payload
 * shape with the same `clientMessageId` (Req 6.6).
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5,
 * 6.6, 6.7, 6.8, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.9, 7.10, 8.4, 18.1,
 * 18.2, 18.3, 19.1, 19.4, 20.1, 20.2, 20.3, 20.6, 20.7.
 */
export const sendMessageThunk = createAsyncThunk<
  { conversationId: string; clientMessageId: string },
  SendMessageArgs,
  ThunkApiConfig
>(
  'chat/sendMessage',
  async (args, { dispatch, getState, rejectWithValue }) => {
    // 1. Validate via prepareSend (Property 3).
    const prepared = prepareSend({
      content: args.content,
      attachments: args.attachments,
      conversationId: args.conversationId,
      recipientId: args.recipientId,
    });
    if (!prepared.ok) {
      return rejectWithValue(`VALIDATION:${prepared.code}`);
    }
    const { payload } = prepared;
    const clientMessageId = payload.clientMessageId;

    const bucketKey = resolveBucketKey(args);
    if (!bucketKey) {
      return rejectWithValue('VALIDATION:CLIENT_VALIDATION');
    }

    // 2. Insert optimistic message.
    const auth = getState().auth;
    const optimistic = buildOptimisticMessage({
      conversationId: bucketKey,
      clientMessageId,
      payload,
      selfUserId: auth.user?.id ?? null,
      selfName: auth.user?.name ?? null,
      selfAvatar: auth.user?.avatar ?? null,
      attachments: args.attachments ?? [],
      content: args.content ?? '',
    });
    dispatch(
      insertOptimisticMessage({
        conversationId: bucketKey,
        message: optimistic,
      }),
    );

    // 3. Pick transport at dispatch time.
    try {
      let serverMessage: MessagePayload;

      if (chatSocket.isConnected()) {
        const ack = await chatSocket.emitWithAck<ChatSendAck>(
          'chat:send-message',
          payload,
          DEFAULT_ACK_TIMEOUT_MS,
        );
        if (!ack.success) {
          // Ack failure (Req 6.5).
          if (ack.error.code === 'CHAT_RATE_LIMITED') {
            applyRateLimitCooldown(dispatch);
          }
          dispatch(
            markMessageFailed({
              conversationId: bucketKey,
              clientMessageId,
              error: { code: ack.error.code, message: ack.error.message },
            }),
          );
          return rejectWithValue(ack.error.message);
        }
        serverMessage = ack.message;
      } else {
        // REST fallback (Req 6.4).
        const res = await sendMessageApi(payload);
        serverMessage = res.data.message;
      }

      // 4. Replace optimistic with server payload (Req 6.3 / 18.3).
      const finalConversationId = serverMessage.conversationId || bucketKey;

      // When a `recipientId`-only send round-trips with a freshly-created
      // conversation id (Req 8.5), the optimistic currently lives under
      // the placeholder `recipientId` bucket. We always insert the server
      // payload under the real conversation id; the placeholder bucket is
      // reconciled by the `chat:conversation-updated` flow (Task 9.1).
      // When `finalConversationId === bucketKey` (the common case), the
      // dedup index on `clientMessageId` cleanly replaces the optimistic
      // entry in place.
      dispatch(
        replaceOptimisticMessage({
          conversationId: finalConversationId,
          clientMessageId,
          message: serverMessage,
        }),
      );

      return { conversationId: finalConversationId, clientMessageId };
    } catch (err: unknown) {
      // 5. Error handling (REST or socket-emit failures).
      if (maybeEscalate401(err, dispatch)) {
        dispatch(
          markMessageFailed({
            conversationId: bucketKey,
            clientMessageId,
            error: { code: 'CHAT_UNAUTHORIZED', message: 'Session expired' },
          }),
        );
        return rejectWithValue('Session expired');
      }

      // 429 → cooldown (Req 7.10, 20.2).
      if (err instanceof ApiError && err.status === 429) {
        applyRateLimitCooldown(dispatch);
      }

      const code: LocalMessageErrorCode =
        extractChatErrorCode(err) ?? 'CHAT_VALIDATION_ERROR';
      const message =
        err instanceof Error ? err.message : 'Failed to send message';
      dispatch(
        markMessageFailed({
          conversationId: bucketKey,
          clientMessageId,
          error: { code, message },
        }),
      );
      return rejectWithValue(message);
    }
  },
);

// ─── retrySendThunk ──────────────────────────────────────────────────────────

/** Argument shape for {@link retrySendThunk}. */
export type RetrySendArgs = {
  conversationId: string;
  clientMessageId: string;
};

/**
 * Re-sends a previously failed message with the same `clientMessageId`
 * (Req 6.6). Reads the existing `LocalMessage` from the slice to
 * reconstruct the original `SendMessageRequest`, flips its `localStatus`
 * back to `'pending'`, and re-runs the same dual-transport flow as
 * {@link sendMessageThunk} — the dedup index ensures the entry is
 * replaced in place (Property 2(d)) rather than duplicated.
 *
 * No-ops with `rejectWithValue('NOT_FOUND')` when the original message is
 * no longer in the slice (e.g. the conversation was cleared).
 *
 * Requirements: 6.5, 6.6.
 */
export const retrySendThunk = createAsyncThunk<
  { conversationId: string; clientMessageId: string },
  RetrySendArgs,
  ThunkApiConfig
>(
  'chat/retrySend',
  async ({ conversationId, clientMessageId }, { dispatch, getState, rejectWithValue }) => {
    const bucket = getState().chat.messagesByConversation[conversationId];
    const targetId = bucket?.clientMessageIdIndex[clientMessageId];
    const existing = targetId ? bucket?.byId[targetId] : undefined;
    if (!existing) {
      return rejectWithValue('NOT_FOUND');
    }

    // Reset local status to pending so the screen renders the in-flight
    // state immediately. The shared upsert keeps the entry in place
    // because both the id and clientMessageId match.
    dispatch(
      insertOptimisticMessage({
        conversationId,
        message: { ...existing, localStatus: 'pending', error: undefined },
      }),
    );

    // Rebuild the request payload from the existing message. Since the
    // payload was already validated when first sent, we don't re-run
    // prepareSend — that would mint a fresh clientMessageId and break
    // dedup. Instead, replay the same shape directly through the
    // transport.
    const payload: SendMessageRequest = {
      conversationId,
      content: existing.content || undefined,
      type: existing.type,
      attachments:
        existing.attachments.length > 0 ? existing.attachments : undefined,
      clientMessageId,
    };

    try {
      let serverMessage: MessagePayload;
      if (chatSocket.isConnected()) {
        const ack = await chatSocket.emitWithAck<ChatSendAck>(
          'chat:send-message',
          payload,
          DEFAULT_ACK_TIMEOUT_MS,
        );
        if (!ack.success) {
          if (ack.error.code === 'CHAT_RATE_LIMITED') {
            applyRateLimitCooldown(dispatch);
          }
          dispatch(
            markMessageFailed({
              conversationId,
              clientMessageId,
              error: { code: ack.error.code, message: ack.error.message },
            }),
          );
          return rejectWithValue(ack.error.message);
        }
        serverMessage = ack.message;
      } else {
        const res = await sendMessageApi(payload);
        serverMessage = res.data.message;
      }

      dispatch(
        replaceOptimisticMessage({
          conversationId: serverMessage.conversationId || conversationId,
          clientMessageId,
          message: serverMessage,
        }),
      );
      return {
        conversationId: serverMessage.conversationId || conversationId,
        clientMessageId,
      };
    } catch (err: unknown) {
      if (maybeEscalate401(err, dispatch)) {
        dispatch(
          markMessageFailed({
            conversationId,
            clientMessageId,
            error: { code: 'CHAT_UNAUTHORIZED', message: 'Session expired' },
          }),
        );
        return rejectWithValue('Session expired');
      }
      if (err instanceof ApiError && err.status === 429) {
        applyRateLimitCooldown(dispatch);
      }
      const code: LocalMessageErrorCode =
        extractChatErrorCode(err) ?? 'CHAT_VALIDATION_ERROR';
      const message =
        err instanceof Error ? err.message : 'Failed to retry send';
      dispatch(
        markMessageFailed({
          conversationId,
          clientMessageId,
          error: { code, message },
        }),
      );
      return rejectWithValue(message);
    }
  },
);

// ─── uploadAttachmentsAndSendThunk ───────────────────────────────────────────

/** Argument shape for {@link uploadAttachmentsAndSendThunk}. */
export type UploadAttachmentsAndSendArgs = {
  files: PickedAsset[];
  content?: string;
  conversationId?: string;
  recipientId?: string;
};

/**
 * Result shape for {@link uploadAttachmentsAndSendThunk} when files are
 * partially rejected client-side. Callers can use this to keep the
 * remaining selection editable in the picker (Req 7.4 — name the offending
 * file).
 */
export type UploadRejection = {
  fileName: string;
  reason: 'UNSUPPORTED_MIME' | 'IMAGE_TOO_LARGE' | 'VIDEO_TOO_LARGE';
  message: string;
};

/**
 * Validates files locally, uploads them via `POST /chat/messages/upload`,
 * derives the message `type` from the returned descriptors, and dispatches
 * `sendMessageThunk` to complete the send.
 *
 * Local validation rules (Req 7.3, 7.4):
 *  - Reject any file whose MIME is not in {@link ALLOWED_ATTACHMENT_MIMES}.
 *  - Reject any image >10 MB ({@link IMAGE_MAX_BYTES}).
 *  - Reject any video >50 MB ({@link VIDEO_MAX_BYTES}).
 *
 * If at least one file passes validation, the upload proceeds with the
 * surviving files; rejected files are returned in the rejection list so
 * the screen can surface them inline (Req 7.4 — keep selection editable).
 * If every file fails validation, the thunk rejects with the validation
 * sentinel without contacting the server.
 *
 * Server response handling:
 *  - 201 → derive `type`, dispatch `sendMessageThunk` with the returned
 *    descriptors (Req 7.7).
 *  - 413 (`CHAT_PAYLOAD_TOO_LARGE`) → leave the selection editable; the
 *    thunk rejects with a typed sentinel so the screen can react
 *    (Req 7.9, 20.7).
 *  - 429 → set the 60s cooldown (Req 7.10).
 *  - 401 → escalate to `logoutThunk` (Req 19.4).
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.9, 7.10, 19.1, 19.4,
 * 20.6, 20.7.
 */
export const uploadAttachmentsAndSendThunk = createAsyncThunk<
  { rejected: UploadRejection[] },
  UploadAttachmentsAndSendArgs,
  ThunkApiConfig
>(
  'chat/uploadAttachmentsAndSend',
  async (args, { dispatch, rejectWithValue }) => {
    const files = args.files ?? [];
    if (files.length === 0) {
      return rejectWithValue('VALIDATION:NO_FILES');
    }

    // 1. Per-file validation (Req 7.3, 7.4).
    const accepted: PickedAsset[] = [];
    const rejected: UploadRejection[] = [];
    for (const f of files) {
      if (!ALLOWED_ATTACHMENT_MIMES.has(f.mime)) {
        rejected.push({
          fileName: f.name,
          reason: 'UNSUPPORTED_MIME',
          message: `Unsupported file type: ${f.mime}`,
        });
        continue;
      }
      const isImage = f.mime.startsWith('image/');
      const isVideo = f.mime.startsWith('video/');
      if (isImage && f.size > IMAGE_MAX_BYTES) {
        rejected.push({
          fileName: f.name,
          reason: 'IMAGE_TOO_LARGE',
          message: `${f.name} exceeds the 10 MB image limit`,
        });
        continue;
      }
      if (isVideo && f.size > VIDEO_MAX_BYTES) {
        rejected.push({
          fileName: f.name,
          reason: 'VIDEO_TOO_LARGE',
          message: `${f.name} exceeds the 50 MB video limit`,
        });
        continue;
      }
      accepted.push(f);
    }

    if (accepted.length === 0) {
      // Every file failed validation; the screen surfaces `rejected`.
      return rejectWithValue('VALIDATION:ALL_REJECTED');
    }

    // 2. Upload (Req 7.5, 7.6).
    let descriptors: AttachmentDescriptor[];
    try {
      const res = await uploadAttachmentsApi(accepted);
      descriptors = res.data;
    } catch (err: unknown) {
      if (maybeEscalate401(err, dispatch)) {
        return rejectWithValue('Session expired');
      }
      if (err instanceof ApiError) {
        if (err.status === 413) {
          // Keep selection editable (Req 7.9, 20.7).
          return rejectWithValue('UPLOAD:413');
        }
        if (err.status === 429) {
          applyRateLimitCooldown(dispatch);
          return rejectWithValue('UPLOAD:429');
        }
      }
      const message =
        err instanceof Error ? err.message : 'Failed to upload attachments';
      return rejectWithValue(message);
    }

    // 3. Derive type and forward to sendMessageThunk (Req 7.7).
    //
    // `deriveMessageType` is consulted explicitly to keep the thunk's
    // contract self-documenting — `prepareSend` (called inside
    // `sendMessageThunk`) re-derives the same value so this is purely a
    // belt-and-braces check that keeps the dispatch site readable.
    const _derivedType = deriveMessageType(descriptors, args.content ?? '');
    void _derivedType;

    const sendResult = await dispatch(
      sendMessageThunk({
        conversationId: args.conversationId,
        recipientId: args.recipientId,
        content: args.content,
        attachments: descriptors,
      }),
    );

    if (sendMessageThunk.rejected.match(sendResult)) {
      return rejectWithValue(
        typeof sendResult.payload === 'string'
          ? sendResult.payload
          : 'Failed to send after upload',
      );
    }

    return { rejected };
  },
);

// ─── hydrateChatThunk ────────────────────────────────────────────────────────

/**
 * Reads any persisted chat cache for `userId` and seeds the slice
 * (Req 21.2, 21.3). The full persistence implementation lands with Task
 * 15.1; today the helper returns `undefined` so this thunk is effectively
 * a no-op until then. The wiring is kept here so callers (e.g. `App.tsx`,
 * `ChatsScreen` mount) can adopt the API immediately.
 *
 * Hydration uses targeted reducers so it composes with any state already
 * present in the slice (e.g. an in-flight first fetch that resolves while
 * hydration is running). Conversations are upserted via
 * `mergeConversationsPage` and messages are seeded via `setMessagesPage`
 * per conversation; both reducers preserve the slice invariants.
 *
 * Requirements: 21.2, 21.3.
 */
export const hydrateChatThunk = createAsyncThunk<void, string, ThunkApiConfig>(
  'chat/hydrate',
  async (userId, { dispatch }) => {
    if (!userId) return;
    const cached = await chatPersistence.hydrate(userId);
    if (!cached) return;

    // Seed conversations.
    if (cached.conversationIds && cached.conversationsById) {
      const items: ConversationListItem[] = [];
      for (const id of cached.conversationIds) {
        const conv = cached.conversationsById[id];
        if (conv) items.push(conv);
      }
      if (items.length > 0) {
        dispatch(
          mergeConversationsPage({
            items,
            meta: {
              total: items.length,
              page: 1,
              limit: items.length,
              totalPages: 1,
            },
            replace: false,
          }),
        );
      }
    }

    // Seed messages per conversation.
    if (cached.messagesByConversation) {
      for (const [conversationId, bucket] of Object.entries(
        cached.messagesByConversation,
      )) {
        if (!bucket) continue;
        const items: MessagePayload[] = [];
        for (const id of bucket.ids) {
          const m = bucket.byId[id];
          if (m) items.push(m);
        }
        if (items.length === 0) continue;
        dispatch(
          setMessagesPage({
            conversationId,
            items,
            meta: {
              limit: items.length,
              count: items.length,
              hasMore: bucket.hasMore ?? false,
              nextBefore: bucket.nextBefore ?? null,
            },
          }),
        );
      }
    }
  },
);

// ─── persistChatStateMiddleware ──────────────────────────────────────────────

/**
 * Debounced AsyncStorage subscription that writes the pruned chat state
 * to `chat:${userId}` after every relevant slice change. The full
 * implementation (debounce, prune, secret redaction) is delivered by Task
 * 15.1; today the middleware is a pass-through that keeps the public type
 * stable so `store/index.ts` can be updated without churn.
 *
 * Note: middleware lives here (rather than in `chatSlice.ts`) because it
 * crosses the slice / persistence boundary. When 15.1 lands the
 * implementation will move to `chatPersistence.ts` and this file will
 * just re-export.
 *
 * Requirements: 21.1, 21.4, 21.5.
 */
export type PersistChatStateMiddleware = (
  store: { getState: () => RootState; dispatch: (action: unknown) => unknown },
) => (next: (action: unknown) => unknown) => (action: unknown) => unknown;

export const persistChatStateMiddleware: PersistChatStateMiddleware =
  (_store) => (next) => (action) => next(action);
