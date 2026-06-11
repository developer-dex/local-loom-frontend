import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppButton,
  AppTextField,
  BusinessTimeWheelPicker,
  Icon,
  KeyboardFormScrollView,
  useKeyboardFormScrollOnFocus,
  useToast,
} from '../../components/ui';
import { saveTradieDraft, saveTradieStatus, type TradieApplicationDraft } from '../../storage/tradieApplication';
import { colors, fontFamilies } from '../../theme';
import {
  AU_PHONE_E164_MAX_LENGTH,
  AU_PHONE_DIAL_CODE,
  normalizeAustralianPhone,
  sanitizeAustralianPhone,
  sanitizeName,
  validateName,
  validatePhone,
} from '../../utils';
import { abnResultToApiJson } from '../../utils/abnData';
import {
  businessTimeToApi,
  DEFAULT_BUSINESS_TIME,
  parseStoredBusinessTime,
  type BusinessTimeValue,
} from '../../utils/businessTime';
import { personalInfoFromAuthUser } from '../../utils/authUser';
import { filterUuids, isUuid } from '../../utils/uuid';
import type { RootStackParamList } from '../../navigation/types';
import { abnLookupApi } from '../../api/tradies';
import type { AbnLookupResult } from '../../api/tradieTypes';
import {
  useAppDispatch,
  useAppSelector,
  selectAuthUser,
  selectCategories,
  selectCategoriesError,
  selectCategoriesLoading,
  selectRegions,
  selectRegionsError,
  selectRegionsLoading,
} from '../../store/hooks';
import { fetchCategoriesThunk } from '../../store/slices/categoriesSlice';
import { fetchRegionsThunk } from '../../store/slices/regionsSlice';
import { fetchProfileThunk, setAuthUser } from '../../store/slices/authSlice';
import { updateUserMeThunk } from '../../store/slices/usersSlice';
import {
  deleteWorkPhotoThunk,
  setupBusinessProfileThunk,
  uploadWorkPhotosThunk,
} from '../../store/slices/tradiesSlice';
import { computeProfileCompletionPercent } from '../../utils/profileCompletionScore';
import {
  hasPendingWorkPhotoChanges,
  isLocalMediaUri,
  normalizeWorkImageDrafts,
  type WorkImageDraft,
} from '../../utils/workPhotos';

const MAX_SERVICE_CATEGORIES = 6;
const MAX_WORK_PHOTOS = 20;

const STEPS = 3;

const STEP_HEADINGS = [
  'Personal info',
  'Business Details',
  'Work Image',
] as const;

type DocKey = 'tradeLicense' | 'publicLiability' | 'idProof';

const DOC_FIELDS: { key: DocKey; label: string; placeholder: string }[] = [
  { key: 'tradeLicense', label: 'Trade License', placeholder: 'Upload Your License' },
  { key: 'publicLiability', label: 'Public Liability Insurance', placeholder: 'Upload Your License' },
  { key: 'idProof', label: 'ID Proof', placeholder: 'Upload Your License' },
];

const DAYS_OF_WEEK: { id: string; label: string }[] = [
  { id: 'mon', label: 'Monday' },
  { id: 'tue', label: 'Tuesday' },
  { id: 'wed', label: 'Wednesday' },
  { id: 'thu', label: 'Thursday' },
  { id: 'fri', label: 'Friday' },
  { id: 'sat', label: 'Saturday' },
  { id: 'sun', label: 'Sunday' },
];

/** Map short day ids to API `openDays` values (sunday–saturday). */
const OPEN_DAY_TO_API: Record<string, string> = {
  sun: 'sunday',
  mon: 'monday',
  tue: 'tuesday',
  wed: 'wednesday',
  thu: 'thursday',
  fri: 'friday',
  sat: 'saturday',
};

function validateEmail(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address.';
  return null;
}

function formatLicenseExpiryForDisplay(iso: string | null | undefined): string {
  if (!iso) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!match) return iso;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function parseLicenseExpiryInput(value: string): string | null {
  const trimmed = value.trim();
  const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (ddmmyyyy) {
    return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return null;
}

function validateLicenseExpiry(value: string): string | null {
  if (!value.trim()) return 'Licence expiry date is required.';
  const iso = parseLicenseExpiryInput(value);
  if (!iso) return 'Enter a valid date (DD/MM/YYYY).';
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return 'Enter a valid date (DD/MM/YYYY).';
  }
  return null;
}

function validateLicenseNumber(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Licence number is required.';
  if (v.length < 3) return 'Licence number is too short.';
  return null;
}

/** Supports current API shape and legacy draft payloads. */
function getAbnDisplayFields(result: AbnLookupResult) {
  const legacy = result as AbnLookupResult & { businessName?: string; status?: string };
  return {
    entityName: result.entityName?.trim() || legacy.businessName?.trim() || '—',
    abnStatus: result.abnStatus?.trim() || legacy.status?.trim() || '—',
    entityType: result.entityType?.trim() || '—',
  };
}

function AbnDetailsRow({
  label,
  value,
  showDivider,
}: {
  label: string;
  value: string;
  showDivider?: boolean;
}) {
  return (
    <>
      <View style={abnStyles.detailRow}>
        <Text style={abnStyles.detailLabel}>{label}</Text>
        <Text style={abnStyles.detailValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
      {showDivider ? <View style={abnStyles.detailDivider} /> : null}
    </>
  );
}

function AbnDetailsCard({ result }: { result: AbnLookupResult }) {
  const { entityName, abnStatus, entityType } = getAbnDisplayFields(result);
  return (
    <View style={abnStyles.detailsCard}>
      <AbnDetailsRow label="Business Name" value={entityName} showDivider />
      <AbnDetailsRow label="Status" value={abnStatus} showDivider />
      <AbnDetailsRow label="Entity Type" value={entityType} />
    </View>
  );
}

function AbnNumberField({
  value,
  onChangeText,
  error,
  verified,
  loading,
}: {
  value: string;
  onChangeText: (raw: string) => void;
  error?: string;
  verified: boolean;
  loading: boolean;
}) {
  const handleFocus = useKeyboardFormScrollOnFocus();

  return (
    <View style={abnStyles.fieldWrap}>
      <Text style={abnStyles.fieldLabel}>ABN number</Text>
      <View style={[abnStyles.inputWrap, error ? abnStyles.inputError : null]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          placeholder="Enter ABN Number"
          placeholderTextColor={colors.placeholder}
          keyboardType="number-pad"
          maxLength={11}
          style={abnStyles.input}
          accessibilityLabel="ABN number"
        />
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : verified ? (
          <Icon name="checkmark-badge-01" width={24} height={24} />
        ) : null}
      </View>
      {error ? <Text style={abnStyles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <Text style={fieldErrorStyles.text}>{message}</Text>;
}

const fieldErrorStyles = StyleSheet.create({
  text: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.error,
    marginTop: 4,
  },
});

const abnStyles = StyleSheet.create({
  fieldWrap: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.label,
  },
  inputWrap: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  inputError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    fontFamily: fontFamilies.inter.regular,
    fontSize: 16,
    color: colors.onboardingTitle,
    paddingVertical: 0,
  },
  fieldError: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 12,
    color: colors.error,
  },
  detailsCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  detailLabel: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.label,
    flexShrink: 0,
  },
  detailValue: {
    flex: 1,
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onboardingTitle,
    textAlign: 'right',
  },
  detailDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginHorizontal: 16,
  },
});

