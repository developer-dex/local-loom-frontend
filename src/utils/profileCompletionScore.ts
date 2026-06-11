import type { AbnLookupResult } from '../api/tradieTypes';
import type { BusinessTimeValue } from './businessTime';
import { validateEmail, validateName, validatePhone } from './index';
import { filterUuids, isUuid } from './uuid';

/** Step buckets for the Become Service Provider wizard. */
export const PROFILE_STEP_WEIGHTS = {
  personal: 20,
  business: 50,
  workImages: 30,
} as const;

export type ProfileCompletionInput = {
  photoUri: string | null;
  name: string;
  phone: string;
  email: string;
  businessName: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  abn: string;
  abnLookupLoading: boolean;
  abnLookupResult: AbnLookupResult | null;
  verifiedAbn: string | null;
  selectedServiceIds: string[];
  knownCategoryIds: Set<string>;
  selectedRegionId: string | null;
  serviceDescription: string;
  openTime: BusinessTimeValue | null;
  closeTime: BusinessTimeValue | null;
  openDayIds: string[];
  emergencyAvailable: boolean | null;
  workImageCount: number;
};

function bucketScore(weight: number, fieldComplete: boolean[]): number {
  if (fieldComplete.length === 0) return 0;
  const done = fieldComplete.filter(Boolean).length;
  return (done / fieldComplete.length) * weight;
}

function isAbnVerified(input: ProfileCompletionInput): boolean {
  return (
    input.abn.length === 11 &&
    !input.abnLookupLoading &&
    input.abnLookupResult != null &&
    input.verifiedAbn === input.abn
  );
}

function hasValidServices(input: ProfileCompletionInput): boolean {
  return (
    filterUuids(input.selectedServiceIds.filter((id) => input.knownCategoryIds.has(id))).length > 0
  );
}

/** Cumulative 0–100% from filled fields across all wizard steps. */
export function computeProfileCompletionPercent(input: ProfileCompletionInput): number {
  const personal = bucketScore(PROFILE_STEP_WEIGHTS.personal, [
    Boolean(input.photoUri),
    !validateName(input.name),
    !validatePhone(input.phone, { completeOnly: true }),
    !validateEmail(input.email),
  ]);

  /** Required business fields only (matches wizard validation). */
  const business = bucketScore(PROFILE_STEP_WEIGHTS.business, [
    input.businessName.trim().length > 0,
    input.licenseNumber.trim().length >= 3,
    input.licenseExpiryDate.trim().length > 0,
    isAbnVerified(input),
    hasValidServices(input),
    Boolean(input.selectedRegionId && isUuid(input.selectedRegionId)),
    input.serviceDescription.trim().length >= 20,
    input.openTime != null,
    input.closeTime != null,
    input.openDayIds.length > 0,
    input.emergencyAvailable !== null,
  ]);

  const workImages = bucketScore(PROFILE_STEP_WEIGHTS.workImages, [input.workImageCount >= 1]);

  return Math.min(100, Math.round(personal + business + workImages));
}
