/** LocalLoom UI tokens — align with Figma (LocalLoom Dev). */
export const colors = {
  background: '#FFFFFF',
  surface: '#FAFAFA',
  textPrimary: '#1A1A1A',
  placeholderText: '#81838A',
  textSecondary: '#6B6B6B',
  textMuted: '#9A9A9A',
  /** Figma Primary */
  primary: '#F58E83',
  primaryPressed: '#E07A6F',
  border: '#DCE0E3',
  error: '#C62828',
  success: '#2E7D32',
  /** Onboarding text (Figma colors/gray) */
  onboardingTitle: '#252525',
  onboardingBody: '#4E5059',
  label: '#808080',
  placeholder: '#717171',
  skipLabel: '#717171',
  onPrimary: '#FFFFFF',
  cardBorder: '#EEEEEE',
  searchColor:"#9C9C9C",
  red:"#C62828",
} as const;

export type ColorName = keyof typeof colors;
