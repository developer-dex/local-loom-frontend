import { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton, Icon } from '../../components/ui';
import type { RootStackParamList } from '../../navigation/types';
import {
  useAppDispatch,
  useAppSelector,
  selectAuthUser,
  selectMyTradieProfile,
  selectMyTradieProfileStatus,
  selectTradieStats,
} from '../../store/hooks';
import { fetchMyTradieProfileThunk, fetchTradieStatsThunk } from '../../store/slices/tradiesSlice';
import { isTradieProfileApproved } from '../../utils/authUser';
import { myTradieProfileToDraft, profileStatusLabel } from '../../utils/tradieProfileDraft';
import { colors, fontFamilies, nunitoSans } from '../../theme';

const REVIEW_PENDING_MESSAGE =
  'Your application is still being reviewed. We will notify you when it is ready.';

export function ManageTradiesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const dispatch = useAppDispatch();
  const authUser = useAppSelector(selectAuthUser);
  const profile = useAppSelector(selectMyTradieProfile);
  const profileFetchStatus = useAppSelector(selectMyTradieProfileStatus);
  const stats = useAppSelector(selectTradieStats);

  const status = authUser?.tradieProfileStatus ?? profile?.profileStatus ?? 'pending';
  const approved = isTradieProfileApproved(status);
  const loading = approved && profileFetchStatus === 'loading' && !profile;
  const isReviewState = !approved;
  const allowLeaveRef = useRef(false);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !isReviewState });
  }, [isReviewState, navigation]);

  useEffect(() => {
    if (!isReviewState) return;

    const onHardwareBack = () => true;
    const backSub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    const removeNavBlock = navigation.addListener('beforeRemove', (e) => {
      if (allowLeaveRef.current) return;
      e.preventDefault();
    });

    return () => {
      backSub.remove();
      removeNavBlock();
    };
  }, [isReviewState, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (!approved) return;
      void dispatch(fetchMyTradieProfileThunk());
      void dispatch(fetchTradieStatsThunk());
    }, [dispatch, approved]),
  );

  const onEditProfile = useCallback(() => {
    if (!approved || !profile) return;
    const initial = myTradieProfileToDraft(profile, {
      name: authUser?.name,
      phone: authUser?.phone,
      email: authUser?.email,
      avatar: authUser?.avatar,
    });
    navigation.navigate('BecomeTradie', { mode: 'edit', initial });
  }, [approved, profile, authUser, navigation]);

  const onOkay = useCallback(() => {
    allowLeaveRef.current = true;
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs', params: { screen: 'Profile' } }],
    });
  }, [navigation]);

  const title = approved
    ? 'Manage your service provider profile'
    : status === 'rejected'
      ? 'Your application was not approved'
      : 'Application under review';

  const subtitle = approved
    ? (profile?.businessName ?? 'Update your business details and work photos.')
    : REVIEW_PENDING_MESSAGE;

  const formatRating = (value: number | undefined) =>
    value != null && Number.isFinite(value) ? value.toFixed(1) : '—';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        {isReviewState ? (
          <View style={styles.headerSide} />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={10}
            onPress={() => {
              if (navigation.canGoBack()) navigation.goBack();
            }}
            style={({ pressed }) => [styles.headerSide, pressed && styles.pressed]}
          >
            <Icon name="arrow-left-01" width={24} height={24} color={colors.onboardingTitle} />
          </Pressable>
        )}
        <Text numberOfLines={1} style={styles.headerTitle}>
          Manage Service Provider
        </Text>
        <View style={styles.headerSide} />
      </View>

      <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 14) + 24 }]}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <View style={styles.reviewCard}>
            <View style={styles.reviewCopy}>
              <Text style={styles.statusPill}>{profileStatusLabel(status)}</Text>
              <Text style={styles.reviewTitle}>{title}</Text>
              <Text style={styles.reviewSubtitle}>{subtitle}</Text>
              {approved && stats ? (
                <Text style={styles.statsLine}>
                  {stats.visitCount} visits · {stats.reviewCount} reviews · {formatRating(stats.averageRating)} rating
                </Text>
              ) : null}
            </View>

            {approved ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit service provider profile"
                onPress={onEditProfile}
                disabled={!profile}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  !profile && styles.primaryBtnDisabled,
                  pressed && profile && styles.pressed,
                ]}
              >
                <Text style={styles.primaryBtnText}>Edit profile</Text>
              </Pressable>
            ) : (
              <AppButton
                title="Okay"
                onPress={onOkay}
                containerStyle={styles.okayBtn}
                accessibilityLabel="Okay, return to profile"
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 48,
    paddingHorizontal: 20,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.background,
  },
  headerSide: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.onboardingTitle,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 26,
    backgroundColor: colors.background,
  },
  loader: {
    marginTop: 40,
  },
  reviewCard: {
    backgroundColor: '#FFF0EF',
    borderRadius: 20,
    padding: 16,
    gap: 20,
  },
  reviewCopy: {
    gap: 8,
  },
  statusPill: {
    alignSelf: 'flex-start',
    fontFamily: fontFamilies.inter.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.primary,
    backgroundColor: '#FFE4E1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  reviewTitle: {
    ...nunitoSans.medium,
    fontSize: 18,
    lineHeight: 24,
    color: colors.primary,
  },
  reviewSubtitle: {
    ...nunitoSans.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onboardingBody,
  },
  statsLine: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#717171',
    marginTop: 4,
  },
  primaryBtn: {
    height: 44,
    minWidth: 140,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    fontFamily: fontFamilies.inter.medium,
    fontSize: 14,
    lineHeight: 18,
    color: colors.onPrimary,
  },
  okayBtn: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.7,
  },
});
