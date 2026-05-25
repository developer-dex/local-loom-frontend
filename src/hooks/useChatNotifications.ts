/**
 * React hook that drives the in-app chat notification banner.
 *
 * Wires the consumer side of the notification flow described by Requirement
 * 15. The producer side — translating socket events into entries on
 * `chatSlice.notifications` — is owned by `useChatSocket` (Task 9.1):
 *
 *  - `chat:message` for a conversation that is not the Active_Conversation
 *    and where `sender.id` is not the Authenticated_User → `pushNotification`
 *    (Req 15.1).
 *  - `notification:new` whose `data.conversationId` is set → `pushNotification`
 *    with the event's `title` / `body` (Req 15.3).
 *
 * Co-locating the consumer side here keeps the screen layer dumb: the
 * `<InAppBanner />` component (Task 11.6) renders whatever this hook
 * returns and forwards swipe/tap intents to {@link UseChatNotifications.dismiss}
 * and {@link UseChatNotifications.handleTap}.
 *
 * Responsibilities:
 *  - Read the live notifications list from `chatSlice.notifications`.
 *  - Auto-dismiss every entry 4 seconds after it is added (Req 15.1).
 *  - Provide a `dismiss(id)` helper for swipe / explicit close
 *    interactions on the banner (Req 15.1).
 *  - Provide a `handleTap(notification)` helper that dismisses the entry
 *    and navigates to `ChatDetail` for the banner's `conversationId`
 *    via the root navigator (Req 15.2, 15.3).
 *
 * The hook is safe to mount in any component that lives under the app's
 * `NavigationContainer`; navigation is resolved through React Navigation's
 * parent chain so the same hook works whether it is mounted inside
 * `MainTabs` (where `ChatDetail` lives on the parent root stack) or on a
 * screen that already runs on the root stack.
 *
 * _Requirements: 15.1, 15.2, 15.3_
 */

import { useCallback, useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  dismissNotification,
  type ChatNotification,
} from '../store/slices/chatSlice';
import type { RootStackParamList } from '../navigation/types';

/** Auto-dismiss window for an in-app banner entry (Req 15.1). */
const AUTO_DISMISS_MS = 4_000;

/** Header fallback when a notification doesn't carry a usable title string. */
const DEFAULT_CHAT_NAME = 'Chat';

/**
 * Public surface of {@link useChatNotifications}. Designed to be consumed by
 * an `<InAppBanner />` component which renders one banner per entry in
 * `notifications` and forwards swipe/tap into the supplied callbacks.
 */
export type UseChatNotifications = {
  /** Current banner queue (slice-ordered). */
  notifications: ChatNotification[];
  /** Dismiss a single banner by id. Cancels its pending auto-dismiss timer. */
  dismiss: (id: string) => void;
  /**
   * Tap handler: dismisses the banner and, when a `conversationId` is
   * present, navigates to `ChatDetail` via the root navigator.
   */
  handleTap: (notification: ChatNotification) => void;
};

/**
 * Returns the live banner queue plus dismiss / tap helpers. Schedules an
 * auto-dismiss timer for each new entry; cancels timers on manual dismiss
 * or when entries are removed externally (e.g. by `clearChatState` on
 * logout).
 */
export function useChatNotifications(): UseChatNotifications {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const notifications = useAppSelector((s) => s.chat.notifications);

  // Per-id auto-dismiss timer handles. Held on a ref (not state) so timer
  // bookkeeping doesn't trigger renders and so the latest closure observed
  // by the cleanup effect always sees the current map.
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback(
    (id: string): void => {
      const handle = timers.current.get(id);
      if (handle !== undefined) {
        clearTimeout(handle);
        timers.current.delete(id);
      }
      dispatch(dismissNotification(id));
    },
    [dispatch],
  );

  /**
   * Resolves the root navigator. Walks up via `getParent` (matching the
   * convention used by `ChatsScreen`) so the hook can be mounted inside a
   * tab navigator and still reach the root stack where `ChatDetail` lives.
   * Falls back to the current navigator when no parent exists — React
   * Navigation's `navigate` resolves the route through the parent chain
   * automatically in either case.
   */
  const getRootNav = useCallback(():
    | NativeStackNavigationProp<RootStackParamList>
    | undefined => {
    const parent =
      navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
    if (parent) return parent;
    return navigation as unknown as NativeStackNavigationProp<RootStackParamList>;
  }, [navigation]);

  const handleTap = useCallback(
    (notification: ChatNotification): void => {
      // Dismiss first so the banner disappears even when navigation is
      // a no-op (e.g. notification missing a conversationId).
      dismiss(notification.id);
      const chatId = notification.conversationId;
      if (!chatId) return;
      const name =
        typeof notification.title === 'string' && notification.title.length > 0
          ? notification.title
          : DEFAULT_CHAT_NAME;
      getRootNav()?.navigate('ChatDetail', { chatId, name });
    },
    [dismiss, getRootNav],
  );

  // Schedule auto-dismiss for newly-added notifications and prune timers
  // for entries that were removed externally (e.g. logout / clearChatState).
  useEffect(() => {
    const live = new Set<string>();
    for (const n of notifications) {
      live.add(n.id);
      if (timers.current.has(n.id)) continue;
      const handle = setTimeout(() => {
        timers.current.delete(n.id);
        dispatch(dismissNotification(n.id));
      }, AUTO_DISMISS_MS);
      timers.current.set(n.id, handle);
    }
    for (const [id, handle] of timers.current) {
      if (!live.has(id)) {
        clearTimeout(handle);
        timers.current.delete(id);
      }
    }
  }, [notifications, dispatch]);

  // Cancel all pending timers on unmount so a late callback can't dispatch
  // against a torn-down provider tree (e.g. during tests).
  useEffect(() => {
    return () => {
      for (const handle of timers.current.values()) {
        clearTimeout(handle);
      }
      timers.current.clear();
    };
  }, []);

  return { notifications, dismiss, handleTap };
}
