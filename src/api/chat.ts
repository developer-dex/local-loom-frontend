/**
 * Chat REST API — wrappers around `authenticatedGet` / `authenticatedPost`.
 *
 * Each function maps 1-to-1 with an endpoint under `/api/v1/chat/*` documented
 * in the chat module API contract. Request shapes follow design Property 4
 * (pagination/search params) and the Send / Upload / Mark-Read shapes used by
 * the Redux thunks in `chatSlice`.
 *
 * All wrappers reuse the existing authenticated HTTP client so that 401
 * refresh-and-retry, Bearer-header injection, and `ApiError` shaping behave
 * exactly as they do for other domain modules — no parallel HTTP client.
 *
 * Requirements: 1.1, 1.6, 2.1, 4.1, 5.1, 5.3, 6.4, 7.5, 8.1, 13.4, 16.1,
 * 17.1, 17.2, 19.1.
 */
import { authenticatedGet, authenticatedPost } from './client';
import type {
  CreateConversationResponse,
  GetConversationResponse,
  ListConversationsParams,
  ListConversationsResponse,
  ListMessagesParams,
  ListMessagesResponse,
  MarkReadResponse,
  PickedAsset,
  SendMessageRequest,
  SendMessageResponse,
  UploadAttachmentsResponse,
} from './chatTypes';

const BASE = '/chat';

// ─── Conversations ───────────────────────────────────────────────────────────

/**
 * GET /api/v1/chat/conversations
 *
 * Lists the authenticated user's conversations ordered by `lastMessageAt`
 * descending (server-side). Honors `page`, `limit`, and the optional
 * `search` query parameter (caller is responsible for trimming and clamping
 * `search` to 100 characters via {@link buildConversationsRequest}).
 *
 * Requirements: 2.1, 3.1, 3.2, 4.1.
 */
export function listConversationsApi(
  params?: ListConversationsParams,
): Promise<ListConversationsResponse> {
  return authenticatedGet<ListConversationsResponse>(`${BASE}/conversations`, {
    query: {
      page: params?.page,
      limit: params?.limit,
      // Pass `search` only when the caller supplied a non-empty value; the
      // shared query serializer drops `undefined` entries.
      search: params?.search,
    },
  });
}

/**
 * GET /api/v1/chat/conversations/:conversationId
 *
 * Fetches a single conversation. Used by the realtime path when a
 * `chat:message` event arrives for a conversation the slice has not yet
 * loaded (Req 17.2).
 *
 * Requirements: 8.1 (auto-create-on-send echo path), 17.1, 17.2.
 */
export function getConversationApi(
  conversationId: string,
): Promise<GetConversationResponse> {
  return authenticatedGet<GetConversationResponse>(
    `${BASE}/conversations/${encodeURIComponent(conversationId)}`,
  );
}

/**
 * POST /api/v1/chat/conversations
 *
 * Creates (or returns the existing) 1:1 conversation between the
 * authenticated user and `otherUserId`. Used by the "Start chat" action
 * from tradie/user profile screens.
 *
 * Requirements: 8.1.
 */
export function createConversationApi(
  otherUserId: string,
): Promise<CreateConversationResponse> {
  return authenticatedPost<CreateConversationResponse>(`${BASE}/conversations`, {
    body: { otherUserId },
  });
}

// ─── Messages ────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/chat/conversations/:conversationId/messages
 *
 * Cursor-paginated. Server returns newest-first in `data.items`; the slice
 * reverses to ascending before storing. `limit` defaults to 100 (Req 5.1)
 * when the caller does not supply one. `before` is included only for older
 * pages (Req 5.3); the shared query serializer drops `undefined`.
 *
 * Requirements: 5.1, 5.3.
 */
export function listMessagesApi(
  conversationId: string,
  params?: ListMessagesParams,
): Promise<ListMessagesResponse> {
  return authenticatedGet<ListMessagesResponse>(
    `${BASE}/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      query: {
        limit: params?.limit ?? 100,
        before: params?.before,
      },
    },
  );
}

/**
 * POST /api/v1/chat/messages
 *
 * REST fallback for sending a message when the socket transport is not
 * connected (Req 6.4). The request shape is identical to the
 * `chat:send-message` socket emit — same canonical write path.
 *
 * Requirements: 6.4, 7.5 (post-upload send), 8.1, 8.4 (auto-create-on-send
 * with `recipientId`).
 */
export function sendMessageApi(
  req: SendMessageRequest,
): Promise<SendMessageResponse> {
  return authenticatedPost<SendMessageResponse>(`${BASE}/messages`, {
    body: req,
  });
}

// ─── Attachment uploads ──────────────────────────────────────────────────────

/**
 * POST /api/v1/chat/messages/upload
 *
 * Uploads 1-5 attachments in a single `multipart/form-data` request. Per the
 * API contract, the field name for files is `files` (repeated), and per-file
 * metadata is sent as `width[i]`, `height[i]`, `durationMs[i]`,
 * `thumbnailUrl[i]` indexed by the file's position in the form.
 *
 * Caller is responsible for client-side MIME and size validation (Req 7.3,
 * 7.4) before invoking this function.
 *
 * Requirements: 7.5.
 */
export function uploadAttachmentsApi(
  files: PickedAsset[],
): Promise<UploadAttachmentsResponse> {
  if (files.length === 0) {
    throw new Error('At least one file is required');
  }

  const form = new FormData();
  files.forEach((f, i) => {
    // React Native's FormData accepts `{ uri, name, type }` objects; the cast
    // through `unknown` is the established convention in this codebase
    // (see `tradies.ts` and `auth.ts`).
    form.append('files', {
      uri: f.uri,
      name: f.name,
      type: f.mime,
    } as unknown as Blob);

    if (f.width !== undefined) form.append(`width[${i}]`, String(f.width));
    if (f.height !== undefined) form.append(`height[${i}]`, String(f.height));
    if (f.durationMs !== undefined) {
      form.append(`durationMs[${i}]`, String(f.durationMs));
    }
    if (f.thumbnailUrl !== undefined) {
      form.append(`thumbnailUrl[${i}]`, f.thumbnailUrl);
    }
  });

  return authenticatedPost<UploadAttachmentsResponse>(`${BASE}/messages/upload`, {
    body: form,
  });
}

// ─── Mark conversation as read ───────────────────────────────────────────────

/**
 * POST /api/v1/chat/conversations/:conversationId/read
 *
 * REST fallback for `chat:mark-read` when the socket transport is not
 * connected (Req 13.4). Omits `lastReadMessageId` from the body when
 * undefined so the server applies its "mark up to newest" behavior.
 *
 * Requirements: 13.4, 16.1.
 */
export function markReadApi(
  conversationId: string,
  lastReadMessageId?: string,
): Promise<MarkReadResponse> {
  return authenticatedPost<MarkReadResponse>(
    `${BASE}/conversations/${encodeURIComponent(conversationId)}/read`,
    {
      body: lastReadMessageId ? { lastReadMessageId } : {},
    },
  );
}
