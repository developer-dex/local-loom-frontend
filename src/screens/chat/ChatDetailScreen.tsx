/**
 * ChatDetailScreen — slice-driven implementation of a single chat thread.
 *
 * Replaces the placeholder UI with a fully wired, real-time view of one
 * conversation. Lifecycle, messages, typing, read receipts, presence,
 * sending (text + attachments), retry, and 403 / 404 handling all flow
 * through `chatSlice` and the chat thunks.
 *
 * Lifecycle (Req 5.1, 9.6, 12.3, 13.1, 13.2, 17.4):
 *  - On mount: `setActiveConversation(chatId)`, `fetchMessagesThunk`, and
 *    `chat:join` when the socket is connected.
 *  - On unmount: clear the active conversation, emit `chat:leave`, and
 *    flush a `chat:stop-typing` via {@link useChatTyping.emitStopTyping}.
 *
 * Rendering:
 *  - `inverted` `FlatList` so newest renders at the bottom; `onEndReached`
 *    scrolls toward older messages and triggers
 *    `fetchOlderMessagesThunk` guarded by `loadingOlder` / `hasMore`
 *    (Req 5.3 / 5.5).
 *  - `<ConnectionBanner />` above the list (Req 9.6).
 *  - Online indicator next to the participant name driven by
 *    {@link selectIsOtherOnline} (Req 14.2 / 14.3).
 *  - `<TypingIndicator />` above the input bar (Req 12.4 / 12.5 / 12.6).
 *  - `<SendCooldownNotice />` countdown beside the composer (Req 7.10,
 *    20.2 / 20.3).
 *  - Failed outbound messages render a retry control →
 *    `retrySendThunk({ clientMessageId })` (Req 6.5 / 6.6).
 *
 * Composer:
 *  - Text via {@link ChatInputBar}; the bar wires the typing protocol
 *    through {@link useChatTyping} (Req 12.1 / 12.2).
 *  - Attachment button → `expo-image-picker` (multi-select up to 5;
 *    truncate excess with a notice; reject unsupported MIME and oversize
 *    files inline) (Req 7.1 / 7.2 / 7.3 / 7.4).
 *  - Send is validated via `prepareSend` inside `sendMessageThunk`; the
 *    button stays disabled while `sendCooldownEndsAt > now` (Req 6.1 /
 *    6.7 / 6.8 / 7.10 / 20.2 / 20.3).
 *
 * Errors:
 *  - 403 from the messages endpoint → access-denied state with back
 *    navigation (Req 5.6).
 *  - 404 → not-found state with back navigation (Req 5.7).
 *
 * _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4,
 * 6.5, 6.6, 6.7, 6.8, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10,
 * 8.4, 9.6, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 13.1, 13.2, 13.3, 13.4,
 * 13.5, 14.2, 14.3, 17.4, 18.1, 18.2, 18.3, 18.4, 20.1, 20.2, 20.3, 20.6,
 * 20.7, 21.3, 22.3, 23.2, 23.3, 23.4, 23.5_
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import {
  useIsFocused,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { Icon, useToast } from '../../components/ui';
import { ChatInputBar } from '../../components/chat/ChatInputBar';
import { ConnectionBanner } from '../../components/chat/ConnectionBanner';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { SendCooldownNotice } from '../../components/chat/SendCooldownNotice';
import { TypingIndicator } from '../../components/chat/TypingIndicator';
import { chatSocket } from '../../api/chatSocket';
import {
  ALLOWED_ATTACHMENT_MIMES,
  ATTACHMENTS_MAX_COUNT,
  IMAGE_MAX_BYTES,
  VIDEO_MAX_BYTES,
} from '../../api/chatHelpers';
import type { PickedAsset } from '../../api/chatTypes';
import { useChatTyping } from '../../hooks/useChatTyping';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchMessagesThunk,
  fetchOlderMessagesThunk,
  markConversationReadThunk,
  retrySendThunk,
  sendMessageThunk,
  uploadAttachmentsAndSendThunk,
} from '../../store/slices/chatThunks';
import { setActiveConversation } from '../../store/slices/chatSlice';
import {
  selectIsOtherOnline,
  selectOrderedMessages,
} from '../../store/slices/chatSelectors';
import type { LocalMessage } from '../../store/slices/chatSlice';
import type { RootStackParamList } from '../../navigation/types';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { colors, fontFamilies, nunitoSans } from '../../theme';

const HEADER_AVATAR = 36;

/** Request body size beyond which we treat a single picker selection as oversize text/attachments. */
type AccessError = 'forbidden' | 'not-found' | null;

