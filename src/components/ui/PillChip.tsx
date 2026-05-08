import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamilies } from '../../theme';

// const shadowCard = {
//   shadowColor: '#1B1B4D' as const,
//   shadowOpacity: 0.04,
//   shadowRadius: 22.5,
//   shadowOffset: { width: 0, height: 2 } as const,
//   elevation: 2,
// };

export type PillChipProps = {
  label: string;
  /** `home`: Popular Categories (selectable). `detail`: service tags on provider detail (static). */
  variant: 'home' | 'detail';
  /** Only for `variant="home"` when using `onPress`. */
  selected?: boolean;
  /** Omit for static chips (detail services). */
  onPress?: () => void;
};

export const PillChip = memo(function PillChip({ label, variant, selected = false, onPress }: PillChipProps) {
  const isInteractive = typeof onPress === 'function';

  const shellStyle = [
    styles.shell,
    variant === 'home' ? styles.shellHome : styles.shellDetail,
    variant === 'home' && selected && styles.shellHomeSelected,
  ];

  const content = <Text style={styles.label}>{label}</Text>;

  if (isInteractive) {
    return (
      <Pressable
        onPress={onPress}
        style={shellStyle}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={shellStyle}>{content}</View>;
});

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 85,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    backgroundColor: colors.background,
    // ...shadowCard,
  },
  shellHome: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  shellDetail: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  shellHomeSelected: {
    backgroundColor: '#FFF0EF',
  },
  label: {
    fontFamily: fontFamilies.nunitoSans.medium,
    fontSize: 12,
    lineHeight: 16,
    color: '#4E4E4E',
  },
});
