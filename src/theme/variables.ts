import { colors } from './colors';
import { appFontSources, fontFamily } from './fonts';
import { fontSize, lineHeight } from './typography';
import { spacing } from './spacing';

/**
 * Single import surface for design tokens (colors, type, spacing).
 * Figma: https://www.figma.com/design/yq6JD6zepT0uFE5XFuPRpw/LocalLoom--Dev-?node-id=0-1
 */
export const variables = {
  colors,
  spacing,
  font: {
    family: fontFamily,
    size: fontSize,
    lineHeight,
    /** Use with `useFonts` from `expo-font` at app startup. */
    sources: appFontSources,
  },
} as const;
