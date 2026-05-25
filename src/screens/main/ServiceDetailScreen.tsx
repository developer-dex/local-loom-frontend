import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  type ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { ProviderReviewsSection } from '../../components/ProviderReviewsSection';
import type { ReviewEntry } from '../../components/ProviderReviewsSection';
import {
  AdaptiveBlurView,
  AppButton,
  Icon,
  PillChip,
  RemoteImage,
  WorkPhotoGrid,
  useToast,
} from '../../components/ui';
import type { RootStackParamList } from '../../navigation/types';
import { colors, fontFamilies, nunitoSans } from '../../theme';
import { fetchTradieByIdApi, fetchTradieDetailsApi, fetchTradieContactApi } from '../../api/tradies';
import type { TradieProfile, TradieReviewsDetail } from '../../api/tradieTypes';
import {
  normalizeTradieProfile,
  normalizeTradieReviewsDetail,
  normalizeWorkDetailImages,
} from '../../utils/tradieDetails';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { prefetchRemoteImages } from '../../utils/prefetchImages';
import { useAppDispatch } from '../../store/hooks';
import { createConversationThunk } from '../../store/slices/chatThunks';

const { width: SCREEN_W } = Dimensions.get('window');
const H_PADDING = 20;
const HERO_H = 204;
const HERO_W = SCREEN_W - H_PADDING * 2;

type DetailTab = 'about' | 'work' | 'reviews';

type Props = NativeStackScreenProps<RootStackParamList, 'ServiceDetail'>;

/** Format open days + hours into a human-readable string. */
function formatHours(
  timeFrom: string | null,
  timeTo: string | null,
  openDays: string[],
): string {
  if (!timeFrom && !timeTo && openDays.length === 0) return '';
  const days =
    openDays.length > 0
      ? `(${openDays
          .map((d) => {
            const day = String(d).trim();
            if (!day) return '';
            return day.charAt(0).toUpperCase() + day.slice(1, 3);
          })
          .filter(Boolean)
          .join('-')})`
      : '';
  const hours =
    timeFrom && timeTo ? `Open ${timeFrom} – ${timeTo}` : timeFrom ? `From ${timeFrom}` : '';
  return [days, hours].filter(Boolean).join(' ');
}

/** Map API TradieReview items to the ReviewEntry shape used by ProviderReviewsSection. */
function toReviewEntry(r: TradieReviewsDetail['items'][number]): ReviewEntry {
  return {
    id: r.id,
    author: r.reviewer.name,
    dateLabel: new Date(r.createdAt).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    rating: r.rating,
    body: r.comment ?? '',
    avatarSource: r.reviewer.avatar ? { uri: r.reviewer.avatar } : undefined,
  };
}

