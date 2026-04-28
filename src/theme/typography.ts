/** Type scale — tune to match Figma text styles when you sync tokens. */
export const fontSize = {
  xxs: 10,
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  title: 28,
  display: 34,
  hero: 40,
} as const;

export type FontSizeName = keyof typeof fontSize;

/** Line heights paired by key with `fontSize`. */
export const lineHeight = {
  xxs: 14,
  xs: 16,
  sm: 20,
  md: 22,
  lg: 24,
  xl: 28,
  xxl: 32,
  title: 36,
  display: 42,
  hero: 48,
} as const;
