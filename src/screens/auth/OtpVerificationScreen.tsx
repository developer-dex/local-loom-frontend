import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton, Icon } from '../../components/ui';
import { colors, fontFamilies, spacing } from '../../theme';
import { useAppDispatch, useAppSelector, selectAuthStatus, selectAuthError } from '../../store/hooks';
import { verifyOtpThunk, clearError } from '../../store/slices/authSlice';
import type { IdentifierType } from '../../api/authTypes';
import { useToast } from '../../components/ui';

type Props = {
  /** The raw identifier (phone or email) used in signup/login. */
  identifier: string;
  identifierType: IdentifierType;
  /** Display-friendly version (masked or plain). Shown in the subtitle. */
  displayIdentifier?: string;
  onBack: () => void;
  /** Called after OTP is verified and user is stored in Redux. */
  onVerified: () => void;
  onResend?: () => void;
};

// API requires exactly 6-digit OTP
const OTP_LEN = 6;
const RESEND_SECONDS = 59;

/** Pure helper: derives the destination string shown in the OTP subtitle. */
export function deriveOtpDestination(displayIdentifier?: string, identifier?: string): string {
  return displayIdentifier ?? identifier ?? 'your contact';
}

export function OtpVerificationScreen({
  identifier,
  identifierType,
  displayIdentifier,
  onBack,
  onVerified,
  onResend,
}: Props) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const apiStatus = useAppSelector(selectAuthStatus);
  const apiError = useAppSelector(selectAuthError);

  const inputRef = useRef<TextInput>(null);
  const [otp, setOtp] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [resendLeft, setResendLeft] = useState(RESEND_SECONDS);
  const caretOpacity = useRef(new Animated.Value(1)).current;

  const submitting = apiStatus === 'loading';
  const canSubmit = useMemo(() => otp.length === OTP_LEN && !submitting, [otp, submitting]);

  // Clear Redux error when screen unmounts
  useEffect(() => () => { dispatch(clearError()); }, [dispatch]);

  // Show API errors as a toast
  const { showToast } = useToast();
  useEffect(() => {
    if (apiError) showToast({ message: apiError, type: 'error', duration: 5_000 });
  }, [apiError, showToast]);

  useEffect(() => {
    setResendLeft(RESEND_SECONDS);
  }, [identifier]);

  useEffect(() => {
    if (resendLeft <= 0) return;
    const t = setInterval(() => setResendLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendLeft]);

  useEffect(() => {
    if (!isFocused) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(caretOpacity, { toValue: 0, duration: 520, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(caretOpacity, { toValue: 1, duration: 520, easing: Easing.linear, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => { anim.stop(); caretOpacity.setValue(1); };
  }, [caretOpacity, isFocused]);

  const onChange = (raw: string) => {
    setOtp(raw.replace(/[^\d]/g, '').slice(0, OTP_LEN));
  };

  const submit = async () => {
    Keyboard.dismiss();
    if (otp.length !== OTP_LEN) return;

    const result = await dispatch(verifyOtpThunk({ identifier, identifierType, code: otp }));
    if (verifyOtpThunk.fulfilled.match(result)) {
      onVerified();
    }
  };

  const resend = () => {
    setOtp('');
    setResendLeft(RESEND_SECONDS);
    onResend?.();
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const resendTime = useMemo(() => {
    const m = Math.floor(resendLeft / 60);
    const s = resendLeft % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }, [resendLeft]);

  const destination = deriveOtpDestination(displayIdentifier, identifier);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
      <View style={styles.topNav}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
          <Icon name="arrow-left-01" width={20} height={20} />
        </Pressable>
        <View style={styles.topNavSpacer} />
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>OTP Verification</Text>
        <Text style={styles.subtitle}>OTP has been sent to {destination}.</Text>
      </View>

      <Pressable
        style={styles.otpRow}
        onPress={() => inputRef.current?.focus()}
        accessibilityRole="button"
        accessibilityLabel="Enter verification code"
      >
        {Array.from({ length: OTP_LEN }).map((_, i) => {
          const ch = otp[i] ?? '';
          const isActive = isFocused && i === Math.min(otp.length, OTP_LEN - 1) && otp.length < OTP_LEN;
          return (
            <View key={i} style={[styles.otpCell, isActive && styles.otpCellActive]}>
              {ch ? (
                <Text style={styles.otpChar}>{ch}</Text>
              ) : isActive ? (
                <Animated.View style={[styles.caret, { opacity: caretOpacity }]} />
              ) : (
                <Text style={styles.otpChar}>{' '}</Text>
              )}
            </View>
          );
        })}
      </Pressable>

      <TextInput
        ref={inputRef}
        value={otp}
        onChangeText={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        caretHidden
        selectionColor="transparent"
        contextMenuHidden
        style={styles.hiddenInput}
      />

      <AppButton title="Verify" onPress={submit} loading={submitting} disabled={!canSubmit} containerStyle={styles.cta} />

      {resendLeft > 0 ? (
        <Text style={styles.resendCountdown}>
          Resend code in <Text style={styles.resendCountdownTime}>{resendTime}</Text>
        </Text>
      ) : (
        <Pressable onPress={resend} hitSlop={8} style={styles.resend}>
          <Text style={styles.resendText}>Resend code</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  topNav: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backBtn: {},
  topNavSpacer: { flex: 1 },
  header: { gap: spacing.sm, marginBottom: 24, alignItems: 'center' },
  title: { fontFamily: fontFamilies.inter.bold, fontSize: 24, lineHeight: 32, color: colors.onboardingTitle, textAlign: 'center' },
  subtitle: { fontFamily: fontFamilies.inter.regular, fontSize: 14, lineHeight: 18, color: colors.placeholder, textAlign: 'center', maxWidth: 320 },
  otpRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 12 },
  otpCell: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  otpCellActive: { borderColor: colors.primary },
  otpChar: { fontFamily: fontFamilies.inter.regular, fontSize: 16, color: colors.onboardingTitle },
  caret: { width: 2, height: 22, borderRadius: 2, backgroundColor: colors.onboardingTitle },
  hiddenInput: { position: 'absolute', left: -1000, top: -1000, width: 1, height: 1, opacity: 0 },
  cta: { marginTop: 12 },
  apiError: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 13,
    lineHeight: 18,
    color: '#D32F2F',
    textAlign: 'center',
    marginTop: 8,
  },
  resend: { alignSelf: 'center', marginTop: 14 },
  resendText: { fontFamily: fontFamilies.inter.regular, color: colors.primary, fontSize: 14, lineHeight: 18 },
  resendCountdown: { alignSelf: 'center', marginTop: 18, fontFamily: fontFamilies.inter.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  resendCountdownTime: { color: colors.primary, fontFamily: fontFamilies.inter.semibold },
});
