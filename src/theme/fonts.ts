import { Platform, type TextStyle } from 'react-native';

const interRegular = require('../../assets/fonts/Inter_18pt-Regular.ttf');
const interMedium = require('../../assets/fonts/Inter_18pt-Medium.ttf');
const interSemiBold = require('../../assets/fonts/Inter_18pt-SemiBold.ttf');
const interBold = require('../../assets/fonts/Inter_18pt-Bold.ttf');
const manropeRegular = require('../../assets/fonts/Manrope-Regular.ttf');
const manropeMedium = require('../../assets/fonts/Manrope-Medium.ttf');
const manropeSemiBold = require('../../assets/fonts/Manrope-SemiBold.ttf');
const manropeBold = require('../../assets/fonts/Manrope-Bold.ttf');
const nunitoSansRegular = require('../../assets/fonts/NunitoSans-Regular.ttf');
const nunitoSansMedium = require('../../assets/fonts/NunitoSans-Medium.ttf');
const nunitoSansSemiBold = require('../../assets/fonts/NunitoSans-SemiBold.ttf');
const nunitoSansBold = require('../../assets/fonts/NunitoSans-Bold.ttf');
const nunitoSansExtraBold = require('../../assets/fonts/NunitoSans-ExtraBold.ttf');

/** iOS uses PostScript names; Android embedded fonts use the file name (without .ttf). */
function fontFace(ios: string, android: string = ios): string {
  return Platform.select({ android, default: ios }) as string;
}

/**
 * Register every alias used in styles on either platform.
 * Inter needs two aliases because iOS PostScript ≠ Android file name.
 */
export const appFontSources = {
  // Inter — iOS PostScript names
  'Inter18pt-Regular': interRegular,
  'Inter18pt-Medium': interMedium,
  'Inter18pt-SemiBold': interSemiBold,
  'Inter18pt-Bold': interBold,
  // Inter — Android file-name aliases
  'Inter_18pt-Regular': interRegular,
  'Inter_18pt-Medium': interMedium,
  'Inter_18pt-SemiBold': interSemiBold,
  'Inter_18pt-Bold': interBold,

  'Manrope-Regular': manropeRegular,
  'Manrope-Medium': manropeMedium,
  'Manrope-SemiBold': manropeSemiBold,
  'Manrope-Bold': manropeBold,

  'NunitoSans-Regular': nunitoSansRegular,
  'NunitoSans-Medium': nunitoSansMedium,
  'NunitoSans-SemiBold': nunitoSansSemiBold,
  'NunitoSans-Bold': nunitoSansBold,
  'NunitoSans-ExtraBold': nunitoSansExtraBold,
} as const;

/**
 * `fontFamily` values for `Text` / `TextInput` styles.
 * Each weight is a separate face (required on React Native).
 */
export const fontFamily = {
  extrabold: fontFace('Manrope-Bold'),
  bold: fontFace('Manrope-Bold'),
  semibold: fontFace('Manrope-SemiBold'),
  medium: fontFace('Manrope-Medium'),
  regular: fontFace('Manrope-Regular'),
  /** Back-compat alias (older code used `normal`). */
  normal: fontFace('Manrope-Regular'),
} as const;

/** Nunito Sans styles — spread into StyleSheet entries (`...nunitoSans.medium`). */
export const nunitoSans = {
  extrabold: { fontFamily: fontFace('NunitoSans-ExtraBold') },
  bold: { fontFamily: fontFace('NunitoSans-Bold') },
  semibold: { fontFamily: fontFace('NunitoSans-SemiBold') },
  medium: { fontFamily: fontFace('NunitoSans-Medium') },
  regular: { fontFamily: fontFace('NunitoSans-Regular') },
} as const satisfies Record<string, TextStyle>;

/** Explicit family selection for places Figma uses Inter / Nunito Sans. */
export const fontFamilies = {
  manrope: {
    extrabold: fontFace('Manrope-Bold'),
    bold: fontFace('Manrope-Bold'),
    semibold: fontFace('Manrope-SemiBold'),
    medium: fontFace('Manrope-Medium'),
    regular: fontFace('Manrope-Regular'),
  },
  inter: {
    extrabold: fontFace('Inter18pt-Bold', 'Inter_18pt-Bold'),
    bold: fontFace('Inter18pt-Bold', 'Inter_18pt-Bold'),
    semibold: fontFace('Inter18pt-SemiBold', 'Inter_18pt-SemiBold'),
    medium: fontFace('Inter18pt-Medium', 'Inter_18pt-Medium'),
    regular: fontFace('Inter18pt-Regular', 'Inter_18pt-Regular'),
  },
  nunitoSans: {
    extrabold: fontFace('NunitoSans-ExtraBold'),
    bold: fontFace('NunitoSans-Bold'),
    semibold: fontFace('NunitoSans-SemiBold'),
    medium: fontFace('NunitoSans-Medium'),
    regular: fontFace('NunitoSans-Regular'),
  },
} as const;

export type FontWeightName = keyof typeof fontFamily;
export type FontFamilyName = keyof typeof fontFamilies;
