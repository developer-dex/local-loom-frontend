import { Image } from 'expo-image';
import { resolveMediaUrl } from './mediaUrl';

/** Warm the image cache for a list of remote paths/URLs (e.g. category icons). */
export async function prefetchRemoteImages(
  paths: (string | null | undefined)[],
): Promise<void> {
  const urls = [
    ...new Set(
      paths
        .map((p) => resolveMediaUrl(p) ?? (p?.trim() ? p.trim() : undefined))
        .filter((u): u is string => Boolean(u)),
    ),
  ];
  if (urls.length === 0) return;

  await Promise.allSettled(urls.map((url) => Image.prefetch(url)));
}
