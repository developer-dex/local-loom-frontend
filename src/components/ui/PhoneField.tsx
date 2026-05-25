/**
 * PhoneField — Australian mobile/landline input (+61).
 *
 *   <PhoneField
 *     label="Phone number"
 *     value={phone}           // E.164 e.g. "+61412345678"
 *     onChangePhone={setPhone}
 *     error={phoneError ?? undefined}
 *   />
 */
import { useMemo } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useKeyboardFormScrollOnFocus } from './KeyboardFormScrollView';
import {
  AU_PHONE_DIAL_CODE,
  AU_PHONE_E164_MAX_LENGTH,
  AU_PHONE_LOCAL_MAX_DIGITS,
  normalizeAustralianPhone,
} from '../../utils/validation';
import { colors, fontFamilies, spacing } from '../../theme';

export type Country = {
  code: string;
  name: string;
  dial: string;
  flag: string;
};

/** Kept for compatibility; app uses Australia only. */
export const COUNTRIES: Country[] = [
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
];

const AU_COUNTRY = COUNTRIES[0];

function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

/** Local digits after +61 from E.164 value. */
function localFromE164(e164: string): string {
  if (e164.startsWith(AU_PHONE_DIAL_CODE)) {
    return e164.slice(AU_PHONE_DIAL_CODE.length);
  }
  const normalized = normalizeAustralianPhone(e164);
  if (normalized.startsWith(AU_PHONE_DIAL_CODE)) {
    return normalized.slice(AU_PHONE_DIAL_CODE.length);
  }
  return digitsOnly(e164).replace(/^61/, '').slice(0, AU_PHONE_LOCAL_MAX_DIGITS);
}

export type PhoneFieldProps = {
  label?: string;
  /** Full E.164 value (e.g. "+61412345678"). Controlled. */
  value: string;
  onChangePhone: (e164: string) => void;
  error?: string;
  placeholder?: string;
};

export function PhoneField({
  label = 'Phone number',
  value,
  onChangePhone,
  error,
  placeholder = '412 345 678',
}: PhoneFieldProps) {
  const localValue = useMemo(() => localFromE164(value), [value]);
  const handlePhoneFocus = useKeyboardFormScrollOnFocus();

  const handleLocalChange = (raw: string) => {
    const digits = digitsOnly(raw).slice(0, AU_PHONE_LOCAL_MAX_DIGITS);
    onChangePhone(digits ? `${AU_PHONE_DIAL_CODE}${digits}` : AU_PHONE_DIAL_CODE);
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={[styles.inputWrap, error ? styles.inputError : null]}>
        <View style={styles.prefix} accessibilityLabel={`Country code ${AU_COUNTRY.dial}, Australia`}>
          <Text style={styles.flag}>{AU_COUNTRY.flag}</Text>
          <Text style={styles.dialCode}>{AU_COUNTRY.dial}</Text>
        </View>

        <View style={styles.divider} />

        <TextInput
          style={styles.input}
          value={localValue}
          onChangeText={handleLocalChange}
          onFocus={handlePhoneFocus}
          keyboardType="phone-pad"
          autoComplete="tel"
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          accessibilityLabel={label}
          maxLength={AU_PHONE_LOCAL_MAX_DIGITS}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: {
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
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  inputError: { borderColor: colors.error },
  prefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 4,
  },
  flag: { fontSize: 20 },
  dialCode: {
    fontFamily: fontFamilies.inter.medium,
    fontSize: 15,
    color: colors.onboardingTitle,
    minWidth: 36,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: 10,
  },
  input: {
    flex: 1,
    fontFamily: fontFamilies.inter.regular,
    fontSize: 16,
    color: colors.onboardingTitle,
  },
  error: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 12,
    color: colors.error,
  },
});
