/**
 * Chat persistence — AsyncStorage-backed cache for the chat slice.
 *
 * Storage key: `chat:${userId}` (one entry per authenticated user so
 * multi-account devices don't bleed). Payload version: 1.
 *
 * Pruning rules (write-time):
 *  - Top 50 conversations by `lastMessageAt` desc.
 *  - Per kept conversation, top 100 messages by `createdAt` desc, stored
 *    back in ascending order to match the slice convention.
 *  - Skip messages with `localStatus === 'pending' | 'failed'`.
 *  - Strip attachment fields holding device-local URIs
 *    (`file://`, `content://`, `ph://`).
 *  - Never persist notifications, typing, presence, send cooldown, or
 *    socket errors. Tokens never reach this module — they live in
 *    `tokenStorage` (SecureStore) and are not part of `ChatSliceState`.
 *
 * Hydration:
 *  - Parses JSON, validates `version === 1` and the expected top-level
 *    shape; returns `undefined` for missing / corrupt / version-mismatched
 *    payloads so callers fall back to network state.
 *
 * Subscription helper:
 *  - {@link subscribeChatPersistence} drives a 500ms-debounced AsyncStorage
 *    write whenever the `chat` slice reference changes. It reads the
 *    current userId from `state.auth.user?.id` and skips persisting when
 *    no user is signed in (logged-out sessions stay clean).
 *
 * Requirements: 9.2, 21.1, 21.2, 21.3, 21.4, 21.5.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AttachmentDescriptor,
  ConversationListItem,
} from './chatTypes';
import type {
  ChatSliceState,
  ConversationMessages,
  LocalMessage,
} from '../store/slices/chatSlice';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Current persisted-payload schema version. Bump when the shape changes. */
const PAYLOAD_VERSION = 1 as const;

/** Maximum conversations retained per persisted snapshot (Req 21.1). */
const MAX_CONVERSATIONS = 50;

/** Maximum messages retained per conversation per snapshot (Req 21.1). */
const MAX_MESSAGES_PER_CONVERSATION = 100;

/** Debounce window for {@link subscribeChatPersistence} writes. */
const PERSIST_DEBOUNCE_MS = 500;

/** URI prefixes that identify device-local file references (Req 21.5). */
const LOCAL_URI_PREFIXES = ['file://', 'content://', 'ph://'] as const;

// ─── Public types ────────────────────────────────────────────────────────────

/**
 * Subset of the slice that {@link hydrate} returns. Keeps the public type
 * focused on what the hydrate-thunk needs to seed.
 */
export type HydratedChatState = Partial<
  Pick<
    ChatSliceState,
    'conversationIds' | 'conversationsById' | 'messagesByConversation'
  >
>;

/**
 * Minimal store shape required by {@link subscribeChatPersistence}. We
 * intentionally do not depend on the project's `RootState` type here —
 * the helper only needs `auth.user?.id` and the `chat` slice — so the
 * persistence module can stay decoupled from the store wiring.
 */
export type ChatPersistenceStore = {
  getState: () => {
    auth?: { user?: { id?: string | null } | null } | null;
    chat?: ChatSliceState;
  };
  subscribe: (listener: () => void) => () => void;
};

// ─── Storage key helpers ─────────────────────────────────────────────────────

/** Storage key shape used for all persisted chat payloads. */
export function storageKeyForUser(userId: string): string {
  return `chat:${userId}`;
}

// ─── Sanitization helpers ────────────────────────────────────────────────────

/** Returns true when `value` is a string starting with a known local-URI prefix. */
function isLocalUri(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return LOCAL_URI_PREFIXES.some((prefix) => value.startsWith(prefix));
}

/**
 * Returns a shallow copy of `att` with any field holding a device-local URI
 * removed. Server-relative URLs (e.g. `/public/chat-attachments/...`) are
 * preserved untouched. Cleans both `url` and `thumbnailUrl`.
 */
function sanitizeAttachment(att: AttachmentDescriptor): AttachmentDescriptor {
  const clone: AttachmentDescriptor = {
    url: isLocalUri(att.url) ? '' : att.url,
    type: att.type,
    mime: att.mime,
    size: att.size,
  };
  if (att.thumbnailUrl !== undefined && !isLocalUri(att.thumbnailUrl)) {
    clone.thumbnailUrl = att.thumbnailUrl;
  }
  if (typeof att.width === 'number') clone.width = att.width;
  if (typeof att.height === 'number') clone.height = att.height;
  if (typeof att.durationMs === 'number') clone.durationMs = att.durationMs;
  return clone;
}

/**
 * Returns a sanitized `LocalMessage` suitable for persistence. Always sets
 * `localStatus: 'sent'` because pending / failed messages are filtered out
 * before this is reached. Strips local URIs from attachments.
 */
