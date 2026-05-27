/**
 * Favourites API — authenticated (customer).
 *
 * POST   /favourites              — add favourite { tradieProfileId }
 * DELETE /favourites/:tradieProfileId — remove favourite
 */
import { authenticatedDelete, authenticatedPost } from './client';
import { ApiError } from './errors';
import type { ApiEnvelope } from './authTypes';

export type AddFavouriteRequest = {
  tradieProfileId: string;
};

export type FavouriteRecord = {
  id: string;
  tradieProfileId: string;
  createdAt?: string;
};

export type AddFavouriteResponse = ApiEnvelope<FavouriteRecord>;

export type RemoveFavouriteResponse = ApiEnvelope<null>;

/**
 * POST /favourites
 * Body: { tradieProfileId }
 */
export async function addFavouriteApi(
  req: AddFavouriteRequest,
): Promise<AddFavouriteResponse> {
  return authenticatedPost<AddFavouriteResponse>('/favourites', {
    body: { tradieProfileId: req.tradieProfileId },
  });
}

/**
 * DELETE /favourites/:tradieProfileId
 */
export async function removeFavouriteApi(
  tradieProfileId: string,
): Promise<RemoveFavouriteResponse> {
  return authenticatedDelete<RemoveFavouriteResponse>(
    `/favourites/${encodeURIComponent(tradieProfileId)}`,
  );
}

/** POST /favourites when the tradie is already favourited (sync UI, no error toast). */
export function isAlreadyFavouriteError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  const msg = err.message.toLowerCase();
  return (
    err.status === 409 ||
    (msg.includes('already') && (msg.includes('favour') || msg.includes('favor')))
  );
}
