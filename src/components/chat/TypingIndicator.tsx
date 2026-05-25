/**
 * TypingIndicator — renders "{name} is typing…" for the active conversation.
 *
 * Reads typing entries via {@link selectTypingUsersForActive}, which already
 * filters out events older than 5 seconds against `Date.now()` (Requirement
 * 12.5). Because that filter is time-based, the component needs to
 * re-evaluate the selector even when no Redux action fires, so we run a 1 s
 * tick via `setInterval` while at least one user is typing. The interval is
 * torn down when there are no typing entries so we don't keep a timer alive
 * for idle screens.
 *
 * - 1 user:  "{name} is typing…"
 * - 2 users: "{nameA} and {nameB} are typing…"
 * - 3+ users: "{nameA}, {nameB} and N others are typing…"
 * - 0 users: renders nothing
 *
 * Events arriving via `chat:typing` extend the window (latest `lastEventAt`
 * from the slice); `chat:stop-typing` removes the entry from the slice and
 * the indicator disappears on the next render (Requirement 12.6).
 *
 * _Requirements: 12.4, 12.5, 12.6_
 */
import { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, nunitoSans } from '../../theme';
import { useAppSelector } from '../../store/hooks';
import {
  selectTypingUsersForActive,
  type TypingUser,
} from '../../store/slices/chatSelectors';

/** How often to re-evaluate the time-based typing window. */
const TICK_MS = 1000;

function formatTypingLabel(users: TypingUser[]): string | null {
  if (users.length === 0) return null;
  if (users.length === 1) return `${users[0].name} is typing\u2026`;
  if (users.length === 2) {
    return `${users[0].name} and ${users[1].name} are typing\u2026`;
  }
  const others = users.length - 2;
  return `${users[0].name}, ${users[1].name} and ${others} others are typing\u2026`;
}

export const TypingIndicator = memo(function TypingIndicator() {
  const typingUsers = useAppSelector(selectTypingUsersForActive);
  // `_tick` is unused on purpose — bumping it forces the selector to re-run
  // so entries fall out of the 5 s window even when no event arrives.
  const [, setTick] = useState(0);

  useEffect(() => {
    if (typingUsers.length === 0) return;
    const id = setInterval(() => {
      setTick((n) => n + 1);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [typingUsers.length]);

  const label = formatTypingLabel(typingUsers);
  if (!label) return null;

  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <Text style={styles.text} accessibilityLabel={label}>
        {label}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  text: {
    ...nunitoSans.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});

export default TypingIndicator;
