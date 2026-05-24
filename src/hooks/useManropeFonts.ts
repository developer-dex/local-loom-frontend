import { useFonts } from 'expo-font';
import { appFontSources } from '../theme';

/** Loads app fonts from `assets/fonts` (Manrope, Inter, Nunito Sans) on iOS and Android. */
export function useManropeFonts(): readonly [boolean, Error | null] {
  return useFonts(appFontSources);
}
