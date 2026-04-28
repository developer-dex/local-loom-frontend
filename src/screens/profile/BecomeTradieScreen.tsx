import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton, AppTextField, Icon } from '../../components/ui';
import { SERVICE_CATEGORIES, getCategoryById } from '../../data/categories';
import { saveTradieDraft, saveTradieStatus, type TradieApplicationDraft } from '../../storage/tradieApplication';
import { colors, fontFamilies } from '../../theme';
import { sanitizeName, sanitizePhone, validateName, validatePhone } from '../../utils';
import type { RootStackParamList } from '../../navigation/types';

const STEPS = 4;

const STEP_HEADINGS = [
  'Personal info',
  'Documents',
  'Business Details',
  'Work Image',
] as const;

type DocKey = 'tradeLicense' | 'publicLiability' | 'idProof';

const DOC_FIELDS: { key: DocKey; label: string; placeholder: string }[] = [
  { key: 'tradeLicense', label: 'Trade License', placeholder: 'Upload Your License' },
  { key: 'publicLiability', label: 'Public Liability Insurance', placeholder: 'Upload Your License' },
  { key: 'idProof', label: 'ID Proof', placeholder: 'Upload Your License' },
];

type LocationOption = { id: string; label: string; comingSoon?: boolean };

const LOCATIONS: LocationOption[] = [
  { id: 'northern_melbourne', label: 'Northern Melbourne' },
  { id: 'south_east_melbourne', label: 'South East Melbourne', comingSoon: true },
  { id: 'western_melbourne', label: 'Western Melbourne', comingSoon: true },
  { id: 'eastern_melbourne', label: 'Eastern Melbourne', comingSoon: true },
];

