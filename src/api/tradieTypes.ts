/** Types for the Tradies API — mirrors the API documentation exactly. */

import type { ApiEnvelope } from './authTypes';

// ─── Shared sub-types ─────────────────────────────────────────────────────────

export type TradieService = {
  id: string;
  name: string;
};

export type TradieRegion = {
  id: string;
  name: string;
};

export type TradieUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  avatar: string | null;
};

// ─── List item (GET /tradies) ─────────────────────────────────────────────────

export type TradieListItem = {
  id: string;
  businessName: string;
  businessImage: string | null;
  services: TradieService[];
  regions: TradieRegion[];
  isOpen: boolean;
  openDays?: string[];
  timeFrom?: string | null;
  timeTo?: string | null;
  averageRating: number;
  totalRatingCount: number;
  isFavourite?: boolean;
  isEmergencyAvailable?: boolean;
};

// ─── Own profile (GET /tradies/me/profile) ────────────────────────────────────

export type MyTradieProfile = {
  id: string;
  userId: string;
  businessName: string | null;
  businessLocation: string | null;
  serviceDescription: string | null;
  website: string | null;
  businessImages: string[];
  abn: string | null;
  abnVerified: boolean;
  abnData: AbnLookupResult | Record<string, unknown> | null;
  yearsOfExperience: number;
  bio: string | null;
  introVideoUrl: string | null;
  profilePhoto: string | null;
  serviceRadiusKm: number | null;
  profileStatus: string;
  hasLicense: boolean;
  licenseNumber: string | null;
  licenseExpiryDate: string | null;
  insuranceVerified: boolean;
  timeFrom: string | null;
  timeTo: string | null;
  openDays: string[];
  isAvailable: boolean;
  isEmergencyAvailable: boolean;
  createdAt: string;
  updatedAt: string;
  services: TradieService[];
  serviceRegions: TradieRegion[];
  workPhotos: WorkPhoto[];
};

// ─── Full profile (GET /tradies/:id) ─────────────────────────────────────────

export type TradieProfile = {
  id: string;
  businessName: string;
  businessImage: string | null;
  businessImages: string[];
  businessLocation: string | null;
  serviceDescription: string | null;
  website: string | null;
  timeFrom: string | null;
  timeTo: string | null;
  openDays: string[];
  isEmergencyAvailable: boolean;
  isOpen: boolean;
  averageRating: number;
  totalRatingCount: number;
  services: TradieService[];
  regions: TradieRegion[];
  workPhotos: WorkPhoto[];
  user: TradieUser;
};

// ─── Detail tabs ──────────────────────────────────────────────────────────────

export type TradieAboutDetail = {
  businessName: string;
  businessLocation: string | null;
  serviceDescription: string | null;
  website: string | null;
  timeFrom: string | null;
  timeTo: string | null;
  openDays: string[];
  isEmergencyAvailable: boolean;
  services: TradieService[];
  user: TradieUser;
};

export type TradieWorkDetail = {
  images: {
    id: string;
    imageUrl: string;
    sortOrder: number;
  }[];
};

/** Single review from GET /tradies/:id/details?type=reviews */
export type TradieReviewApiItem = {
  id: string;
  giverName: string | null;
  profileImage: string | null;
  time: string;
  rating: number;
  comment: string | null;
};

/** Raw `data` payload for details?type=reviews */
export type TradieReviewsDetailApi = {
  totalReviewCount: number;
  averageRating: number;
  reviews: TradieReviewApiItem[];
  meta?: PaginationMeta;
};

export type TradieReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: {
    id: string;
    name: string;
    avatar: string | null;
  };
};

/** Normalized reviews for UI (mapped from API response). */
export type TradieReviewsDetail = {
  average: number;
  totalRatings: number;
  items: TradieReview[];
};

// ─── Work photos ──────────────────────────────────────────────────────────────

export type WorkPhoto = {
  id: string;
  tradieProfileId: string;
  imageUrl: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

// ─── Stats ────────────────────────────────────────────────────────────────────

export type TradieStats = {
  visitCount: number;
  reviewCount: number;
  averageRating: number;
};

// ─── ABN lookup ───────────────────────────────────────────────────────────────

export type AbnLookupResult = {
  abn: string;
  abnStatus: string;
  entityName: string;
  entityType: string;
  state: string;
  postcode: string;
  isActive: boolean;
};

// ─── Business setup request ───────────────────────────────────────────────────

export type BusinessSetupRequest = {
  businessName: string;
  abn?: string;
  /** Comma-separated category UUIDs. */
  categoryIds?: string;
  /** Comma-separated region UUIDs. */
  regionIds?: string;
  serviceDescription?: string;
  website?: string;
  timeFrom?: string;
  timeTo?: string;
  /** Comma-separated day identifiers, e.g. "mon,tue,wed". */
  openDays?: string;
  isEmergencyAvailable?: boolean;
  /** JSON-encoded ABN lookup result. */
  abnData?: string;
  /** Native file URI for the business image. */
  businessImageUri?: string;
  /** Native file URI for the business video. */
  businessVideoUri?: string;
};

// ─── Paginated envelope ───────────────────────────────────────────────────────

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedData<T> = {
  items: T[];
  pagination: PaginationMeta;
};

export type PaginatedEnvelope<T> = ApiEnvelope<PaginatedData<T>>;

// ─── Response aliases ─────────────────────────────────────────────────────────

/** GET /tradies — `data` is a plain array; `meta` is on the envelope root. */
export type TradieListResponse = ApiEnvelope<TradieListItem[]> & {
  meta?: PaginationMeta;
};
export type TradieProfileResponse = ApiEnvelope<TradieProfile>;
export type MyTradieProfileResponse = ApiEnvelope<MyTradieProfile>;
export type TradieDetailsResponse = ApiEnvelope<
  TradieAboutDetail | TradieWorkDetail | TradieReviewsDetailApi
>;
export type TradieReviewsResponse = ApiEnvelope<PaginatedData<TradieReview>>;
export type WorkPhotosResponse = ApiEnvelope<WorkPhoto[]>;
/** POST /tradies/profile/work-photos — returns uploaded photo records. */
export type WorkPhotosUploadResponse = ApiEnvelope<WorkPhoto[]>;
export type TradieContactResponse = ApiEnvelope<TradieProfile>;
export type AbnLookupResponse = ApiEnvelope<AbnLookupResult>;
export type TradieStatsResponse = ApiEnvelope<TradieStats>;
