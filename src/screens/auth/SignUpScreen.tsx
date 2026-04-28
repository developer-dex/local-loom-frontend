import { useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton, AppTextField, Icon } from '../../components/ui';
import { colors, fontFamilies, fontFamily, spacing } from '../../theme';
import { sanitizeName, sanitizePhone, validateName, validatePhone } from '../../utils';

const tradieArt = require('../../../assets/signup/tradie.png');
const customerArt = require('../../../assets/signup/customer.png');

type Role = 'tradie' | 'customer';

type Props = {
  onContinue: (data: { role: Role; fullName: string; phone: string }) => void;
  /** One step back in the stack (header chevron). */
  onBack: () => void;
  /** Open Sign In (footer link). */
  onSignIn: () => void;
  /** Skip create account and open home (guest). */
  onSkipToHome: () => void;
};

export function SignUpScreen({ onContinue, onBack, onSignIn, onSkipToHome }: Props) {
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState<Role | null>(null);
  const [mobile, setMobile] = useState('');
  const [fullName, setFullName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    if (!role) return false;
    if (!fullName.trim() || !mobile.trim()) return false;
    if (validateName(fullName) || validatePhone(mobile)) return false;
    return true;
  }, [role, fullName, mobile]);

  const onSubmit = () => {
    const ne = validateName(fullName);
    const pe = validatePhone(mobile);
    setNameError(ne);
    setPhoneError(pe);
    if (!role || ne || pe) return;

    setSubmitting(true);
    // Later: call API to send OTP, then navigate.
    setTimeout(() => {
      setSubmitting(false);
      onContinue({ role, fullName: fullName.trim(), phone: mobile });
    }, 250);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 8}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, spacing.lg) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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
            placeholder="Jack Withe"
            error={nameError ?? undefined}
          />
          <AppTextField
            label="Phone number"
            leftIconName="smart-phone-02"
            keyboardType="phone-pad"
            autoComplete="tel"
            value={mobile}
            onChangeText={(raw) => {
              const { value, hadInvalid } = sanitizePhone(raw);
              setMobile(value);
              const vErr = validatePhone(value);
              setPhoneError(hadInvalid ? 'Only numbers are allowed.' : vErr);
            }}
            placeholder="Phone Number"
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
          By entering your number, you’re agreeing to our{' '}
          <Text style={styles.legalLink}>Terms & Conditions</Text> and{' '}
          <Text style={styles.legalLink}>Privacy Policy</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
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
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: 20,
    width: '100%',
  },
  topNav: {
    // height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  backBtn: {
    // width: 40,
    // height: 40,
    // alignItems: 'center',
    // justifyContent: 'center',
  },
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
  sectionLabel: {
    fontFamily: fontFamilies.nunitoSans.semibold,
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
  tile: {
    width: 85,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 0,
  },
  tileSelected: {
    opacity: 1,
  },
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
  tileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 13,
    backgroundColor: '#F4F4F4',
  },
  tileLabel: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    lineHeight: 18,
    color: colors.onboardingTitle,
  },
  tileLabelSelected: {
    color: colors.onboardingTitle,
    fontFamily: fontFamilies.inter.semibold,
  },
  fields: {
    gap: spacing.md,
    marginBottom: 24,
  },
  cta: {
    marginTop: 16,
    marginBottom: 32,
    width: '100%',
  },
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
  legalLink: {
    color: '#1B70F3',
    textDecorationLine: 'underline',
  },
});
