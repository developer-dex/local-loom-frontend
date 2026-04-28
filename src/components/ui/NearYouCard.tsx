import { memo, useState } from 'react';
import { Image, type ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { colors, fontFamilies } from '../../theme';

const OPEN = '#34A853';
const CLOSED = '#D32F2F';

export type NearYouItem = {
  id: string;
  image: ImageSourcePropType;
  title: string;
  category: string;
  status: 'open' | 'closed';
  distance: string;
  rating: string;
  reviews: string;
};

export type NearYouCardProps = {
  item: NearYouItem;
  onPress: () => void;
};

export const NearYouCard = memo(function NearYouCard({ item, onPress }: NearYouCardProps) {
  const [fav, setFav] = useState(false);
  const statusColor = item.status === 'open' ? OPEN : CLOSED;
  const statusLabel = item.status === 'open' ? 'Open' : 'Closed';

  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button">
      <Image source={item.image} style={styles.image} resizeMode="cover" />
      <View style={styles.body}>
        <Pressable
          onPress={() => setFav(!fav)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={fav ? 'Remove from favorites' : 'Add to favorites'}
          style={styles.heartCorner}
        >
          <Icon name="heart" width={20} height={20} opacity={fav ? 1 : 0.75} />
        </Pressable>
        <View style={styles.topBlock}>
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
          <View style={styles.distanceRow}>
            <Icon name="location-01" width={16} height={16} color="#6A6E72" />
            <Text style={styles.distance}>{item.distance}</Text>
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
  image: {
    width: 98,
    height: 100,
    borderRadius: 12,
    backgroundColor: colors.surface,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  title: {
    flex: 1,
    fontFamily: fontFamilies.nunitoSans.medium,
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
    fontFamily: fontFamilies.nunitoSans.regular,
    fontSize: 14,
    lineHeight: 18,
    color: colors.label,
  },
  status: {
    fontFamily: fontFamilies.nunitoSans.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distance: {
    fontFamily: fontFamilies.nunitoSans.regular,
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
    fontFamily: fontFamilies.nunitoSans.bold,
    fontSize: 12,
    lineHeight: 16,
    color: '#3E4143',
  },
  ratingReviews: {
    fontFamily: fontFamilies.nunitoSans.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#808080',
  },
});
