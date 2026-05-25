/**
 * ConnectionBanner — non-blocking status strip rendered above chat content
 * whenever the Socket.IO connection is not healthy.
 *
 * Responsibilities (Task 11.5, Requirements 9.6, 9.7):
 *  - Subscribes to {@link selectConnectionStatus} on the Redux `chat` slice.
 *  - Renders nothing when the status is `connected` or `connecting` — those
 *    states either don't need surfacing or are too transient to flash a
 *    banner for during the initial handshake.
 *  - When `reconnecting`, shows the localized text "Reconnecting…".
 *  - When `disconnected`, shows the localized text "Offline" (Req 9.7
 *    specifies this copy is shown only while the user is signed in; the
 *    screen layer is responsible for not mounting the banner under guest
 *    state, so this component just renders whatever status it is given).
 *  - The strip is sized to ≤ 32 logical pixels of vertical space (Req 9.7)
 *    and uses `pointerEvents="none"` so it never intercepts touches on
 *    underlying conversation rows or message rows.
 *  - `accessibilityLiveRegion="polite"` so screen readers announce changes
 *    without stealing focus.
 *
 * The component is presentational: it is mounted unconditionally above the
 * chat surface and self-hides via the early `return null` for healthy states.
 */
import { memo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppSelector } from '../../store/hooks';
import { selectConnectionStatus } from '../../store/slices/chatSelectors';
import type { ConnectionStatus } from '../../api/chatSocket';
import { colors, fontFamilies } from '../../theme';

/** Maximum vertical space for the banner per Req 9.7 (≤ 32 logical pixels). */
const BANNER_HEIGHT = 28;

/**
 * Maps the status to the user-facing label. Returns `null` for healthy
 * states so callers can short-circuit rendering.
 */
function labelFor(status: ConnectionStatus): string | null {
  switch (status) {
    case 'reconnecting':
      return 'Reconnecting…';
    case 'disconnected':
      return 'Offline';
    case 'connected':
    case 'connecting':
    default:
      return null;
  }
}

/**
 * Background colour selection — neutral grey for the transient
 * `reconnecting` state and the project's error red for `disconnected` so
 * the offline state is visually distinct.
 */
function backgroundFor(status: ConnectionStatus): string {
  return status === 'disconnected' ? colors.error : colors.placeholder;
}

export const ConnectionBanner = memo(function ConnectionBanner() {
  const status = useAppSelector(selectConnectionStatus);
  // Only show the banner after the socket has attempted at least one
  // connection. The initial slice state is 'disconnected' which would
  // incorrectly flash "Offline" before the socket module even runs.
  const hasEverConnected = useRef(false);
  if (status === 'connecting' || status === 'connected' || status === 'reconnecting') {
    hasEverConnected.current = true;
  }

  const label = labelFor(status);
  if (label === null) return null;
  // Suppress the banner until the socket has been activated at least once.
  if (!hasEverConnected.current) return null;

  return (
    <View
      pointerEvents="none"
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessibilityLabel={label}
      style={[styles.strip, { backgroundColor: backgroundFor(status) }]}
    >
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  strip: {
    height: BANNER_HEIGHT,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  label: {
    fontFamily: fontFamilies.inter.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onPrimary,
  },
});
