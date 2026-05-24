import { memo, useMemo } from 'react';
import { Image, type ImageSourcePropType, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors, fontFamilies, nunitoSans } from '../../theme';

const DEFAULT_SCREEN_PADDING = 20;
const COLUMN_GAP = 12;
const TILE_RADIUS = 12;

export type WorkPhotoGridProps = {
  photos: ImageSourcePropType[];
  /** Horizontal padding from each screen edge (matches parent screen). Default 20. */
  screenEdgePadding?: number;
  /** Gap between tiles (row and column). Default 12. */
  gap?: number;
  /** Corner radius for each tile. Default 12. */
  borderRadius?: number;
};

export const WorkPhotoGrid = memo(function WorkPhotoGrid({
  photos,
  screenEdgePadding = DEFAULT_SCREEN_PADDING,
  gap = COLUMN_GAP,
  borderRadius = TILE_RADIUS,
}: WorkPhotoGridProps) {
  const { width: windowWidth } = useWindowDimensions();

  const tileSize = useMemo(() => {
    const contentW = windowWidth - screenEdgePadding * 2;
    return (contentW - gap) / 2;
  }, [windowWidth, screenEdgePadding, gap]);

  if (photos.length === 0) {
    return (
      <Text style={styles.empty} accessibilityRole="text">
        No work photos yet.
      </Text>
    );
  }

  return (
    <View style={[styles.grid, { gap }]}>
      {photos.map((source, index) => (
        <View
          key={`work-photo-${index}`}
          style={[styles.tile, { width: tileSize, height: tileSize, borderRadius }]}
          accessibilityLabel={`Work photo ${index + 1} of ${photos.length}`}
          accessibilityRole="image"
        >
          <Image source={source} style={styles.image} resizeMode="cover" />
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
  },
  tile: {
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  empty: {
    ...nunitoSans.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.label,
    paddingVertical: 8,
  },
});
