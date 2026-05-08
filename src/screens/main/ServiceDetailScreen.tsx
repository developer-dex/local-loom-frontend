import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  type ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { ProviderReviewsSection } from '../../components/ProviderReviewsSection';
import type { ReviewEntry } from '../../components/ProviderReviewsSection';
import { AppButton, Icon, PillChip, WorkPhotoGrid } from '../../components/ui';
import type { RootStackParamList } from '../../navigation/types';
import { colors, fontFamilies } from '../../theme';

const { width: SCREEN_W } = Dimensions.get('window');
const H_PADDING = 20;
const HERO_H = 204;
const HERO_W = SCREEN_W - H_PADDING * 2;

type DetailTab = 'about' | 'work' | 'reviews';

type ProviderDetail = {
  heroSlides: ImageSourcePropType[];
  headline: string;
  locationLine: string;
  about: string;
  services: string[];
  /** Portfolio / work samples for the Work tab (any length). */
  workPhotos: ImageSourcePropType[];
  contactName: string;
  contactPhone: string;
  contactAvatar: ImageSourcePropType;
  website: string;
  email: string;
  hours: string;
  mapTitle: string;
  /** Pill on hero image top-left (e.g. emergency services). */
  emergencyAvailable?: boolean;
  reviews: {
    average: number;
    totalRatings: number;
    items: ReviewEntry[];
  };
};

const DEFAULT_ABOUT =
  'Professional plumber with 15+ years of experience specializing in residential and emergency repairs. Known for reliable service, fair pricing, and getting the job done right the first time. Fully licensed and insured for your peace of mind.';

const PROVIDER_DETAIL: Record<string, ProviderDetail> = {
  '1': {
    heroSlides: [
      require('../../../assets/first.png'),
      require('../../../assets/first.png'),
      require('../../../assets/first.png'),
    ],
    headline: 'John The Plumber',
    locationLine: 'Northern Melbourne',
    about: DEFAULT_ABOUT,
    services: ['Emergency Repairs', 'Hot Water', 'Blocked Drains', 'Gas Fitting'],
    workPhotos: [
      require('../../../assets/work1.png'),
      require('../../../assets/work2.png'),
      require('../../../assets/work3.png'),
      require('../../../assets/work4.png'),
    ],
    contactName: 'John White',
    contactPhone: '65 8777 5231',
    contactAvatar: require('../../../assets/first.png'),
    website: 'almamlaka.com',
    email: 'hello@almamlaka.com',
    hours: '(Mon-Fri) Open Until 11:00 PM',
    mapTitle: 'Shop 15, Seef Mall',
    emergencyAvailable: true,
    reviews: {
      average: 4.2,
      totalRatings: 1666,
      items: [
        {
          id: 'r1',
          author: 'Courtney Henry',
          dateLabel: '2 mins ago',
          rating: 5,
          body:
            'john was fantastic! Fixed our leaking pipe quickly and professionally. Highly recommend.',
          avatarSource: require('../../../assets/first.png'),
          attachmentSources: [
            require('../../../assets/work1.png'),
            require('../../../assets/work2.png'),
            require('../../../assets/work3.png'),
          ],
        },
        {
          id: 'r2',
          author: 'Ralph Edwards',
          dateLabel: '1 week ago',
          rating: 4,
          body: 'On time, fair quote, and tidy workmanship. Would use again for any plumbing work.',
        },
        {
          id: 'r3',
          author: 'Jenny Wilson',
          dateLabel: '2 weeks ago',
          rating: 5,
          body: 'Emergency callout on a Sunday — arrived within an hour. Lifesaver!',
        },
      ],
    },
  },
  '2': {
    heroSlides: [
      require('../../../assets/second.png'),
      require('../../../assets/second.png'),
      require('../../../assets/second.png'),
    ],
    headline: "Mark's electical",
    locationLine: 'Adelaide, Australia',
    about:
      'Licensed electrician for residential and commercial work. Fast response, clear quotes, and tidy job sites. Specializing in rewiring, safety switches, and smart home installs.',
    services: ['Wiring', 'Safety Switches', 'Lighting', 'Inspections'],
    workPhotos: [
      require('../../../assets/work2.png'),
      require('../../../assets/work1.png'),
      require('../../../assets/work3.png'),
    ],
    contactName: 'Mark Elect',
    contactPhone: '65 8111 2044',
    contactAvatar: require('../../../assets/second.png'),
    website: 'markselectrical.com',
    email: 'hello@markselectrical.com',
    hours: '(Mon-Sat) Open Until 9:00 PM',
    mapTitle: 'Unit 4, Trade Park',
    emergencyAvailable: false,
    reviews: {
      average: 4.7,
      totalRatings: 892,
      items: [
        {
          id: 'm1',
          author: 'Albert Flores',
          dateLabel: '3 days ago',
          rating: 5,
          body: 'Great electrical work — safety switch install was quick and explained clearly.',
        },
        {
          id: 'm2',
          author: 'Kristin Watson',
          dateLabel: '1 week ago',
          rating: 4,
          body: 'Professional and punctual. Minor follow-up needed but they came back next day.',
        },
      ],
    },
  },
  '3': {
    heroSlides: [
      require('../../../assets/third.png'),
      require('../../../assets/third.png'),
      require('../../../assets/third.png'),
    ],
    headline: 'Herry Ac works',
    locationLine: 'Sydney, Australia',
    about:
      'HVAC team focused on installs, servicing, and emergency callouts. Transparent pricing and manufacturer-backed workmanship on split systems and ducted units.',
    services: ['AC Install', 'Servicing', 'Refrigerant', 'Duct Cleaning'],
    workPhotos: [
      require('../../../assets/work3.png'),
      require('../../../assets/work4.png'),
      require('../../../assets/work1.png'),
      require('../../../assets/work2.png'),
      require('../../../assets/work3.png'),
    ],
    contactName: 'Herry AC',
    contactPhone: '65 9000 3311',
    contactAvatar: require('../../../assets/third.png'),
    website: 'herryac.com',
    email: 'support@herryac.com',
    hours: '(Mon-Fri) Open Until 11:00 PM',
    mapTitle: 'Warehouse 2, Cool Zone',
    emergencyAvailable: true,
    reviews: {
      average: 4.5,
      totalRatings: 423,
      items: [
        {
          id: 'h1',
          author: 'Darrell Steward',
          dateLabel: '5 days ago',
          rating: 5,
          body: 'AC install was smooth. Team was respectful of our home and cleaned up after.',
        },
      ],
    },
  },
};

