import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { IdentifierType } from '../../api/authTypes';
import { AppButton, AppTextField, Icon, KeyboardFormScrollView } from '../../components/ui';
import { colors, fontFamilies, nunitoSans, spacing } from '../../theme';
import {
  detectCredentialType,
  normalizeAustralianPhone,
  normalizeCredentialInput,
  sanitizeEmail,
  sanitizeName,
  validateCredential,
  validateEmail,
  validateName,
  validatePhone,
} from '../../utils';
import { useAppDispatch, useAppSelector, selectAuthStatus, selectAuthError } from '../../store/hooks';
import { signupThunk, clearError } from '../../store/slices/authSlice';
import { useToast } from '../../components/ui';

const tradieArt = require('../../../assets/signup/tradie.png');
const customerArt = require('../../../assets/signup/customer.png');

type Role = 'tradie' | 'customer';

type Props = {
  onContinue: (data: {
    role: Role;
    fullName: string;
    identifier: string;
    identifierType: IdentifierType;
  }) => void;
  onBack: () => void;
  onSignIn: () => void;
  onSkipToHome: () => void;
};

export function SignUpScreen({ onContinue, onBack, onSignIn, onSkipToHome }: Props) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const apiStatus = useAppSelector(selectAuthStatus);
  const apiError = useAppSelector(selectAuthError);

  const [role, setRole] = useState<Role | null>(null);
  const [credential, setCredential] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [credentialError, setCredentialError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);

  const submitting = apiStatus === 'loading';
  const credentialType = detectCredentialType(credential);

  useEffect(() => () => { dispatch(clearError()); }, [dispatch]);

  const { showToast } = useToast();
  useEffect(() => {
    if (apiError) showToast({ message: apiError, type: 'error', duration: 5_000 });
  }, [apiError, showToast]);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast({ message: 'Photo library permission is required to select a photo.', type: 'error', duration: 5_000 });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
      setPhotoError(null);
    }
  };

  const avatarHint = useMemo(() => {
    if (photoUri) return 'Tap to change photo';
    if (role === 'tradie') return 'Add profile photo (required)';
    return 'Add profile photo (optional)';
  }, [photoUri, role]);

  const canSubmit = useMemo(() => {
    if (!role || validateName(fullName)) return false;
    if (role === 'customer') {
      if (!credential.trim() || validateCredential(credential)) return false;
      return true;
    }
    if (!email.trim() || validateEmail(email)) return false;
    if (!phone.trim() || validatePhone(phone, { completeOnly: true })) return false;
    if (!termsAccepted) return false;
    return true;
  }, [role, fullName, credential, email, phone, termsAccepted]);

  const onSubmit = async () => {
    const ne = validateName(fullName);
    const ce = role === 'customer' ? validateCredential(credential) : null;
    const ee = role === 'tradie' ? validateEmail(email) : null;
    const pe = role === 'tradie' ? validatePhone(phone, { completeOnly: true }) : null;
    const photoErr =
      role === 'tradie' && !photoUri ? 'Profile photo is required for service providers.' : null;
    setNameError(ne);
    setCredentialError(ce);
    setEmailError(ee);
    setPhoneError(pe);
    setPhotoError(photoErr);
    const termsErr = !termsAccepted ? 'You must accept the Terms & Conditions.' : null;
    setTermsError(termsErr);
    if (!role || ne || ce || ee || pe || photoErr || termsErr) return;

    const normalizedPhone =
      role === 'tradie' ? normalizeAustralianPhone(phone) : undefined;
    const normalizedEmail = role === 'tradie' ? sanitizeEmail(email).value : undefined;

    const result = await dispatch(
      signupThunk({
        role,
        fullName: fullName.trim(),
        profilePhotoUri: photoUri ?? undefined,
        ...(role === 'customer'
          ? detectCredentialType(credential) === 'phone'
            ? { phone: credential }
            : { email: credential }
          : { email: normalizedEmail, phone: normalizedPhone }),
      }),
    );

    if (signupThunk.fulfilled.match(result)) {
      if (role === 'customer') {
        const type = detectCredentialType(credential);
        onContinue({
          role,
          fullName: fullName.trim(),
          identifier: credential,
          identifierType: type === 'phone' ? 'phone' : 'email',
        });
      } else {
        onContinue({
          role,
          fullName: fullName.trim(),
          identifier: normalizedPhone!,
          identifierType: 'phone',
        });
      }
    }
  };

  const credentialIcon =
    credentialType === 'email' ? 'mail-01' : 'smart-phone-02';

  return (
    <KeyboardFormScrollView
      style={styles.flex}
      keyboardVerticalOffset={8}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, spacing.lg) },
      ]}
    >
        <View style={styles.topNav}>
          <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
            <Icon name="arrow-left-01" width={20} height={20} />
          </Pressable>
          <View style={styles.topNavSpacer} />
          <AppButton title="Skip" variant="ghost" onPress={onSkipToHome} />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Create Your Account</Text>
          <Text style={styles.subtitle}>Sign up to explore live food prices and order at the right time.</Text>
        </View>

        {/* ── Profile photo picker ─────────────────────────────────────── */}
        <View style={styles.avatarSection}>
          <Pressable
            onPress={pickPhoto}
            style={styles.avatarBtn}
            accessibilityRole="button"
            accessibilityLabel="Select profile photo"
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <View style={[styles.avatarPlaceholder, photoError && styles.avatarPlaceholderError]}>
                <Icon name="user-03" width={32} height={32} color={colors.placeholder} />
              </View>
            )}
            {/* Camera badge */}
            <View style={styles.cameraBadge}>
              <Icon name="add-01" width={14} height={14} color={colors.onPrimary} />
            </View>
          </Pressable>
          <Text style={styles.avatarHint}>{avatarHint}</Text>
          {photoError ? <Text style={styles.avatarError}>{photoError}</Text> : null}
        </View>

        <Text style={styles.sectionLabel}>Choose Your Role</Text>
        <View style={styles.roleRow}>
          <RoleTile
            label="Service Providers"
            image={tradieArt}
            selected={role === 'tradie'}
            onPress={() => {
              setRole('tradie');
              setCredentialError(null);
              setPhotoError(null);
            }}
          />
          <RoleTile
            label="Customers"
            image={customerArt}
            selected={role === 'customer'}
            onPress={() => {
              setRole('customer');
              setEmailError(null);
              setPhoneError(null);
              setPhotoError(null);
            }}
          />
        </View>

        <View style={styles.fields}>
          <AppTextField
            label="Name"
            leftIconName="user-03"
            autoComplete="name"
            value={fullName}
            onChangeText={(raw) => {
              const { value, hadInvalid } = sanitizeName(raw);
              setFullName(value);
              const vErr = validateName(value);
              setNameError(hadInvalid ? 'Only letters and spaces are allowed.' : vErr);
            }}
            placeholder="Jack White"
            error={nameError ?? undefined}
          />
          {role === 'tradie' ? (
            <>
              <AppTextField
                label="Email"
                leftIconName="mail-01"
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                value={email}
                onChangeText={(raw) => {
                  const { value } = sanitizeEmail(raw);
                  setEmail(value);
                  setEmailError(validateEmail(value));
                }}
                placeholder="you@example.com"
                error={emailError ?? undefined}
              />
              <AppTextField
                label="Phone"
                leftIconName="smart-phone-02"
                keyboardType="phone-pad"
                autoComplete="tel"
                value={phone}
                onChangeText={(raw) => {
                  const value = normalizeAustralianPhone(raw) || raw.replace(/[^\d+]/g, '');
                  setPhone(value);
                  setPhoneError(validatePhone(value, { completeOnly: true }));
                }}
                placeholder="0412 345 678"
                error={phoneError ?? undefined}
              />
            </>
          ) : (
            <AppTextField
              label="Phone or Email"
              leftIconName={credentialIcon}
              keyboardType="email-address"
              autoComplete="email"
              autoCapitalize="none"
              value={credential}
              onChangeText={(raw) => {
                const value = normalizeCredentialInput(raw);
                setCredential(value);
                setCredentialError(validateCredential(value));
              }}
              placeholder="Phone number or email address"
              error={credentialError ?? undefined}
            />
          )}
        </View>

        {/* Terms & Conditions checkbox */}
        <Pressable
          style={styles.termsRow}
          onPress={() => {
            setTermsAccepted((prev) => !prev);
            setTermsError(null);
          }}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: termsAccepted }}
        >
          <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked, termsError && styles.checkboxError]}>
            {termsAccepted ? (
              <Text style={styles.checkmarkText}>✓</Text>
            ) : null}
          </View>
          <Text style={styles.termsText}>
            I agree to the{' '}
            <Text style={styles.termsLink}>Terms & Conditions</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </Pressable>
        {termsError ? <Text style={styles.termsErrorText}>{termsError}</Text> : null}

        <AppButton
          title="Continue"
          onPress={onSubmit}
          loading={submitting}
          disabled={!canSubmit}
          containerStyle={styles.cta}
        />

        <View style={styles.footerRow}>
          <Text style={styles.footerMuted}>Already a member? </Text>
          <Pressable onPress={onSignIn} hitSlop={8}>
            <Text style={styles.footerLink}>Sign In</Text>
          </Pressable>
        </View>
    </KeyboardFormScrollView>
  );
}

