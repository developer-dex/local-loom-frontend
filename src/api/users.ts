/**
 * Users API — authenticated customer profile endpoints.
 *
 * GET    /users/me         — get profile
 * PATCH  /users/me         — update profile
 * DELETE /users/me         — delete account
 * POST   /users/me/avatar    — update avatar (multipart)
 */
import {
  authenticatedDelete,
  authenticatedGet,
  authenticatedPatch,
  authenticatedPost,
} from './client';
import type {
  DeleteUserResponse,
  UpdateUserRequest,
  UpdateUserResponse,
  UserMeResponse,
} from './userTypes';

/**
 * GET /users/me
 */
export async function getUserMeApi(): Promise<UserMeResponse> {
  return authenticatedGet<UserMeResponse>('/users/me');
}

/**
 * PATCH /users/me
 */
export async function updateUserMeApi(body: UpdateUserRequest): Promise<UpdateUserResponse> {
  return authenticatedPatch<UpdateUserResponse>('/users/me', { body });
}

/**
 * DELETE /users/me
 */
export async function deleteUserMeApi(): Promise<DeleteUserResponse> {
  return authenticatedDelete<DeleteUserResponse>('/users/me');
}

/**
 * POST /users/me/avatar
 * @param avatarUri Native image URI from image picker.
 */
export async function updateUserAvatarApi(avatarUri: string): Promise<UpdateUserResponse> {
  const form = new FormData();
  const fileName = avatarUri.split('/').pop() ?? 'avatar.jpg';
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeType =
    ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  form.append('avatar', {
    uri: avatarUri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);
  return authenticatedPost<UpdateUserResponse>('/users/me/avatar', { body: form });
}
