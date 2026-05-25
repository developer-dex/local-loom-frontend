/**
 * Pure helpers for the Chat module.
 *
 * These functions are deliberately side-effect free and have no dependency on
 * Redux, the network layer, or React — they're consumed by thunks, reducers,
 * and screens, and verified directly by property-based tests.
 *
 * Implements design Properties 3 (send validation), 4 (pagination/search
 * params), 7 (attachment type derivation) and the REST-status → ChatErrorCode
 * mapping used by error reporting throughout the slice.
 */

import { ApiError } from './errors';
import type {
  AttachmentDescriptor,
  ChatErrorCode,
  ListConversationsParams,
  ListMessagesParams,
  MessageType,
  PaginatedMeta,
  SendMessageRequest,
} from './chatTypes';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Max characters of trimmed search input passed to the server (Req 3.3). */
export const SEARCH_QUERY_MAX_LEN = 100;

/** Default page size when no prior `meta` is known (Req 2.1). */
export const CONVERSATIONS_DEFAULT_LIMIT = 20;

/** Default cursor-page size for messages (Req 5.1). */
export const MESSAGES_DEFAULT_LIMIT = 100;

/** Maximum content length for an outbound text message (Req 6.8). */
export const MESSAGE_CONTENT_MAX_LEN = 5000;

/** Maximum attachments per outbound message (Req 7.1, 7.2). */
export const ATTACHMENTS_MAX_COUNT = 5;

/** Maximum image size in bytes (Req 7.4). */
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;

/** Maximum video size in bytes (Req 7.4). */
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

/** Maximum serialized payload size for `chat:send-message` (Req 6.9). */
export const SEND_PAYLOAD_MAX_BYTES = 64 * 1024;

/** Allowed attachment MIME types (Req 7.3). */
export const ALLOWED_ATTACHMENT_MIMES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

// ─── prepareSend ─────────────────────────────────────────────────────────────

/**
 * Extension of `ChatErrorCode` covering local validation failures that never
 * reach the server. Mirrors the `LocalMessage.error.code` union in the design.
 */
export type PrepareSendErrorCode = ChatErrorCode | 'CLIENT_VALIDATION';

export type PrepareSendInput = {
  content?: string;
  attachments?: AttachmentDescriptor[];
  conversationId?: string;
  recipientId?: string;
};

/**
 * Loose shape of the slice/auth state passed to `prepareSend`.
 * Validation does not currently depend on state, but the parameter is part of
 * the documented signature so that future rules (cooldown, throttling) can be
 * folded in without churning callers.
 */
export type PrepareSendState = unknown;

export type PrepareSendOk = {
  ok: true;
  payload: SendMessageRequest & {
    clientMessageId: string;
    type: MessageType;
  };
};

export type PrepareSendErr = {
  ok: false;
  code: PrepareSendErrorCode;
};

export type PrepareSendResult = PrepareSendOk | PrepareSendErr;

/**
 * Validates a candidate send input against the rules in design Property 3 and
 * (on success) returns a fully-populated payload with a UUID v4
 * `clientMessageId` and a derived `type`.
 *
 * Validation runs in the documented order so that the most descriptive error
 * code is reported when more than one rule fails simultaneously.
 */
