import type { AuthUser } from '../api/authTypes';
import type { TradieApplicationDraft } from '../storage/tradieApplication';
import { resolveMediaUrl } from './mediaUrl';

/** Resolve avatar URL for display (fixes localhost / relative paths from API). */
export function normalizeAuthUser(user: AuthUser): AuthUser {
  if (!user.avatar) return user;
  const avatar = resolveMediaUrl(user.avatar);
  return avatar ? { ...user, avatar } : user;
}

/** Step 0 fields for Become Tradie — from GET /users/me (customer becoming tradie). */
export function personalInfoFromAuthUser(
  user: Pick<AuthUser, 'name' | 'phone' | 'email' | 'avatar'>,
): Pick<TradieApplicationDraft, 'photoUri' | 'name' | 'phone' | 'email'> {
  return {
    photoUri: user.avatar ? resolveMediaUrl(user.avatar) ?? user.avatar : null,
    name: user.name ?? '',
    phone: user.phone ?? '',
    email: user.email ?? '',
  };
}