function RoleTile({
  label,
  image,
  selected,
  onPress,
}: {
  label: string;
  image: number;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tile, selected && styles.tileSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={[styles.tileImageWrap, selected && styles.tileImageWrapSelected]}>
        <Image source={image} style={styles.tileImage} resizeMode="cover" />
      </View>
      <Text style={[styles.tileLabel, selected && styles.tileLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 20, width: '100%' },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  backBtn: {},
  topNavSpacer: { flex: 1 },
  header: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontFamily: fontFamilies.inter.bold,
    fontSize: 24,
    lineHeight: 32,
    color: colors.onboardingTitle,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    lineHeight: 18,
    color: colors.placeholder,
    textAlign: 'center',
    maxWidth: 320,
  },
  // ── Avatar picker ──────────────────────────────────────────────────────────
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  avatarBtn: {
    width: 88,
    height: 88,
    borderRadius: 44,
    position: 'relative',
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F4F4F4',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  avatarHint: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.label,
  },
  avatarPlaceholderError: {
    borderColor: colors.error,
  },
  avatarError: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.error,
    textAlign: 'center',
  },
  // ── Role tiles ─────────────────────────────────────────────────────────────
  sectionLabel: {
    ...nunitoSans.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.onboardingTitle,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  roleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 32,
  },
  tile: { width: 85,
     alignItems: 'center', 
     gap: spacing.sm, 
    paddingVertical: 0 ,
  },
  tileSelected: { opacity: 1 },
  tileImageWrap: {
    width: 85,
    height: 85,
    borderRadius: 16,
    padding: 3,
    backgroundColor: '#F4F4F4',
  },
  tileImageWrapSelected: {
    backgroundColor: 'rgba(245, 142, 131, 0.18)',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  tileImage: { width: '100%', height: '100%', borderRadius: 13, backgroundColor: '#F4F4F4' },
  tileLabel: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    lineHeight: 18,
    color: colors.onboardingTitle,
    textAlign:"center"
  },
  tileLabelSelected: { color: colors.onboardingTitle, fontFamily: fontFamilies.inter.semibold },
  // ── Fields ─────────────────────────────────────────────────────────────────
  fields: { gap: spacing.md, marginBottom: 24 },
  // ── Terms checkbox ─────────────────────────────────────────────────────────
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmarkText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  checkboxError: {
    borderColor: colors.error,
  },
  termsText: {
    flex: 1,
    fontFamily: fontFamilies.inter.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onboardingTitle,
    marginTop: 2,
  },
  termsLink: {
    color: colors.primary,
    fontFamily: fontFamilies.inter.semibold,
  },
  termsErrorText: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.error,
    marginTop: 4,
    marginLeft: 32,
  },
  cta: { marginTop: 16, marginBottom: 32, width: '100%' },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  footerMuted: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    lineHeight: 18,
    color: colors.onboardingTitle,
  },
  footerLink: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.primary,
  },
});