export function prepareSend(
  input: PrepareSendInput,
  _currentState?: PrepareSendState,
): PrepareSendResult {
  const content = input.content ?? '';
  const attachments = input.attachments ?? [];

  // (g) target — must have either conversationId or recipientId (Req 8.4).
  const hasTarget =
    (typeof input.conversationId === 'string' && input.conversationId.length > 0) ||
    (typeof input.recipientId === 'string' && input.recipientId.length > 0);
  if (!hasTarget) {
    return { ok: false, code: 'CLIENT_VALIDATION' };
  }

  // (a) empty — no text and no attachments (Req 6.1, 6.7).
  if (content.trim().length === 0 && attachments.length === 0) {
    return { ok: false, code: 'CLIENT_VALIDATION' };
  }

  // (b) oversize text (Req 6.8).
  if (content.length > MESSAGE_CONTENT_MAX_LEN) {
    return { ok: false, code: 'CLIENT_VALIDATION' };
  }

  // (c) too many attachments (Req 7.2).
  if (attachments.length > ATTACHMENTS_MAX_COUNT) {
    return { ok: false, code: 'CLIENT_VALIDATION' };
  }

  // (d) unsupported MIME (Req 7.3) and (e) per-file size (Req 7.4).
  for (const a of attachments) {
    if (!ALLOWED_ATTACHMENT_MIMES.has(a.mime)) {
      return { ok: false, code: 'CLIENT_VALIDATION' };
    }
    if (a.type === 'image' && a.size > IMAGE_MAX_BYTES) {
      return { ok: false, code: 'CLIENT_VALIDATION' };
    }
    if (a.type === 'video' && a.size > VIDEO_MAX_BYTES) {
      return { ok: false, code: 'CLIENT_VALIDATION' };
    }
  }

  // Build the candidate payload.
  const clientMessageId = generateUuidV4();
  const type = deriveMessageType(attachments, content);

  const payload: SendMessageRequest & {
    clientMessageId: string;
    type: MessageType;
  } = {
    clientMessageId,
    type,
    // Always send the trimmed-but-original-cased content (caller may pass
    // either; the trim check above ensures non-empty when no attachments).
    ...(content.length > 0 ? { content } : {}),
    ...(attachments.length > 0 ? { attachments } : {}),
    ...(input.conversationId ? { conversationId: input.conversationId } : {}),
    ...(input.recipientId ? { recipientId: input.recipientId } : {}),
  };

  // (f) serialized payload too large (Req 6.9).
  let serializedLen: number;
  try {
    serializedLen = JSON.stringify(payload).length;
  } catch {
    // Circular references shouldn't occur on AttachmentDescriptor data, but
    // fail closed if they somehow do.
    return { ok: false, code: 'CHAT_PAYLOAD_TOO_LARGE' };
  }
  if (serializedLen > SEND_PAYLOAD_MAX_BYTES) {
    return { ok: false, code: 'CHAT_PAYLOAD_TOO_LARGE' };
  }

  return { ok: true, payload };
}

// ─── deriveMessageType ───────────────────────────────────────────────────────

/**
 * Derives the `type` field for an outbound message per design Property 7
 * (Req 7.7).
 *
 * - empty attachments + non-empty content → `'text'`
 * - all attachments are image → `'image'`
 * - all attachments are video → `'video'`
 * - mix of image and video → `'mixed'`
 *
 * Falls back to `'text'` for an empty attachment list with empty content
 * (which `prepareSend` rejects upstream — `deriveMessageType` is total so
 * callers can use it in any context).
 */
export function deriveMessageType(
  attachments: ReadonlyArray<AttachmentDescriptor> | undefined,
  _content: string | undefined,
): MessageType {
  if (!attachments || attachments.length === 0) {
    return 'text';
  }
  let hasImage = false;
  let hasVideo = false;
  for (const a of attachments) {
    if (a.type === 'image') hasImage = true;
    else if (a.type === 'video') hasVideo = true;
    if (hasImage && hasVideo) return 'mixed';
  }
  if (hasImage && !hasVideo) return 'image';
  if (hasVideo && !hasImage) return 'video';
  return 'mixed';
}

// ─── Request builders ────────────────────────────────────────────────────────

export type BuildConversationsRequestArgs = {
  /** The most recent `meta` from `ListConversationsResponse`, if any. */
  meta: PaginatedMeta | null | undefined;
  /** Raw user-typed search input (untrimmed, may include trailing spaces). */
  search?: string;
  /** Page to fetch. Defaults to 1 when omitted. */
  page?: number;
};

/**
 * Builds the query parameters for `GET /chat/conversations` per design
 * Property 4. Trimmed-empty `search` is omitted (so the server returns the
 * full list); non-empty `search` is clamped to {@link SEARCH_QUERY_MAX_LEN}
 * characters.
 */
export function buildConversationsRequest({
  meta,
  search,
  page,
}: BuildConversationsRequestArgs): ListConversationsParams {
  const trimmed = (search ?? '').trim();
  const params: ListConversationsParams = {
    page: page ?? 1,
    limit: meta?.limit ?? CONVERSATIONS_DEFAULT_LIMIT,
  };
  if (trimmed.length > 0) {
    params.search = trimmed.slice(0, SEARCH_QUERY_MAX_LEN);
  }
  return params;
}

export type BuildMessagesRequestArgs = {
  conversationId: string;
  /** Cursor returned in the most recent `CursorMeta.nextBefore`, if any. */
  nextBefore?: string | null;
  /** Page size override; defaults to {@link MESSAGES_DEFAULT_LIMIT}. */
  limit?: number;
};

