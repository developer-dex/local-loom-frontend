/**
 * MessageBubble — renders a single chat message with status, seen marker,
 * and (for failed outgoing messages) a retry control.
 *
 * Responsibilities (Task 11.1, Requirements 6.5, 13.5, 23.3):
 *  - Renders the message text and any attachments via {@link AttachmentGrid}.
 *  - Shows a status icon for outgoing messages: `pending`, `sent`, `failed`.
 *  - Shows a "Seen" marker on outgoing messages when the other participant
 *    has read up to or past this message (Req 13.5).
 *  - Exposes a retry callback when the message's `localStatus` is `'failed'`
 *    so `ChatDetailScreen` can re-emit the send (Req 6.5).
 *  - Sets `accessibilityLabel` formatted as
 *    `"{sender.name} at {formatted createdAt}: {content || attachmentDescription}"`
 *    per Req 23.3.
 *
 * The bubble is intentionally presentational — it receives a {@link LocalMessage}
 * and a few flags from the screen/selector layer and never reaches into the
 * Redux store directly.
 */
import { memo, useCallback, useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { AttachmentGrid } from './AttachmentGrid';
import { colors, fontFamilies, nunitoSans } from '../../theme';
import type { LocalMessage } from '../../store/slices/chatSlice';
import type { AttachmentDescriptor } from '../../api/chatTypes';

export type MessageBubbleProps = {
  message: LocalMessage;
  /** True when the message was sent by the authenticated user. */
  isSelf: boolean;
  /**
   * True when the seen marker should be rendered. The screen layer is
   * responsible for computing this (true for outgoing messages whose `id`
   * is less than or equal to the other participant's `lastReadMessageId`).
   */
  isSeen: boolean;
  /** Called when the user taps the retry control on a failed message. */
  onRetry?: () => void;
  /** Optional override for the wrapper style (e.g. additional spacing). */
  style?: StyleProp<ViewStyle>;
};

/**
 * Formats `createdAt` as a short locale time string (e.g. "9:41 AM").
 * Falls back to the raw string if the timestamp cannot be parsed so the
 * accessibility label stays meaningful even for malformed payloads.
 */
function formatTime(createdAt: string): string {
  const t = Date.parse(createdAt);
  if (Number.isNaN(t)) return createdAt;
  return new Date(t).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Builds a short human-readable description of `attachments` for the
 * accessibility label fallback when the message has no text content.
 * Keeps the wording consistent with the Req 23.5 conventions used by
 * {@link AttachmentGrid} ("image attachment", "video attachment").
 */
function describeAttachments(attachments: AttachmentDescriptor[]): string {
  const total = attachments.length;
  if (total === 0) return '';
  let images = 0;
  let videos = 0;
  for (const a of attachments) {
    if (a.type === 'image') images += 1;
    else if (a.type === 'video') videos += 1;
  }
  if (images > 0 && videos === 0) {
    return `${images} ${images === 1 ? 'image attachment' : 'image attachments'}`;
  }
  if (videos > 0 && images === 0) {
    return `${videos} ${videos === 1 ? 'video attachment' : 'video attachments'}`;
  }
  return `${total} attachments`;
}

/**
 * Maps a {@link LocalMessage}'s `localStatus` to the unicode glyph rendered
 * in the status corner of outgoing bubbles. Incoming bubbles never show a
 * status icon.
 */
function statusGlyph(status: LocalMessage['localStatus']): string {
  switch (status) {
    case 'pending':
      return '◌';
    case 'failed':
      return '!';
    case 'sent':
    default:
      return '✓';
  }
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isSelf,
  isSeen,
  onRetry,
  style,
}: MessageBubbleProps) {
  const { content, attachments, sender, createdAt, localStatus } = message;
  const hasAttachments = attachments && attachments.length > 0;
  const hasText = typeof content === 'string' && content.trim().length > 0;
  const isFailed = localStatus === 'failed';

  const accessibilityLabel = useMemo(() => {
    const time = formatTime(createdAt);
    const body = hasText ? content : describeAttachments(attachments ?? []);
    return `${sender.name} at ${time}: ${body}`;
  }, [sender.name, createdAt, hasText, content, attachments]);

  const handleRetry = useCallback(() => {
    if (isFailed) onRetry?.();
  }, [isFailed, onRetry]);

  return (
    <View
      style={[styles.wrapper, isSelf ? styles.wrapperSelf : styles.wrapperOther, style]}
      accessible
      accessibilityLabel={accessibilityLabel}
    >
      <View
        style={[
          styles.bubble,
          isSelf ? styles.bubbleSelf : styles.bubbleOther,
          isFailed && styles.bubbleFailed,
        ]}
      >
        {hasAttachments ? (
          <View style={hasText ? styles.attachmentsWithText : undefined}>
            <AttachmentGrid attachments={attachments} />
          </View>
        ) : null}
        {hasText ? (
          <Text style={[styles.text, isSelf ? styles.textSelf : styles.textOther]}>
            {content}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <Text
            style={[styles.time, isSelf ? styles.timeSelf : styles.timeOther]}
          >
            {formatTime(createdAt)}
          </Text>
          {isSelf ? (
            <Text
              style={[
                styles.statusIcon,
                isFailed ? styles.statusFailed : styles.statusOnPrimary,
              ]}
              accessibilityLabel={`Status: ${localStatus}`}
            >
              {statusGlyph(localStatus)}
            </Text>
          ) : null}
        </View>
      </View>

      {isSelf && isFailed ? (
        <Pressable
          onPress={handleRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry sending message"
          style={({ pressed }) => [styles.retryButton, pressed && styles.retryPressed]}
        >
          <Text style={styles.retryText}>Failed — tap to retry</Text>
        </Pressable>
      ) : null}

      {isSelf && isSeen && !isFailed ? (
        <Text style={styles.seenMarker} accessibilityLabel="Seen">
          Seen
        </Text>
      ) : null}
    </View>
  );
});

const MAX_BUBBLE_WIDTH_RATIO = 0.78;

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    paddingHorizontal: 12,
    marginVertical: 4,
  },
  wrapperSelf: { alignItems: 'flex-end' },
  wrapperOther: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: `${MAX_BUBBLE_WIDTH_RATIO * 100}%`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  bubbleSelf: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleFailed: {
    backgroundColor: colors.error,
  },
  attachmentsWithText: {
    marginBottom: 6,
  },
  text: {
    ...nunitoSans.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  textSelf: { color: colors.onPrimary },
  textOther: { color: colors.onboardingTitle },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 4,
  },
  time: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 10,
    lineHeight: 14,
  },
  timeSelf: { color: 'rgba(255,255,255,0.85)' },
  timeOther: { color: colors.placeholder },
  statusIcon: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 11,
    lineHeight: 14,
  },
  statusOnPrimary: { color: 'rgba(255,255,255,0.95)' },
  statusFailed: { color: colors.onPrimary },
  retryButton: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  retryPressed: { opacity: 0.6 },
  retryText: {
    fontFamily: fontFamilies.inter.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.error,
  },
  seenMarker: {
    marginTop: 2,
    fontFamily: fontFamilies.inter.regular,
    fontSize: 11,
    lineHeight: 14,
    color: colors.placeholder,
  },
});