type Props = NativeStackScreenProps<RootStackParamList, 'ServiceDetail'>;

export function ServiceDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { isLoggedIn } = useAuth();
  const { providerId } = route.params;
  const detail = PROVIDER_DETAIL[providerId] ?? PROVIDER_DETAIL['1'];

  const [tab, setTab] = useState<DetailTab>('about');
  const [fav, setFav] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  const openLogin = useCallback(() => {
    navigation.navigate('SignIn');
  }, [navigation]);

  const onHeroScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / HERO_W);
    setSlideIndex(Math.max(0, Math.min(detail.heroSlides.length - 1, i)));
  }, [detail.heroSlides.length]);

  const dots = useMemo(() => detail.heroSlides.map((_, i) => i), [detail.heroSlides]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topNav}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="arrow-left-01" width={24} height={24} color={colors.onboardingTitle} />
        </Pressable>
        <Text style={styles.topNavTitle} numberOfLines={1}>
          Details Screen
        </Text>
        <View style={styles.topNavRightSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <View style={styles.heroWrap}>
          <FlatList
            data={detail.heroSlides}
            keyExtractor={(_, index) => `slide-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onHeroScroll}
            onScrollEndDrag={onHeroScroll}
            renderItem={({ item }) => (
              <Image source={item} style={styles.heroImage} resizeMode="cover" />
            )}
            getItemLayout={(_, index) => ({
              length: HERO_W,
              offset: HERO_W * index,
              index,
            })}
          />
          {detail.emergencyAvailable ? (
            <View
              style={styles.heroEmergencyTag}
              pointerEvents="none"
              accessibilityRole="text"
              accessibilityLabel="Emergency available"
            >
              <Text style={styles.heroEmergencyTagText}>Emergency Available</Text>
            </View>
          ) : null}
          <Pressable
            style={styles.heroHeartBtn}
            onPress={() => setFav(!fav)}
            accessibilityRole="button"
            accessibilityLabel={fav ? 'Remove from favorites' : 'Add to favorites'}
          >
            {fav ? (
              <Icon name="heart" width={20} height={20} />
            ) : (
              <Icon name="icn_heart" width={20} height={20} />
            )}
          </Pressable>
          <View style={styles.dotsRow} pointerEvents="none">
            {dots.map((i) => (
              <View key={i} style={[styles.dot, i === slideIndex ? styles.dotActive : styles.dotIdle]} />
            ))}
          </View>
        </View>

        <View style={styles.profileBlock}>
          <Text style={styles.headline}>{detail.headline}</Text>
          <View style={styles.locationRow}>
            <Icon name="location-01" width={16} height={16} color={colors.primary} />
            <Text style={styles.locationText}>{detail.locationLine}</Text>
          </View>
        </View>

        <View style={styles.segment}>
          {(['about', 'work', 'reviews'] as const).map((key) => {
            const selected = tab === key;
            const label = key === 'about' ? 'About' : key === 'work' ? 'Work' : 'Reviews';
            return (
              <Pressable
                key={key}
                onPress={() => setTab(key)}
                style={[styles.segmentItem, selected && styles.segmentItemActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.segmentLabel, selected && styles.segmentLabelActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'about' && (
          <>
            <Text style={styles.aboutBody}>{detail.about}</Text>

            <View style={styles.servicesBlock}>
              <Text style={styles.servicesTitle}>Services</Text>
              <View style={styles.servicesWrap}>
                {detail.services.map((s) => (
                  <PillChip key={s} variant="detail" label={s} />
                ))}
              </View>
            </View>

            <View style={styles.lockedSection}>
              <View style={styles.lockedInner}>
                <View style={styles.contactCard}>
                  <View style={styles.contactRow}>
                    <View style={styles.contactLeft}>
                      <Image source={detail.contactAvatar} style={styles.contactAvatar} />
                      <View>
                        <Text style={styles.contactName}>{detail.contactName}</Text>
                        <Text style={styles.contactPhone}>{detail.contactPhone}</Text>
                      </View>
                    </View>
                    <View style={styles.contactActions}>
                      <Pressable style={styles.iconAction} accessibilityLabel="Call" disabled={!isLoggedIn}>
                        <Icon name="call-02" width={18} height={18} color={colors.primary} />
                      </Pressable>
                      <Pressable style={styles.iconAction} accessibilityLabel="Message" disabled={!isLoggedIn}>
                        <Icon name="bubble-chat" width={18} height={18} color={colors.primary} />
                      </Pressable>
                    </View>
                  </View>
                </View>

                <View style={styles.businessCard}>
                  <BusinessRow
                    icon={<Icon name="work" width={18} height={18} color={colors.primary} />}
                    label="Website"
                    value={detail.website}
                  />
                  <BusinessRow
                    icon={<Icon name="mail-01" width={18} height={18} color={colors.primary} />}
                    label="Email"
                    value={detail.email}
                  />
                  <BusinessRow
                    icon={<Icon name="time-04" width={18} height={18} color={colors.primary} />}
                    label="Time"
                    value={detail.hours}
                  />
                </View>
              </View>

              {!isLoggedIn && (
                <>
                  <BlurView
                    intensity={Platform.OS === 'ios' ? 10 : 10}
                    tint="light"
                    experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
                    style={styles.lockedBlur}
                  />
                  <View style={styles.loginOverlay} pointerEvents="box-none">
                    <AppButton
                      title="Login"
                      variant="primary"
                      onPress={openLogin}
                      accessibilityLabel="Log in to view contact details"
                      containerStyle={styles.loginBtn}
                    />
                  </View>
                </>
              )}
            </View>
          </>
        )}

        {tab === 'work' && <WorkPhotoGrid photos={detail.workPhotos} />}
        {tab === 'reviews' && (
          <ProviderReviewsSection
            providerName={detail.headline}
            average={detail.reviews.average}
            totalRatings={detail.reviews.totalRatings}
            reviews={detail.reviews.items}
          />
        )}
      </ScrollView>
    </View>
  );
}

function BusinessRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.businessRow}>
      <View style={styles.businessIconCircle}>{icon}</View>
      <View style={styles.businessTextCol}>
        <Text style={styles.businessLabel}>{label}</Text>
        <Text style={styles.businessValue}>{value}</Text>
      </View>
    </View>
  );
}

const shadowCard = {
  shadowColor: '#1B1B4D',
  shadowOpacity: 0.04,
  shadowRadius: 22.5,
  shadowOffset: { width: 0, height: 2 } as const,
  elevation: 2,
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PADDING,
    paddingVertical: 8,
    minHeight: 48,
    gap: 16,
  },
  topNavTitle: {
    flex: 1,
    fontFamily: fontFamilies.nunitoSans.regular,
    fontSize: 18,
    lineHeight: 24,
    color: colors.onboardingTitle,
    // textAlign: 'center',
  },
  topNavRightSpacer: {
    width: 24,
  },
  scrollContent: {
    paddingHorizontal: H_PADDING,
    gap: 16,
  },
  heroWrap: {
    height: HERO_H,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    ...shadowCard,
  },
  heroImage: {
    width: HERO_W,
    height: HERO_H,
    borderRadius: 12,
  },
  heroEmergencyTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 2,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  heroEmergencyTagText: {
    fontFamily: fontFamilies.nunitoSans.semibold,
    fontSize: 11,
    lineHeight: 14,
    color: colors.onPrimary,
    letterSpacing: 0.2,
  },
  heroHeartBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  dotIdle: {
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  profileBlock: {
    gap: 4,
  },
  headline: {
    fontFamily: fontFamilies.nunitoSans.bold,
    fontSize: 18,
    lineHeight: 22,
    color: colors.onboardingTitle,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontFamily: fontFamilies.nunitoSans.medium,
    fontSize: 14,
    lineHeight: 18,
    color: '#4E4E4E',
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 7,
    padding: 4,
    gap: 0,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  segmentItemActive: {
    backgroundColor: '#FFE6E3',
  },
  segmentLabel: {
    fontFamily: fontFamilies.nunitoSans.regular,
    fontSize: 14,
    lineHeight: 16,
    color: '#2E2E2E',
  },
  segmentLabelActive: {
    fontFamily: fontFamilies.nunitoSans.semibold,
  },
  aboutBody: {
    fontFamily: fontFamilies.nunitoSans.regular,
    fontSize: 14,
    lineHeight: 18,
    color: '#4E4E4E',
  },
  servicesBlock: {
    gap: 8,
  },
  servicesTitle: {
    fontFamily: fontFamilies.nunitoSans.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: '#3E4143',
  },
  servicesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  /** Figma 138-3015: blur contact + business until login; map stays clear. */
  lockedSection: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
    gap: 12,
  },
  lockedInner: {
    gap: 12,
  },
  lockedInnerBlocked: {
    pointerEvents: 'none',
  },
  lockedBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  loginOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loginBtn: {
    width: '60%',
    // height: 56,
  },
  contactCard: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 16,
    padding: 12,
    backgroundColor: colors.background,
    ...shadowCard,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  contactAvatar: {
    width: 52,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: colors.surface,
  },
  contactName: {
    fontFamily: fontFamilies.nunitoSans.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.onboardingTitle,
  },
  contactPhone: {
    fontFamily: fontFamilies.nunitoSans.regular,
    fontSize: 14,
    lineHeight: 18,
    color: '#2D3133',
    marginTop: 4,
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF6F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessCard: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 16,
    padding: 12,
    gap: 12,
    backgroundColor: colors.background,
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  businessIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessTextCol: {
    flex: 1,
    minWidth: 0,
  },
  businessLabel: {
    fontFamily: fontFamilies.nunitoSans.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#5D5D5D',
  },
  businessValue: {
    fontFamily: fontFamilies.nunitoSans.semibold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.onboardingTitle,
    marginTop: 2,
  },
  mapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 17,
    paddingVertical: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFE9E7',
    backgroundColor: '#FFF6F5',
  },
  mapThumbWrap: {
    width: 68,
    height: 60,
    position: 'relative',
  },
  mapThumb: {
    width: 60,
    height: 60,
    borderRadius: 8.68,
    borderWidth: 1,
    borderColor: '#CACACA',
  },
  mapPin: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapTextCol: {
    flex: 1,
    gap: 4,
  },
  mapTitle: {
    fontFamily: fontFamilies.nunitoSans.medium,
    fontSize: 14,
    lineHeight: 18,
    color: '#3E4143',
  },
  mapCta: {
    fontFamily: fontFamilies.nunitoSans.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.primary,
  },
});
