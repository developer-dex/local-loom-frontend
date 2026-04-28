import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import {
  NunitoSans_400Regular,
  NunitoSans_500Medium,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
  NunitoSans_800ExtraBold,
} from '@expo-google-fonts/nunito-sans';

export const appFontSources = {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  NunitoSans_400Regular,
  NunitoSans_500Medium,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
  NunitoSans_800ExtraBold,
} as const;

/**
 * `fontFamily` values for `Text` / `TextInput` styles.
 * Each weight is a separate face (required on React Native).
 */
export const fontFamily = {
  // Legacy default (Manrope) — keeps existing code working.
  extrabold: 'Manrope_800ExtraBold',
  bold: 'Manrope_700Bold',
  semibold: 'Manrope_600SemiBold',
  medium: 'Manrope_500Medium',
  regular: 'Manrope_400Regular',
  /** Back-compat alias (older code used `normal`). */
  normal: 'Manrope_400Regular',
} as const;

/** Explicit family selection for places Figma uses Inter / Nunito Sans. */
export const fontFamilies = {
  manrope: {
    extrabold: 'Manrope_800ExtraBold',
    bold: 'Manrope_700Bold',
    semibold: 'Manrope_600SemiBold',
    medium: 'Manrope_500Medium',
    regular: 'Manrope_400Regular',
  },
  inter: {
    extrabold: 'Inter_800ExtraBold',
    bold: 'Inter_700Bold',
    semibold: 'Inter_600SemiBold',
    medium: 'Inter_500Medium',
    regular: 'Inter_400Regular',
  },
  nunitoSans: {
    extrabold: 'NunitoSans_800ExtraBold',
    bold: 'NunitoSans_700Bold',
    semibold: 'NunitoSans_600SemiBold',
    medium: 'NunitoSans_500Medium',
    regular: 'NunitoSans_400Regular',
  },
} as const;

export type FontWeightName = keyof typeof fontFamily;
export type FontFamilyName = keyof typeof fontFamilies;
