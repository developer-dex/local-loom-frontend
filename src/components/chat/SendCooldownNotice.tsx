/**
 * SendCooldownNotice — countdown banner shown while a 60-second send
 * cooldown is active.
 *
 * Driven by `chatSlice.sendCooldownEndsAt`, which is set to
 * `Date.now() + 60_000` whenever the slice observes a `CHAT_RATE_LIMITED`
 * outcome from either:
 *   - a REST 429 response on `POST /chat/messages` or `POST /chat/messages/upload`, or
 *   - a `chat:send-message` socket ack with `error.code === 'CHAT_RATE_LIMITED'`.
 *
 * Behaviour (Task 11.7):
 *  - When `sendCooldownEndsAt` is `null` or already in the past, renders
 *    nothing. The screen layer is responsible for re-enabling the send
 *    control via `selectCanSend` once that happens (Req 20.2 / 20.3).
 *  - When in the future, shows "Please wait {N}s before sending again",
 *    where `{N}` is the remaining whole seconds rounded up
 *    (e.g. 0.4s remaining → "1s", per Req 20.2 / 20.3 wording
 *    "remaining cooldown in whole seconds updated at least once per
 *    second").
 *  - Re-evaluates once per second via `setInterval`. The interval is torn
 *    down when no cooldown is active so we don't keep a timer alive on
 *    idle screens.
 *
 * The component is presentational and self-hides; it is mounted next to
 * the `ChatInputBar` (per design § Components: "replaces the send tooltip
 * area when a 60s cooldown is active").
 *
 * `accessibilityLiveRegion="polite"` so assistive tech announces the
 * countdown without stealing focus (Req 23 — accessibility).
 *
 * _Requirements: 7.10, 20.2, 20.3_
 */
import { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, nunitoSans } from '../../theme';
import { useAppSelector } from '../../store/hooks';

/** Tick interval matching Req 20.2 / 20.3 ("updated at least once per second"). */
const TICK_MS = 1000;

/**
 * Returns the whole seconds remaining until `endsAt`, ceil-rounded so a
 * fractional second still reads as "1s" rather than "0s". Returns `0` when
 * the deadline is unset, has elapsed, or is malformed.
 */
function remainingSeconds(endsAt: number | null, now: number): number {
  if (endsAt == null || !Number.isFinite(endsAt)) return 0;
  const ms = endsAt - now;
  if (ms <= 0) return 0;
  return Math.ceil(ms / 1000);
}

export const SendCooldownNotice = memo(function SendCooldownNotice() {
  const endsAt = useAppSelector((s) => s.chat.sendCooldownEndsAt);
  // `_now` exists purely to force re-evaluation on each tick — the
  // cooldown deadline is time-based, so a Redux change isn't enough.
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (endsAt == null) return;
    if (endsAt <= Date.now()) return;
    const id = setInterval(() => {
      setNow(Date.now());
    }, TICK_MS);
    return () => clearInterval(id);
  }, [endsAt]);

  const seconds = remainingSeconds(endsAt, now);
  if (seconds <= 0) return null;

  const label = `Please wait ${seconds}s before sending again`;
  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessibilityLabel={label}
    >
      <Text style={styles.text} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  text: {
    ...nunitoSans.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.error,
    textAlign: 'center',
  },
});

export default SendCooldownNotice;
