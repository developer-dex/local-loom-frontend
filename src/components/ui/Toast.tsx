/**
 * Toast — animated overlay notification.
 *
 * Slides in from the top, stays for `duration` ms, then slides out.
 * Tap the × button to dismiss early.
 *
 * Usage:
 *   const { showToast } = useToast();
 *   showToast({ message: 'Something went wrong', type: 'error' });
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamilies, spacing } from '../../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'error' | 'success' | 'info';

export type ToastOptions = {
  message: string;
  type?: ToastType;
  /** Auto-dismiss after this many ms. Defaults to 5 000 (5 s). */
  duration?: number;
};

type ToastContextValue = {
  showToast: (opts: ToastOptions) => void;
  hideToast: () => void;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<(ToastOptions & { id: number }) | null>(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start(() => setToast(null));
  }, [opacity, translateY]);

  const show = useCallback(
    (opts: ToastOptions) => {
      // Cancel any running timer / animation
      if (timerRef.current) clearTimeout(timerRef.current);
      translateY.stopAnimation();
      opacity.stopAnimation();

      idRef.current += 1;
      const id = idRef.current;
      const duration = opts.duration ?? 5_000;

      // Reset position before animating in
      translateY.setValue(-120);
      opacity.setValue(0);

      setToast({ ...opts, id });

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

      timerRef.current = setTimeout(() => {
        // Only hide if this toast is still the active one
        if (idRef.current === id) hide();
      }, duration);
    },
    [hide, opacity, translateY],
  );

  // Cleanup on unmount
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const bgColor: ViewStyle['backgroundColor'] =
    toast?.type === 'success'
      ? colors.success
      : toast?.type === 'info'
        ? '#1565C0'
        : colors.error;

  return (
    <ToastContext.Provider value={{ showToast: show, hideToast: hide }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.container,
            {
              top: insets.top + spacing.sm,
              backgroundColor: bgColor,
              transform: [{ translateY }],
              opacity,
            },
          ]}
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          <Text style={styles.message} numberOfLines={4}>
            {toast.message}
          </Text>
          <Pressable onPress={hide} hitSlop={12} style={styles.closeBtn} accessibilityLabel="Dismiss">
            <Text style={styles.closeIcon}>✕</Text>
          </Pressable>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    borderRadius: 12,
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  message: {
    flex: 1,
    fontFamily: fontFamilies.inter.medium,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  closeBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  closeIcon: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },
});
