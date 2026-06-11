import * as Sentry from '@sentry/react-native';
import { isRunningInExpoGo } from 'expo';

import { env } from '../config/env';

/** Wired in {@link RootNavigator} via `NavigationContainer.onReady`. */
export const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: !isRunningInExpoGo(),
});

function isSentryEnabled(): boolean {
  if (!env.sentryDsn) return false;
  if (!__DEV__) return true;
  return env.sentryEnabledInDev;
}

export function initSentry(): void {
  if (!env.sentryDsn) {
    if (__DEV__) {
      console.warn('[sentry] EXPO_PUBLIC_SENTRY_DSN is not set — crash reporting is disabled.');
    }
    return;
  }

  Sentry.init({
    dsn: env.sentryDsn,
    environment: __DEV__ ? 'development' : 'production',
    enabled: isSentryEnabled(),
    debug: __DEV__ && env.sentryEnabledInDev,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enableNativeFramesTracking: !isRunningInExpoGo(),
    integrations: [navigationIntegration],
  });
}

export { Sentry };
