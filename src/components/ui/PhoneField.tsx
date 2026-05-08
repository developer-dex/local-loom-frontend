/**
 * PhoneField — phone number input with a country code prefix picker.
 *
 * - Tapping the flag/dial-code prefix opens a modal with a searchable country list.
 * - The full E.164 number (e.g. "+61412345678") is passed to `onChangePhone`.
 * - Defaults to Australia (+61).
 *
 * Usage:
 *   <PhoneField
 *     label="Phone number"
 *     value={phone}           // E.164 string
 *     onChangePhone={setPhone}
 *     error={phoneError ?? undefined}
 *   />
 */
import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Icon } from './Icon';
import { colors, fontFamilies, spacing } from '../../theme';

// ─── Country data ─────────────────────────────────────────────────────────────

export type Country = {
  code: string;   // ISO 3166-1 alpha-2
  name: string;
  dial: string;   // e.g. "+61"
  flag: string;   // emoji flag
};

export const COUNTRIES: Country[] = [
  { code: 'AU', name: 'Australia',          dial: '+61',  flag: '🇦🇺' },
  { code: 'US', name: 'United States',      dial: '+1',   flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom',     dial: '+44',  flag: '🇬🇧' },
  { code: 'IN', name: 'India',              dial: '+91',  flag: '🇮🇳' },
  { code: 'NZ', name: 'New Zealand',        dial: '+64',  flag: '🇳🇿' },
  { code: 'CA', name: 'Canada',             dial: '+1',   flag: '🇨🇦' },
  { code: 'SG', name: 'Singapore',          dial: '+65',  flag: '🇸🇬' },
  { code: 'PH', name: 'Philippines',        dial: '+63',  flag: '🇵🇭' },
  { code: 'MY', name: 'Malaysia',           dial: '+60',  flag: '🇲🇾' },
  { code: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪' },
  { code: 'ZA', name: 'South Africa',       dial: '+27',  flag: '🇿🇦' },
  { code: 'NG', name: 'Nigeria',            dial: '+234', flag: '🇳🇬' },
  { code: 'PK', name: 'Pakistan',           dial: '+92',  flag: '🇵🇰' },
  { code: 'BD', name: 'Bangladesh',         dial: '+880', flag: '🇧🇩' },
  { code: 'LK', name: 'Sri Lanka',          dial: '+94',  flag: '🇱🇰' },
  { code: 'DE', name: 'Germany',            dial: '+49',  flag: '🇩🇪' },
  { code: 'FR', name: 'France',             dial: '+33',  flag: '🇫🇷' },
  { code: 'IT', name: 'Italy',              dial: '+39',  flag: '🇮🇹' },
  { code: 'JP', name: 'Japan',              dial: '+81',  flag: '🇯🇵' },
  { code: 'CN', name: 'China',              dial: '+86',  flag: '🇨🇳' },
  { code: 'KR', name: 'South Korea',        dial: '+82',  flag: '🇰🇷' },
  { code: 'ID', name: 'Indonesia',          dial: '+62',  flag: '🇮🇩' },
  { code: 'TH', name: 'Thailand',           dial: '+66',  flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam',            dial: '+84',  flag: '🇻🇳' },
  { code: 'BR', name: 'Brazil',             dial: '+55',  flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico',             dial: '+52',  flag: '🇲🇽' },
  { code: 'AR', name: 'Argentina',          dial: '+54',  flag: '🇦🇷' },
  { code: 'EG', name: 'Egypt',              dial: '+20',  flag: '🇪🇬' },
  { code: 'KE', name: 'Kenya',              dial: '+254', flag: '🇰🇪' },
  { code: 'GH', name: 'Ghana',              dial: '+233', flag: '🇬🇭' },
];

const DEFAULT_COUNTRY = COUNTRIES[0]; // Australia

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip all non-digit characters from a string. */
function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

/** Build E.164 from dial code + local digits. */
function toE164(dial: string, local: string): string {
  const d = digitsOnly(local);
  if (!d) return '';
  return `${dial}${d}`;
}

/** Extract local digits from an E.164 string given a dial code. */
function localFromE164(e164: string, dial: string): string {
  if (e164.startsWith(dial)) return e164.slice(dial.length);
  // If it starts with + but different code, strip the + and return as-is
  if (e164.startsWith('+')) return digitsOnly(e164.slice(1));
  return digitsOnly(e164);
}

// ─── Component ────────────────────────────────────────────────────────────────

export type PhoneFieldProps = {
  label?: string;
  /** Full E.164 value (e.g. "+61412345678"). Controlled. */
  value: string;
  /** Called with the full E.164 string on every change. */
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
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Derive the local (subscriber) part from the E.164 value
  const localValue = useMemo(
    () => localFromE164(value, country.dial),
    [value, country.dial],
  );

  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [search]);

  const handleLocalChange = (raw: string) => {
    const digits = digitsOnly(raw);
    onChangePhone(toE164(country.dial, digits));
  };

  const handleSelectCountry = (c: Country) => {
    setCountry(c);
    setPickerOpen(false);
    setSearch('');
    // Rebuild E.164 with new dial code, keeping existing local digits
    onChangePhone(toE164(c.dial, localValue));
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={[styles.inputWrap, error ? styles.inputError : null]}>
        {/* Country code prefix button */}
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={styles.prefix}
          accessibilityRole="button"
          accessibilityLabel={`Country code ${country.dial}, ${country.name}`}
          hitSlop={8}
        >
          <Text style={styles.flag}>{country.flag}</Text>
          <Text style={styles.dialCode}>{country.dial}</Text>
          <Icon name="arrow-down-01" width={14} height={14} color={colors.label} />
        </Pressable>

        <View style={styles.divider} />

        <TextInput
          style={styles.input}
          value={localValue}
          onChangeText={handleLocalChange}
          keyboardType="phone-pad"
          autoComplete="tel"
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          accessibilityLabel={label}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Country picker modal */}
      <Modal
        visible={pickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerOpen(false)}
      >
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Country</Text>
            <Pressable onPress={() => setPickerOpen(false)} hitSlop={12}>
              <Icon name="cancel-01" width={22} height={22} color={colors.onboardingTitle} />
            </Pressable>
          </View>

          {/* Search */}
          <View style={styles.searchWrap}>
            <Icon name="search-01" width={18} height={18} color={colors.placeholder} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search country or code..."
              placeholderTextColor={colors.placeholder}
              autoFocus
              returnKeyType="search"
            />
          </View>

          <FlatList
            data={filteredCountries}
            keyExtractor={(c) => c.code}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.countryRow,
                  item.code === country.code && styles.countryRowSelected,
                  pressed && styles.countryRowPressed,
                ]}
                onPress={() => handleSelectCountry(item)}
                accessibilityRole="button"
                accessibilityState={{ selected: item.code === country.code }}
              >
                <Text style={styles.countryFlag}>{item.flag}</Text>
                <Text style={styles.countryName}>{item.name}</Text>
                <Text style={styles.countryDial}>{item.dial}</Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={styles.noResults}>No countries found.</Text>
            }
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  // Modal
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 17,
    color: colors.onboardingTitle,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 16,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamilies.inter.regular,
    fontSize: 15,
    color: colors.onboardingTitle,
    padding: 0,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  countryRowSelected: { backgroundColor: 'rgba(245,142,131,0.08)' },
  countryRowPressed: { backgroundColor: colors.surface },
  countryFlag: { fontSize: 24, width: 32 },
  countryName: {
    flex: 1,
    fontFamily: fontFamilies.inter.regular,
    fontSize: 15,
    color: colors.onboardingTitle,
  },
  countryDial: {
    fontFamily: fontFamilies.inter.medium,
    fontSize: 14,
    color: colors.label,
    minWidth: 44,
    textAlign: 'right',
  },
  noResults: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    color: colors.label,
    textAlign: 'center',
    marginTop: 32,
  },
});
