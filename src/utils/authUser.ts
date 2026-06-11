import type { AuthUser, UserRole, UserStatus } from '../api/authTypes';
import type { TradieApplicationDraft } from '../storage/tradieApplication';
import { resolveMediaUrl } from './mediaUrl';

function pickString(value: unknown): string | null {
  if (value == null || value === '') return null;
  return String(value);
}

/** Map GET /users/me `data` (snake_case or camelCase) into {@link AuthUser}. */
export function parseAuthUserFromMe(data: unknown): AuthUser {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid user profile');
  }

  const o = data as Record<string, unknown>;
  const isTradie = Boolean(o.is_tradie ?? o.isTradie);
  const roleRaw = o.role;
  const role: UserRole =
    roleRaw === 'tradie' || roleRaw === 'customer' ? roleRaw : isTradie ? 'tradie' : 'customer';

  return {
    id: String(o.id ?? ''),
    name: String(o.name ?? ''),
    email: o.email != null && o.email !== '' ? String(o.email) : null,
    phone: String(o.phone ?? ''),
    avatar: pickString(o.avatar),
    role,
    status: (o.status === 'active' || o.status === 'suspended' || o.status === 'deleted'
      ? o.status
      : 'active') as UserStatus,
    isPhoneVerified: Boolean(o.isPhoneVerified ?? o.is_phone_verified),
    overallRating: Number(o.overallRating ?? o.overall_rating ?? 0),
    lastLogin: String(o.lastLogin ?? o.last_login ?? ''),
    createdAt: String(o.createdAt ?? o.created_at ?? ''),
    updatedAt: String(o.updatedAt ?? o.updated_at ?? ''),
    isTradie,
    isCustomer: Boolean(o.is_customer ?? o.isCustomer ?? true),
    profileExist: Boolean(o.profile_exist ?? o.profileExist),
    tradieProfileStatus: pickString(
      o.tradie_profile_status ?? o.tradieProfileStatus ?? o.profile_status ?? o.profileStatus,
    ),
  };
}

/** Resolve avatar URL for display (fixes localhost / relative paths from API). */
export function normalizeAuthUser(data: unknown): AuthUser {
  const user = parseAuthUserFromMe(data);
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

export function isTradieProfileApproved(status: string | null | undefined): boolean {
  return status === 'approved';
}

/** True while service provider application is awaiting approval (not rejected). */
export function isTradieProfileUnderReview(status: string | null | undefined): boolean {
  if (status === 'approved' || status === 'rejected') return false;
  return true;
}
