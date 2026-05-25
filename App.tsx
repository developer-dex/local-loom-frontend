import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { store } from './src/store';
import { BrandedSplash } from './src/components/BrandedSplash';
import { AuthProvider } from './src/context/AuthContext';
import { useChatSocket } from './src/hooks/useChatSocket';
import { useManropeFonts } from './src/hooks/useManropeFonts';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ToastProvider } from './src/components/ui';
import { subscribeChatPersistence } from './src/api/chatPersistence';

// Keep the native splash visible until we explicitly hide it.
// Must be called at module level (not inside a component) to take effect before
// the first render. Without this, the native splash auto-hides on production APKs.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore — throws in Expo Go but is safe to swallow.
});

const MIN_SPLASH_MS = 600;
// Safety timeout: if fonts haven't loaded after 5 s, proceed anyway rather
// than staying stuck on the splash screen forever.
const MAX_SPLASH_MS = 5000;

/**
 * Wires the chat socket lifecycle and persistence subscription.
 * Only rendered after the splash phase completes so that any initialization
 * error in the chat module can't block the app from booting.
 */
function ChatWiring() {
  useChatSocket();

  // Subscribe to store for persistence (debounced AsyncStorage writes).
  // Running inside a useEffect avoids blocking module initialization.
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribeChatPersistence(store);
    } catch {
      // Best-effort — persistence failure must never block the app.
    }
    return () => unsubscribe?.();
  }, []);

  return null;
}

export default function App() {
  const [fontsLoaded, fontError] = useManropeFonts();
  const [showMain, setShowMain] = useState(false);
  const nativeHidden = useRef(false);
  const startedAt = useRef(Date.now());

  const hideNativeOnce = useCallback(() => {
    if (nativeHidden.current) return;
    nativeHidden.current = true;
    void SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (fontError && __DEV__) {
      console.error('[fonts] Failed to load:', fontError);
    }
  }, [fontError]);

  useEffect(() => {
    if (!fontsLoaded) return;
    const elapsed = Date.now() - startedAt.current;
    const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);
    const t = setTimeout(() => {
      hideNativeOnce();
      setShowMain(true);
    }, remaining);
    return () => clearTimeout(t);
  }, [fontsLoaded, hideNativeOnce]);

  // Safety net: never stay on splash longer than MAX_SPLASH_MS.
  useEffect(() => {
    const t = setTimeout(() => {
      if (!fontsLoaded && __DEV__) {
        console.warn('[fonts] Timed out waiting for fonts — showing app anyway');
      }
      hideNativeOnce();
      setShowMain(true);
    }, MAX_SPLASH_MS);
    return () => clearTimeout(t);
  }, [fontsLoaded, hideNativeOnce]);

  return (
    <ReduxProvider store={store}>
      <SafeAreaProvider>
        <ToastProvider>
          {!showMain ? (
            <View
              style={splashWrap.fill}
              onLayout={() => {
                hideNativeOnce();
              }}
            >
              <BrandedSplash />
            </View>
          ) : (
            <AuthProvider>
              <ChatWiring />
              <RootNavigator />
            </AuthProvider>
          )}
          <StatusBar style="dark" />
        </ToastProvider>
      </SafeAreaProvider>
    </ReduxProvider>
  );
}

const splashWrap = StyleSheet.create({
  fill: { flex: 1 },
});