export function ServiceDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { isLoggedIn } = useAuth();
  const { providerId } = route.params;
  const dispatch = useAppDispatch();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<TradieProfile | null>(null);
  const [workPhotoUris, setWorkPhotoUris] = useState<string[]>([]);
  const [workLoading, setWorkLoading] = useState(false);
  const [workFetched, setWorkFetched] = useState(false);
  const [reviewsDetail, setReviewsDetail] = useState<TradieReviewsDetail | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsFetched, setReviewsFetched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<DetailTab>('about');
  const [fav, setFav] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  // Profile only on mount — work/reviews load when their tab is selected
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setWorkFetched(false);
    setReviewsFetched(false);
    setWorkPhotoUris([]);
    setReviewsDetail(null);

    fetchTradieByIdApi(providerId)
      .then((profileRes) => {
        if (cancelled) return;
        const normalized = normalizeTradieProfile(profileRes.data);
        if (!normalized) {
          setError('Profile not found.');
          return;
        }
        setProfile(normalized);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [providerId]);

  useEffect(() => {
    if (tab !== 'work' || workFetched) return;
    let cancelled = false;
    setWorkLoading(true);

    fetchTradieDetailsApi(providerId, 'work')
      .then((res) => {
        if (cancelled) return;
        setWorkPhotoUris(normalizeWorkDetailImages(res.data));
        setWorkFetched(true);
      })
      .catch(() => {
        if (!cancelled) setWorkPhotoUris([]);
      })
      .finally(() => {
        if (!cancelled) setWorkLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab, providerId, workFetched]);

  useEffect(() => {
    if (workPhotoUris.length > 0) {
      void prefetchRemoteImages(workPhotoUris);
    }
  }, [workPhotoUris]);

  useEffect(() => {
    if (tab !== 'reviews' || reviewsFetched) return;
    let cancelled = false;
    setReviewsLoading(true);

    fetchTradieDetailsApi(providerId, 'reviews')
      .then((res) => {
        if (cancelled) return;
        setReviewsDetail(normalizeTradieReviewsDetail(res.data));
        setReviewsFetched(true);
      })
      .catch(() => {
        if (!cancelled) setReviewsDetail(null);
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab, providerId, reviewsFetched]);

  const fetchReviews = useCallback(() => {
    fetchTradieDetailsApi(providerId, 'reviews')
      .then((res) => {
        setReviewsDetail(normalizeTradieReviewsDetail(res.data));
        setReviewsFetched(true);
      })
      .catch(() => {
        /* best-effort */
      });
  }, [providerId]);

  // Log contact event when user taps contact actions (fire-and-forget)
  const logContact = useCallback(() => {
    if (isLoggedIn) {
      fetchTradieContactApi(providerId).catch(() => {
        // Best-effort — ignore errors
      });
    }
  }, [isLoggedIn, providerId]);

  // Track a pending "Start chat" dispatch so we can disable the message
  // button while the conversation is being created.
  const [startingChat, setStartingChat] = useState(false);

  /**
   * "Start chat" entry point (Task 14.1, Req 8.1, 8.2, 8.3, 8.5).
   *
   * Dispatches `createConversationThunk(otherUserId)` for the tradie's
   * underlying user (`profile.user.id`) and, on success, navigates to
   * `ChatDetail` with the returned conversation id. On a
   * `CHAT_VALIDATION_ERROR` (e.g. attempting to message yourself) we
   * surface the server message inline via toast and stay on this screen.
   */
  const startChat = useCallback(async () => {
    if (!isLoggedIn || !profile || startingChat) return;

    // Best-effort contact log alongside opening the chat.
    logContact();

    const otherUserId = profile.user.id;
    if (!otherUserId) {
      showToast({ message: 'Unable to start chat with this provider.', type: 'error' });
      return;
    }

    setStartingChat(true);
    try {
      const result = await dispatch(createConversationThunk(otherUserId));
      if (createConversationThunk.fulfilled.match(result)) {
        const conv = result.payload;
        const avatarUri = conv.otherParticipant.avatar ?? profile.user.avatar ?? undefined;
        navigation.navigate('ChatDetail', {
          chatId: conv.id,
          name: conv.otherParticipant.name || profile.user.name,
          avatarUri,
        });
      } else {
        // Rejected — surface the server message in this originating screen
        // (Req 8.5: CHAT_VALIDATION_ERROR for "with yourself" and similar).
        const message =
          typeof result.payload === 'string'
            ? result.payload
            : 'Could not start the conversation.';
        showToast({ message, type: 'error', duration: 5_000 });
      }
    } finally {
      setStartingChat(false);
    }
  }, [
    dispatch,
    isLoggedIn,
    logContact,
    navigation,
    profile,
    showToast,
    startingChat,
  ]);

  const openLogin = useCallback(() => {
    navigation.navigate('SignIn');
  }, [navigation]);

  const heroSlides = useMemo<ImageSourcePropType[]>(() => {
    if (!profile) return [];
    const images = profile.businessImages?.length
      ? profile.businessImages
      : profile.businessImage
        ? [profile.businessImage]
        : [];
    return images.length > 0
      ? images.map((uri) => ({ uri: resolveMediaUrl(uri) ?? uri }))
      : [require('../../../assets/first.png')];
  }, [profile]);

  const onHeroScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const i = Math.round(x / HERO_W);
      setSlideIndex(Math.max(0, Math.min(heroSlides.length - 1, i)));
    },
    [heroSlides.length],
  );

  const dots = useMemo(() => heroSlides.map((_, i) => i), [heroSlides]);

  const reviewEntries = useMemo<ReviewEntry[]>(
    () => (reviewsDetail?.items ?? []).map(toReviewEntry),
    [reviewsDetail],
  );

  const hoursString = useMemo(
    () =>
      profile
        ? formatHours(profile.timeFrom, profile.timeTo, profile.openDays ?? [])
        : '',
    [profile],
  );

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Loading profile" />
      </View>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error || !profile) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.errorBackBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="arrow-left-01" width={24} height={24} color={colors.onboardingTitle} />
        </Pressable>
        <Text style={styles.errorText}>{error ?? 'Profile not found.'}</Text>
      </View>
    );
  }

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
        {/* ── Hero carousel ── */}
        <View style={styles.heroWrap}>
          <FlatList
            data={heroSlides}
            keyExtractor={(_, index) => `slide-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onHeroScroll}
            onScrollEndDrag={onHeroScroll}
            renderItem={({ item }) => (
              <RemoteImage
                uri={typeof item === 'object' && item && 'uri' in item ? String(item.uri) : null}
                fallback={require('../../../assets/first.png')}
                style={styles.heroImage}
                resizeMode="cover"
              />
            )}
            getItemLayout={(_, index) => ({
              length: HERO_W,
              offset: HERO_W * index,
              index,
            })}
          />
          {profile.isEmergencyAvailable ? (
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
              <View
                key={i}
                style={[styles.dot, i === slideIndex ? styles.dotActive : styles.dotIdle]}
              />
            ))}
          </View>
        </View>

        {/* ── Profile block ── */}
        <View style={styles.profileBlock}>
          <Text style={styles.headline}>{profile.businessName}</Text>
          <View style={styles.locationRow}>
            <Icon name="location-01" width={16} height={16} color={colors.primary} />
            <Text style={styles.locationText}>{profile.businessLocation ?? ''}</Text>
          </View>
        </View>

        {/* ── Tab segment ── */}
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
                <Text style={[styles.segmentLabel, selected && styles.segmentLabelActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── About tab ── */}
        {tab === 'about' && (
          <>
            <Text style={styles.aboutBody}>{profile.serviceDescription ?? ''}</Text>

            <View style={styles.servicesBlock}>
              <Text style={styles.servicesTitle}>Services</Text>
              <View style={styles.servicesWrap}>
                {profile.services.map((s) => (
                  <PillChip key={s.id} variant="detail" label={s.name} />
                ))}
              </View>
            </View>

            <View style={styles.lockedSection}>
              <View style={styles.lockedInner}>
                <View style={styles.contactCard}>
                  <View style={styles.contactRow}>
                    <View style={styles.contactLeft}>
                      {profile.user.avatar ? (
                        <RemoteImage
                          uri={profile.user.avatar}
                          fallback={require('../../../assets/signup/customer.png')}
                          style={styles.contactAvatar}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.contactAvatar, styles.contactAvatarPlaceholder]}>
                          <Icon name="user-03" width={24} height={24} color={colors.placeholder} />
                        </View>
                      )}
                      <View>
                        <Text style={styles.contactName}>{profile.user.name}</Text>
                        <Text style={styles.contactPhone}>{profile.user.phone}</Text>
                      </View>
                    </View>
                    <View style={styles.contactActions}>
                      <Pressable
                        style={styles.iconAction}
                        accessibilityLabel="Call"
                        disabled={!isLoggedIn}
                        onPress={logContact}
                      >
                        <Icon name="call-02" width={18} height={18} color={colors.primary} />
                      </Pressable>
                      <Pressable
                        style={styles.iconAction}
                        accessibilityRole="button"
                        accessibilityLabel="Message"
                        accessibilityState={{ disabled: !isLoggedIn || startingChat }}
                        disabled={!isLoggedIn || startingChat}
                        onPress={startChat}
                      >
                        <Icon name="bubble-chat" width={18} height={18} color={colors.primary} />
                      </Pressable>
                    </View>
                  </View>
                </View>

                <View style={styles.businessCard}>
                  <BusinessRow
                    icon={<Icon name="work" width={18} height={18} color={colors.primary} />}
                    label="Website"
                    value={profile.website ?? ''}
                  />
                  <BusinessRow
                    icon={<Icon name="mail-01" width={18} height={18} color={colors.primary} />}
                    label="Email"
                    value={profile.user.email ?? ''}
                  />
                  <BusinessRow
                    icon={<Icon name="time-04" width={18} height={18} color={colors.primary} />}
                    label="Time"
                    value={hoursString}
                  />
                </View>
              </View>

              {!isLoggedIn && (
                <>
                  <AdaptiveBlurView intensity={10} tint="light" style={styles.lockedBlur} />
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

        {/* ── Work tab ── */}
        {tab === 'work' &&
          (workLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.tabLoader} />
          ) : (
            <WorkPhotoGrid photoUris={workPhotoUris} />
          ))}

        {/* ── Reviews tab ── */}
        {tab === 'reviews' &&
          (reviewsLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.tabLoader} />
          ) : (
            <ProviderReviewsSection
              providerName={profile.businessName}
              tradieProfileId={profile.id}
              average={reviewsDetail?.average ?? profile.averageRating ?? 0}
              totalRatings={reviewsDetail?.totalRatings ?? profile.totalRatingCount ?? 0}
              reviews={reviewEntries}
              onReviewPosted={fetchReviews}
              isLoggedIn={isLoggedIn}
              onLoginRequired={openLogin}
            />
          ))}
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBackBtn: {
    position: 'absolute',
    top: 16,
    left: H_PADDING,
  },
  errorText: {
    ...nunitoSans.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.label,
    textAlign: 'center',
    paddingHorizontal: 32,
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
    ...nunitoSans.regular,
    fontSize: 18,
    lineHeight: 24,
    color: colors.onboardingTitle,
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
    ...nunitoSans.semibold,
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
    ...nunitoSans.bold,
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
    ...nunitoSans.medium,
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
    ...nunitoSans.regular,
    fontSize: 14,
    lineHeight: 16,
    color: '#2E2E2E',
  },
  segmentLabelActive: {
    ...nunitoSans.semibold,
  },
  tabLoader: {
    marginVertical: 24,
  },
  aboutBody: {
    ...nunitoSans.regular,
    fontSize: 14,
    lineHeight: 18,
    color: '#4E4E4E',
  },
  servicesBlock: {
    gap: 8,
  },
  servicesTitle: {
    ...nunitoSans.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: '#3E4143',
  },
  servicesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  lockedSection: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
    gap: 12,
  },
  lockedInner: {
    gap: 12,
  },
  lockedBlur: {
    overflow: 'hidden',
  },
  loginOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loginBtn: {
    width: '60%',
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
  contactAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactName: {
    ...nunitoSans.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.onboardingTitle,
  },
  contactPhone: {
    ...nunitoSans.regular,
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
    ...nunitoSans.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#5D5D5D',
  },
  businessValue: {
    ...nunitoSans.semibold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.onboardingTitle,
    marginTop: 2,
  },
});