export function BecomeTradieScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'BecomeTradie'>>();
  const route = useRoute<any>();
  const mode: 'create' | 'edit' = route?.params?.mode === 'edit' ? 'edit' : 'create';
  const fromSignup = route?.params?.fromSignup === true;
  const initial: TradieApplicationDraft | undefined = route?.params?.initial;
  const authUser = useAppSelector(selectAuthUser);
  const personalPrefill = useMemo(
    () => (authUser ? personalInfoFromAuthUser(authUser) : null),
    [authUser],
  );
  const [step, setStep] = useState(0);
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const categories = useAppSelector(selectCategories);
  const categoriesLoading = useAppSelector(selectCategoriesLoading);
  const categoriesError = useAppSelector(selectCategoriesError);
  const regions = useAppSelector(selectRegions);
  const regionsLoading = useAppSelector(selectRegionsLoading);
  const regionsError = useAppSelector(selectRegionsError);
  const [submitting, setSubmitting] = useState(false);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) {
      map.set(c.id, c.name);
    }
    return map;
  }, [categories]);

  const getCategoryName = useCallback(
    (id: string) => categoryNameById.get(id) ?? id,
    [categoryNameById],
  );

  const regionNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of regions) {
      map.set(r.id, r.name);
    }
    return map;
  }, [regions]);

  const getRegionName = useCallback(
    (id: string) => regionNameById.get(id) ?? id,
    [regionNameById],
  );

  useEffect(() => {
    dispatch(fetchProfileThunk());
  }, [dispatch]);

  useEffect(() => {
    if (step === 1) {
      dispatch(fetchCategoriesThunk());
      dispatch(fetchRegionsThunk());
    }
  }, [step, dispatch]);

  const [photoUri, setPhotoUri] = useState<string | null>(
    initial?.photoUri ?? personalPrefill?.photoUri ?? null,
  );
  const [name, setName] = useState(initial?.name ?? personalPrefill?.name ?? '');
  const [phone, setPhone] = useState(
    () =>
      sanitizeAustralianPhone(initial?.phone ?? personalPrefill?.phone ?? '').value ||
      AU_PHONE_DIAL_CODE,
  );
  const [email, setEmail] = useState(initial?.email ?? personalPrefill?.email ?? '');

  /** When profile loads after mount, prefill step 0 for customers (create flow, no draft). */
  useEffect(() => {
    if (initial || mode === 'edit' || !personalPrefill) return;
    setPhotoUri((cur) => cur ?? personalPrefill.photoUri);
    setName((cur) => cur || personalPrefill.name);
    setPhone((cur) => cur || personalPrefill.phone);
    setEmail((cur) => cur || personalPrefill.email);
  }, [initial, mode, personalPrefill]);

  const [documents, setDocuments] = useState<Record<DocKey, { uri: string; name: string } | null>>(
    (initial?.documents as any) ?? {
      tradeLicense: null,
      publicLiability: null,
      idProof: null,
    },
  );

  const [abn, setAbn] = useState(initial?.abn ?? '');
  const [abnError, setAbnError] = useState<string | null>(null);
  const [abnLookupLoading, setAbnLookupLoading] = useState(false);
  const [abnLookupResult, setAbnLookupResult] = useState<AbnLookupResult | null>(initial?.abnData ?? null);
  const [verifiedAbn, setVerifiedAbn] = useState<string | null>(
    initial?.abn && initial?.abnData ? initial.abn : null,
  );
  const [businessName, setBusinessName] = useState(initial?.businessName ?? '');
  const [licenseNumber, setLicenseNumber] = useState(initial?.licenseNumber ?? '');
  const [licenseExpiryDate, setLicenseExpiryDate] = useState(
    formatLicenseExpiryForDisplay(initial?.licenseExpiryDate),
  );
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(initial?.selectedServiceIds ?? []);
  const [servicesPickerOpen, setServicesPickerOpen] = useState(false);
  const [videoUri, setVideoUri] = useState<{ uri: string; name: string } | null>(initial?.videoUri ?? null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(
    initial?.selectedRegionId ?? initial?.selectedLocationId ?? null,
  );
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [businessImageUri, setBusinessImageUri] = useState<{ uri: string; name: string } | null>(
    initial?.businessImageUri ?? null,
  );
  const [serviceDescription, setServiceDescription] = useState(initial?.serviceDescription ?? '');
  const [website, setWebsite] = useState(initial?.website ?? '');
  const [openTime, setOpenTime] = useState<BusinessTimeValue | null>(
    parseStoredBusinessTime(initial?.openTime ?? null),
  );
  const [closeTime, setCloseTime] = useState<BusinessTimeValue | null>(
    parseStoredBusinessTime(initial?.closeTime ?? null),
  );
  const [openTimePickerOpen, setOpenTimePickerOpen] = useState(false);
  const [closeTimePickerOpen, setCloseTimePickerOpen] = useState(false);
  const [openDayIds, setOpenDayIds] = useState<string[]>(initial?.openDayIds ?? []);
  const [openDayPickerOpen, setOpenDayPickerOpen] = useState(false);
  const [emergencyAvailable, setEmergencyAvailable] = useState<boolean | null>(initial?.emergencyAvailable ?? null);

  const initialWorkImagesForEdit = useMemo(
    () => (mode === 'edit' ? normalizeWorkImageDrafts(initial?.workImages ?? []) : []),
    [mode, initial?.workImages],
  );

  const [workImages, setWorkImages] = useState<WorkImageDraft[]>(initialWorkImagesForEdit);
  /** Server photo ids the user explicitly removed with the × button (edit mode). */
  const removedWorkPhotoIdsRef = useRef<Set<string>>(new Set());
  /** Local file URIs the user added from camera/gallery this session. */
  const addedLocalWorkUrisRef = useRef<Set<string>>(new Set());

  const [photoError, setPhotoError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [businessNameError, setBusinessNameError] = useState<string | null>(null);
  const [licenseNumberError, setLicenseNumberError] = useState<string | null>(null);
  const [licenseExpiryError, setLicenseExpiryError] = useState<string | null>(null);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [serviceDescriptionError, setServiceDescriptionError] = useState<string | null>(null);
  const [openTimeError, setOpenTimeError] = useState<string | null>(null);
  const [closeTimeError, setCloseTimeError] = useState<string | null>(null);
  const [openDaysError, setOpenDaysError] = useState<string | null>(null);
  const [emergencyError, setEmergencyError] = useState<string | null>(null);
  const [workImagesError, setWorkImagesError] = useState<string | null>(null);

  const inputColor = useMemo(() => ({ color: colors.onboardingTitle }), []);

  const knownCategoryIds = useMemo(
    () => new Set(categories.map((c) => c.id)),
    [categories],
  );

  const profileCompletionPercent = useMemo(
    () =>
      computeProfileCompletionPercent({
        photoUri,
        name,
        phone,
        email,
        businessName,
        licenseNumber,
        licenseExpiryDate,
        abn,
        abnLookupLoading,
        abnLookupResult,
        verifiedAbn,
        selectedServiceIds,
        knownCategoryIds,
        selectedRegionId,
        serviceDescription,
        openTime,
        closeTime,
        openDayIds,
        emergencyAvailable,
        workImageCount: workImages.length,
      }),
    [
      photoUri,
      name,
      phone,
      email,
      businessName,
      licenseNumber,
      licenseExpiryDate,
      abn,
      abnLookupLoading,
      abnLookupResult,
      verifiedAbn,
      selectedServiceIds,
      knownCategoryIds,
      selectedRegionId,
      serviceDescription,
      openTime,
      closeTime,
      openDayIds,
      emergencyAvailable,
      workImages.length,
    ],
  );

  const onAbnChange = useCallback((raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    setAbn(digits);
    setAbnError(null);
    if (digits.length < 11) {
      setAbnLookupResult(null);
      setVerifiedAbn(null);
      setAbnError(null);
      setAbnLookupLoading(false);
    }
  }, []);

  useEffect(() => {
    if (abn.length !== 11 || verifiedAbn === abn) return;

    let cancelled = false;
    setAbnLookupLoading(true);
    setAbnError(null);

    void (async () => {
      try {
        const res = await abnLookupApi(abn);
        if (cancelled) return;
        setAbnLookupResult(res.data);
        setVerifiedAbn(abn);
        const entityName = res.data.entityName?.trim();
        setBusinessName((prev) => (prev.trim() ? prev : entityName ?? prev));
      } catch (err: unknown) {
        if (cancelled) return;
        setAbnLookupResult(null);
        setVerifiedAbn(null);
        const msg = err instanceof Error ? err.message : 'ABN lookup failed. Please check the number.';
        setAbnError(msg);
      } finally {
        if (!cancelled) setAbnLookupLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [abn, verifiedAbn]);

  const toggleService = useCallback(
    (id: string) => {
      setSelectedServiceIds((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        if (prev.length >= MAX_SERVICE_CATEGORIES) {
          showToast({ message: `You can select up to ${MAX_SERVICE_CATEGORIES} services.`, type: 'error' });
          return prev;
        }
        return [...prev, id];
      });
      setServicesError(null);
    },
    [showToast],
  );

  const toggleOpenDay = useCallback((id: string) => {
    setOpenDayIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setOpenDaysError(null);
  }, []);

  const onPickPhoto = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow photo access to upload a profile picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setPhotoUri(result.assets[0].uri);
        setPhotoError(null);
      }
    } catch (e) {
      Alert.alert('Could not open photos', 'Something went wrong. Please try again.');
    }
  }, []);

  const onPickVideo = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow media access to upload your video.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 0.9,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        const asset = result.assets[0];
        const fileName = asset.fileName ?? asset.uri.split('/').pop() ?? 'Video';
        setVideoUri({ uri: asset.uri, name: fileName });
      }
    } catch (e) {
      Alert.alert('Could not open media', 'Something went wrong. Please try again.');
    }
  }, []);

  const onPickBusinessImage = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow photo access to upload an image.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        const asset = result.assets[0];
        const fileName = asset.fileName ?? asset.uri.split('/').pop() ?? 'Image';
        setBusinessImageUri({ uri: asset.uri, name: fileName });
      }
    } catch (e) {
      Alert.alert('Could not open photos', 'Something went wrong. Please try again.');
    }
  }, []);

  const addWorkImagesFromAssets = useCallback(
    (assets: ImagePicker.ImagePickerAsset[]) => {
      if (assets.length === 0) return;

      setWorkImages((prev) => {
        const remaining = MAX_WORK_PHOTOS - prev.length;
        if (remaining <= 0) {
          showToast({
            message: `Maximum ${MAX_WORK_PHOTOS} work photos allowed.`,
            type: 'error',
          });
          return prev;
        }

        const accepted = assets.slice(0, remaining).map((asset) => ({
          uri: asset.uri,
          name: asset.fileName ?? asset.uri.split('/').pop() ?? 'Image',
        }));

        for (const img of accepted) {
          if (isLocalMediaUri(img.uri)) {
            addedLocalWorkUrisRef.current.add(img.uri);
          }
        }

        if (assets.length > remaining) {
          showToast({
            message: `Only ${remaining} more photo(s) added (max ${MAX_WORK_PHOTOS}).`,
            type: 'error',
          });
        }

        return [...prev, ...accepted];
      });
      setWorkImagesError(null);
    },
    [showToast],
  );

  const onTakeWorkPhoto = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow camera access to take a photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        addWorkImagesFromAssets(result.assets);
      }
    } catch (e) {
      Alert.alert('Could not open camera', 'Something went wrong. Please try again.');
    }
  }, [addWorkImagesFromAssets]);

  const onChooseWorkImageFromLibrary = useCallback(async () => {
    try {
      const remaining = MAX_WORK_PHOTOS - workImages.length;
      if (remaining <= 0) {
        showToast({
          message: `Maximum ${MAX_WORK_PHOTOS} work photos allowed.`,
          type: 'error',
        });
        return;
      }

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow photo access to upload images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        allowsEditing: false,
        quality: 0.9,
      });
      if (!result.canceled && result.assets?.length) {
        addWorkImagesFromAssets(result.assets);
      }
    } catch (e) {
      Alert.alert('Could not open photos', 'Something went wrong. Please try again.');
    }
  }, [workImages.length, addWorkImagesFromAssets, showToast]);

  const onAddWorkImage = useCallback(() => {
    Alert.alert('Add Work Images', 'How would you like to add photos?', [
      { text: 'Take Photo', onPress: onTakeWorkPhoto },
      { text: 'Choose from Library', onPress: onChooseWorkImageFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [onTakeWorkPhoto, onChooseWorkImageFromLibrary]);

  const onRemoveWorkImage = useCallback((uri: string) => {
    setWorkImages((prev) => {
      const target = prev.find((img) => img.uri === uri);
      if (target?.id) {
        removedWorkPhotoIdsRef.current.add(target.id);
      }
      if (isLocalMediaUri(uri)) {
        addedLocalWorkUrisRef.current.delete(uri);
      }
      return prev.filter((img) => img.uri !== uri);
    });
  }, []);

  const onPickDocument = useCallback(async (key: DocKey) => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow photo access to upload your document.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        const asset = result.assets[0];
        const fileName = asset.fileName ?? asset.uri.split('/').pop() ?? 'Document';
        setDocuments((prev) => ({ ...prev, [key]: { uri: asset.uri, name: fileName } }));
        setDocumentsError(null);
      }
    } catch (e) {
      Alert.alert('Could not open photos', 'Something went wrong. Please try again.');
    }
  }, []);

  const validateStep0 = useCallback((): boolean => {
    const ne = validateName(name);
    const pe = validatePhone(phone, { completeOnly: true });
    const ee = validateEmail(email);
    // const photoErr = !photoUri ? 'Profile photo is required.' : null;
    setNameError(ne);
    setPhoneError(pe);
    setEmailError(ee);
    // setPhotoError(photoErr);
    return !ne && !pe && !ee; // && !photoErr
  }, [name, phone, email, photoUri]);

  const validateStep1 = useCallback((): boolean => {
    const allUploaded = DOC_FIELDS.every((f) => documents[f.key] !== null);
    if (!allUploaded) {
      setDocumentsError('Please upload all required documents.');
      return false;
    }
    setDocumentsError(null);
    return true;
  }, [documents]);

  const validateStep2 = useCallback((): boolean => {
    const nextAbnError =
      abn.length !== 11
        ? 'Enter a valid 11-digit ABN.'
        : abnLookupLoading
          ? 'ABN verification is still in progress.'
          : !abnLookupResult || verifiedAbn !== abn
            ? 'Please enter a valid ABN and wait for verification.'
            : null;
    const nextBusinessNameError = !businessName.trim() ? 'Business name is required.' : null;
    const nextLicenseNumberError = validateLicenseNumber(licenseNumber);
    const nextLicenseExpiryError = validateLicenseExpiry(licenseExpiryDate);
    const validCategoryIds = filterUuids(
      selectedServiceIds.filter((id) => categoryNameById.has(id)),
    );
    const nextServicesError =
      validCategoryIds.length === 0 ? 'Please select at least one service.' : null;
    const nextLocationError =
      !selectedRegionId || !isUuid(selectedRegionId)
        ? 'Please choose a business location.'
        : null;
    const nextServiceDescriptionError =
      !serviceDescription.trim() || serviceDescription.trim().length < 20
        ? 'Please write a short service description (20+ characters).'
        : null;
    const nextOpenTimeError = !openTime ? 'Please select an opening time.' : null;
    const nextCloseTimeError = !closeTime ? 'Please select a closing time.' : null;
    const nextOpenDaysError = openDayIds.length === 0 ? 'Please choose at least one open day.' : null;
    const nextEmergencyError =
      emergencyAvailable === null ? 'Please answer the emergency availability question.' : null;

    setAbnError(nextAbnError);
    setBusinessNameError(nextBusinessNameError);
    setLicenseNumberError(nextLicenseNumberError);
    setLicenseExpiryError(nextLicenseExpiryError);
    setServicesError(nextServicesError);
    setLocationError(nextLocationError);
    setServiceDescriptionError(nextServiceDescriptionError);
    setOpenTimeError(nextOpenTimeError);
    setCloseTimeError(nextCloseTimeError);
    setOpenDaysError(nextOpenDaysError);
    setEmergencyError(nextEmergencyError);

    return !(
      nextAbnError ||
      nextBusinessNameError ||
      nextLicenseNumberError ||
      nextLicenseExpiryError ||
      nextServicesError ||
      nextLocationError ||
      nextServiceDescriptionError ||
      nextOpenTimeError ||
      nextCloseTimeError ||
      nextOpenDaysError ||
      nextEmergencyError
    );
  }, [
    abn,
    abnLookupLoading,
    abnLookupResult,
    verifiedAbn,
    businessName,
    licenseNumber,
    licenseExpiryDate,
    selectedServiceIds,
    selectedRegionId,
    categoryNameById,
    serviceDescription,
    openTime,
    closeTime,
    openDayIds,
    emergencyAvailable,
  ]);

  const buildDraftPayload = useCallback((): TradieApplicationDraft => {
    return {
      photoUri,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      documents,
      abn,
      abnData: abnLookupResult,
      businessName: businessName.trim(),
      licenseNumber: licenseNumber.trim(),
      licenseExpiryDate: parseLicenseExpiryInput(licenseExpiryDate),
      selectedServiceIds,
      videoUri,
      selectedRegionId,
      businessImageUri,
      serviceDescription: serviceDescription.trim(),
      website: website.trim() || null,
      openTime: openTime ? businessTimeToApi(openTime) : null,
      closeTime: closeTime ? businessTimeToApi(closeTime) : null,
      openDayIds,
      emergencyAvailable,
      workImages,
    };
  }, [
    photoUri,
    name,
    phone,
    email,
    documents,
    abn,
    abnLookupResult,
    businessName,
    licenseNumber,
    licenseExpiryDate,
    selectedServiceIds,
    videoUri,
    selectedRegionId,
    businessImageUri,
    serviceDescription,
    website,
    openTime,
    closeTime,
    openDayIds,
    emergencyAvailable,
    workImages,
  ]);

  const submitBusinessSetup = useCallback(async (): Promise<boolean> => {
    if (!openTime || !closeTime || !abnLookupResult || !selectedRegionId) return false;

    const draft = buildDraftPayload();
    void saveTradieDraft(draft);

    const categoryIds = filterUuids(
      draft.selectedServiceIds.filter((id) => categoryNameById.has(id)),
    ).join(',');

    if (!categoryIds || !isUuid(selectedRegionId)) {
      showToast({ message: 'Please select valid services and a region.', type: 'error' });
      return false;
    }

    const result = await dispatch(
      setupBusinessProfileThunk({
        businessName: draft.businessName.trim(),
        licenseNumber: draft.licenseNumber.trim(),
        licenseExpiryDate: draft.licenseExpiryDate ?? undefined,
        abn: draft.abn.trim(),
        abnData: abnResultToApiJson(draft.abnData!),
        categoryIds,
        regionIds: selectedRegionId,
        serviceDescription: draft.serviceDescription || undefined,
        website: draft.website?.trim() || undefined,
        timeFrom: businessTimeToApi(openTime),
        timeTo: businessTimeToApi(closeTime),
        openDays: draft.openDayIds.map((id) => OPEN_DAY_TO_API[id] ?? id).join(','),
        isEmergencyAvailable: draft.emergencyAvailable ?? undefined,
        businessImageUri: draft.businessImageUri?.uri ?? undefined,
        businessVideoUri: draft.videoUri?.uri ?? undefined,
      }),
    );

    if (setupBusinessProfileThunk.fulfilled.match(result)) {
      showToast({ message: 'Business profile saved successfully!', type: 'success' });
      return true;
    }

    const errMsg =
      typeof result.payload === 'string' ? result.payload : 'Failed to save business profile.';
    showToast({ message: errMsg, type: 'error' });
    return false;
  }, [
    abnLookupResult,
    buildDraftPayload,
    categoryNameById,
    closeTime,
    dispatch,
    openTime,
    selectedRegionId,
    showToast,
  ]);

  const validateStep4 = useCallback((): boolean => {
    if (workImages.length === 0) {
      setWorkImagesError('Please add at least one work image.');
      return false;
    }
    if (workImages.length > MAX_WORK_PHOTOS) {
      setWorkImagesError(`Maximum ${MAX_WORK_PHOTOS} work photos allowed.`);
      return false;
    }
    setWorkImagesError(null);
    return true;
  }, [workImages]);

  const submitWorkPhotos = useCallback(async (): Promise<boolean> => {
    const newLocal = workImages.filter((img) => addedLocalWorkUrisRef.current.has(img.uri));

    if (mode === 'edit') {
      const removedIds = [...removedWorkPhotoIdsRef.current];

      if (!hasPendingWorkPhotoChanges(removedIds, addedLocalWorkUrisRef.current)) {
        return true;
      }

      for (const photoId of removedIds) {
        const delResult = await dispatch(deleteWorkPhotoThunk(photoId));
        if (deleteWorkPhotoThunk.rejected.match(delResult)) {
          const errMsg =
            typeof delResult.payload === 'string'
              ? delResult.payload
              : 'Failed to remove work photo.';
          setWorkImagesError(errMsg);
          showToast({ message: errMsg, type: 'error' });
          return false;
        }
      }

      if (newLocal.length > 0) {
        const uploadResult = await dispatch(uploadWorkPhotosThunk(newLocal.map((img) => img.uri)));
        if (uploadWorkPhotosThunk.rejected.match(uploadResult)) {
          const errMsg =
            typeof uploadResult.payload === 'string'
              ? uploadResult.payload
              : 'Failed to upload work images.';
          setWorkImagesError(errMsg);
          showToast({ message: errMsg, type: 'error' });
          return false;
        }
      }

      removedWorkPhotoIdsRef.current.clear();
      addedLocalWorkUrisRef.current.clear();
      showToast({ message: 'Work photos updated successfully!', type: 'success' });
      return true;
    }

    // Create: only upload newly picked local files; skip if already on server.
    if (newLocal.length === 0) {
      const hasRemote = workImages.some((img) => !isLocalMediaUri(img.uri));
      if (hasRemote) return true;
    }

    const uris = newLocal.map((img) => img.uri);
    const result = await dispatch(uploadWorkPhotosThunk(uris));

    if (uploadWorkPhotosThunk.fulfilled.match(result)) {
      showToast({ message: 'Work photos uploaded successfully!', type: 'success' });
      return true;
    }

    const errMsg =
      typeof result.payload === 'string' ? result.payload : 'Failed to upload work images.';
    setWorkImagesError(errMsg);
    showToast({ message: errMsg, type: 'error' });
    return false;
  }, [workImages, dispatch, showToast, mode]);

  const submitPersonalInfo = useCallback(async (): Promise<boolean> => {
    const result = await dispatch(
      updateUserMeThunk({
        name: name.trim(),
        email: email.trim(),
        phone: normalizeAustralianPhone(phone),
      }),
    );
    if (updateUserMeThunk.rejected.match(result)) {
      const msg = (result.payload as string) ?? 'Failed to update profile.';
      showToast({ message: msg, type: 'error', duration: 5_000 });
      return false;
    }
    dispatch(setAuthUser(result.payload));
    return true;
  }, [dispatch, name, email, phone, showToast]);

  const onPrimaryPress = useCallback(() => {
    if (step === 0) {
      if (!validateStep0()) return;
      setSubmitting(true);
      void (async () => {
        try {
          const ok = await submitPersonalInfo();
          if (ok) setStep(1);
        } finally {
          setSubmitting(false);
        }
      })();
      return;
    }
    if (step === 1) {
      if (!validateStep2()) return;
      setSubmitting(true);
      void (async () => {
        try {
          const ok = await submitBusinessSetup();
          if (ok) setStep(2);
        } finally {
          setSubmitting(false);
        }
      })();
      return;
    }
    if (step !== 2) return;

    if (!validateStep4()) return;
    void saveTradieDraft(buildDraftPayload());

    setSubmitting(true);
    void (async () => {
      try {
        const ok = await submitWorkPhotos();
        if (!ok) return;

        if (mode === 'create') {
          await saveTradieStatus('under_review');
        }
        if (fromSignup) {
          navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
        } else {
          navigation.navigate('ManageTradies');
        }
      } finally {
        setSubmitting(false);
      }
    })();
  }, [
    step,
    submitPersonalInfo,
    validateStep0,
    validateStep2,
    validateStep4,
    submitBusinessSetup,
    submitWorkPhotos,
    buildDraftPayload,
    navigation,
    mode,
    fromSignup,
  ]);

  const onBackPress = useCallback(() => {
    if (step > 0) {
      setStep((s) => s - 1);
      return;
    }
    if (navigation.canGoBack()) navigation.goBack();
  }, [step, navigation]);

  const primaryLabel = useMemo(() => {
    if (submitting) {
      if (step === 0 || step === 1) return 'Saving...';
      return 'Submitting...';
    }
    return step === STEPS - 1 ? 'Submit Images' : 'Continue';
  }, [step, submitting]);

  const handleDescriptionFocus = useKeyboardFormScrollOnFocus();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior="padding"
      keyboardVerticalOffset={insets.top}
    >
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={onBackPress}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={step > 0 ? 'Previous step' : 'Go back'}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Icon name="arrow-left-01" width={24} height={24} color={colors.onboardingTitle} />
          </Pressable>
          <Text style={styles.topTitle}>Become a Service Provider</Text>
          <View style={styles.backBtn} />
        </View>

        <View style={styles.stepperRow}>
          {Array.from({ length: STEPS }, (_, i) => {
            const isActive = i === step;
            const isCompleted = i < step;
            const isOn = isActive || isCompleted;
            return (
              <View key={i} style={styles.stepperItem}>
                <View
                  style={[
                    styles.stepCircle,
                    isOn ? styles.stepCircleOn : styles.stepCircleOff,
                  ]}
                >
                  <Text style={[styles.stepNumber, isOn ? styles.stepNumberOn : styles.stepNumberOff]}>
                    {i + 1}
                  </Text>
                </View>
                {i < STEPS - 1 ? (
                  <View
                    style={[
                      styles.stepConnector,
                      isCompleted ? styles.stepConnectorOn : styles.stepConnectorOff,
                    ]}
                  />
                ) : null}
              </View>
            );
          })}
        </View>

        <ProfileCompletionScore percent={profileCompletionPercent} />

        <KeyboardFormScrollView
          keyboardAvoiding={false}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.title}>{STEP_HEADINGS[step]}</Text>

          {step === 0 ? (
            <View style={styles.block}>
              {/* Profile photo picker — hidden on step 0 for now
              <View style={styles.uploadWrap}>
                <Pressable
                  onPress={onPickPhoto}
                  accessibilityRole="button"
                  accessibilityLabel="Upload your photo"
                  style={({ pressed }) => [styles.uploadCircle, pressed && styles.pressed]}
                >
                  {photoUri ? (
                    <Image source={{ uri: photoUri }} style={styles.uploadImage} resizeMode="cover" />
                  ) : (
                    <Icon name="album-02" width={36} height={36} color={colors.placeholder} />
                  )}
                  <View style={styles.uploadBadge}>
                    <Icon name="pencil-edit-02" width={14} height={14} color={colors.onPrimary} />
                  </View>
                </Pressable>
                <Text style={styles.uploadLabel}>Upload Your Photo (required)</Text>
                <FieldError message={photoError} />
              </View>
              */}

              <View style={styles.fields}>
                <AppTextField
                  label="Name"
                  value={name}
                  onChangeText={(raw) => {
                    const { value } = sanitizeName(raw);
                    setName(value);
                    setNameError(null);
                  }}
                  placeholder="Your full name"
                  leftIconName="user-03"
                  autoCapitalize="words"
                  error={nameError ?? undefined}
                  inputStyle={inputColor}
                />
                <AppTextField
                  label="Phone number"
                  value={phone}
                  onChangeText={(raw) => {
                    const { value, hadInvalid } = sanitizeAustralianPhone(raw);
                    const next = value || AU_PHONE_DIAL_CODE;
                    setPhone(next);
                    const err = validatePhone(next);
                    setPhoneError(
                      hadInvalid
                        ? 'Use digits only (Australian format, e.g. 0412 345 678).'
                        : err,
                    );
                  }}
                  placeholder="412 345 678"
                  leftIconName="smart-phone-02"
                  keyboardType="phone-pad"
                  maxLength={AU_PHONE_E164_MAX_LENGTH}
                  error={phoneError ?? undefined}
                  inputStyle={inputColor}
                />
                <AppTextField
                  label="Email"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    setEmailError(null);
                  }}
                  placeholder="Email"
                  leftIconName="mail-01"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={emailError ?? undefined}
                  inputStyle={inputColor}
                />
              </View>
            </View>
          ) : null}

          {step === 1 ? (
            <View style={styles.block}>
              <AppTextField
                label="Business Name"
                value={businessName}
                onChangeText={(t) => {
                  setBusinessName(t);
                  setBusinessNameError(null);
                }}
                placeholder="Business Name"
                error={businessNameError ?? undefined}
                inputStyle={inputColor}
              />

              <AppTextField
                label="Licence Number"
                value={licenseNumber}
                onChangeText={(t) => {
                  setLicenseNumber(t);
                  setLicenseNumberError(validateLicenseNumber(t));
                }}
                placeholder="Enter licence number"
                autoCapitalize="characters"
                autoCorrect={false}
                leftIconName="transaction-history"
                error={licenseNumberError ?? undefined}
                inputStyle={inputColor}
              />

              <AppTextField
                label="Licence Expiry Date"
                value={licenseExpiryDate}
                onChangeText={(t) => {
                  setLicenseExpiryDate(t);
                  setLicenseExpiryError(validateLicenseExpiry(t));
                }}
                placeholder="DD/MM/YYYY"
                keyboardType="numbers-and-punctuation"
                leftIconName="time-04"
                error={licenseExpiryError ?? undefined}
                inputStyle={inputColor}
              />

              <AbnNumberField
                value={abn}
                onChangeText={onAbnChange}
                error={abnError ?? undefined}
                verified={Boolean(abnLookupResult && verifiedAbn === abn)}
                loading={abnLookupLoading}
              />
              {abnLookupResult && verifiedAbn === abn ? (
                <AbnDetailsCard result={abnLookupResult} />
              ) : null}

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Services</Text>
                <DropdownHeader
                  placeholder="Select a services"
                  value={
                    selectedServiceIds.length > 0
                      ? selectedServiceIds.map((id) => getCategoryName(id)).join(', ')
                      : null
                  }
                  isOpen={servicesPickerOpen}
                  hasError={Boolean(servicesError)}
                  onPress={() => setServicesPickerOpen((o) => !o)}
                />
                {servicesPickerOpen ? (
                  categoriesLoading ? (
                    <View style={styles.categoriesLoading}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.categoriesLoadingText}>Loading services…</Text>
                    </View>
                  ) : categoriesError ? (
                    <FieldError message={categoriesError} />
                  ) : categories.length === 0 ? (
                    <FieldError message="No services available." />
                  ) : (
                    <ListCard>
                      {categories.map((c, idx) => (
                        <ListRow
                          key={c.id}
                          label={c.name}
                          selected={selectedServiceIds.includes(c.id)}
                          onPress={() => toggleService(c.id)}
                          showDivider={idx < categories.length - 1}
                        />
                      ))}
                    </ListCard>
                  )
                ) : null}
                {!servicesPickerOpen && selectedServiceIds.length > 0 ? (
                  <ListCard>
                    {selectedServiceIds.map((id, idx) => (
                      <ListRow
                        key={id}
                        label={getCategoryName(id)}
                        selected
                        onPress={() => toggleService(id)}
                        showDivider={idx < selectedServiceIds.length - 1}
                      />
                    ))}
                  </ListCard>
                ) : null}
                <FieldError message={servicesError} />
              </View>

              <DocumentUploadField
                label="Your Video Profile"
                placeholder="Upload Video Profile"
                fileName={videoUri?.name ?? null}
                onPress={onPickVideo}
              />

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Business Location</Text>
                <DropdownHeader
                  placeholder="Business Location"
                  value={selectedRegionId ? getRegionName(selectedRegionId) : null}
                  isOpen={locationPickerOpen}
                  hasError={Boolean(locationError)}
                  onPress={() => setLocationPickerOpen((o) => !o)}
                />
                {locationPickerOpen ? (
                  regionsLoading ? (
                    <View style={styles.categoriesLoading}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.categoriesLoadingText}>Loading locations…</Text>
                    </View>
                  ) : regionsError ? (
                    <FieldError message={regionsError} />
                  ) : regions.length === 0 ? (
                    <FieldError message="No locations available." />
                  ) : (
                    <ListCard>
                      {regions.map((region, idx) => (
                        <ListRow
                          key={region.id}
                          label={region.name}
                          selected={selectedRegionId === region.id}
                          onPress={() => {
                            setSelectedRegionId(
                              selectedRegionId === region.id ? null : region.id,
                            );
                            setLocationError(null);
                            setLocationPickerOpen(false);
                          }}
                          showDivider={idx < regions.length - 1}
                        />
                      ))}
                    </ListCard>
                  )
                ) : null}
                {!locationPickerOpen && selectedRegionId ? (
                  <ListCard>
                    <ListRow
                      label={getRegionName(selectedRegionId)}
                      selected
                      onPress={() => {
                        setSelectedRegionId(null);
                        setLocationError(null);
                      }}
                    />
                  </ListCard>
                ) : null}
                <FieldError message={locationError} />
              </View>

              <DocumentUploadField
                label="Image"
                placeholder="Upload Image"
                fileName={businessImageUri?.name ?? null}
                onPress={onPickBusinessImage}
              />

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Service Description</Text>
                <TextInput
                  value={serviceDescription}
                  onChangeText={(t) => {
                    setServiceDescription(t);
                    setServiceDescriptionError(null);
                  }}
                  onFocus={handleDescriptionFocus}
                  placeholder="Description"
                  placeholderTextColor={colors.placeholder}
                  multiline
                  textAlignVertical="top"
                  style={[styles.textArea, serviceDescriptionError ? styles.textAreaError : null]}
                />
                <FieldError message={serviceDescriptionError} />
              </View>

              <AppTextField
                label="Website"
                value={website}
                onChangeText={setWebsite}
                placeholder="Website"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                inputStyle={inputColor}
              />

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Business Time</Text>
                <View style={styles.timeRow}>
                  <BusinessTimeWheelPicker
                    label="Open"
                    placeholder="Select Time"
                    value={openTime}
                    isOpen={openTimePickerOpen}
                    onToggle={() => {
                      if (!openTime) setOpenTime(DEFAULT_BUSINESS_TIME);
                      setOpenTimePickerOpen((o) => !o);
                      setCloseTimePickerOpen(false);
                    }}
                    onChange={(t) => {
                      setOpenTime(t);
                      setOpenTimeError(null);
                    }}
                    error={openTimeError ?? undefined}
                  />
                  <BusinessTimeWheelPicker
                    label="Close"
                    placeholder="Select Time"
                    value={closeTime}
                    isOpen={closeTimePickerOpen}
                    onToggle={() => {
                      if (!closeTime) setCloseTime(DEFAULT_BUSINESS_TIME);
                      setCloseTimePickerOpen((o) => !o);
                      setOpenTimePickerOpen(false);
                    }}
                    onChange={(t) => {
                      setCloseTime(t);
                      setCloseTimeError(null);
                    }}
                    error={closeTimeError ?? undefined}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Open-day</Text>
                <DropdownHeader
                  placeholder="Select days"
                  value={
                    openDayIds.length > 0
                      ? openDayIds
                          .map((id) => DAYS_OF_WEEK.find((d) => d.id === id)?.label.slice(0, 3))
                          .filter(Boolean)
                          .join(', ')
                      : null
                  }
                  isOpen={openDayPickerOpen}
                  hasError={Boolean(openDaysError)}
                  onPress={() => setOpenDayPickerOpen((o) => !o)}
                />
                {openDayPickerOpen ? (
                  <ListCard>
                    {DAYS_OF_WEEK.map((d, idx) => (
                      <ListRow
                        key={d.id}
                        label={d.label}
                        selected={openDayIds.includes(d.id)}
                        onPress={() => {
                          toggleOpenDay(d.id);
                          setOpenDaysError(null);
                        }}
                        showDivider={idx < DAYS_OF_WEEK.length - 1}
                      />
                    ))}
                  </ListCard>
                ) : null}
                <FieldError message={openDaysError} />
              </View>

              <View style={styles.emergencyRow}>
                <Text style={styles.emergencyLabel}>
                  Are you available for emergency work?
                </Text>
                <View style={styles.emergencyToggles}>
                  <TogglePill
                    label="No"
                    selected={emergencyAvailable === false}
                    onPress={() => {
                      setEmergencyAvailable(false);
                      setEmergencyError(null);
                    }}
                  />
                  <TogglePill
                    label="Yes"
                    selected={emergencyAvailable === true}
                    onPress={() => {
                      setEmergencyAvailable(true);
                      setEmergencyError(null);
                    }}
                  />
                </View>
              </View>
              <FieldError message={emergencyError} />
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.block}>
              <View style={styles.workGrid}>
                {workImages.map((img) => (
                  <View key={img.uri} style={styles.workTile}>
                    <Image source={{ uri: img.uri }} style={styles.workImage} resizeMode="cover" />
                    <Pressable
                      onPress={() => onRemoveWorkImage(img.uri)}
                      accessibilityRole="button"
                      accessibilityLabel="Remove work image"
                      hitSlop={8}
                      style={({ pressed }) => [styles.workRemoveBtn, pressed && styles.pressed]}
                    >
                      <Text style={styles.workRemoveText}>×</Text>
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  onPress={onAddWorkImage}
                  accessibilityRole="button"
                  accessibilityLabel="Add work images"
                  style={({ pressed }) => [
                    styles.workAddTile,
                    workImages.length % 2 === 0
                      ? styles.workAddTileFull
                      : styles.workAddTileSquare,
                    pressed && styles.pressed,
                  ]}
                >
                  <Icon name="add-01" width={28} height={28} color={colors.onboardingTitle} />
                </Pressable>
              </View>
              <FieldError message={workImagesError} />
            </View>
          ) : null}
        </KeyboardFormScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <AppButton
            title={primaryLabel}
            onPress={onPrimaryPress}
            containerStyle={styles.footerFull}
            disabled={submitting}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function DocumentUploadField({
  label,
  placeholder,
  fileName,
  onPress,
}: {
  label: string;
  placeholder: string;
  fileName: string | null;
  onPress: () => void;
}) {
  const hasFile = Boolean(fileName);
  return (
    <View style={styles.docFieldWrap}>
      <Text style={styles.docFieldLabel}>{label}</Text>
      <View style={styles.docFieldRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Upload ${label}`}
          onPress={onPress}
          style={({ pressed }) => [styles.docUploadBtn, pressed && styles.pressed]}
        >
          <Icon name="album-02" width={14} height={14} color={colors.placeholder} />
          <Text style={styles.docUploadBtnText}>Upload</Text>
        </Pressable>
        <View style={styles.docDivider} />
        <Text
          style={[styles.docFieldValue, hasFile ? styles.docFieldValueFilled : null]}
          numberOfLines={1}
        >
          {hasFile ? fileName : placeholder}
        </Text>
      </View>
    </View>
  );
}

function DropdownHeader({
  placeholder,
  value,
  isOpen,
  hasError,
  onPress,
}: {
  placeholder: string;
  value?: string | null;
  isOpen: boolean;
  hasError?: boolean;
  onPress: () => void;
}) {
  const hasValue = Boolean(value);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.dropdownRow,
        hasError ? styles.dropdownRowError : null,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[styles.dropdownText, hasValue ? styles.dropdownTextFilled : null]}
        numberOfLines={1}
      >
        {hasValue ? value : placeholder}
      </Text>
      <Icon
        name={isOpen ? 'arrow-up-01' : 'arrow-down-01'}
        width={18}
        height={18}
        color={colors.placeholder}
      />
    </Pressable>
  );
}

function ListCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.listCard}>{children}</View>;
}

function ListRow({
  label,
  suffix,
  selected,
  disabled,
  onPress,
  showDivider,
}: {
  label: string;
  suffix?: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  showDivider?: boolean;
}) {
  const inner = (
    <View style={[styles.listRow, selected && !disabled ? styles.listRowSelected : null]}>
      <Text
        style={[
          styles.listRowText,
          disabled ? styles.listRowTextDisabled : null,
          selected && !disabled ? styles.listRowTextSelected : null,
        ]}
        numberOfLines={1}
      >
        {label}
        {suffix ? <Text style={styles.listRowSuffix}>{` ${suffix}`}</Text> : null}
      </Text>
      {selected && !disabled ? (
        <View style={styles.listRowCheck}>
          <Text style={styles.listRowCheckMark}>✓</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View>
      {onPress && !disabled ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityState={{ selected: Boolean(selected) }}
          style={({ pressed }) => [pressed ? styles.pressed : null]}
        >
          {inner}
        </Pressable>
      ) : (
        inner
      )}
      {showDivider ? <View style={styles.listDivider} /> : null}
    </View>
  );
}

function TogglePill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.togglePill,
        selected ? styles.togglePillOn : styles.togglePillOff,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.togglePillText,
          selected ? styles.togglePillTextOn : styles.togglePillTextOff,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const STEP_CIRCLE_SIZE = 28;

function ProfileCompletionScore({ percent }: { percent: number }) {

  return (
    <View
      style={styles.profileScoreSection}
      accessibilityRole="progressbar"
      accessibilityLabel={`Profile ${percent} percent complete`}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      <View style={styles.profileScoreCard}>
        <View style={styles.profileScoreHeader}>
          <Text style={styles.profileScoreLabel}>Profile score</Text>
          <Text style={styles.profileScorePercent}>{percent}%</Text>
        </View>
        <View style={styles.profileScoreTrack}>
          <View style={[styles.profileScoreFill, { width: `${percent}%` }]} />
        </View>
        <Text style={styles.profileScoreCaption}>{percent}% profile complete</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
    minHeight: 48,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  topTitle: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.onboardingTitle,
    textAlign: 'center',
    flex: 1,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 50,
    marginTop: 8,
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  profileScoreSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  profileScoreCard: {
    backgroundColor: '#FFF0EF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  profileScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileScoreLabel: {
    fontFamily: fontFamilies.inter.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onboardingBody,
  },
  profileScorePercent: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.primary,
  },
  profileScoreTrack: {
    height: 6,
    borderRadius: 20,
    backgroundColor: '#E8E8EE',
    overflow: 'hidden',
  },
  profileScoreFill: {
    height: '100%',
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  profileScoreCaption: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.placeholderText,
  },
  stepperItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  stepCircle: {
    width: STEP_CIRCLE_SIZE,
    height: STEP_CIRCLE_SIZE,
    borderRadius: STEP_CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  stepCircleOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepCircleOff: {
    backgroundColor: colors.background,
    borderColor: '#E1E1E6',
  },
  stepNumber: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 13,
    lineHeight: 16,
  },
  stepNumberOn: {
    color: colors.onPrimary,
  },
  stepNumberOff: {
    color: '#B5B5BD',
  },
  stepConnector: {
    width: 60,
    height: 6,
    borderRadius: 20,
    marginLeft: 20,
  },
  stepConnectorOn: {
    backgroundColor: colors.primary,
  },
  stepConnectorOff: {
    backgroundColor: '#E8E8EE',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  title: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.onboardingTitle,
    marginBottom: 20,
  },
  block: {
    gap: 20,
  },
  uploadWrap: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  uploadCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#F2F2F4',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  uploadImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  uploadBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F5A623',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  uploadLabel: {
    fontFamily: fontFamilies.inter.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onboardingTitle,
  },
  fields: {
    gap: 16,
  },
  sectionLabel: {
    fontFamily: fontFamilies.inter.medium,
    fontSize: 14,
    lineHeight: 18,
    color: colors.onboardingTitle,
    marginBottom: 4,
  },
  docFieldWrap: {
    gap: 6,
  },
  docFieldLabel: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.label,
  },
  docFieldRow: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingLeft: 8,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  docUploadBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F2F2F4',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  docUploadBtnText: {
    fontFamily: fontFamilies.inter.medium,
    fontSize: 13,
    lineHeight: 16,
    color: colors.onboardingTitle,
  },
  docDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },
  docFieldValue: {
    flex: 1,
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.placeholder,
  },
  docFieldValueFilled: {
    color: colors.onboardingTitle,
  },
  categoriesLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  categoriesLoadingText: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.label,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.label,
  },
  dropdownRow: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownRowError: {
    borderColor: colors.error,
  },
  textAreaError: {
    borderColor: colors.error,
  },
  dropdownText: {
    flex: 1,
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.placeholder,
    marginRight: 8,
  },
  dropdownTextFilled: {
    color: colors.onboardingTitle,
  },
  listCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  listRow: {
    minHeight: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listRowSelected: {
    backgroundColor: 'rgba(245, 142, 131, 0.12)',
  },
  listRowText: {
    flex: 1,
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onboardingTitle,
    marginRight: 8,
  },
  listRowTextSelected: {
    fontFamily: fontFamilies.inter.semibold,
    color: colors.onboardingTitle,
  },
  listRowTextDisabled: {
    color: colors.placeholder,
  },
  listRowSuffix: {
    fontFamily: fontFamilies.inter.regular,
    color: colors.placeholder,
  },
  listRowCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listRowCheckMark: {
    color: colors.onPrimary,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '700',
  },
  listDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#EAEAEF',
    marginHorizontal: 16,
  },
  timeRow: {
    gap: 16,
  },
  emergencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
  },
  emergencyLabel: {
    flex: 1,
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onboardingTitle,
  },
  emergencyToggles: {
    flexDirection: 'row',
    gap: 8,
  },
  togglePill: {
    minWidth: 56,
    height: 36,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  togglePillOn: {
    backgroundColor: colors.primary,
  },
  togglePillOff: {
    backgroundColor: '#EFEFF2',
  },
  togglePillText: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 14,
    lineHeight: 18,
  },
  togglePillTextOn: {
    color: colors.onPrimary,
  },
  togglePillTextOff: {
    color: colors.onboardingTitle,
  },
  workGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  workTile: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F2F2F4',
    position: 'relative',
  },
  workImage: {
    width: '100%',
    height: '100%',
  },
  workRemoveBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workRemoveText: {
    color: colors.onPrimary,
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '700',
  },
  workAddTile: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E1E6',
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workAddTileSquare: {
    width: '48%',
    aspectRatio: 1,
  },
  workAddTileFull: {
    width: '100%',
    height: 96,
  },
  inlineError: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.error,
    marginTop: -8,
  },
  textArea: {
    minHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fontFamilies.inter.regular,
    fontSize: 16,
    lineHeight: 22,
    color: colors.onboardingTitle,
    backgroundColor: colors.background,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.background,
  },
  footerFull: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.7,
  },
});
