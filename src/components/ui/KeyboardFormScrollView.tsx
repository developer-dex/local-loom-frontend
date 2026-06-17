import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import {
  findNodeHandle,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  UIManager,
  type LayoutRectangle,
  type ScrollViewProps,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type KeyboardFormContextValue = {
  scrollToFocusedField: (nativeHandle: number) => void;
};

const KeyboardFormContext = createContext<KeyboardFormContextValue | null>(null);

const DEFAULT_FOCUS_PADDING = 80;

export type KeyboardFormScrollViewProps = ScrollViewProps & {
  children: ReactNode;
  /** Extra space above the keyboard when scrolling to a focused field. */
  focusScrollPadding?: number;
  /** Set false when a parent already wraps the screen in KeyboardAvoidingView. */
  keyboardAvoiding?: boolean;
  keyboardVerticalOffset?: number;
};

export function KeyboardFormScrollView({
  children,
  focusScrollPadding = DEFAULT_FOCUS_PADDING,
  keyboardAvoiding = true,
  keyboardVerticalOffset = 0,
  keyboardShouldPersistTaps = 'handled',
  keyboardDismissMode = 'on-drag',
  automaticallyAdjustKeyboardInsets = true,
  showsVerticalScrollIndicator = false,
  style,
  ...scrollProps
}: KeyboardFormScrollViewProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const scrollLayoutRef = useRef<LayoutRectangle | null>(null);
  const currentOffsetRef = useRef(0);

  const scrollToFocusedField = useCallback(
    (nativeHandle: number) => {
      const scroll = scrollRef.current;
      if (!scroll || !nativeHandle) return;

      if (Platform.OS === 'android') {
        // On Android, use measureLayout for reliable positioning
        const scrollNode = findNodeHandle(scroll);
        if (!scrollNode) return;

        const doScroll = () => {
          try {
            UIManager.measureLayout(
              nativeHandle,
              scrollNode,
              () => {},
              (_x: number, y: number, _w: number, h: number) => {
                const scrollHeight = scrollLayoutRef.current?.height ?? 400;
                // Calculate where the field is relative to current scroll
                const fieldBottom = y + h + focusScrollPadding;
                const visibleBottom = currentOffsetRef.current + scrollHeight;

                if (fieldBottom > visibleBottom) {
                  // Field is below visible area — scroll down just enough
                  const targetOffset = fieldBottom - scrollHeight;
                  scroll.scrollTo({ y: targetOffset, animated: true });
                } else if (y < currentOffsetRef.current + 20) {
                  // Field is above visible area — scroll up
                  scroll.scrollTo({ y: Math.max(0, y - 20), animated: true });
                }
                // If field is already visible, don't scroll at all
              },
            );
          } catch {
            // Fallback: use the old API if measureLayout fails
            scroll.scrollResponderScrollNativeHandleToKeyboard?.(
              nativeHandle,
              focusScrollPadding,
              true,
            );
          }
        };

        // Wait for keyboard to finish appearing
        setTimeout(doScroll, 300);
      } else {
        // iOS: the built-in API works reliably
        requestAnimationFrame(() => {
          scroll.scrollResponderScrollNativeHandleToKeyboard?.(
            nativeHandle,
            focusScrollPadding,
            true,
          );
        });
      }
    },
    [focusScrollPadding],
  );

  const contextValue = useMemo(
    () => ({ scrollToFocusedField }),
    [scrollToFocusedField],
  );

  const scrollView = (
    <KeyboardFormContext.Provider value={contextValue}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={keyboardDismissMode}
        automaticallyAdjustKeyboardInsets={
          Platform.OS === 'ios' ? automaticallyAdjustKeyboardInsets : false
        }
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        onLayout={(e) => {
          scrollLayoutRef.current = e.nativeEvent.layout;
        }}
        onScroll={(e) => {
          currentOffsetRef.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        {...scrollProps}
      >
        {children}
      </ScrollView>
    </KeyboardFormContext.Provider>
  );

  if (!keyboardAvoiding) {
    return scrollView;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset + insets.top}
    >
      {scrollView}
    </KeyboardAvoidingView>
  );
}

/** Attach to TextInput `onFocus` when not using AppTextField. */
export function useKeyboardFormScrollOnFocus(onFocus?: TextInputProps['onFocus']) {
  const form = useContext(KeyboardFormContext);

  return useCallback<NonNullable<TextInputProps['onFocus']>>(
    (event) => {
      onFocus?.(event);
      const handle = event.nativeEvent.target;
      if (typeof handle === 'number') {
        form?.scrollToFocusedField(handle);
      }
    },
    [form, onFocus],
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
