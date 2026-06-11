/**
 * Public env vars must use the `EXPO_PUBLIC_` prefix to be inlined at build time.
 * @see https://docs.expo.dev/guides/environment-variables/
 */

function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

/** REST API root (includes `/api/v1`). */
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

/**
 * Socket.IO server origin — no `/api/v1` path.
 * Falls back to stripping `/api/v1` from {@link apiBaseUrl} when unset.
 */
const socketBaseUrl = (() => {
  const explicit = process.env.EXPO_PUBLIC_SOCKET_BASE_URL;
  if (explicit) return trimTrailingSlash(explicit);
  return trimTrailingSlash(apiBaseUrl.replace(/\/api\/v1\/?$/i, ''));
})();

/** Sentry DSN — public; safe to embed in the client bundle. */
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

/** When true, Sentry sends events in `__DEV__` builds (default: off). */
const sentryEnabledInDev = process.env.EXPO_PUBLIC_SENTRY_ENABLED === 'true';

export const env = {
  apiBaseUrl,
  socketBaseUrl,
  sentryDsn,
  sentryEnabledInDev,
} as const;
