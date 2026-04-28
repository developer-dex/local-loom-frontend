import { useFonts } from 'expo-font';
import { appFontSources } from '../theme';

/** Loads app fonts: Manrope + Inter + Nunito Sans (regular→extrabold). */
export function useManropeFonts(): readonly [boolean, Error | null] {
  return useFonts(appFontSources);
}
