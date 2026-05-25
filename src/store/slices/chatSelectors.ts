/**
 * Chat selectors — typed accessors over the `chat` slice.
 *
 * Lives next to `chatSlice.ts` (the slice file is already large; co-locating
 * the selectors here keeps it focused on state/reducers). All selectors are
 * plain functions:
 *   - Top-level:    `(state: RootState) => T`
 *   - Parameterized: `(arg) => (state: RootState) => T`
 *
 * Selectors are intentionally non-memoised — array results allocate a fresh
 * array on each call. Hot consumers (FlatList renderers, etc.) can wrap with
 * `useMemo` / `reselect` at the call site if profiling shows it matters.
 *
 * Note on typing: `RootState` is augmented with `chat: ChatSliceState` here
 * so this file type-checks today even though the reducer registration
 * (`store/index.ts`) is being updated in parallel by task 6.3. Once that
 * lands, `RootState` already has the `chat` key and the intersection is a
 * no-op.
 *
 * _Requirements: 2.3, 4.2, 5.2, 12.4, 12.5, 13.6, 14.2, 14.3, 16.2, 20.2_
 */
import type { RootState } from '../index';
import type { ConnectionStatus } from '../../api/chatSocket';
import type { ConversationListItem } from '../../api/chatTypes';
import type {
  ChatSliceState,
  ConversationMessages,
  LocalMessage,
} from './chatSlice';

/**
 * Bridge type so this module compiles independently of the parallel
 * reducer-registration task. Resolves to `RootState` once `chat` is
 * registered there.
 */
type RootStateWithChat = RootState & { chat: ChatSliceState };

/** Width of the typing-indicator window per Requirement 12.5. */
const TYPING_WINDOW_MS = 5000;

/** Single typing entry shape returned by {@link selectTypingUsersForActive}. */
export type TypingUser = {
  userId: string;
  name: string;
  lastEventAt: number;
};

/**
 * Returns the conversations in the slice-defined order (descending
 * `lastMessageAt`, ties broken by `updatedAt` desc then `id` asc, with
 * lastMessageAt-less entries pushed to the bottom). Drops any id whose
 * `byId` entry is missing — the slice keeps these in sync, but a defensive
 * filter avoids returning `undefined` to consumers under any reducer race.
 *
 * _Requirements: 2.3, 4.2_
 */
export const selectOrderedConversations = (
  state: RootStateWithChat,
): ConversationListItem[] => {
  const { conversationIds, conversationsById } = state.chat;
  const result: ConversationListItem[] = [];
  for (const id of conversationIds) {
    const conv = conversationsById[id];
    if (conv) result.push(conv);
  }
  return result;
};

/**
 * Parameterised selector returning messages for a conversation ordered
 * ascending by `createdAt`. Returns an empty array when the conversation
 * has no bucket yet (the screen is allowed to render against an
 * uninitialised conversation while the first fetch is in flight).
 *
 * _Requirements: 5.2_
 */
export const selectOrderedMessages =
  (conversationId: string) =>
  (state: RootStateWithChat): LocalMessage[] => {
    const bucket: ConversationMessages | undefined =
      state.chat.messagesByConversation[conversationId];
    if (!bucket) return [];
    const result: LocalMessage[] = [];
    for (const id of bucket.ids) {
      const m = bucket.byId[id];
      if (m) result.push(m);
    }
    return result;
  };

/**
 * Returns the typing users for the active conversation whose latest
 * `chat:typing` event was received within the last 5 seconds
 * (Requirement 12.5). Uses `Date.now()` so consumers must re-render on a
 * timer (or on each new typing event) to see entries fall out of the
 * window. Returns an empty array when there is no active conversation or
 * no recent events.
 *
 * _Requirements: 12.4, 12.5_
 */
export const selectTypingUsersForActive = (
  state: RootStateWithChat,
): TypingUser[] => {
  const activeId = state.chat.activeConversationId;
  if (!activeId) return [];
  const map = state.chat.typingByConversation[activeId];
  if (!map) return [];
  const now = Date.now();
  const out: TypingUser[] = [];
  for (const userId of Object.keys(map)) {
    const entry = map[userId];
    if (!entry) continue;
    if (now - entry.lastEventAt < TYPING_WINDOW_MS) {
      out.push({ userId, name: entry.name, lastEventAt: entry.lastEventAt });
    }
  }
  return out;
};

/**
 * Returns whether the other participant of the given conversation is
 * currently online. Resolves to `false` when the conversation is unknown,
 * has no `otherParticipant`, or the presence map has no entry for that
 * participant (Requirement 14.3 — absence is rendered as offline).
 *
 * _Requirements: 14.2, 14.3_
 */
export const selectIsOtherOnline =
  (conversationId: string) =>
  (state: RootStateWithChat): boolean => {
    const conv = state.chat.conversationsById[conversationId];
    const otherId = conv?.otherParticipant?.id;
    if (!otherId) return false;
    return state.chat.presence[otherId] === true;
  };

/**
 * Returns whether sending is currently allowed at the supplied `now`
 * (epoch ms). Returns `true` when no cooldown is active, or when the
 * cooldown deadline has elapsed (Requirement 20.2 / 20.3).
 *
 * Parameterised on `now` (rather than reading `Date.now()` internally) so
 * that consumers can drive countdown re-renders deterministically and so
 * tests can pass synthetic timestamps.
 *
 * _Requirements: 20.2_
 */
export const selectCanSend =
  (now: number) =>
  (state: RootStateWithChat): boolean => {
    const endsAt = state.chat.sendCooldownEndsAt;
    if (endsAt == null) return true;
    return now >= endsAt;
  };

/**
 * Current Socket.IO connection status. Used to drive the offline /
 * reconnecting banner (Requirement 9.6/9.7).
 */
export const selectConnectionStatus = (
  state: RootStateWithChat,
): ConnectionStatus => state.chat.connectionStatus;

/**
 * Returns the active {@link ConversationListItem} or `null` when there is
 * no active conversation or the id no longer resolves (e.g. removed by
 * `removeConversation`).
 */
export const selectActiveConversation = (
  state: RootStateWithChat,
): ConversationListItem | null => {
  const id = state.chat.activeConversationId;
  if (!id) return null;
  return state.chat.conversationsById[id] ?? null;
};

/**
 * Returns the unread count for the conversation, or `0` when the
 * conversation is unknown. Drives the badge on conversation rows
 * (Requirement 13.6) and inputs to mark-as-read flows (Requirement 16.2).
 *
 * _Requirements: 13.6, 16.2_
 */
export const selectUnreadCount =
  (conversationId: string) =>
  (state: RootStateWithChat): number => {
    return state.chat.conversationsById[conversationId]?.unreadCount ?? 0;
  };
