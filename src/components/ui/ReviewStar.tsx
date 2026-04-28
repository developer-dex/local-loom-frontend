import { memo } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/** Path from `assets/icons/star.svg` — filled = gold, unfilled = outline only. */
const STAR_PATH =
  'M9.82987 0.542969L12.6994 6.35634L19.1164 7.29428L14.4731 11.8168L15.569 18.206L9.82987 15.1878L4.09079 18.206L5.1866 11.8168L0.543335 7.29428L6.96033 6.35634L9.82987 0.542969Z';

const GOLD = '#E7B66B';
const OUTLINE = '#D0D0D0';

export type ReviewStarProps = {
  filled: boolean;
  size?: number;
};

export const ReviewStar = memo(function ReviewStar({ filled, size = 36 }: ReviewStarProps) {
  const h = (size * 19) / 20;
  return (
    <Svg width={size} height={h} viewBox="0 0 20 19" accessibilityElementsHidden>
      <Path
        d={STAR_PATH}
        fill={filled ? GOLD : 'none'}
        stroke={filled ? GOLD : OUTLINE}
        strokeWidth={1.08668}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
});

/** Left half of a filled star (for aggregate ratings like 4.2). */
export const ReviewStarHalf = memo(function ReviewStarHalf({ size = 22 }: { size?: number }) {
  const h = (size * 19) / 20;
  return (
    <View style={{ width: size / 2, height: h, overflow: 'hidden' }}>
      <ReviewStar filled size={size} />
    </View>
  );
});
