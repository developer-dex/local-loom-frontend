/**
 * Tradies API — public and authenticated endpoints.
 *
 * Optional auth (Bearer when logged in):
 *   GET /tradies
 *   GET /tradies/:id
 *   GET /tradies/:id/details
 *   GET /tradies/:id/reviews
 *   GET /tradies/:id/work-photos
 *
 * Authenticated (Bearer token):
 *   GET  /tradies/:id/contact
 *   POST /tradies/abn-lookup
 *   GET  /tradies/me/profile
 *   POST /tradies/business/setup
 *   POST /tradies/profile/work-photos
 *   DELETE /tradies/profile/work-photos/:photoId
 *   GET  /tradies/profile/stats
 */
import { authenticatedGet, authenticatedPost, authenticatedDelete, getWithOptionalAuth } from './client';
import type {
  TradieListResponse,
  TradieProfileResponse,
  MyTradieProfileResponse,
  TradieDetailsResponse,
  TradieReviewsResponse,
  WorkPhotosResponse,
  TradieContactResponse,
  AbnLookupResponse,
  TradieStatsResponse,
  BusinessSetupRequest,
  WorkPhotosUploadResponse,
} from './tradieTypes';
import type { ApiEnvelope } from './authTypes';

// ─── Query param types ────────────────────────────────────────────────────────

export type FetchTradiesParams = {
  categoryId?: string;
  regionId?: string;
  rating?: number;
  availability?: boolean;
  emergency?: boolean;
  page?: number;
  limit?: number;
};

export type DetailType = 'about' | 'work' | 'reviews';

// ─── Optional-auth endpoints (token when logged in) ───────────────────────────

/**
 * GET /tradies
 * Lists tradies with optional filters. Sends Bearer token when user is logged in.
 */
export async function fetchTradiesApi(params?: FetchTradiesParams): Promise<TradieListResponse> {
  return getWithOptionalAuth<TradieListResponse>('/tradies', {
    query: params as Record<string, string | number | boolean | null | undefined>,
  });
}

/**
 * GET /tradies/:id
 * Returns the full profile for a single tradie.
 */
export async function fetchTradieByIdApi(id: string): Promise<TradieProfileResponse> {
  return getWithOptionalAuth<TradieProfileResponse>(`/tradies/${encodeURIComponent(id)}`);
}

/**
 * GET /tradies/:id/details?type=about|work|reviews
 * Returns a specific detail tab section.
 */
export async function fetchTradieDetailsApi(
  id: string,
  type: DetailType,
  page?: number,
  limit?: number,
): Promise<TradieDetailsResponse> {
  return getWithOptionalAuth<TradieDetailsResponse>(`/tradies/${encodeURIComponent(id)}/details`, {
    query: { type, page, limit },
  });
}

/**
 * GET /tradies/:id/reviews
 * Returns paginated reviews for a tradie.
 */
export async function fetchTradieReviewsApi(
  id: string,
  page?: number,
  limit?: number,
): Promise<TradieReviewsResponse> {
  return getWithOptionalAuth<TradieReviewsResponse>(`/tradies/${encodeURIComponent(id)}/reviews`, {
    query: { page, limit },
  });
}

/**
 * GET /tradies/:id/work-photos
 * Returns work photos for a tradie.
 */
export async function fetchTradieWorkPhotosApi(id: string): Promise<WorkPhotosResponse> {
  return getWithOptionalAuth<WorkPhotosResponse>(`/tradies/${encodeURIComponent(id)}/work-photos`);
}

// ─── Authenticated endpoints ──────────────────────────────────────────────────

/**
 * GET /tradies/:id/contact
 * Returns profile + contact info and logs a contact event. Requires auth.
 */
export async function fetchTradieContactApi(id: string): Promise<TradieContactResponse> {
  return authenticatedGet<TradieContactResponse>(`/tradies/${encodeURIComponent(id)}/contact`);
}

