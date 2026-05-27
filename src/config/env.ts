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

export const env = {
  apiBaseUrl,
  socketBaseUrl,
} as const;
