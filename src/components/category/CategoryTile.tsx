import { memo, useMemo } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { RemoteImage } from '../ui/RemoteImage';
import { Icon, type IconName } from '../ui/Icon';
import { colors, nunitoSans } from '../../theme';
import { resolveMediaUrl } from '../../utils/mediaUrl';

const { width: SCREEN_W } = Dimensions.get('window');
const H_PAD = 20;
const GAP = 10;
const COLS = 3;
export const CATEGORY_TILE_W = (SCREEN_W - H_PAD * 2 - GAP * (COLS - 1)) / COLS;

const ICON_WELL_BG = '#F0F0F0';
const TILE_ICON = require('../../../assets/signup/customer.png');

export type CategoryTileProps = {
  title: string;
  /** Local icon name — used when no imageUri is available or image fails to load. */
  icon?: IconName;
  /** Remote image URL from the API. Takes priority over `icon`. */
  imageUri?: string | null;
  serviceCount?: number;
  onPress: () => void;
};

function CategoryIcon({ icon }: { icon?: IconName }) {
  return (
    <Icon
      name={icon ?? 'dashboard-square-02'}
      width={24}
      height={24}
      color={colors.primary}
    />
  );
}

export const CategoryTile = memo(function CategoryTile({
  title,
  icon,
  imageUri,
  serviceCount,
  onPress,
}: CategoryTileProps) {
  const servicesLine = serviceCount != null ? `${serviceCount} Services` : undefined;
  const resolvedUri = useMemo(
    () => resolveMediaUrl(imageUri) ?? (imageUri?.trim() ? imageUri.trim() : undefined),
    [imageUri],
  );

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { width: CATEGORY_TILE_W }, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={servicesLine ? `${title}, ${servicesLine}` : title}
    >
      <View style={styles.iconWrap}>
        {resolvedUri ? (
          <RemoteImage
            uri={resolvedUri}
            fallback={TILE_ICON}
            renderFallback={() => <CategoryIcon icon={icon} />}
            style={styles.image}
            containerStyle={styles.imageContainer}
            resizeMode="cover"
            accessibilityLabel={`${title} icon`}
          />
        ) : (
          <CategoryIcon icon={icon} />
        )}
      </View>
      <Text style={styles.categoryName} numberOfLines={2}>
        {title}
      </Text>
      {servicesLine && (
        <Text style={styles.servicesLine} numberOfLines={1}>
          {servicesLine}
        </Text>
      )}
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
    overflow: 'hidden',
  },
  imageContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: ICON_WELL_BG,
  },
  image: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  categoryName: {
    ...nunitoSans.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onboardingTitle,
    textAlign: 'center',
  },
  servicesLine: {
    ...nunitoSans.regular,
    fontSize: 11,
    lineHeight: 14,
    color: '#808080',
    textAlign: 'center',
  },
});
