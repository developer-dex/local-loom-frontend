import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BrandedSplash } from './src/components/BrandedSplash';
import { AuthProvider } from './src/context/AuthContext';
import { useManropeFonts } from './src/hooks/useManropeFonts';
import { RootNavigator } from './src/navigation/RootNavigator';

const MIN_SPLASH_MS = 600;

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

  return (
    <SafeAreaProvider>
      {!showMain ? (
        <View
          style={splashWrap.fill}
          onLayout={() => {
            // Drop native layer once our branded view has laid out (avoids a blank flash).
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
    </SafeAreaProvider>
  );
}

const splashWrap = StyleSheet.create({
  fill: { flex: 1 },
});