/**
 * Builds a {@link PickedAsset} from an `expo-image-picker` asset. Falls back
 * to a sensible name when the platform omits `fileName`, and infers a MIME
 * from the URI extension when `mimeType` is missing (older Android
 * builds occasionally drop it for videos).
 */
function buildPickedAsset(
  asset: ImagePicker.ImagePickerAsset,
): PickedAsset | null {
  if (!asset?.uri) return null;
  const fallbackName = asset.uri.split('/').pop() ?? 'attachment';
  const name = asset.fileName ?? fallbackName;
  const mime = asset.mimeType ?? inferMimeFromUri(asset.uri, asset.type ?? undefined);
  // expo-image-picker's `fileSize` is reported in bytes when available.
  const size = typeof asset.fileSize === 'number' ? asset.fileSize : 0;
  const durationMs =
    typeof asset.duration === 'number' && asset.duration > 0
      ? Math.round(asset.duration)
      : undefined;
  return {
    uri: asset.uri,
    name,
    mime,
    size,
    width: asset.width,
    height: asset.height,
    durationMs,
  };
}

/**
 * Best-effort MIME inference from the file extension. The validation in
 * `uploadAttachmentsAndSendThunk` will still reject anything outside
 * {@link ALLOWED_ATTACHMENT_MIMES}; this helper only exists to keep
 * common cases (`jpeg`, `png`, `mp4`, etc.) flowing through.
 */
function inferMimeFromUri(uri: string, kind?: string): string {
  const ext = uri.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'mp4':
      return 'video/mp4';
    case 'mov':
      return 'video/quicktime';
    case 'webm':
      return 'video/webm';
    default:
      if (kind === 'video') return 'video/mp4';
      return 'image/jpeg';
  }
}