function sanitizeMessage(msg: LocalMessage): LocalMessage {
  const sanitized: LocalMessage = {
    ...msg,
    attachments: (msg.attachments ?? []).map(sanitizeAttachment),
    localStatus: 'sent',
  };
  // Drop the runtime `error` field — only relevant for failed sends, which
  // never make it past the filter, but defensive anyway.
  if ('error' in sanitized) {
    delete (sanitized as { error?: unknown }).error;
  }
  return sanitized;
}

// ─── Pruning helpers ─────────────────────────────────────────────────────────

/**
 * Selects the top `MAX_CONVERSATIONS` conversation ids from `state` ordered
 * by `lastMessageAt` desc. Conversations with a missing / empty
 * `lastMessageAt` sort last so populated rows are always preferred. Ties
 * are broken by `updatedAt` desc and `id` asc to match the slice's
 * comparator.
 */
function pickTopConversationIds(state: ChatSliceState): string[] {
  const known = state.conversationIds.filter((id) => state.conversationsById[id]);
  const sorted = [...known].sort((idA, idB) => {
    const a = state.conversationsById[idA];
    const b = state.conversationsById[idB];
    const aHas =
      typeof a.lastMessageAt === 'string' && a.lastMessageAt.length > 0;
    const bHas =
      typeof b.lastMessageAt === 'string' && b.lastMessageAt.length > 0;
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    if (aHas && bHas) {
      if (a.lastMessageAt > b.lastMessageAt) return -1;
      if (a.lastMessageAt < b.lastMessageAt) return 1;
    }
    if (a.updatedAt > b.updatedAt) return -1;
    if (a.updatedAt < b.updatedAt) return 1;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });
  return sorted.slice(0, MAX_CONVERSATIONS);
}

/**
 * Selects the top `MAX_MESSAGES_PER_CONVERSATION` messages from a bucket
 * by `createdAt` desc, drops pending / failed entries, sanitizes
 * attachments, and returns them in ascending `createdAt` order so the
 * persisted layout matches the slice convention.
 *
 * Returns `null` if no messages remain after filtering — the caller can
 * skip emitting an empty bucket entirely.
 */
function buildPersistedMessageBucket(
  bucket: ConversationMessages,
): {
  ids: string[];
  byId: Record<string, LocalMessage>;
  clientMessageIdIndex: Record<string, string>;
  hasMore: boolean;
  nextBefore: string | null;
} | null {
  const eligible: LocalMessage[] = [];
  for (const id of bucket.ids) {
    const m = bucket.byId[id];
    if (!m) continue;
    if (m.localStatus === 'pending' || m.localStatus === 'failed') continue;
    eligible.push(m);
  }
  if (eligible.length === 0) return null;

  // Top 100 by createdAt desc.
  const byCreatedDesc = [...eligible].sort((a, b) => {
    if (a.createdAt > b.createdAt) return -1;
    if (a.createdAt < b.createdAt) return 1;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });
  const kept = byCreatedDesc.slice(0, MAX_MESSAGES_PER_CONVERSATION);

  // Restore ascending order (slice convention) and rebuild indexes.
  const ascending = kept
    .map((m) => sanitizeMessage(m))
    .sort((a, b) => {
      if (a.createdAt < b.createdAt) return -1;
      if (a.createdAt > b.createdAt) return 1;
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });

  const ids: string[] = [];
  const byId: Record<string, LocalMessage> = {};
  const clientMessageIdIndex: Record<string, string> = {};
  for (const m of ascending) {
    ids.push(m.id);
    byId[m.id] = m;
    if (typeof m.clientMessageId === 'string' && m.clientMessageId.length > 0) {
      clientMessageIdIndex[m.clientMessageId] = m.id;
    }
  }

  return {
    ids,
    byId,
    clientMessageIdIndex,
    hasMore: Boolean(bucket.hasMore),
    nextBefore: bucket.nextBefore ?? null,
  };
}

// ─── Persisted envelope ──────────────────────────────────────────────────────

type PersistedEnvelope = {
  version: typeof PAYLOAD_VERSION;
  conversationIds: string[];
  conversationsById: Record<string, ConversationListItem>;
  messagesByConversation: Record<
    string,
    {
      ids: string[];
      byId: Record<string, LocalMessage>;
      clientMessageIdIndex: Record<string, string>;
      hasMore: boolean;
      nextBefore: string | null;
    }
  >;
};