const TIME_SLOTS: string[] = [
  '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
  '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM',
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

function validateEmail(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address.';
  return null;
}

export function BecomeTradieScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'BecomeTradie'>>();
  const route = useRoute<any>();
  const mode: 'create' | 'edit' = route?.params?.mode === 'edit' ? 'edit' : 'create';
  const initial: TradieApplicationDraft | undefined = route?.params?.initial;
  const [step, setStep] = useState(0);

  const [photoUri, setPhotoUri] = useState<string | null>(initial?.photoUri ?? null);
  const [name, setName] = useState(initial?.name ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');

  const [documents, setDocuments] = useState<Record<DocKey, { uri: string; name: string } | null>>(
    (initial?.documents as any) ?? {
      tradeLicense: null,
      publicLiability: null,
      idProof: null,
    },
  );

  const [businessName, setBusinessName] = useState(initial?.businessName ?? '');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(initial?.selectedServiceIds ?? []);
  const [servicesPickerOpen, setServicesPickerOpen] = useState(false);
  const [videoUri, setVideoUri] = useState<{ uri: string; name: string } | null>(initial?.videoUri ?? null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(initial?.selectedLocationId ?? null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [businessImageUri, setBusinessImageUri] = useState<{ uri: string; name: string } | null>(
    initial?.businessImageUri ?? null,
  );
  const [serviceDescription, setServiceDescription] = useState(initial?.serviceDescription ?? '');
  const [website, setWebsite] = useState(initial?.website ?? '');
  const [openTime, setOpenTime] = useState<string | null>(initial?.openTime ?? null);
  const [closeTime, setCloseTime] = useState<string | null>(initial?.closeTime ?? null);
  const [openTimePickerOpen, setOpenTimePickerOpen] = useState(false);
  const [closeTimePickerOpen, setCloseTimePickerOpen] = useState(false);
  const [openDayIds, setOpenDayIds] = useState<string[]>(initial?.openDayIds ?? []);
  const [openDayPickerOpen, setOpenDayPickerOpen] = useState(false);
  const [emergencyAvailable, setEmergencyAvailable] = useState<boolean | null>(initial?.emergencyAvailable ?? null);

  const [workImages, setWorkImages] = useState<{ uri: string; name: string }[]>(initial?.workImages ?? []);

  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [businessDetailsError, setBusinessDetailsError] = useState<string | null>(null);
  const [workImagesError, setWorkImagesError] = useState<string | null>(null);

  const inputColor = useMemo(() => ({ color: colors.onboardingTitle }), []);

  const toggleService = useCallback((id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setBusinessDetailsError(null);
  }, []);

  const toggleOpenDay = useCallback((id: string) => {
    setOpenDayIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
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

  const addWorkImageFromAsset = useCallback(
    (asset: ImagePicker.ImagePickerAsset) => {
      const fileName = asset.fileName ?? asset.uri.split('/').pop() ?? 'Image';
      setWorkImages((prev) => [...prev, { uri: asset.uri, name: fileName }]);
      setWorkImagesError(null);
    },
    [],
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
        addWorkImageFromAsset(result.assets[0]);
      }
    } catch (e) {
      Alert.alert('Could not open camera', 'Something went wrong. Please try again.');
    }
  }, [addWorkImageFromAsset]);

  const onChooseWorkImageFromLibrary = useCallback(async () => {
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
        addWorkImageFromAsset(result.assets[0]);
      }
    } catch (e) {
      Alert.alert('Could not open photos', 'Something went wrong. Please try again.');
    }
  }, [addWorkImageFromAsset]);

  const onAddWorkImage = useCallback(() => {
    Alert.alert('Add Work Image', 'How would you like to add an image?', [
      { text: 'Take Photo', onPress: onTakeWorkPhoto },
      { text: 'Choose from Library', onPress: onChooseWorkImageFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [onTakeWorkPhoto, onChooseWorkImageFromLibrary]);

  const onRemoveWorkImage = useCallback((uri: string) => {
    setWorkImages((prev) => prev.filter((img) => img.uri !== uri));
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
    const pe = validatePhone(phone);
    const ee = validateEmail(email);
    setNameError(ne);
    setPhoneError(pe);
    setEmailError(ee);
    return !ne && !pe && !ee;
  }, [name, phone, email]);

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
    if (!businessName.trim()) {
      setBusinessDetailsError('Business name is required.');
      return false;
    }
    if (selectedServiceIds.length === 0) {
      setBusinessDetailsError('Please select at least one service.');
      return false;
    }
    if (!selectedLocationId) {
      setBusinessDetailsError('Please choose a business location.');
      return false;
    }
    if (!serviceDescription.trim() || serviceDescription.trim().length < 20) {
      setBusinessDetailsError('Please write a short service description (20+ characters).');
      return false;
    }
    if (!openTime || !closeTime) {
      setBusinessDetailsError('Please set your business hours.');
      return false;
    }
    if (openDayIds.length === 0) {
      setBusinessDetailsError('Please choose at least one open day.');
      return false;
    }
    if (emergencyAvailable === null) {
      setBusinessDetailsError('Please answer the emergency availability question.');
      return false;
    }
    setBusinessDetailsError(null);
    return true;
  }, [
    businessName,
    selectedServiceIds,
    selectedLocationId,
    serviceDescription,
    openTime,
    closeTime,
    openDayIds,
    emergencyAvailable,
  ]);

  const onPrimaryPress = useCallback(() => {
    if (step === 0) {
      if (!validateStep0()) return;
      setStep(1);
      return;
    }
    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!validateStep2()) return;
      setStep(3);
      return;
    }
    if (workImages.length === 0) {
      setWorkImagesError('Please add at least one work image.');
      return;
    }
    setWorkImagesError(null);
    const payload: TradieApplicationDraft = {
      photoUri,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      documents,
      businessName: businessName.trim(),
      selectedServiceIds,
      videoUri,
      selectedLocationId,
      businessImageUri,
      serviceDescription: serviceDescription.trim(),
      website: website.trim() || null,
      openTime,
      closeTime,
      openDayIds,
      emergencyAvailable,
      workImages,
    };
    console.log('BecomeTradie — submit', payload);
    void (async () => {
      await saveTradieDraft(payload);
      if (mode === 'create') {
        await saveTradieStatus('under_review');
      }
      navigation.navigate('ManageTradies');
    })();
  }, [
    step,
    validateStep0,
    validateStep1,
    validateStep2,
    workImages,
    photoUri,
    name,
    phone,
    email,
    documents,
    businessName,
    selectedServiceIds,
    videoUri,
    selectedLocationId,
    businessImageUri,
    serviceDescription,
    website,
    openTime,
    closeTime,
    openDayIds,
    emergencyAvailable,
    navigation,
    mode,
  ]);

  const onBackPress = useCallback(() => {
    if (step > 0) {
      setStep((s) => s - 1);
      return;
    }
    if (navigation.canGoBack()) navigation.goBack();
  }, [step, navigation]);

  const primaryLabel = step === STEPS - 1 ? 'Submit for Review' : 'Continue';

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
          <Text style={styles.topTitle}>Become a Tradies</Text>
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

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>{STEP_HEADINGS[step]}</Text>

          {step === 0 ? (
            <View style={styles.block}>
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
                <Text style={styles.uploadLabel}>Upload Your Photo</Text>
              </View>

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
                    const { value } = sanitizePhone(raw);
                    setPhone(value);
                    setPhoneError(null);
                  }}
                  placeholder="Phone Number"
                  leftIconName="smart-phone-02"
                  keyboardType="phone-pad"
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
              <View style={styles.fields}>
                {DOC_FIELDS.map((f) => (
                  <DocumentUploadField
                    key={f.key}
                    label={f.label}
                    placeholder={f.placeholder}
                    fileName={documents[f.key]?.name ?? null}
                    onPress={() => onPickDocument(f.key)}
                  />
                ))}
              </View>
              {documentsError ? <Text style={styles.inlineError}>{documentsError}</Text> : null}
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.block}>
              <AppTextField
                label="Business Name"
                value={businessName}
                onChangeText={(t) => {
                  setBusinessName(t);
                  setBusinessDetailsError(null);
                }}
                placeholder="Business Name"
                inputStyle={inputColor}
              />

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Services</Text>
                <DropdownHeader
                  placeholder="Select a services"
                  value={
                    selectedServiceIds.length > 0
                      ? selectedServiceIds
                          .map((id) => getCategoryById(id)?.title)
                          .filter(Boolean)
                          .join(', ')
                      : null
                  }
                  isOpen={servicesPickerOpen}
                  onPress={() => setServicesPickerOpen((o) => !o)}
                />
                {servicesPickerOpen ? (
                  <ListCard>
                    {SERVICE_CATEGORIES.map((c, idx) => (
                      <ListRow
                        key={c.id}
                        label={c.title}
                        selected={selectedServiceIds.includes(c.id)}
                        onPress={() => toggleService(c.id)}
                        showDivider={idx < SERVICE_CATEGORIES.length - 1}
                      />
                    ))}
                  </ListCard>
                ) : null}
                {selectedServiceIds.length > 0 ? (
                  <ListCard>
                    {selectedServiceIds.map((id, idx) => (
                      <ListRow
                        key={id}
                        label={getCategoryById(id)?.title ?? id}
                        showDivider={idx < selectedServiceIds.length - 1}
                      />
                    ))}
                  </ListCard>
                ) : null}
              </View>

              <DocumentUploadField
                label="Video"
                placeholder="Upload Video"
                fileName={videoUri?.name ?? null}
                onPress={onPickVideo}
              />

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Business Location</Text>
                <DropdownHeader
                  placeholder="Business Location"
                  value={LOCATIONS.find((l) => l.id === selectedLocationId)?.label ?? null}
                  isOpen={locationPickerOpen}
                  onPress={() => setLocationPickerOpen((o) => !o)}
                />
                {locationPickerOpen ? (
                  <ListCard>
                    {LOCATIONS.map((loc, idx) => (
                      <ListRow
                        key={loc.id}
                        label={loc.label}
                        suffix={loc.comingSoon ? '(Coming Soon)' : undefined}
                        disabled={loc.comingSoon}
                        selected={selectedLocationId === loc.id}
                        onPress={
                          loc.comingSoon
                            ? undefined
                            : () => {
                                setSelectedLocationId(loc.id);
                                setLocationPickerOpen(false);
                                setBusinessDetailsError(null);
                              }
                        }
                        showDivider={idx < LOCATIONS.length - 1}
                      />
                    ))}
                  </ListCard>
                ) : null}
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
                    setBusinessDetailsError(null);
                  }}
                  placeholder="Description"
                  placeholderTextColor={colors.placeholder}
                  multiline
                  textAlignVertical="top"
                  style={styles.textArea}
                />
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
                  <View style={styles.timeCol}>
                    <DropdownHeader
                      placeholder="Open"
                      value={openTime}
                      isOpen={openTimePickerOpen}
                      onPress={() => {
                        setOpenTimePickerOpen((o) => !o);
                        setCloseTimePickerOpen(false);
                      }}
                    />
                  </View>
                  <View style={styles.timeCol}>
                    <DropdownHeader
                      placeholder="Close"
                      value={closeTime}
                      isOpen={closeTimePickerOpen}
                      onPress={() => {
                        setCloseTimePickerOpen((o) => !o);
                        setOpenTimePickerOpen(false);
                      }}
                    />
                  </View>
                </View>
                {openTimePickerOpen ? (
                  <ListCard>
                    {TIME_SLOTS.map((t, idx) => (
                      <ListRow
                        key={`open-${t}`}
                        label={t}
                        selected={openTime === t}
                        onPress={() => {
                          setOpenTime(t);
                          setOpenTimePickerOpen(false);
                          setBusinessDetailsError(null);
                        }}
                        showDivider={idx < TIME_SLOTS.length - 1}
                      />
                    ))}
                  </ListCard>
                ) : null}
                {closeTimePickerOpen ? (
                  <ListCard>
                    {TIME_SLOTS.map((t, idx) => (
                      <ListRow
                        key={`close-${t}`}
                        label={t}
                        selected={closeTime === t}
                        onPress={() => {
                          setCloseTime(t);
                          setCloseTimePickerOpen(false);
                          setBusinessDetailsError(null);
                        }}
                        showDivider={idx < TIME_SLOTS.length - 1}
                      />
                    ))}
                  </ListCard>
                ) : null}
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
                          setBusinessDetailsError(null);
                        }}
                        showDivider={idx < DAYS_OF_WEEK.length - 1}
                      />
                    ))}
                  </ListCard>
                ) : null}
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
                      setBusinessDetailsError(null);
                    }}
                  />
                  <TogglePill
                    label="Yes"
                    selected={emergencyAvailable === true}
                    onPress={() => {
                      setEmergencyAvailable(true);
                      setBusinessDetailsError(null);
                    }}
                  />
                </View>
              </View>

              {businessDetailsError ? (
                <Text style={styles.inlineError}>{businessDetailsError}</Text>
              ) : null}
            </View>
          ) : null}

          {step === 3 ? (
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
                  accessibilityLabel="Add work image"
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
              {workImagesError ? (
                <Text style={styles.inlineError}>{workImagesError}</Text>
              ) : null}
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <AppButton title={primaryLabel} onPress={onPrimaryPress} containerStyle={styles.footerFull} />
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
  onPress,
}: {
  placeholder: string;
  value?: string | null;
  isOpen: boolean;
  onPress: () => void;
}) {
  const hasValue = Boolean(value);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.dropdownRow, pressed && styles.pressed]}
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
    <View style={styles.listRow}>
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
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 24,
    // backgroundColor: colors.placeholderText,
    justifyContent: 'space-between',
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
    width: 40,
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
    flexDirection: 'row',
    gap: 12,
  },
  timeCol: {
    flex: 1,
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
