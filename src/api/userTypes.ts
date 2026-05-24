/** Types for the Users API — customer profile management. */

import type { ApiEnvelope } from './authTypes';
import type { AuthUser } from './authTypes';

/** GET /users/me — same shape as auth user. */
export type UserProfile = AuthUser;

export type UpdateUserRequest = {
  name?: string;
  phone?: string;
  email?: string | null;
};

export type UserMeResponse = ApiEnvelope<UserProfile>;
export type UpdateUserResponse = ApiEnvelope<UserProfile>;
export type DeleteUserResponse = ApiEnvelope<null>;