function buildEnvelope(state: ChatSliceState): PersistedEnvelope {
  const keptIds = pickTopConversationIds(state);
  const conversationsById: Record<string, ConversationListItem> = {};
  for (const id of keptIds) {
    const conv = state.conversationsById[id];
    if (conv) conversationsById[id] = conv;
  }

  const messagesByConversation: PersistedEnvelope['messagesByConversation'] =
    {};
  for (const id of keptIds) {
    const bucket = state.messagesByConversation[id];
    if (!bucket) continue;
    const persisted = buildPersistedMessageBucket(bucket);
    if (persisted) messagesByConversation[id] = persisted;
  }

  return {
    version: PAYLOAD_VERSION,
    conversationIds: keptIds,
    conversationsById,
    messagesByConversation,
  };
}

// ─── Validation (hydrate path) ───────────────────────────────────────────────

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateEnvelope(raw: unknown): PersistedEnvelope | null {
  if (!isPlainObject(raw)) return null;
  if (raw.version !== PAYLOAD_VERSION) return null;
  if (!Array.isArray(raw.conversationIds)) return null;
  if (!isPlainObject(raw.conversationsById)) return null;
  if (!isPlainObject(raw.messagesByConversation)) return null;

  // Spot-check a couple of nested shapes — we don't deeply validate every
  // field (best-effort hydration is fine), but we do guard against
  // payloads whose top-level shape would crash the hydrate-thunk's
  // reducer dispatches.
  for (const id of raw.conversationIds) {
    if (typeof id !== 'string' || id.length === 0) return null;
  }
  for (const value of Object.values(raw.messagesByConversation)) {
    if (!isPlainObject(value)) return null;
    if (!Array.isArray(value.ids)) return null;
    if (!isPlainObject(value.byId)) return null;
  }

  return raw as unknown as PersistedEnvelope;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Reads and validates the persisted chat snapshot for `userId`. Returns
 * `undefined` for missing keys, JSON parse failures, and version
 * mismatches so callers can fall back to network state without throwing.
 */
export async function hydrate(
  userId: string,
): Promise<HydratedChatState | undefined> {
  if (!userId) return undefined;
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(storageKeyForUser(userId));
  } catch {
    return undefined;
  }
  if (raw == null) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }

  const envelope = validateEnvelope(parsed);
  if (!envelope) return undefined;

  return {
    conversationIds: envelope.conversationIds,
    conversationsById: envelope.conversationsById,
    messagesByConversation: envelope.messagesByConversation,
  };
}

/**
 * Writes the pruned, secret-free projection of `state` to AsyncStorage
 * under `chat:${userId}`. Best-effort: write failures are swallowed so
 * the user-facing chat flow is not blocked by persistence hiccups.
 */
export async function persist(
  state: ChatSliceState,
  userId: string,
): Promise<void> {
  if (!userId) return;
  const envelope = buildEnvelope(state);
  try {
    const json = JSON.stringify(envelope);
    await AsyncStorage.setItem(storageKeyForUser(userId), json);
  } catch {
    // Swallow — persistence is best-effort.
  }
}

/**
 * Removes the persisted chat payload for `userId` (called on logout to
 * satisfy Req 9.2 / 21.4).
 */
export async function clearForUser(userId: string): Promise<void> {
  if (!userId) return;
  try {
    await AsyncStorage.removeItem(storageKeyForUser(userId));
  } catch {
    // Swallow — clearing is best-effort and falls through to user re-login.
  }
}

// ─── Debounced subscription helper ───────────────────────────────────────────

/**
 * Subscribes to the given store and writes a pruned `chat` snapshot to
 * AsyncStorage debounced by 500ms whenever the chat slice reference
 * changes. Skips persisting when no user is signed in (Req 21.5).
 *
 * Returns an unsubscribe function that cancels any pending debounced
 * write and removes the store listener.
 *
 * The store shape is intentionally narrow ({@link ChatPersistenceStore})
 * so callers can pass the project's Redux store without an extra cast
 * — `auth` and `chat` are the only slices this helper reads.
 */
export function subscribeChatPersistence(
  store: ChatPersistenceStore,
): () => void {
  let prevChat: ChatSliceState | undefined = store.getState().chat;
  let pendingTimer: ReturnType<typeof setTimeout> | null = null;

  const flush = (): void => {
    pendingTimer = null;
    const { auth, chat } = store.getState();
    const userId = auth?.user?.id;
    if (!userId || typeof userId !== 'string' || userId.length === 0) return;
    if (!chat) return;
    // Fire-and-forget — `persist` swallows its own errors.
    void persist(chat, userId);
  };

  const listener = (): void => {
    const nextChat = store.getState().chat;
    if (nextChat === prevChat) return;
    prevChat = nextChat;
    if (pendingTimer != null) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(flush, PERSIST_DEBOUNCE_MS);
  };

  const unsubscribe = store.subscribe(listener);

  return () => {
    if (pendingTimer != null) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
    unsubscribe();
  };
}
