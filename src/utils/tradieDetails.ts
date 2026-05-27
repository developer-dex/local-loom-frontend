import type {
  TradieProfile,
  TradieReview,
  TradieReviewApiItem,
  TradieReviewsDetail,
  TradieService,
  TradieUser,
  TradieWorkDetail,
} from '../api/tradieTypes';
import { resolveMediaUrl } from './mediaUrl';

function readString(raw: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = raw[key];
    if (value != null && value !== '') return String(value);
  }
  return null;
}

/** Coerce API booleans that may arrive as 1, "true", etc. */
function readBoolean(raw: Record<string, unknown>, ...keys: string[]): boolean {
  for (const key of keys) {
    const value = raw[key];
    if (value === true || value === 1) return true;
    if (typeof value === 'string') {
      const lower = value.trim().toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') return true;
    }
  }
  return false;
}

/** Resolve favourite flag from common API field names and nested shapes. */
export function readIsFavourite(raw: Record<string, unknown>): boolean {
  if (
    readBoolean(
      raw,
      'isFavourite',
      'is_favourite',
      'isFavorite',
      'is_favorite',
      'favourited',
      'favorited',
    )
  ) {
    return true;
  }

  const nested = raw.favourite ?? raw.favorite;
  if (nested && typeof nested === 'object') {
    return readBoolean(nested as Record<string, unknown>, 'isFavourite', 'is_favourite');
  }

  return false;
}

/** Normalize GET /tradies/:id — guards missing fields that crash the detail screen. */
export function normalizeTradieProfile(data: unknown): TradieProfile | null {
  if (!data || typeof data !== 'object') return null;

  let raw = data as Record<string, unknown>;
  if (raw.data && typeof raw.data === 'object' && !raw.businessName && !raw.business_name && !raw.id) {
    raw = raw.data as Record<string, unknown>;
  }

  const id = raw.id != null ? String(raw.id) : '';
  if (!id) return null;

  const services: TradieService[] = Array.isArray(raw.services)
    ? raw.services
        .filter((s): s is Record<string, unknown> => Boolean(s) && typeof s === 'object')
        .map((s) => ({
          id: String(s.id ?? ''),
          name: String(s.name ?? ''),
        }))
        .filter((s) => s.id && s.name)
    : [];

  const userRaw =
    raw.user && typeof raw.user === 'object' ? (raw.user as Record<string, unknown>) : null;
  const user: TradieUser = {
    id: userRaw?.id != null ? String(userRaw.id) : '',
    name: userRaw?.name != null ? String(userRaw.name) : 'Provider',
    email: userRaw?.email != null ? String(userRaw.email) : null,
    phone: userRaw?.phone != null ? String(userRaw.phone) : '',
    avatar: resolveMediaUrl(userRaw?.avatar as string | null | undefined) ?? null,
  };

  const businessImagesRaw = Array.isArray(raw.businessImages)
    ? raw.businessImages
    : Array.isArray(raw.business_images)
      ? raw.business_images
      : [];
  const businessImages = businessImagesRaw
    .map((uri) => resolveMediaUrl(String(uri)) ?? String(uri))
    .filter(Boolean);

  const businessImageSingle = readString(raw, 'businessImage', 'business_image');
  const businessImage =
    resolveMediaUrl(businessImageSingle ?? undefined) ?? businessImages[0] ?? null;

  const openDays = Array.isArray(raw.openDays)
    ? raw.openDays.map((d) => String(d)).filter(Boolean)
    : [];

  return {
    id,
    businessName: readString(raw, 'businessName', 'business_name') ?? 'Business',
    businessImage,
    businessImages,
    businessLocation: readString(raw, 'businessLocation', 'business_location'),
    serviceDescription: readString(raw, 'serviceDescription', 'service_description'),
    website: readString(raw, 'website'),
    timeFrom: readString(raw, 'timeFrom', 'time_from'),
    timeTo: readString(raw, 'timeTo', 'time_to'),
    openDays,
    isEmergencyAvailable: Boolean(raw.isEmergencyAvailable),
    isOpen: Boolean(raw.isOpen),
    averageRating: Number(raw.averageRating ?? 0),
    totalRatingCount: Number(raw.totalRatingCount ?? 0),
    services,
    regions: Array.isArray(raw.regions)
      ? raw.regions
          .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === 'object')
          .map((r) => ({ id: String(r.id ?? ''), name: String(r.name ?? '') }))
          .filter((r) => r.id && r.name)
      : [],
    workPhotos: Array.isArray(raw.workPhotos) ? raw.workPhotos : [],
    user,
    isFavourite: readIsFavourite(raw),
  };
}

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
