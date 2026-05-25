import { memo, useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { RemoteImage } from './RemoteImage';
import { colors, nunitoSans } from '../../theme';

const DEFAULT_SCREEN_PADDING = 20;
const COLUMN_GAP = 12;
const TILE_RADIUS = 12;
const WORK_PHOTO_FALLBACK = require('../../../assets/first.png');

export type WorkPhotoGridProps = {
  /** Resolved remote image URLs. */
  photoUris: string[];
  /** Horizontal padding from each screen edge (matches parent screen). Default 20. */
  screenEdgePadding?: number;
  /** Gap between tiles (row and column). Default 12. */
  gap?: number;
  /** Corner radius for each tile. Default 12. */
  borderRadius?: number;
};

export const WorkPhotoGrid = memo(function WorkPhotoGrid({
  photoUris,
  screenEdgePadding = DEFAULT_SCREEN_PADDING,
  gap = COLUMN_GAP,
  borderRadius = TILE_RADIUS,
}: WorkPhotoGridProps) {
  const { width: windowWidth } = useWindowDimensions();

  const tileSize = useMemo(() => {
    const contentW = windowWidth - screenEdgePadding * 2;
    return (contentW - gap) / 2;
  }, [windowWidth, screenEdgePadding, gap]);

  const tileStyle = useMemo(
    () => ({ width: tileSize, height: tileSize, borderRadius }),
    [tileSize, borderRadius],
  );

  if (photoUris.length === 0) {
    return (
      <Text style={styles.empty} accessibilityRole="text">
        No work photos yet.
      </Text>
    );
  }

  return (
    <View style={[styles.grid, { gap }]}>
      {photoUris.map((uri, index) => (
        <View
          key={uri}
          style={[styles.tile, tileStyle]}
          accessibilityLabel={`Work photo ${index + 1} of ${photoUris.length}`}
          accessibilityRole="image"
        >
          <RemoteImage
            uri={uri}
            fallback={WORK_PHOTO_FALLBACK}
            style={styles.image}
            containerStyle={styles.imageContainer}
            resizeMode="cover"
            accessibilityLabel={`Work photo ${index + 1}`}
          />
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
  imageContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
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
