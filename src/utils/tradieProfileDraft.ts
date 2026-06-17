import type { MyTradieProfile, WorkPhoto } from '../api/tradieTypes';
import type { AbnLookupResult } from '../api/tradieTypes';
import type { TradieApplicationDraft } from '../storage/tradieApplication';
import { normalizeWorkImageDrafts } from './workPhotos';

const DAY_API_TO_SHORT: Record<string, string> = {
  sunday: 'sun',
  monday: 'mon',
  tuesday: 'tue',
  wednesday: 'wed',
  thursday: 'thu',
  friday: 'fri',
  saturday: 'sat',
};

/** Map GET /tradies/me/profile data into BecomeTradie draft for edit mode. */
export function myTradieProfileToDraft(
  profile: MyTradieProfile,
  user?: { name?: string; phone?: string; email?: string | null; avatar?: string | null },
): TradieApplicationDraft {
  const abnData = profile.abnData as AbnLookupResult | null;

  return {
    photoUri: user?.avatar ?? profile.profilePhoto ?? null,
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    email: user?.email ?? '',
    documents: {
      tradeLicense: null,
      publicLiability: null,
      idProof: null,
    },
    abn: profile.abn ?? '',
    abnData: abnData && typeof abnData === 'object' ? abnData : null,
    businessName: profile.businessName ?? '',
    businessNumber: profile.businessNumber ?? '',
    licenseNumber: profile.licenseNumber ?? '',
    licenseExpiryDate: profile.licenseExpiryDate ?? null,
    selectedServiceIds: profile.services?.map((s) => s.id) ?? [],
    videoUri: profile.introVideoUrl
      ? { uri: profile.introVideoUrl, name: 'business-video.mp4' }
      : null,
    selectedRegionId: profile.serviceRegions?.[0]?.id ?? null,
    businessImageUri:
      profile.businessImages?.[0]
        ? { uri: profile.businessImages[0], name: 'business-image.jpg' }
        : null,
    serviceDescription: profile.serviceDescription ?? '',
    website: profile.website ?? null,
    openTime: profile.timeFrom ?? null,
    closeTime: profile.timeTo ?? null,
    openDayIds: (profile.openDays ?? [])
      .map((d) => DAY_API_TO_SHORT[d.toLowerCase()] ?? d.slice(0, 3).toLowerCase())
      .filter(Boolean),
    emergencyAvailable: profile.isEmergencyAvailable ?? null,
    workImages: normalizeWorkImageDrafts(
      (profile.workPhotos ?? []).map((p) => {
        const raw = p as WorkPhoto & { image_url?: string };
        const uri = raw.imageUrl ?? raw.image_url ?? '';
        return {
          id: raw.id,
          uri,
          name: uri.split('/').pop() ?? 'work.jpg',
        };
      }),
    ),
  };
}

export function profileStatusLabel(status: string): string {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'reviewed':
      return 'Reviewed';
    case 'rejected':
      return 'Rejected';
    case 'pending':
    default:
      return 'Under review';
  }
}
