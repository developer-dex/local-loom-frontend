/**
 * Reviews API — authenticated endpoints (customer role required).
 *
 * POST /reviews          — submit a rating + comment for a tradie
 * GET  /reviews/my-reviews — get the customer's own submitted reviews
 */
import { authenticatedPost, authenticatedGet } from './client';
import type { ApiEnvelope } from './authTypes';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export type Review = {
  id: string;
  customerId: string;
  tradieProfileId: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  rejectionReason: string | null;
  reviewedByAdmin: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MyReview = Review & {
  tradieProfile: { businessName: string };
};

export type SubmitReviewRequest = {
  tradieProfileId: string;
  /** Integer 1-5. */
  rating: number;
  /** Optional — omit or send empty string. */
  comment?: string;
};

export type SubmitReviewResponse = ApiEnvelope<Review>;

export type MyReviewsMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type MyReviewsResponse = ApiEnvelope<MyReview[]> & { meta: MyReviewsMeta };

// ─── API functions ────────────────────────────────────────────────────────────

/**
 * POST /reviews
 * Submit a rating and optional comment for a tradie.
 * Requires auth + customer role.
 */
export async function submitReviewApi(req: SubmitReviewRequest): Promise<SubmitReviewResponse> {
  return authenticatedPost<SubmitReviewResponse>('/reviews', {
    body: {
      tradieProfileId: req.tradieProfileId,
      rating: req.rating,
      ...(req.comment ? { comment: req.comment } : {}),
    },
  });
}

/**
 * GET /reviews/my-reviews
 * Get the authenticated customer's own submitted reviews (all statuses).
 * Requires auth + customer role.
 */
export async function getMyReviewsApi(
  page = 1,
  limit = 20,
): Promise<MyReviewsResponse> {
  return authenticatedGet<MyReviewsResponse>('/reviews/my-reviews', {
    query: { page, limit },
  });
}
