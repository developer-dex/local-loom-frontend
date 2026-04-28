import type { TextStyle } from 'react-native';
import { colors, type ColorName } from './colors';
import { fontFamily, type FontWeightName } from './fonts';
import { fontSize, lineHeight, type FontSizeName } from './typography';

export type { ColorName, FontSizeName, FontWeightName };

export type TextStyleOptions = {
  weight: FontWeightName;
  size: FontSizeName;
  color: ColorName;
  /** Override default line height for this size. */
  lineHeight?: number;
  letterSpacing?: number;
};

/** Builds a `TextStyle` from tokens — use everywhere instead of ad-hoc font props. */
export function textStyle({
  weight,
  size,
  color,
  lineHeight: lineHeightOverride,
  letterSpacing,
}: TextStyleOptions): TextStyle {
  return {
    fontFamily: fontFamily[weight],
    fontSize: fontSize[size],
    lineHeight: lineHeightOverride ?? lineHeight[size],
    color: colors[color],
    ...(letterSpacing !== undefined ? { letterSpacing } : {}),
  };
}