export function ChatDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'ChatDetail'>>();
  const dispatch = useAppDispatch();
  const isFocused = useIsFocused();
  const { showToast } = useToast();

  const { chatId, name, avatarUri } = route.params ?? {
    chatId: '',
    name: 'Chat',
    avatarUri: undefined,
  };

  // ── Slice-driven state ─────────────────────────────────────────────────
  const messages = useAppSelector(selectOrderedMessages(chatId));
  const messagesStatus = useAppSelector(
    (s) => s.chat.messagesStatusByConversation[chatId] ?? 'idle',
  );
  const loadingOlder = useAppSelector(
    (s) => s.chat.messagesLoadingOlder[chatId] ?? false,
  );
  const hasMore = useAppSelector(
    (s) => s.chat.messagesByConversation[chatId]?.hasMore ?? false,
  );
  const sendCooldownEndsAt = useAppSelector(
    (s) => s.chat.sendCooldownEndsAt,
  );
  const presenceOnline = useAppSelector(selectIsOtherOnline(chatId));
  const lastReadMessageId = useAppSelector(
    (s) => s.chat.readByConversation[chatId]?.lastReadMessageId ?? null,
  );
  const selfUserId = useAppSelector((s) => s.auth.user?.id ?? null);
  const isLoggedIn = useAppSelector(
    (s) => s.auth.user !== null || s.auth.tokens !== null,
  );

  // ── Local screen state ─────────────────────────────────────────────────
  const [accessError, setAccessError] = useState<AccessError>(null);
  const [stagedAttachments, setStagedAttachments] = useState<PickedAsset[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  // `_now` ticks once per second while a cooldown is active so the send
  // button re-evaluates without dispatching an action.
  const [now, setNow] = useState<number>(() => Date.now());

  const listRef = useRef<FlatList<LocalMessage>>(null);
  const lastMarkedReadId = useRef<string | null>(null);

  // ── Auth guard (Req 22.3) ──────────────────────────────────────────────
  // The root navigator already redirects unauthenticated users away from
  // ChatDetail (Task 16.2), but if a guest somehow lands here we bail
  // out cleanly rather than firing chat REST calls.
  useEffect(() => {
    if (!isLoggedIn) {
      if (navigation.canGoBack()) navigation.goBack();
    }
  }, [isLoggedIn, navigation]);

  // ── Mount / unmount lifecycle (Req 5.1, 13.1, 17.4, 12.3) ──────────────
  // We bind a top-level `useChatTyping` so we can call `emitStopTyping()`
  // on unmount; the actual keystroke wiring lives inside `<ChatInputBar>`,
  // which has its own (independent) hook instance for keystroke throttling.
  // Both hooks gate on the same `conversationId` so emits are coherent.
  const { emitStopTyping } = useChatTyping(chatId || null);

  useEffect(() => {
    if (!chatId || !isLoggedIn) return;

    setAccessError(null);
    dispatch(setActiveConversation(chatId));

    // Initial fetch.
    void dispatch(fetchMessagesThunk({ conversationId: chatId })).then(
      (result) => {
        if (fetchMessagesThunk.rejected.match(result)) {
          const payload = result.payload;
          if (payload === 'FORBIDDEN') {
            setAccessError('forbidden');
          } else if (payload === 'NOT_FOUND') {
            setAccessError('not-found');
          }
        }
      },
    );

    // Best-effort socket join — connection-bound emits no-op when offline.
    if (chatSocket.isConnected()) {
      chatSocket.emit('chat:join', { conversationId: chatId });
    }

    return () => {
      // Req 12.3 / 17.4: clean up the active conversation, leave the socket
      // room, and flush a stop-typing if one is owed.
      emitStopTyping();
      if (chatSocket.isConnected()) {
        chatSocket.emit('chat:leave', { conversationId: chatId });
      }
      dispatch(setActiveConversation(null));
      lastMarkedReadId.current = null;
    };
    // `emitStopTyping` is stable per `chatId`; including it here would
    // re-mount on every render, so we omit it deliberately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, isLoggedIn, dispatch]);

  // ── Cooldown ticker (Req 20.2 / 20.3) ──────────────────────────────────
  useEffect(() => {
    if (sendCooldownEndsAt == null) return;
    if (sendCooldownEndsAt <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [sendCooldownEndsAt]);

  // ── Mark-read (Req 13.1, 13.2, 13.3) ──────────────────────────────────
  // Dispatches `markConversationReadThunk` whenever the newest visible
  // message id changes while the screen is focused. The ref guard prevents
  // duplicate dispatches (the same newest id firing multiple effects).
  useEffect(() => {
    if (!chatId || !isFocused) return;
    if (messages.length === 0) return;
    const newest = messages[messages.length - 1];
    // Only mark-read for messages the server has assigned a real id (i.e.
    // not a still-pending optimistic). The `clientMessageIdIndex` would
    // otherwise resolve to the placeholder id we generated locally.
    if (!newest || newest.localStatus !== 'sent') return;
    if (newest.id === lastMarkedReadId.current) return;
    lastMarkedReadId.current = newest.id;
    void dispatch(
      markConversationReadThunk({
        conversationId: chatId,
        lastReadMessageId: newest.id,
      }),
    );
  }, [chatId, isFocused, messages, dispatch]);

  // ── Older-page loader (Req 5.3 / 5.4 / 5.5) ────────────────────────────
  const onEndReached = useCallback(() => {
    if (!chatId) return;
    if (loadingOlder || !hasMore) return;
    void dispatch(fetchOlderMessagesThunk({ conversationId: chatId }));
  }, [chatId, dispatch, loadingOlder, hasMore]);

  // ── Send / retry handlers (Req 6.1–6.8, 7.x, 8.4) ──────────────────────
  const sendDisabledByCooldown = useMemo(() => {
    return sendCooldownEndsAt != null && sendCooldownEndsAt > now;
  }, [sendCooldownEndsAt, now]);

  const handleSend = useCallback(
    (text: string) => {
      if (!chatId) return;
      if (sendDisabledByCooldown) return;

      // With staged attachments → upload-and-send path. Without → text-only.
      if (stagedAttachments.length > 0) {
        const filesToSend = stagedAttachments;
        setIsUploading(true);
        void dispatch(
          uploadAttachmentsAndSendThunk({
            conversationId: chatId,
            content: text.length > 0 ? text : undefined,
            files: filesToSend,
          }),
        )
          .then((result) => {
            if (uploadAttachmentsAndSendThunk.fulfilled.match(result)) {
              setStagedAttachments([]);
              const rejected = result.payload?.rejected ?? [];
              if (rejected.length > 0) {
                showToast({
                  message: rejected[0].message,
                  type: 'error',
                  duration: 5_000,
                });
              }
              return;
            }
            const payload = result.payload;
            if (payload === 'UPLOAD:413') {
              showToast({
                message: 'Attachment is too large. Try a smaller file.',
                type: 'error',
                duration: 5_000,
              });
              return; // Keep selection editable (Req 7.9).
            }
            if (payload === 'UPLOAD:429') {
              showToast({
                message:
                  'Sending too quickly. Please wait a moment before trying again.',
                type: 'error',
                duration: 5_000,
              });
              return;
            }
            if (payload === 'VALIDATION:ALL_REJECTED') {
              // Per-file errors were already collected; surface the first
              // one so the user sees something actionable.
              showToast({
                message:
                  'No attachments could be uploaded. Check file types and sizes.',
                type: 'error',
                duration: 5_000,
              });
              setStagedAttachments([]);
              return;
            }
            const message =
              typeof payload === 'string'
                ? payload
                : 'Failed to send attachments.';
            showToast({ message, type: 'error', duration: 5_000 });
          })
          .finally(() => setIsUploading(false));
        return;
      }

      // Text-only send.
      void dispatch(
        sendMessageThunk({
          conversationId: chatId,
          content: text,
        }),
      ).then((result) => {
        if (sendMessageThunk.rejected.match(result)) {
          const payload = result.payload;
          // Validation errors already produced an inline message via the
          // disabled state / cooldown banner; only surface unexpected ones.
          if (typeof payload === 'string' && !payload.startsWith('VALIDATION:')) {
            showToast({
              message: payload,
              type: 'error',
              duration: 5_000,
            });
          }
        }
      });
    },
    [
      chatId,
      stagedAttachments,
      sendDisabledByCooldown,
      dispatch,
      showToast,
    ],
  );

  const handleRetry = useCallback(
    (clientMessageId: string | undefined) => {
      if (!chatId || !clientMessageId) return;
      void dispatch(
        retrySendThunk({ conversationId: chatId, clientMessageId }),
      );
    },
    [chatId, dispatch],
  );

  // ── Attachment picker (Req 7.1 / 7.2 / 7.3 / 7.4) ──────────────────────
  const handleAttachmentPress = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showToast({
          message: 'Photo library access is needed to attach files.',
          type: 'error',
          duration: 4_000,
        });
        return;
      }

      const remainingSlots = ATTACHMENTS_MAX_COUNT - stagedAttachments.length;
      if (remainingSlots <= 0) {
        showToast({
          message: `Maximum ${ATTACHMENTS_MAX_COUNT} attachments per message`,
          type: 'error',
          duration: 4_000,
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.9,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      // Truncate beyond MAX (Req 7.2). The picker honours `selectionLimit`
      // on most platforms, but we re-clamp defensively.
      let selected = result.assets;
      let truncated = false;
      if (selected.length > remainingSlots) {
        selected = selected.slice(0, remainingSlots);
        truncated = true;
      }

      // Per-file validation (Req 7.3 / 7.4). Anything that fails locally
      // is reported inline before the upload starts.
      const accepted: PickedAsset[] = [];
      const rejections: string[] = [];
      for (const asset of selected) {
        const picked = buildPickedAsset(asset);
        if (!picked) continue;
        if (!ALLOWED_ATTACHMENT_MIMES.has(picked.mime)) {
          rejections.push(`Unsupported file type: ${picked.mime}`);
          continue;
        }
        const isImage = picked.mime.startsWith('image/');
        const isVideo = picked.mime.startsWith('video/');
        if (isImage && picked.size > IMAGE_MAX_BYTES) {
          rejections.push(`${picked.name} exceeds the 10 MB image limit`);
          continue;
        }
        if (isVideo && picked.size > VIDEO_MAX_BYTES) {
          rejections.push(`${picked.name} exceeds the 50 MB video limit`);
          continue;
        }
        accepted.push(picked);
      }

      if (accepted.length > 0) {
        setStagedAttachments((prev) =>
          [...prev, ...accepted].slice(0, ATTACHMENTS_MAX_COUNT),
        );
      }

      if (truncated) {
        showToast({
          message: `Maximum ${ATTACHMENTS_MAX_COUNT} attachments per message`,
          type: 'error',
          duration: 4_000,
        });
      }
      // Surface the first rejection inline so the user sees something
      // actionable; subsequent ones are paged through subsequent picks.
      if (rejections.length > 0) {
        showToast({
          message: rejections[0],
          type: 'error',
          duration: 5_000,
        });
      }
    } catch {
      showToast({
        message: 'Could not open photo library.',
        type: 'error',
        duration: 4_000,
      });
    }
  }, [stagedAttachments.length, showToast]);

  const removeStagedAttachment = useCallback((uri: string) => {
    setStagedAttachments((prev) => prev.filter((a) => a.uri !== uri));
  }, []);


  // ── Rendering ──────────────────────────────────────────────────────────
  const headerInitial = useMemo(
    () => (name?.trim()?.charAt(0) || 'C').toUpperCase(),
    [name],
  );

  const resolvedAvatar = useMemo(
    () => resolveMediaUrl(avatarUri),
    [avatarUri],
  );

  /**
   * Builds a fast lookup for "is this outgoing message seen?" — true when
   * the other participant's last-read marker is at or beyond the message's
   * `createdAt`. We compare by `createdAt` because UUID-based ids don't
   * carry temporal ordering.
   */
  const lastReadCreatedAt = useMemo(() => {
    if (!lastReadMessageId) return null;
    const bucket = messages;
    for (let i = bucket.length - 1; i >= 0; i -= 1) {
      if (bucket[i].id === lastReadMessageId) {
        return bucket[i].createdAt;
      }
    }
    return null;
  }, [lastReadMessageId, messages]);

  const renderItem: ListRenderItem<LocalMessage> = useCallback(
    ({ item }) => {
      const isSelf = !!selfUserId && item.sender.id === selfUserId;
      const isSeen =
        isSelf &&
        lastReadCreatedAt !== null &&
        item.createdAt <= lastReadCreatedAt &&
        item.localStatus === 'sent';
      return (
        <MessageBubble
          message={item}
          isSelf={isSelf}
          isSeen={isSeen}
          onRetry={() => handleRetry(item.clientMessageId)}
        />
      );
    },
    [selfUserId, lastReadCreatedAt, handleRetry],
  );

  // Inverted list expects newest at index 0 → reverse the ascending slice.
  const invertedData = useMemo(() => {
    if (messages.length === 0) return messages;
    return messages.slice().reverse();
  }, [messages]);

  const isInitialLoading =
    messagesStatus === 'loading' && messages.length === 0;

  // ── Access-error states (Req 5.6 / 5.7) ────────────────────────────────
  if (accessError !== null) {
    return (
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <Header
          name={name}
          avatarUri={resolvedAvatar}
          headerInitial={headerInitial}
          presenceOnline={false}
          onBack={() => navigation.canGoBack() && navigation.goBack()}
        />
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>
            {accessError === 'forbidden'
              ? 'Access denied'
              : 'Conversation not found'}
          </Text>
          <Text style={styles.errorBody}>
            {accessError === 'forbidden'
              ? "You don't have permission to view this conversation."
              : "This conversation doesn't exist or has been removed."}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to chats"
            onPress={() => {
              if (navigation.canGoBack()) navigation.goBack();
            }}
            style={({ pressed }) => [
              styles.errorButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.errorButtonText}>Back to chats</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Header
          name={name}
          avatarUri={resolvedAvatar}
          headerInitial={headerInitial}
          presenceOnline={presenceOnline}
          onBack={() => navigation.canGoBack() && navigation.goBack()}
        />

        <ConnectionBanner />

        {isInitialLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={invertedData}
            inverted
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.2}
            ListFooterComponent={
              loadingOlder ? (
                <View style={styles.loadingOlder}>
                  <ActivityIndicator
                    size="small"
                    color={colors.placeholder}
                  />
                </View>
              ) : null
            }
            ListEmptyComponent={
              messagesStatus === 'succeeded' ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No messages yet</Text>
                  <Text style={styles.emptyBody}>
                    Say hello to get the conversation started.
                  </Text>
                </View>
              ) : null
            }
          />
        )}

        <TypingIndicator />

        {stagedAttachments.length > 0 ? (
          <StagedAttachmentsStrip
            attachments={stagedAttachments}
            onRemove={removeStagedAttachment}
          />
        ) : null}

        <SendCooldownNotice />

        <View style={{ paddingBottom: Math.max(insets.bottom, 0) }}>
          <ChatInputBar
            conversationId={chatId || null}
            onSend={handleSend}
            onAttachmentPress={() => {
              void handleAttachmentPress();
            }}
            disabled={sendDisabledByCooldown}
            attachmentCount={stagedAttachments.length}
            isUploading={isUploading}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

type HeaderProps = {
  name: string;
  avatarUri: string | undefined;
  headerInitial: string;
  presenceOnline: boolean;
  onBack: () => void;
};

function Header({
  name,
  avatarUri,
  headerInitial,
  presenceOnline,
  onBack,
}: HeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={10}
        onPress={onBack}
        style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
      >
        <Icon
          name="arrow-left-01"
          width={24}
          height={24}
          color={colors.onboardingTitle}
        />
      </Pressable>

      <View style={styles.headerAvatarWrap}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.headerAvatar} />
        ) : (
          <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
            <Text style={styles.headerAvatarInitial}>{headerInitial}</Text>
          </View>
        )}
        {presenceOnline ? (
          <View
            style={styles.onlineDot}
            accessibilityLabel="Online"
            accessibilityRole="image"
          />
        ) : null}
      </View>

      <View style={styles.headerTextCol}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {name}
        </Text>
        {presenceOnline ? (
          <Text style={styles.headerSubtitle}>Online</Text>
        ) : null}
      </View>
    </View>
  );
}

