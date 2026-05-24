import type {
  TradieReview,
  TradieReviewApiItem,
  TradieReviewsDetail,
  TradieWorkDetail,
} from '../api/tradieTypes';
import { resolveMediaUrl } from './mediaUrl';

function mapApiReviewItem(r: TradieReviewApiItem): TradieReview {
  return {
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.time,
    reviewer: {
      id: r.id,
      name: r.giverName?.trim() || 'Anonymous',
      avatar: resolveMediaUrl(r.profileImage) ?? null,
    },
  };
}

/** Normalize GET /tradies/:id/details?type=reviews (and legacy shapes). */
export function normalizeTradieReviewsDetail(data: unknown): TradieReviewsDetail | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;

  if (Array.isArray(raw.reviews)) {
    const reviews = raw.reviews as TradieReviewApiItem[];
    return {
      average: Number(raw.averageRating ?? 0),
      totalRatings: Number(raw.totalReviewCount ?? reviews.length),
      items: reviews.map(mapApiReviewItem),
    };
  }

  if (Array.isArray(raw.items)) {
    const items = raw.items as Array<{
      id: string;
      rating: number;
      comment: string | null;
      createdAt: string;
      reviewer: { id?: string; name: string; avatar: string | null };
    }>;
    return {
      average: Number(raw.average ?? 0),
      totalRatings: Number(raw.totalRatings ?? items.length),
      items: items.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        reviewer: {
          id: r.reviewer.id ?? r.id,
          name: r.reviewer.name,
          avatar: resolveMediaUrl(r.reviewer.avatar) ?? null,
        },
      })),
    };
  }

  return null;
}

/** Normalize GET /tradies/:id/details?type=work → image URLs for the grid. */
export function normalizeWorkDetailImages(data: unknown): string[] {
  if (!data || typeof data !== 'object') return [];
  const images = (data as TradieWorkDetail).images;
  if (!Array.isArray(images)) return [];
  return images
    .map((img) => resolveMediaUrl(img.imageUrl) ?? img.imageUrl)
    .filter(Boolean);
}
