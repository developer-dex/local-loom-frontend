/**
 * InAppBanner — top-of-screen swipeable/tappable notification banner.
 *
 * Responsibilities (Task 11.6, Requirements 15.1, 15.2, 15.3):
 *  - Reads `state.chat.notifications` and renders the most recent few
 *    entries as stacked banners at the top of the screen.
 *  - Auto-dismisses each banner after 4 s (matches the design's UX target;
 *    if a parallel hook later assumes ownership of timing, pass
 *    `autoDismiss={false}` from the mount site to disable this safety net).
 *  - On tap → fires `onOpenConversation(notification)` (defaults to a
 *    `useNavigation()`-driven `navigate('ChatDetail', { chatId })`) and
 *    dismisses the banner.
 *  - On swipe (left or right) past a small threshold → dismisses the
 *    banner without navigating.
 *  - On tap of the close affordance (×) → dismisses the banner without
 *    navigating.
 *
 * The component is intentionally presentational over the slice: it never
 * wires the socket or sets up the notification entries — that is the job
 * of `useChatNotifications` (Task 10.2). It only renders what
 * `chatSlice.notifications` already contains and dispatches
 * `dismissNotification(id)` for the swipe/tap-close paths.
 *
 * Mount the component once near the navigation root so banners overlay the
 * current screen regardless of route. If the mount point sits outside a
 * `NavigationContainer` (e.g. inside `App.tsx` above `RootNavigator`),
 * pass `onOpenConversation` to wire navigation explicitly — the default
 * `useNavigation()` lookup only works when the banner is rendered inside
 * a navigator.
 */
import { memo, useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  dismissNotification,
  type ChatNotification,
} from '../../store/slices/chatSlice';
import type { RootStackParamList } from '../../navigation/types';
import { colors, fontFamilies, nunitoSans, spacing } from '../../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export type InAppBannerProps = {
  /**
   * Optional override for the tap handler. Receives the notification that
   * was tapped. When omitted, the component looks up a navigator via
   * `useNavigation()` and calls `navigate('ChatDetail', { chatId })` for
   * notifications that carry a `conversationId`.
   */
  onOpenConversation?: (notification: ChatNotification) => void;
  /**
   * When `true` (default) every banner is removed from the slice 4 s after
   * it appears. Set to `false` if a parallel hook (e.g. Task 10.2's
   * `useChatNotifications`) owns the auto-dismiss schedule.
   */
  autoDismiss?: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

/** How long a banner stays visible before the local timer dismisses it. */
const AUTO_DISMISS_MS = 4_000;
/** Horizontal pixels of pan before we treat the gesture as a dismiss swipe. */
const SWIPE_DISMISS_THRESHOLD = 64;
/** Pixels of horizontal movement that flip the gesture from tap to swipe. */
const SWIPE_DETECT_THRESHOLD = 8;
/** Cap on the number of banners rendered at once. The slice may hold more. */
const MAX_VISIBLE = 3;

// ─── Public component ────────────────────────────────────────────────────────

/**
 * Renders the most recent notifications from {@link ChatNotification} state
 * as a vertical stack at the top of the screen. Returns `null` when the
 * slice has no notifications, so the component is cheap to mount
 * unconditionally.
 */
export function InAppBanner({
  onOpenConversation,
  autoDismiss = true,
}: InAppBannerProps) {
  const insets = useSafeAreaInsets();
  const notifications = useAppSelector((s) => s.chat.notifications);

  // Reverse so the newest banner sits on top; cap stack height for sanity.
  const visible: ChatNotification[] = notifications
    .slice(-MAX_VISIBLE)
    .slice()
    .reverse();

  if (visible.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.stack, { top: insets.top + spacing.sm }]}
    >
      {visible.map((notification) => (
        <BannerItem
          key={notification.id}
          notification={notification}
          autoDismiss={autoDismiss}
          onOpenConversation={onOpenConversation}
        />
      ))}
    </View>
  );
}

// ─── Per-banner item ─────────────────────────────────────────────────────────

