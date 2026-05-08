/**
 * Public env vars must use the `EXPO_PUBLIC_` prefix to be inlined at build time.
 * @see https://docs.expo.dev/guides/environment-variables/
 */
export const env = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
} as const;
