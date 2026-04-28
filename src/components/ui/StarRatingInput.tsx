import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ReviewStar } from './ReviewStar';

export type StarRatingInputProps = {
  value: number;
  onChange: (stars: number) => void;
  starSize?: number;
  gap?: number;
};

/** Interactive 1–5 stars; `value` 0 = none selected (all outline). */
export const StarRatingInput = memo(function StarRatingInput({
  value,
  onChange,
  starSize = 40,
  gap = 10,
}: StarRatingInputProps) {
  return (
    <View style={[styles.row, { gap }]}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
          accessibilityState={{ selected: n <= value }}
          onPress={() => onChange(n)}
        >
          <ReviewStar filled={n <= value} size={starSize} />
        </Pressable>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