/**
 * POST /tradies/abn-lookup
 * Looks up an ABN and returns business details. Requires auth.
 */
export async function abnLookupApi(abn: string): Promise<AbnLookupResponse> {
  return authenticatedPost<AbnLookupResponse>('/tradies/abn-lookup', {
    body: { abn },
  });
}

/**
 * GET /tradies/me/profile
 * Returns the authenticated tradie's own profile. Requires auth + tradie role.
 */
export async function fetchMyTradieProfileApi(): Promise<MyTradieProfileResponse> {
  return authenticatedGet<MyTradieProfileResponse>('/tradies/me/profile');
}

/**
 * POST /tradies/business/setup
 * Creates or updates the tradie's business profile. Requires auth + tradie role.
 * Sends multipart/form-data.
 */
export async function setupBusinessProfileApi(req: BusinessSetupRequest): Promise<TradieProfileResponse> {
  const form = new FormData();

  if (req.businessName) form.append('businessName', req.businessName);
  if (req.licenseNumber) form.append('licenseNumber', req.licenseNumber);
  if (req.licenseExpiryDate) form.append('licenseExpiryDate', req.licenseExpiryDate);
  if (req.abn) form.append('abn', req.abn);
  if (req.categoryIds) form.append('categoryIds', req.categoryIds);
  if (req.regionIds) form.append('regionIds', req.regionIds);
  if (req.serviceDescription) form.append('serviceDescription', req.serviceDescription);
  if (req.website) form.append('website', req.website);
  if (req.timeFrom) form.append('timeFrom', req.timeFrom);
  if (req.timeTo) form.append('timeTo', req.timeTo);
  if (req.openDays) form.append('openDays', req.openDays);
  if (req.isEmergencyAvailable !== undefined) {
    form.append('isEmergencyAvailable', String(req.isEmergencyAvailable));
  }
  if (req.abnData) form.append('abnData', req.abnData);

  if (req.businessImageUri) {
    const fileName = req.businessImageUri.split('/').pop() ?? 'businessImage.jpg';
    const ext = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
    form.append('businessImage', {
      uri: req.businessImageUri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);
  }

  if (req.businessVideoUri) {
    const fileName = req.businessVideoUri.split('/').pop() ?? 'businessVideo.mp4';
    form.append('businessVideo', {
      uri: req.businessVideoUri,
      name: fileName,
      type: 'video/mp4',
    } as unknown as Blob);
  }

  return authenticatedPost<TradieProfileResponse>('/tradies/business/setup', { body: form });
}

/**
 * POST /tradies/profile/work-photos
 * Uploads work photos (multipart field name: `images`). Requires auth + tradie role.
 * @param uris 1–20 native image URIs.
 */
export async function uploadWorkPhotosApi(uris: string[]): Promise<WorkPhotosUploadResponse> {
  if (uris.length === 0) {
    throw new Error('At least one image is required');
  }
  if (uris.length > 20) {
    throw new Error('Maximum 20 work photos allowed');
  }

  const form = new FormData();
  for (const uri of uris) {
    const fileName = uri.split('/').pop() ?? 'photo.jpg';
    const ext = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mimeType =
      ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    form.append('images', {
      uri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);
  }
  return authenticatedPost<WorkPhotosUploadResponse>('/tradies/profile/work-photos', { body: form });
}

/**
 * DELETE /tradies/profile/work-photos/:photoId
 * Deletes a work photo. Requires auth + tradie role.
 */
export async function deleteWorkPhotoApi(photoId: string): Promise<ApiEnvelope<unknown>> {
  return authenticatedDelete<ApiEnvelope<unknown>>(
    `/tradies/profile/work-photos/${encodeURIComponent(photoId)}`,
  );
}

/**
 * GET /tradies/profile/stats
 * Returns visit count, review count, and average rating. Requires auth + tradie role.
 */
export async function fetchTradieStatsApi(): Promise<TradieStatsResponse> {
  return authenticatedGet<TradieStatsResponse>('/tradies/profile/stats');
}
