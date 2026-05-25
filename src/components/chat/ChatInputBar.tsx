/**
 * ChatInputBar — composer row for `ChatDetailScreen`.
 *
 * Responsibilities (Task 11.3, Requirements 6.1, 6.7, 6.8, 7.1, 7.6, 23.2,
 * 23.4):
 *
 *  - Renders a multiline text input clamped to {@link MESSAGE_CONTENT_MAX_LEN}
 *    characters via `maxLength` so users physically cannot exceed the
 *    server-side limit (Req 6.8). Empty input with no attachments is
 *    rejected at the send-button level rather than silently no-op'd
 *    (Req 6.7).
 *  - Renders a `+` attachment button that calls `onAttachmentPress`
 *    (Req 7.1). The button is disabled while an upload is in flight
 *    (Req 7.6).
 *  - Renders a send button with the accessibility contract from Req 23.4:
 *    `accessibilityRole="button"`, `accessibilityLabel="Send message"`,
 *    and `accessibilityState={ disabled }` reflecting whether the bar can
 *    actually send. Send is enabled exactly when there is at least one
 *    character of trimmed text OR a staged attachment, and the parent has
 *    not asked us to disable (cooldown / connection / etc.) and no upload
 *    is running.
 *  - Wires `useChatTyping(conversationId).onChangeText` to the input's
 *    `onChangeText` so keystrokes drive the throttled `chat:typing` /
 *    `chat:stop-typing` protocol (Req 12.1, 12.2 — implemented in the
 *    hook). When `conversationId` is `null` the hook is inert.
 *
 * The bar manages its own draft text state. On a successful send tap, the
 * draft is cleared so the next message starts from an empty input. The
 * parent ({@link ChatDetailScreen}) owns the staged attachment list and
 * the cooldown / upload flags.
 */
import { useCallback, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Icon } from '../ui';
import { MESSAGE_CONTENT_MAX_LEN } from '../../api/chatHelpers';
import { useChatTyping } from '../../hooks/useChatTyping';
import { colors, fontFamilies } from '../../theme';

export type ChatInputBarProps = {
  /**
   * Active conversation id used by the typing hook. May be `null` when the
   * screen is opened with `recipientId` only (first-message flow); the
   * typing protocol is suppressed in that case.
   */
  conversationId: string | null;
  /**
   * Called with the trimmed draft text when the user taps the send button
   * with valid content. The parent is expected to dispatch the send thunk;
   * the input is cleared after the callback returns so retries reuse the
   * parent's `clientMessageId` rather than re-typing.
   */
  onSend: (text: string) => void;
  /** Called when the `+` attachment button is tapped (Req 7.1). */
  onAttachmentPress: () => void;
  /**
   * Forces the send button into the disabled state regardless of input
   * (e.g. while a 60s rate-limit cooldown is active per Req 20.2 / 20.3,
   * or when the connection is offline and the parent prefers to block).
   */
  disabled?: boolean;
  /**
   * Number of attachments staged in the parent. Used to enable send when
   * the text is empty but attachments are queued (Req 6.1, 7.1, 7.7).
   */
  attachmentCount?: number;
  /**
   * True while `POST /chat/messages/upload` is in flight. Disables both
   * the attachment button (Req 7.6 — prevent duplicate uploads) and the
   * send button so the user cannot fire a send before the upload resolves.
   */
  isUploading?: boolean;
  /** Optional override for the wrapper style (e.g. extra bottom padding). */
  style?: StyleProp<ViewStyle>;
};

export function ChatInputBar({
  conversationId,
  onSend,
  onAttachmentPress,
  disabled = false,
  attachmentCount = 0,
  isUploading = false,
  style,
}: ChatInputBarProps) {
  const [text, setText] = useState('');
  const { onChangeText: emitTyping } = useChatTyping(conversationId);

  const trimmedLength = text.trim().length;
  const hasContent = trimmedLength > 0 || attachmentCount > 0;
  const sendDisabled = !hasContent || disabled || isUploading;
  const attachDisabled = isUploading;

  const handleChangeText = useCallback(
    (next: string) => {
      // `maxLength` on the TextInput already clamps to MESSAGE_CONTENT_MAX_LEN,
      // but be defensive in case the platform delivers a longer value (e.g.
      // paste on Android). This keeps the rejection silent — Req 6.8 surfaces
      // the explicit "too long" notice via the validation pipeline in the
      // send thunk; the input itself just refuses to accept the overflow.
      const clamped =
        next.length > MESSAGE_CONTENT_MAX_LEN
          ? next.slice(0, MESSAGE_CONTENT_MAX_LEN)
          : next;
      setText(clamped);
      emitTyping(clamped);
    },
    [emitTyping],
  );

  const handleSend = useCallback(() => {
    if (sendDisabled) return;
    const trimmed = text.trim();
    // Req 6.1 / 6.7: only invoke onSend when there is content to send. The
    // parent decides what to do when the user has only attachments staged
    // (we still pass the trimmed text, which may be empty — `prepareSend`
    // handles the attachments-only case downstream).
    onSend(trimmed);
    setText('');
  }, [sendDisabled, text, onSend]);

  const handleAttachmentPress = useCallback(() => {
    if (attachDisabled) return;
    onAttachmentPress();
  }, [attachDisabled, onAttachmentPress]);

  return (
    <View style={[styles.bar, style]}>
      <View style={styles.inputField}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add attachment"
          accessibilityState={{ disabled: attachDisabled }}
          disabled={attachDisabled}
          hitSlop={10}
          onPress={handleAttachmentPress}
          style={({ pressed }) => [
            styles.plusBtn,
            attachDisabled && styles.btnDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Icon name="add-01" width={20} height={20} color={colors.placeholder} />
        </Pressable>
        <TextInput
          value={text}
          onChangeText={handleChangeText}
          placeholder="Message"
          placeholderTextColor={colors.placeholder}
          style={styles.input}
          multiline
          maxLength={MESSAGE_CONTENT_MAX_LEN}
          returnKeyType="default"
          accessibilityLabel="Message"
          textAlignVertical="top"
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send message"
        accessibilityState={{ disabled: sendDisabled }}
        disabled={sendDisabled}
        onPress={handleSend}
        style={({ pressed }) => [
          styles.sendBtn,
          sendDisabled && styles.sendBtnDisabled,
          pressed && !sendDisabled && styles.pressed,
        ]}
      >
        <Icon name="sent" width={20} height={20} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: colors.background,
  },
  inputField: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F4F4F5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  plusBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    lineHeight: 18,
    color: colors.onboardingTitle,
    paddingTop: Platform.OS === 'ios' ? 6 : 0,
    paddingBottom: Platform.OS === 'ios' ? 6 : 0,
    maxHeight: 96,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  pressed: { opacity: 0.7 },
});

export default ChatInputBar;
