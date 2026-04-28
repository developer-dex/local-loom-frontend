import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton, AppTextField, Icon } from '../../components/ui';
import { colors, fontFamilies, spacing } from '../../theme';
import { sanitizePhone, validatePhone } from '../../utils';

type Props = {
  onBack: () => void;
  onSendOtp: (data: { phone: string }) => void;
};

export function SignInScreen({ onBack, onSendOtp }: Props) {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = useMemo(() => !validatePhone(phone), [phone]);

  const submit = () => {
    const pe = validatePhone(phone);
    setPhoneError(pe);
    if (pe) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onSendOtp({ phone });
    }, 250);
  };

  const onSignUp = onBack;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 8}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topNav}>
          <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
            <Icon name="arrow-left-01" width={20} height={20} />
          </Pressable>
          <View style={styles.topNavSpacer} />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>Enter your phone number and we’ll send you a one-time code.</Text>
        </View>

        <AppTextField
          label="Phone number"
          leftIconName="smart-phone-02"
          keyboardType="phone-pad"
          autoComplete="tel"
          value={phone}
          onChangeText={(raw) => {
            const { value, hadInvalid } = sanitizePhone(raw);
            setPhone(value);
            const vErr = validatePhone(value);
            setPhoneError(hadInvalid ? 'Only numbers are allowed.' : vErr);
          }}
          placeholder="Phone Number"
          error={phoneError ?? undefined}
        />

        <AppButton title="Send OTP" onPress={submit} loading={submitting} disabled={!canSubmit} containerStyle={styles.cta} />
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Not a member yet?
          </Text>
            <Pressable onPress={onSignUp}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    marginBottom: 12,
  },
  backBtn: {},
  topNavSpacer: { flex: 1 },
  header: { gap: spacing.sm, marginBottom: spacing.lg, alignItems: 'center' },
  title: { fontFamily: fontFamilies.inter.bold, fontSize: 24, lineHeight: 32, color: colors.onboardingTitle, textAlign: 'center' },
  subtitle: { fontFamily: fontFamilies.inter.regular, fontSize: 14, lineHeight: 18, color: colors.placeholder, textAlign: 'center', maxWidth: 320 },
  cta: { marginTop: 32 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 32,
  },
  footerText: { fontFamily: fontFamilies.inter.regular, 
    fontSize: 14, lineHeight: 18, 
    marginRight: 6,
    color: colors.placeholderText },
  footerLink: {
    fontFamily: fontFamilies.inter.medium,
    fontSize: 14,
    lineHeight: 18, color: colors.primary,
  },
});

