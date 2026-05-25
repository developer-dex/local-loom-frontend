import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import {
  InteractionManager,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type KeyboardFormContextValue = {
  scrollToFocusedField: (nativeHandle: number) => void;
};

const KeyboardFormContext = createContext<KeyboardFormContextValue | null>(null);

const DEFAULT_FOCUS_PADDING = 60;

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

  const scrollToFocusedField = useCallback(
    (nativeHandle: number) => {
      const scroll = scrollRef.current;
      if (!scroll || !nativeHandle) return;

      const run = () => {
        scroll.scrollResponderScrollNativeHandleToKeyboard?.(
          nativeHandle,
          focusScrollPadding,
          true,
        );
      };

      if (Platform.OS === 'android') {
        InteractionManager.runAfterInteractions(() => {
          setTimeout(run, 120);
        });
      } else {
        requestAnimationFrame(run);
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
        automaticallyAdjustKeyboardInsets={automaticallyAdjustKeyboardInsets}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
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
