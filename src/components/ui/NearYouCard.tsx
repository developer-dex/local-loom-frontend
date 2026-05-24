import { memo } from 'react';
import { type ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { RemoteImage } from './RemoteImage';
import { colors, fontFamilies, nunitoSans } from '../../theme';

const OPEN = '#34A853';
const CLOSED = '#D32F2F';
const FALLBACK_IMAGE = require('../../../assets/first.png');

export type NearYouItem = {
  id: string;
  image: ImageSourcePropType;
  title: string;
  category: string;
  status: 'open' | 'closed';
  region: string;
  rating: string;
  reviews: string;
  /** From GET /tradies — heart is shown only when true. */
  isFavourite?: boolean;
};

export type NearYouCardProps = {
  item: NearYouItem;
  onPress: () => void;
};

function imageUriFromSource(image: ImageSourcePropType): string | null {
  if (typeof image === 'object' && image && 'uri' in image && image.uri) {
    return image.uri;
  }
  return null;
}

export const NearYouCard = memo(function NearYouCard({ item, onPress }: NearYouCardProps) {
  const statusColor = item.status === 'open' ? OPEN : CLOSED;
  const statusLabel = item.status === 'open' ? 'Open' : 'Closed';
  const imageUri = imageUriFromSource(item.image);
  const showFavourite = item.isFavourite === true;

  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button">
      <RemoteImage
        uri={imageUri}
        fallback={FALLBACK_IMAGE}
        style={styles.image}
        containerStyle={styles.imageContainer}
        resizeMode="cover"
        accessibilityLabel={item.title}
      />
      <View style={styles.body}>
        {showFavourite ? (
          <View style={styles.heartCorner} pointerEvents="none" accessibilityElementsHidden>
            <Icon name="heart" width={20} height={20} />
          </View>
        ) : null}
        <View style={[styles.topBlock, !showFavourite && styles.topBlockNoHeart]}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.category}>{item.category}</Text>
            <Text style={[styles.status, { color: statusColor }]}>  • {statusLabel}</Text>
          </View>
        </View>
        <View style={styles.footerRow}>
          <View style={styles.regionRow}>
            <Icon name="location-01" width={16} height={16} color="#6A6E72" />
            <Text style={styles.region} numberOfLines={1}>
              {item.region}
            </Text>
          </View>
          <View style={styles.ratingRow}>
            <Icon name="icn_star" width={16} height={16} accessibilityElementsHidden />
            <Text style={styles.ratingValue}>{item.rating}</Text>
            <Text style={styles.ratingReviews}>{item.reviews}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    height: 100,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    overflow: 'hidden',
    shadowColor: '#1B1B4D',
    shadowOpacity: 0.04,
    shadowRadius: 22.5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  imageContainer: {
    width: 98,
    height: 100,
    borderRadius: 12,
  },
  image: {
    width: 98,
    height: 100,
    borderRadius: 12,
  },
  body: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 12,
    justifyContent: 'space-between',
    position: 'relative',
  },
  heartCorner: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
  },
  topBlock: {
    gap: 4,
    paddingRight: 28,
  },
  topBlockNoHeart: {
    paddingRight: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  title: {
    flex: 1,
    ...nunitoSans.medium,
    fontSize: 16,
    lineHeight: 22,
    color: '#1F2937',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  category: {
    ...nunitoSans.regular,
    fontSize: 14,
    lineHeight: 18,
    color: colors.label,
  },
  status: {
    ...nunitoSans.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  region: {
    flex: 1,
    ...nunitoSans.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#808080',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    ...nunitoSans.bold,
    fontSize: 12,
    lineHeight: 16,
    color: '#3E4143',
  },
  ratingReviews: {
    ...nunitoSans.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#808080',
  },
});