export type BuiltMessagesRequest = {
  conversationId: string;
  params: ListMessagesParams;
};

/**
 * Builds the cursor request for `GET /chat/conversations/:id/messages` per
 * design Property 4(d). `before` is included only when fetching older pages
 * (i.e. `nextBefore` is a non-empty string).
 */
export function buildMessagesRequest({
  conversationId,
  nextBefore,
  limit,
}: BuildMessagesRequestArgs): BuiltMessagesRequest {
  const params: ListMessagesParams = {
    limit: limit ?? MESSAGES_DEFAULT_LIMIT,
  };
  if (typeof nextBefore === 'string' && nextBefore.length > 0) {
    params.before = nextBefore;
  }
  return { conversationId, params };
}

// ─── Error code mapping ──────────────────────────────────────────────────────

/**
 * Maps an HTTP status to the documented `ChatErrorCode`. Returns `null` for
 * statuses that don't have a specific chat code (network/5xx/etc.) so callers
 * can fall back to a generic message.
 */
export function mapStatusToCode(status: number): ChatErrorCode | null {
  switch (status) {
    case 400:
      return 'CHAT_VALIDATION_ERROR';
    case 401:
      return 'CHAT_UNAUTHORIZED';
    case 403:
      return 'CHAT_FORBIDDEN';
    case 404:
      return 'CHAT_NOT_FOUND';
    case 409:
      return 'CHAT_CONFLICT';
    case 413:
      return 'CHAT_PAYLOAD_TOO_LARGE';
    case 429:
      return 'CHAT_RATE_LIMITED';
    default:
      return null;
  }
}

const KNOWN_CHAT_ERROR_CODES: ReadonlySet<ChatErrorCode> = new Set<ChatErrorCode>([
  'CHAT_VALIDATION_ERROR',
  'CHAT_UNAUTHORIZED',
  'CHAT_FORBIDDEN',
  'CHAT_NOT_FOUND',
  'CHAT_CONFLICT',
  'CHAT_RATE_LIMITED',
  'CHAT_PAYLOAD_TOO_LARGE',
  'CHAT_UPLOAD_FAILED',
  'CHAT_AUTOSUBSCRIBE_FAILED',
  'CHAT_JOIN_FORBIDDEN',
]);

/**
 * Pulls a `ChatErrorCode` out of an unknown error.
 *
 * - For `ApiError` instances, prefers `body.code` when the server included one
 *   (this covers the rare REST endpoints that echo a code) and falls back to
 *   {@link mapStatusToCode}.
 * - For socket-style error objects (`{ code, message }`) the `code` is taken
 *   directly when it matches the closed union.
 * - Returns `null` when no chat code can be identified — callers should treat
 *   `null` as a transport / unknown-error case.
 */
export function extractChatErrorCode(err: unknown): ChatErrorCode | null {
  if (err instanceof ApiError) {
    const fromBody = readCodeField(err.body);
    if (fromBody) return fromBody;
    return mapStatusToCode(err.status);
  }
  // Plain socket error / ack failure with `{ code }` shape.
  return readCodeField(err);
}

function readCodeField(value: unknown): ChatErrorCode | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = (value as { code?: unknown }).code;
  if (typeof candidate !== 'string') return null;
  return KNOWN_CHAT_ERROR_CODES.has(candidate as ChatErrorCode)
    ? (candidate as ChatErrorCode)
    : null;
}

// ─── UUID v4 ─────────────────────────────────────────────────────────────────

/**
 * Generates a UUID v4 suitable for `clientMessageId`. Uses
 * `crypto.randomUUID` when available (Hermes / modern browsers / Node 19+)
 * and falls back to a `Math.random`-based generator. The id is used purely
 * for client-side deduplication, so the fallback's reduced entropy is
 * acceptable.
 */
export function generateUuidV4(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  const hex = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      out += '-';
      continue;
    }
    if (i === 14) {
      out += '4';
      continue;
    }
    if (i === 19) {
      // bits 6-7 of clock_seq_hi_and_reserved set to '10' → first hex digit
      // must be one of 8, 9, a, b.
      out += hex[Math.floor(Math.random() * 4) + 8];
      continue;
    }
    out += hex[Math.floor(Math.random() * 16)];
  }
  return out;
}