type StagedAttachmentsStripProps = {
  attachments: PickedAsset[];
  onRemove: (uri: string) => void;
};

function StagedAttachmentsStrip({
  attachments,
  onRemove,
}: StagedAttachmentsStripProps) {
  return (
    <View style={styles.stagedStrip}>
      {attachments.map((a) => (
        <View key={a.uri} style={styles.stagedTile}>
          <Image source={{ uri: a.uri }} style={styles.stagedImage} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove attachment ${a.name}`}
            onPress={() => onRemove(a.uri)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.stagedRemoveBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.stagedRemoveText}>×</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}


// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    height: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.background,
  },
  backBtn: {
    width: 28,
    height: 28,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerAvatarWrap: {
    width: HEADER_AVATAR,
    height: HEADER_AVATAR,
    borderRadius: HEADER_AVATAR / 2,
    overflow: 'visible',
    backgroundColor: colors.surface,
  },
  headerAvatar: {
    width: HEADER_AVATAR,
    height: HEADER_AVATAR,
    borderRadius: HEADER_AVATAR / 2,
  },
  headerAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE7E4',
  },
  headerAvatarInitial: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 14,
    color: colors.primary,
  },
  onlineDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
  },
  headerTextCol: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.onboardingTitle,
  },
  headerSubtitle: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.success,
  },

  // List
  listContent: {
    paddingVertical: 8,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingOlder: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyState: {
    paddingTop: 64,
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 6,
    transform: [{ scaleY: -1 }],
  },
  emptyTitle: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 16,
    lineHeight: 20,
    color: colors.onboardingTitle,
  },
  emptyBody: {
    ...nunitoSans.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.placeholder,
    textAlign: 'center',
  },

  // Error states (403/404)
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  errorTitle: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.onboardingTitle,
    textAlign: 'center',
  },
  errorBody: {
    ...nunitoSans.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onboardingBody,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.primary,
    minWidth: 160,
    alignItems: 'center',
  },
  errorButtonText: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.onPrimary,
  },

  // Staged attachments strip
  stagedStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  stagedTile: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  stagedImage: {
    width: '100%',
    height: '100%',
  },
  stagedRemoveBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  stagedRemoveText: {
    color: colors.onPrimary,
    fontSize: 14,
    lineHeight: 16,
    fontFamily: fontFamilies.inter.semibold,
  },

  pressed: { opacity: 0.7 },
});
