import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { store } from './src/store';
import { BrandedSplash } from './src/components/BrandedSplash';
import { AuthProvider } from './src/context/AuthContext';
import { useManropeFonts } from './src/hooks/useManropeFonts';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ToastProvider } from './src/components/ui';

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

export default function App() {
  const [fontsLoaded, fontError] = useManropeFonts();
  const [showMain, setShowMain] = useState(false);
  const nativeHidden = useRef(false);
  const startedAt = useRef(Date.now());
  const fontsReady = fontsLoaded || fontError != null;

  const hideNativeOnce = useCallback(() => {
    if (nativeHidden.current) return;
    nativeHidden.current = true;
    void SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (!fontsReady) return;
    const elapsed = Date.now() - startedAt.current;
    const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);
    const t = setTimeout(() => setShowMain(true), remaining);
    return () => clearTimeout(t);
  }, [fontsReady]);

  // Safety net: never stay on splash longer than MAX_SPLASH_MS regardless of
  // font load status. Prevents a frozen screen on devices where font loading
  // hangs (e.g. network issues in production builds).
  useEffect(() => {
    const t = setTimeout(() => setShowMain(true), MAX_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

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
