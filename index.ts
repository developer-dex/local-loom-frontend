import * as SplashScreen from 'expo-splash-screen';

// Hold the native splash until the app calls hideAsync (see App.tsx).
// Expo Go often does not show your app.json splash image; the JS splash matches designs anyway.
void SplashScreen.preventAutoHideAsync();

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
