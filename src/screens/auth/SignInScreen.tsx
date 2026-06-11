import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton, AppTextField, Icon, KeyboardFormScrollView } from '../../components/ui';
import { colors, fontFamilies, spacing } from '../../theme';
import { detectCredentialType, normalizeCredentialInput, validateCredential } from '../../utils';
import { useAppDispatch, useAppSelector, selectAuthStatus, selectAuthError } from '../../store/hooks';
import { loginThunk, clearError } from '../../store/slices/authSlice';
import type { IdentifierType } from '../../api/authTypes';
import { useToast } from '../../components/ui';

type Props = {
  onBack: () => void;
  onSignUp: () => void;
  /** Called after login API succeeds — navigate to OTP screen. */
  onSendOtp: (data: { identifier: string; identifierType: IdentifierType }) => void;
};

export function SignInScreen({ onBack, onSignUp, onSendOtp }: Props) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const apiStatus = useAppSelector(selectAuthStatus);
  const apiError = useAppSelector(selectAuthError);

  const [credential, setCredential] = useState('');
  const [credentialError, setCredentialError] = useState<string | null>(null);

  const submitting = apiStatus === 'loading';
  const canSubmit = useMemo(() => !validateCredential(credential), [credential]);

  // Clear Redux error when screen unmounts
  useEffect(() => () => { dispatch(clearError()); }, [dispatch]);

  // Show API errors as a toast
  const { showToast } = useToast();
  useEffect(() => {
    if (apiError) showToast({ message: apiError, type: 'error', duration: 5_000 });
  }, [apiError, showToast]);

  const submit = async () => {
    const err = validateCredential(credential);
    setCredentialError(err);
    if (err) return;

    const type = detectCredentialType(credential);
    const identifierType: IdentifierType = type === 'phone' ? 'phone' : 'email';

    const result = await dispatch(loginThunk({ identifier: credential, identifierType }));

    if (loginThunk.fulfilled.match(result)) {
      onSendOtp({ identifier: credential, identifierType });
    }
    // On rejection, apiError is shown below the button
  };

  return (
    <KeyboardFormScrollView
      style={styles.flex}
      keyboardVerticalOffset={8}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
    >
        <View style={styles.topNav}>
          <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
            <Icon name="arrow-left-01" width={20} height={20} />
          </Pressable>
          <View style={styles.topNavSpacer} />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>Enter your phone number or email and we'll send you a one-time code.</Text>
        </View>

        <AppTextField
          label="Phone or Email"
          leftIconName="smart-phone-02"
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

        <AppButton
          title="Send OTP"
          onPress={submit}
          loading={submitting}
          disabled={!canSubmit}
          containerStyle={styles.cta}
        />

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Not a member yet? </Text>
          <Pressable onPress={onSignUp}>
            <Text style={styles.footerLink}>Sign Up</Text>
          </Pressable>
        </View>
    </KeyboardFormScrollView>
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
  apiError: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 13,
    lineHeight: 18,
    color: '#D32F2F',
    textAlign: 'center',
    marginTop: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 32,
  },
  footerText: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    lineHeight: 18,
    marginRight: 4,
    color: colors.placeholderText,
  },
  footerLink: {
    fontFamily: fontFamilies.inter.medium,
    fontSize: 14,
    lineHeight: 18,
    color: colors.primary,
  },
});
