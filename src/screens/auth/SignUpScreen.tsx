import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton, AppTextField, Icon, KeyboardFormScrollView } from '../../components/ui';
import { colors, fontFamilies, nunitoSans, spacing } from '../../theme';
import {
  AU_PHONE_E164_MAX_LENGTH,
  AU_PHONE_DIAL_CODE,
  sanitizeAustralianPhone,
  sanitizeEmail,
  sanitizeName,
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
  onContinue: (data: { role: Role; fullName: string; email: string; phone: string }) => void;
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
  const [mobile, setMobile] = useState(AU_PHONE_DIAL_CODE);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const submitting = apiStatus === 'loading';

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
    }
  };

  const canSubmit = useMemo(() => {
    if (!role) return false;
    if (!fullName.trim() || !email.trim() || !mobile.trim()) return false;
    if (validateName(fullName) || validateEmail(email) || validatePhone(mobile, { completeOnly: true }))
      return false;
    return true;
  }, [role, fullName, email, mobile]);

  const onSubmit = async () => {
    const ne = validateName(fullName);
    const ee = validateEmail(email);
    const pe = validatePhone(mobile, { completeOnly: true });
    setNameError(ne);
    setEmailError(ee);
    setPhoneError(pe);
    if (!role || ne || ee || pe) return;

    const result = await dispatch(
      signupThunk({
        role,
        fullName: fullName.trim(),
        email,
        phone: mobile,
        profilePhotoUri: photoUri ?? undefined,
      }),
    );

    if (signupThunk.fulfilled.match(result)) {
      onContinue({ role, fullName: fullName.trim(), email, phone: mobile });
    }
  };

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
              <View style={styles.avatarPlaceholder}>
                <Icon name="user-03" width={32} height={32} color={colors.placeholder} />
              </View>
            )}
            {/* Camera badge */}
            <View style={styles.cameraBadge}>
              <Icon name="add-01" width={14} height={14} color={colors.onPrimary} />
            </View>
          </Pressable>
          <Text style={styles.avatarHint}>
            {photoUri ? 'Tap to change photo' : 'Add profile photo (optional)'}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Choose Your Role</Text>
        <View style={styles.roleRow}>
          <RoleTile
            label="Tradies"
            image={tradieArt}
            selected={role === 'tradie'}
            onPress={() => setRole('tradie')}
          />
          <RoleTile
            label="Customers"
            image={customerArt}
            selected={role === 'customer'}
            onPress={() => setRole('customer')}
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
          <AppTextField
            label="Email"
            leftIconName="mail-01"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={(raw) => {
              const { value, hadInvalid } = sanitizeEmail(raw);
              setEmail(value);
              const vErr = validateEmail(value);
              setEmailError(hadInvalid ? 'Email cannot have leading or trailing spaces.' : vErr);
            }}
            placeholder="you@example.com"
            error={emailError ?? undefined}
          />
          <AppTextField
            label="Phone number"
            leftIconName="smart-phone-02"
            keyboardType="phone-pad"
            autoComplete="tel"
            value={mobile}
            onChangeText={(raw) => {
              const { value, hadInvalid } = sanitizeAustralianPhone(raw);
              setMobile(value || AU_PHONE_DIAL_CODE);
              const err = validatePhone(value || AU_PHONE_DIAL_CODE);
              setPhoneError(
                hadInvalid ? 'Use digits only (Australian format, e.g. 0412 345 678).' : err,
              );
            }}
            maxLength={AU_PHONE_E164_MAX_LENGTH}
            placeholder="Phone number"
            error={phoneError ?? undefined}
          />
        </View>

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

        <Text style={styles.legal}>
          By entering your number, you're agreeing to our{' '}
          <Text style={styles.legalLink}>Terms & Conditions</Text> and{' '}
          <Text style={styles.legalLink}>Privacy Policy</Text>
        </Text>
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
  tile: { width: 85, alignItems: 'center', gap: spacing.sm, paddingVertical: 0 },
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
  },
  tileLabelSelected: { color: colors.onboardingTitle, fontFamily: fontFamilies.inter.semibold },
  // ── Fields ─────────────────────────────────────────────────────────────────
  fields: { gap: spacing.md, marginBottom: 24 },
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
  legal: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 11,
    lineHeight: 16,
    color: colors.onboardingTitle,
    textAlign: 'center',
    maxWidth: 320,
  },
  legalLink: { color: '#1B70F3', textDecorationLine: 'underline' },
});
