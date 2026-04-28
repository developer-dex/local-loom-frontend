import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '../ui/Icon';
import { colors, fontFamilies } from '../../theme';

export type ProfileMenuRowProps = {
  icon: IconName;
  label: string;
  onPress?: () => void;
  /** Render a thin divider above the row (used to stack rows in a single card). */
  showBorderTop?: boolean;
  iconColor?: string;
  labelColor?: string;
};

export const ProfileMenuRow = memo(function ProfileMenuRow({
  icon,
  label,
  onPress,
  showBorderTop,
  iconColor = '#252525',
  labelColor = '#333030',
}: ProfileMenuRowProps) {
  return (
    <View>
      {showBorderTop ? <View style={styles.divider} /> : null}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <View style={styles.iconWrap}>
          <Icon name={icon} width={24} height={24} color={iconColor} />
        </View>
        <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E9F0F7',
    borderRadius: 34,
    marginVertical: 8,
  },
  pressed: {
    opacity: 0.6,
  },
  iconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontFamily: fontFamilies.inter.medium,
    fontSize: 16,
    lineHeight: 24,
    color: colors.onboardingTitle,
  },
});