type BannerItemProps = {
  notification: ChatNotification;
  autoDismiss: boolean;
  onOpenConversation?: (notification: ChatNotification) => void;
};

/**
 * Single animated banner. Owns its own fade/slide-in animation, its own
 * auto-dismiss timer, and a {@link PanResponder} for swipe-to-dismiss.
 * Memoised so updates to other entries in the notifications array don't
 * reset the animation or timer of unrelated banners.
 */
const BannerItem = memo(function BannerItem({
  notification,
  autoDismiss,
  onOpenConversation,
}: BannerItemProps) {
  const dispatch = useAppDispatch();
  // Default tap handler navigates via the nearest navigator. The parent is
  // expected to mount this component inside a navigator (e.g. as part of a
  // screen tree). For environments outside a navigator (tests, custom
  // mount points), pass `onOpenConversation` to bypass this lookup.
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-24)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissedRef = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    dispatch(dismissNotification(notification.id));
  }, [dispatch, notification.id]);

  const animateOutAndDismiss = useCallback(
    (toX: number) => {
      if (dismissedRef.current) return;
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: toX,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => dismiss());
    },
    [dismiss, opacity, translateX],
  );

  const handlePress = useCallback(() => {
    if (dismissedRef.current) return;
    if (onOpenConversation) {
      onOpenConversation(notification);
    } else if (notification.conversationId && navigation) {
      navigation.navigate('ChatDetail', {
        chatId: notification.conversationId,
        // The slice notification only carries `title`/`body`; downstream
        // ChatDetail looks up the conversation by id and renders the full
        // header from the slice, so we forward the title as the best
        // available `name` fallback for the route param shape.
        name: notification.title,
      });
    }
    dismiss();
  }, [dismiss, navigation, notification, onOpenConversation]);

  // Slide + fade in on mount.
  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 6,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  // Auto-dismiss timer (Req 15.1: banners are dismissible by swipe or tap;
  // the design's notification UX caps visibility at 4 s when no other hook
  // owns the schedule).
  useEffect(() => {
    if (!autoDismiss) return;
    const timer = setTimeout(() => {
      animateOutAndDismiss(0);
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [animateOutAndDismiss, autoDismiss]);

  // Pan gesture for swipe-to-dismiss. We only claim the responder once the
  // user has clearly moved horizontally (`SWIPE_DETECT_THRESHOLD`), so a
  // straight tap still reaches the inner Pressable.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (
        _e: GestureResponderEvent,
        g: PanResponderGestureState,
      ) =>
        Math.abs(g.dx) > SWIPE_DETECT_THRESHOLD &&
        Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: Animated.event([null, { dx: translateX }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (
        _e: GestureResponderEvent,
        g: PanResponderGestureState,
      ) => {
        if (Math.abs(g.dx) > SWIPE_DISMISS_THRESHOLD) {
          animateOutAndDismiss(g.dx > 0 ? 400 : -400);
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 6,
        }).start();
      },
    }),
  ).current;

  // The accessibility label combines the title and a short body excerpt so
  // screen readers announce both pieces in one stroke (matches the
  // notification UX described in Req 15.1).
  const accessibilityLabel = notification.body
    ? `${notification.title}: ${notification.body}`
    : notification.title;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.banner,
        {
          transform: [{ translateX }, { translateY }],
          opacity,
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Opens the conversation. Swipe to dismiss."
        style={({ pressed }) => [styles.bannerInner, pressed && styles.pressed]}
      >
        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          {notification.body ? (
            <Text style={styles.body} numberOfLines={2}>
              {notification.body}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => animateOutAndDismiss(0)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
          style={styles.closeBtn}
        >
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  stack: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  banner: {
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  bannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 12,
    gap: 12,
  },
  pressed: { opacity: 0.85 },
  textWrap: { flex: 1, gap: 2 },
  title: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  body: {
    ...nunitoSans.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  closeIcon: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 13,
    color: colors.placeholder,
  },
});

export default InAppBanner;
