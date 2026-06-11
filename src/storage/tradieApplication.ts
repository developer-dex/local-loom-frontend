import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AbnLookupResult } from '../api/tradieTypes';
import type { WorkImageDraft } from '../utils/workPhotos';

export type TradieApplicationStatus = 'under_review' | 'reviewed';

export type TradieApplicationDraft = {
  photoUri: string | null;
  name: string;
  phone: string;
  email: string;
  documents: Record<'tradeLicense' | 'publicLiability' | 'idProof', { uri: string; name: string } | null>;
  abn: string;
  abnData: AbnLookupResult | null;
  businessName: string;
  licenseNumber: string;
  licenseExpiryDate: string | null;
  selectedServiceIds: string[];
  videoUri: { uri: string; name: string } | null;
  /** Region UUID from GET /regions */
  selectedRegionId: string | null;
  /** @deprecated Use selectedRegionId */
  selectedLocationId?: string | null;
  businessImageUri: { uri: string; name: string } | null;
  serviceDescription: string;
  website: string | null;
  openTime: string | null;
  closeTime: string | null;
  openDayIds: string[];
  emergencyAvailable: boolean | null;
  workImages: WorkImageDraft[];
};

const DRAFT_KEY = '@localloom/tradie_application_draft';
const STATUS_KEY = '@localloom/tradie_application_status';

export async function loadTradieDraft(): Promise<TradieApplicationDraft | null> {
  const raw = await AsyncStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TradieApplicationDraft;
  } catch {
    return null;
  }
}

export async function saveTradieDraft(draft: TradieApplicationDraft): Promise<void> {
  await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export async function loadTradieStatus(): Promise<TradieApplicationStatus> {
  const v = await AsyncStorage.getItem(STATUS_KEY);
  if (v === 'reviewed' || v === 'under_review') return v;
  return 'under_review';
}

export async function saveTradieStatus(status: TradieApplicationStatus): Promise<void> {
  await AsyncStorage.setItem(STATUS_KEY, status);
}

