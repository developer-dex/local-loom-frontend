import { useCallback } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/ui';
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
import { myTradieProfileToDraft, profileStatusLabel } from '../../utils/tradieProfileDraft';
import { colors, fontFamilies, nunitoSans } from '../../theme';

function canEditProfile(status: string | undefined): boolean {
  return status === 'approved' || status === 'reviewed';
}

export function ManageTradiesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const dispatch = useAppDispatch();
  const authUser = useAppSelector(selectAuthUser);
  const profile = useAppSelector(selectMyTradieProfile);
  const profileStatus = useAppSelector(selectMyTradieProfileStatus);
  const stats = useAppSelector(selectTradieStats);

  const loading = profileStatus === 'loading';
  const status = profile?.profileStatus ?? 'pending';
  const editable = canEditProfile(status);

  useFocusEffect(
    useCallback(() => {
      void dispatch(fetchMyTradieProfileThunk());
      void dispatch(fetchTradieStatsThunk());
    }, [dispatch]),
  );

  const onPrimaryAction = useCallback(() => {
    if (editable && profile) {
      const initial = myTradieProfileToDraft(profile, {
        name: authUser?.name,
        phone: authUser?.phone,
        email: authUser?.email,
        avatar: authUser?.avatar,
      });
      navigation.navigate('BecomeTradie', { mode: 'edit', initial });
      return;
    }
    Alert.alert('Contact', 'Your application is still being reviewed. We will notify you when it is ready.');
  }, [editable, profile, authUser, navigation]);

  const title =
    status === 'rejected'
      ? 'Your application was not approved'
      : editable
        ? 'Your application is reviewed'
        : 'Your application is under review';

  const subtitle =
    profile?.businessName ??
    'Find what you are looking for, right in your local community.';

  const formatRating = (value: number | undefined) =>
    value != null && Number.isFinite(value) ? value.toFixed(1) : '—';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={10}
          onPress={() => {
            if (navigation.canGoBack()) navigation.goBack();
          }}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Icon name="arrow-left-01" width={24} height={24} color={colors.onboardingTitle} />
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          Manage Tradie
        </Text>
      </View>

      <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 14) + 24 }]}>
        {loading && !profile ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <View style={styles.reviewCard}>
            <View style={styles.reviewCopy}>
              <Text style={styles.statusPill}>{profileStatusLabel(status)}</Text>
              <Text style={styles.reviewTitle}>{title}</Text>
              <Text style={styles.reviewSubtitle}>{subtitle}</Text>
              {stats ? (
                <Text style={styles.statsLine}>
                  {stats.visitCount} visits · {stats.reviewCount} reviews · {formatRating(stats.averageRating)} rating
                </Text>
              ) : null}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={editable ? 'Edit profile' : 'Contact'}
              onPress={onPrimaryAction}
              style={({ pressed }) => [styles.contactBtn, pressed && styles.pressed]}
            >
              <Text style={styles.contactBtnText}>{editable ? 'Edit' : 'Contact'}</Text>
            </Pressable>
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
  backBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.onboardingTitle,
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
    gap: 6,
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
    fontSize: 12,
    lineHeight: 16,
    color: colors.placeholder,
  },
  statsLine: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#717171',
    marginTop: 4,
  },
  contactBtn: {
    height: 40,
    width: 115,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  contactBtnText: {
    fontFamily: fontFamilies.inter.medium,
    fontSize: 14,
    lineHeight: 18,
    color: colors.onPrimary,
  },
  pressed: {
    opacity: 0.7,
  },
});
