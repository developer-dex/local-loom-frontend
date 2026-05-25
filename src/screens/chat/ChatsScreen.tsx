/**
 * ChatsScreen — list the authenticated user's conversations.
 *
 * Wires the screen to the chat slice (Task 12.1):
 *  - On mount with `isLoggedIn`, hydrates any persisted cache then issues
 *    the page-1 fetch (Req 2.1, 21.2).
 *  - Search box debounces input by 300 ms and clamps to 100 chars; a blank
 *    query is dispatched as `undefined` (Req 3.1, 3.2, 3.3).
 *  - `onEndReached` paginates while `meta.totalPages > meta.page` and no
 *    page is in flight (Req 4.1, 4.3).
 *  - Rows are sourced from `selectOrderedConversations`; loading, empty,
 *    and footer-error states cover the lifecycle (Req 2.2, 2.3, 4.4).
 *  - `<ConnectionBanner />` self-hides when the socket is healthy and
 *    surfaces "Reconnecting…" / "Offline" otherwise (Req 9.6).
 *  - Swipe action "Mark as read" dispatches `markConversationReadThunk`;
 *    a 403 is swallowed by the thunk so the badge is left unchanged
 *    (Req 16.1, 16.3).
 *  - Tap navigates to `ChatDetail` with `{ chatId, name, avatarUri }`
 *    (Req 22.2, 22.3 — guest case is the unchanged login CTA below).
 *  - Guest state preserved verbatim from the previous mock — no chat REST
 *    or socket calls are issued while unauthenticated (Req 22.1).
 *
 * Requirements: 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4,
 *               4.1, 4.2, 4.3, 4.4, 9.6, 13.6, 16.1, 16.2, 16.3, 21.2,
 *               22.1, 22.2, 23.1.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton, Icon } from '../../components/ui';
import { ConnectionBanner } from '../../components/chat/ConnectionBanner';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import {
  selectOrderedConversations,
} from '../../store/slices/chatSelectors';
import {
  fetchConversationsThunk,
  hydrateChatThunk,
  markConversationReadThunk,
  searchConversationsThunk,
} from '../../store/slices/chatThunks';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { colors, fontFamilies, nunitoSans, spacing } from '../../theme';
import type { ConversationListItem } from '../../api/chatTypes';

const PAGE_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MAX_LEN = 100;

export function ChatsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { isLoggedIn } = useAuth();

  // ── Slice-driven state ───────────────────────────────────────────────────
  const conversations = useAppSelector(selectOrderedConversations);
  const meta = useAppSelector((s) => s.chat.conversationsMeta);
  const status = useAppSelector((s) => s.chat.conversationsStatus);
  const loadingMore = useAppSelector((s) => s.chat.conversationsLoadingMore);
  const conversationsError = useAppSelector((s) => s.chat.conversationsError);
  const appliedSearch = useAppSelector((s) => s.chat.conversationsSearch);
  const userId = useAppSelector((s) => s.auth.user?.id ?? null);

  // ── Local UI state ──────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  /** Footer error surfaced when a page > 1 request rejects (Req 4.4). */
  const [paginatedError, setPaginatedError] = useState<string | null>(null);
  /** Open Swipeable refs by row id so we can close any open row on tap. */
  const openSwipeableRef = useRef<Swipeable | null>(null);

  // ── Navigation helper ───────────────────────────────────────────────────
  const getRootNav = useCallback(() => {
    return navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  }, [navigation]);

  const openLogin = useCallback(() => {
    getRootNav()?.navigate('SignIn');
  }, [getRootNav]);

  const openChat = useCallback(
    (item: ConversationListItem) => {
      const avatarUri = resolveMediaUrl(item.otherParticipant.avatar);
      getRootNav()?.navigate('ChatDetail', {
        chatId: item.id,
        name: item.otherParticipant.name,
        avatarUri,
      });
    },
    [getRootNav],
  );

  // ── Hydrate + first-page fetch on mount (Req 21.2, 2.1) ─────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    (async () => {
      // Hydrate persisted cache before the network resolves so the user
      // sees an instant list when offline (Req 21.2). Hydration is best
      // effort; failures are swallowed by the thunk.
      if (userId) await dispatch(hydrateChatThunk(userId));
      if (cancelled) return;
      dispatch(fetchConversationsThunk({ page: 1, limit: PAGE_LIMIT }));
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally limited to (isLoggedIn, userId, dispatch) — we only
    // re-hydrate / re-fetch when the auth identity changes.
  }, [dispatch, isLoggedIn, userId]);

  // ── Debounced search (Req 3.1, 3.2, 3.3) ────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    const trimmed = query.trim().slice(0, SEARCH_MAX_LEN);
    // If the trimmed query already matches the applied search, there's
    // nothing to dispatch — saves a redundant page-1 fetch on initial
    // mount when query === '' and conversationsSearch === ''.
    if (trimmed === appliedSearch) return;
    const handle = setTimeout(() => {
      dispatch(searchConversationsThunk(trimmed));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [appliedSearch, dispatch, isLoggedIn, query]);

  // ── Pagination (Req 4.1, 4.3, 4.4) ──────────────────────────────────────
  const canLoadMore = useMemo(() => {
    if (!meta) return false;
    return meta.totalPages > meta.page;
  }, [meta]);

  const loadMore = useCallback(async () => {
    if (!isLoggedIn) return;
    if (!meta) return;
    if (loadingMore) return;
    if (!canLoadMore) return;
    setPaginatedError(null);
    const action = await dispatch(
      fetchConversationsThunk({
        page: meta.page + 1,
        limit: PAGE_LIMIT,
        search: appliedSearch.length > 0 ? appliedSearch : undefined,
      }),
    );
    // The thunk rejects on REST failures with a human-readable message;
    // surface it inline at the list footer (Req 4.4).
    if (fetchConversationsThunk.rejected.match(action)) {
      const message = (action.payload as string | undefined) ?? 'Failed to load more chats';
      // Skip the in-flight short-circuit sentinel.
      if (message !== 'IN_FLIGHT') setPaginatedError(message);
    }
  }, [appliedSearch, canLoadMore, dispatch, isLoggedIn, loadingMore, meta]);

  const retryPagination = useCallback(() => {
    setPaginatedError(null);
    loadMore();
  }, [loadMore]);

  // ── Mark-as-read swipe (Req 16.1, 16.2, 16.3) ───────────────────────────
  const handleMarkRead = useCallback(
    (item: ConversationListItem) => {
      if (item.unreadCount === 0) return;
      dispatch(markConversationReadThunk({ conversationId: item.id }));
    },
    [dispatch],
  );

  // ── Render helpers ──────────────────────────────────────────────────────
  const renderRightActions = useCallback(
    (item: ConversationListItem) => () => (
      <Pressable
        onPress={() => {
          openSwipeableRef.current?.close();
          handleMarkRead(item);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Mark chat with ${item.otherParticipant.name} as read`}
        style={({ pressed }) => [styles.swipeAction, pressed && styles.swipeActionPressed]}
      >
        <Text style={styles.swipeActionText}>Mark as read</Text>
      </Pressable>
    ),
    [handleMarkRead],
  );

  const renderItem: ListRenderItem<ConversationListItem> = ({ item }) => {
    const hasUnread = item.unreadCount > 0;
    const avatarUri = resolveMediaUrl(item.otherParticipant.avatar);
    const accessibilityLabel = hasUnread
      ? `Open chat with ${item.otherParticipant.name}, ${item.unreadCount} unread`
      : `Open chat with ${item.otherParticipant.name}`;
    const preview =
      item.lastMessage?.content && item.lastMessage.content.length > 0
        ? item.lastMessage.content
        : 'No messages yet';

    return (
      <Swipeable
        ref={(ref) => {
          // Track the most recently opened row so taps elsewhere can close it.
          if (ref) openSwipeableRef.current = ref;
        }}
        renderRightActions={renderRightActions(item)}
        rightThreshold={40}
        onSwipeableOpen={() => handleMarkRead(item)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          onPress={() => {
            openSwipeableRef.current?.close();
            openChat(item);
          }}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <View style={styles.avatarWrap}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Icon name="user-03" width={18} height={18} color={colors.placeholder} />
              </View>
            )}
          </View>

          <View style={styles.rowMain}>
            <View style={styles.rowTop}>
              <Text numberOfLines={1} style={styles.name}>
                {item.otherParticipant.name}
              </Text>
              <Text style={styles.time}>{formatRelativeTime(item.lastMessageAt)}</Text>
            </View>

            <View style={styles.rowBottom}>
              <Text
                numberOfLines={1}
                style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]}
              >
                {preview}
              </Text>
              {hasUnread ? (
                <View
                  style={styles.unreadPill}
                  accessibilityLabel={`${item.unreadCount} unread messages`}
                >
                  <Text style={styles.unreadText}>{item.unreadCount}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </Pressable>
      </Swipeable>
    );
  };

  // ── Lifecycle-derived UI flags ──────────────────────────────────────────
  const isInitialLoading =
    status === 'loading' && conversations.length === 0;
  const isInitialError =
    status === 'failed' && conversations.length === 0 && conversationsError != null;
  const isEmpty =
    status === 'succeeded' && conversations.length === 0;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat</Text>
      </View>

      {!isLoggedIn ? (
        <View
          style={[
            styles.guestState,
            { paddingBottom: Math.max(insets.bottom, 14) + spacing.lg },
          ]}
        >
          <View style={styles.guestIconWrap}>
            <Icon name="bubble-chat" width={32} height={32} color={colors.primary} />
          </View>
          <Text style={styles.guestTitle}>Sign in to view your chats</Text>
          <Text style={styles.guestBody}>
            Log in to message tradies and keep track of your conversations.
          </Text>
          <AppButton
            title="Login"
            variant="primary"
            onPress={openLogin}
            accessibilityLabel="Log in to view chats"
            containerStyle={styles.loginBtn}
          />
        </View>
      ) : (
        <>
          <ConnectionBanner />

          <View style={styles.searchWrap}>
            <View style={styles.searchField}>
              <Icon name="search-01" width={18} height={18} color={colors.placeholder} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search"
                placeholderTextColor={colors.placeholder}
                style={styles.searchInput}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={SEARCH_MAX_LEN}
              />
            </View>
          </View>

          {isInitialLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : isInitialError ? (
            <View style={styles.center}>
              <Text style={styles.errorTitle}>Couldn’t load chats</Text>
              <Text style={styles.errorBody}>{conversationsError}</Text>
              <AppButton
                title="Retry"
                variant="primary"
                onPress={() =>
                  dispatch(
                    fetchConversationsThunk({ page: 1, limit: PAGE_LIMIT }),
                  )
                }
                containerStyle={styles.retryBtn}
              />
            </View>
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(c) => c.id}
              renderItem={renderItem}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: Math.max(insets.bottom, 14) + spacing.lg },
              ]}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              onEndReachedThreshold={0.5}
              onEndReached={loadMore}
              ListEmptyComponent={
                isEmpty ? (
                  <View style={styles.empty}>
                    {appliedSearch.length > 0 ? (
                      <>
                        <Text style={styles.emptyTitle}>
                          No matches for &lsquo;{appliedSearch}&rsquo;
                        </Text>
                        <Text style={styles.emptyBody}>Try a different search.</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.emptyTitle}>No chats yet</Text>
                        <Text style={styles.emptyBody}>
                          Start a conversation with a tradie to see it here.
                        </Text>
                      </>
                    )}
                  </View>
                ) : null
              }
              ListFooterComponent={
                <ListFooter
                  loadingMore={loadingMore}
                  paginatedError={paginatedError}
                  onRetry={retryPagination}
                />
              }
            />
          )}
        </>
      )}
    </View>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Compact relative-time formatter for the conversation row timestamp. */
function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return '';
  const now = Date.now();
  const diffMs = Math.max(0, now - ts);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  }
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d`;
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

// ─── Footer (loading more / paginated error) ────────────────────────────────

type ListFooterProps = {
  loadingMore: boolean;
  paginatedError: string | null;
  onRetry: () => void;
};

function ListFooter({ loadingMore, paginatedError, onRetry }: ListFooterProps) {
  if (paginatedError) {
    return (
      <View style={styles.footer}>
        <Text style={styles.footerError}>{paginatedError}</Text>
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry loading more chats"
          style={({ pressed }) => [styles.footerRetry, pressed && styles.pressed]}
        >
          <Text style={styles.footerRetryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }
  if (loadingMore) {
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return null;
}

const AVATAR = 44;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 48,
    paddingHorizontal: 20,
    paddingVertical: 8,
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.onboardingTitle,
  },
  searchWrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: colors.background,
  },
  searchField: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.background,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    lineHeight: 18,
    color: colors.onboardingTitle,
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    backgroundColor: colors.background,
  },
  avatarWrap: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#EAEAEF',
  },
  avatar: { width: '100%', height: '100%' },
  avatarFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  rowMain: { flex: 1, gap: 6 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  name: {
    flex: 1,
    ...nunitoSans.medium,
    fontSize: 16,
    lineHeight: 20,
    color: colors.onboardingTitle,
  },
  time: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.placeholder,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  lastMessage: {
    flex: 1,
    ...nunitoSans.regular,
    fontSize: 13,
    lineHeight: 16,
    color: colors.placeholder,
  },
  lastMessageUnread: { color: colors.onboardingTitle, ...nunitoSans.medium },
  unreadPill: {
    minWidth: 22,
    height: 22,
    borderRadius: 999,
    paddingHorizontal: 7,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onPrimary,
  },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#EFEFF2' },
  empty: { paddingTop: 48, alignItems: 'center', gap: 6, paddingHorizontal: 16 },
  emptyTitle: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 16,
    lineHeight: 20,
    color: colors.onboardingTitle,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.placeholder,
    textAlign: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  errorTitle: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 16,
    lineHeight: 20,
    color: colors.onboardingTitle,
    textAlign: 'center',
  },
  errorBody: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.placeholder,
    textAlign: 'center',
  },
  retryBtn: { minWidth: 160, marginTop: 8 },
  footer: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  footerError: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 13,
    color: colors.error,
    flexShrink: 1,
  },
  footerRetry: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footerRetryText: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 13,
    color: colors.primary,
  },
  swipeAction: {
    width: 120,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeActionPressed: { backgroundColor: colors.primaryPressed },
  swipeActionText: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.onPrimary,
  },
  guestState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  guestIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  guestTitle: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.onboardingTitle,
    textAlign: 'center',
  },
  guestBody: {
    ...nunitoSans.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onboardingBody,
    textAlign: 'center',
    marginBottom: 8,
  },
  loginBtn: {
    minWidth: 160,
    marginTop: 4,
  },
  pressed: { opacity: 0.7 },
});
