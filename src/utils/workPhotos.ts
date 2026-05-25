import { resolveMediaUrl } from './mediaUrl';

export type WorkImageDraft = {
  uri: string;
  name: string;
  /** Existing server photo id (edit mode). */
  id?: string;
};

export function isLocalMediaUri(uri: string): boolean {
  return (
    uri.startsWith('file://') ||
    uri.startsWith('content://') ||
    uri.startsWith('ph://') ||
    uri.startsWith('assets-library://')
  );
}

/** Photo already on the server (from GET /tradies/me/profile), not a new pick. */
export function isExistingServerPhoto(img: WorkImageDraft): boolean {
  return Boolean(img.id) && !isLocalMediaUri(img.uri);
}

export function normalizeWorkImageDraft(img: WorkImageDraft): WorkImageDraft {
  const resolved = resolveMediaUrl(img.uri) ?? img.uri;
  return {
    ...img,
    uri: resolved,
    name: img.name || resolved.split('/').pop() || 'work.jpg',
  };
}

export function normalizeWorkImageDrafts(images: WorkImageDraft[]): WorkImageDraft[] {
  return images.map(normalizeWorkImageDraft);
}

/** New picks from camera/gallery only — not existing remote URLs. */
export function getNewLocalWorkImages(current: WorkImageDraft[]): WorkImageDraft[] {
  return current.filter((i) => isLocalMediaUri(i.uri));
}

/** Remote URLs already stored on the server (no new upload needed). */
export function getExistingRemoteWorkImages(current: WorkImageDraft[]): WorkImageDraft[] {
  return current.filter((i) => !isLocalMediaUri(i.uri));
}

export function hasPendingWorkPhotoChanges(
  removedServerPhotoIds: Iterable<string>,
  addedLocalUris: Iterable<string>,
): boolean {
  return [...removedServerPhotoIds].length > 0 || [...addedLocalUris].length > 0;
}
