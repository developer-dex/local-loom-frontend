import { memo } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '../ui/Icon';
import { colors, fontFamilies } from '../../theme';

const { width: SCREEN_W } = Dimensions.get('window');
const H_PAD = 20;
const GAP = 10;
/** Figma: 3-column category grid. */
const COLS = 3;
export const CATEGORY_TILE_W = (SCREEN_W - H_PAD * 2 - GAP * (COLS - 1)) / COLS;

/** Figma: neutral icon well (light gray), salmon/coral glyph. */
const ICON_WELL_BG = '#F0F0F0';

export type CategoryTileProps = {
  title: string;
  icon: IconName;
  serviceCount: number;
  onPress: () => void;
};

export const CategoryTile = memo(function CategoryTile({ title, icon, serviceCount, onPress }: CategoryTileProps) {
  const servicesLine = `${serviceCount} Services`;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { width: CATEGORY_TILE_W }, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${servicesLine}`}
    >
      <View style={styles.iconWrap}>
        <Icon name={icon} width={24} height={24} color={colors.primary} />
      </View>
      <Text style={styles.categoryName} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.servicesLine} numberOfLines={1}>
        {servicesLine}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    backgroundColor: colors.background,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#1B1B4D',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pressed: {
    opacity: 0.94,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: ICON_WELL_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontFamily: fontFamilies.nunitoSans.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onboardingTitle,
    textAlign: 'center',
  },
  servicesLine: {
    fontFamily: fontFamilies.nunitoSans.regular,
    fontSize: 11,
    lineHeight: 14,
    color: '#808080',
    textAlign: 'center',
  },
});
