import { memo, useCallback, useState } from 'react';
import { Image, type ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import { AppButton } from './ui/AppButton';
import { Icon } from './ui/Icon';
import { LeaveReviewModal } from './LeaveReviewModal';
import { colors, fontFamilies } from '../theme';

type StarSlot = 'full' | 'half' | 'empty';

/** Same rules as aggregate average (full / half / empty). */
function listStarSlots(score: number): StarSlot[] {
  const stars: StarSlot[] = [];
  let s = Math.min(5, Math.max(0, score));
  for (let i = 0; i < 5; i++) {
    if (s >= 1) {
      stars.push('full');
      s -= 1;
    } else if (s >= 0.85) {
      stars.push('full');
      s = 0;
    } else if (s >= 0.15) {
      stars.push('half');
      s = 0;
    } else {
      stars.push('empty');
    }
  }
  return stars;
}

function ListStarIcon({ variant, size }: { variant: StarSlot; size: number }) {
  if (variant === 'half') {
    return <Icon name="icn_star-half" width={size} height={size} />;
  }
  if (variant === 'empty') {
    return (
      <View style={{ opacity: 0.32 }} accessibilityElementsHidden>
        <Icon name="icn_star" width={size} height={size} />
      </View>
    );
  }
  return <Icon name="icn_star" width={size} height={size} />;
}

export type ReviewEntry = {
  id: string;
  author: string;
  dateLabel: string;
  rating: number;
  body: string;
  /** Optional avatar image; otherwise first letter is shown. */
  avatarSource?: ImageSourcePropType;
  /** Square thumbnails below the review text (Figma). */
  attachmentSources?: ImageSourcePropType[];
};

export type ProviderReviewsSectionProps = {
  providerName: string;
  average: number;
  totalRatings: number;
  reviews: ReviewEntry[];
};

function AggregateStars({ average, size = 22 }: { average: number; size?: number }) {
  const slots = listStarSlots(average);
  return (
    <View style={styles.aggStars}>
      {slots.map((variant, i) => (
        <ListStarIcon key={i} variant={variant} size={size} />
      ))}
    </View>
  );
}

function ReviewRow({ item }: { item: ReviewEntry }) {
  const slots = listStarSlots(item.rating);
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.avatar}>
          {item.avatarSource ? (
            <Image source={item.avatarSource} style={styles.avatarImg} resizeMode="cover" />
          ) : (
            <Text style={styles.avatarText}>{item.author.charAt(0)}</Text>
          )}
        </View>
        <View style={styles.reviewMetaCol}>
          <Text style={styles.reviewAuthor}>{item.author}</Text>
          <Text style={styles.reviewDate}>{item.dateLabel}</Text>
        </View>
        <View style={styles.reviewStarsRight}>
          {slots.map((variant, i) => (
            <ListStarIcon key={i} variant={variant} size={14} />
          ))}
        </View>
      </View>
      <Text style={styles.reviewBody}>{item.body}</Text>
      {item.attachmentSources && item.attachmentSources.length > 0 ? (
        <View style={styles.attachRow}>
          {item.attachmentSources.map((src, idx) => (
            <Image key={idx} source={src} style={styles.attachThumb} resizeMode="cover" />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export const ProviderReviewsSection = memo(function ProviderReviewsSection({
  providerName,
  average,
  totalRatings,
  reviews,
}: ProviderReviewsSectionProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const onPost = useCallback((_payload: { rating: number; text: string }) => {
    // Later: POST /reviews when API exists
  }, []);

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Reviews</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryLeft}>
          <Text style={styles.averageNum}>{average.toFixed(1)}</Text>
          <AggregateStars average={average} size={16} />
          <Text style={styles.ratingsCaption}>Based on {totalRatings.toLocaleString()} ratings</Text>
        </View>
        <AppButton
          title="Write Review"
          onPress={() => setModalVisible(true)}
          containerStyle={styles.writeBtnPill}
          labelStyle={styles.writeBtnPillText}
        />
      </View>

      <View style={styles.list}>
        {reviews.map((item) => (
          <ReviewRow key={item.id} item={item} />
        ))}
      </View>

      <LeaveReviewModal
        visible={modalVisible}
        providerName={providerName}
        onClose={() => setModalVisible(false)}
        onPost={onPost}
      />
    </View>
  );
});

const REVIEWS_BG = '#F5F5F5';

const styles = StyleSheet.create({
  /** Bleed to screen edges to match Figma panel background (parent has horizontal padding). */
  wrap: {
    gap: 12,
    backgroundColor: colors.background,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontFamily: fontFamilies.nunitoSans.medium,
    fontSize: 16,
    lineHeight: 24,
    color: colors.onboardingTitle,
    // marginBottom: 4,
  },
  /** Figma: rating left, pill button right, same row. */
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    backgroundColor: colors.background,
    gap: 12,
  },
  summaryLeft: {
    flex: 1,
    // minWidth: 0,
    gap: 6,
  },
  averageNum: {
    fontFamily: fontFamilies.nunitoSans.bold,
    fontSize: 40,
    // lineHeight: 48,
    color: colors.onboardingTitle,
  },
  aggStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingsCaption: {
    fontFamily: fontFamilies.nunitoSans.regular,
    fontSize: 14,
    lineHeight: 20,
    color: '#6B6B6B',
  },
  writeBtnPill: {
    flexShrink: 0,
    paddingHorizontal: 20,
    height: 36,
    minWidth: 132,
    alignSelf: 'center',
  },
  writeBtnPillText: {
    fontFamily: fontFamilies.nunitoSans.semibold,
    fontSize: 14,
    lineHeight: 16,
    color: colors.background,
  },
  list: {
    gap: 12,
    marginTop: 4,
  },
  reviewCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    backgroundColor: colors.background,
    gap: 10,
  },
  /** Avatar | name/date | stars (Figma). */
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 22,
    backgroundColor: '#FFF0EF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 34,
    height: 34,
    borderRadius: 22,
  },
  avatarText: {
    fontFamily: fontFamilies.nunitoSans.semibold,
    fontSize: 18,
    color: colors.primary,
  },
  reviewMetaCol: {
    flex: 1,
    minWidth: 0,
  },
  reviewStarsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  reviewAuthor: {
    fontFamily: fontFamilies.nunitoSans.semibold,
    fontSize: 14,
    lineHeight: 22,
    color: colors.onboardingTitle,
  },
  reviewDate: {
    fontFamily: fontFamilies.nunitoSans.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.label,
    marginTop: 2,
  },
  reviewBody: {
    fontFamily: fontFamilies.nunitoSans.regular,
    fontSize: 12,
    // lineHeight: 20,
    color: '#4E4E4E',
  },
  attachRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  attachThumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
});
