import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EditProfileBottomSheet, ProfileMenuRow } from '../../components/profile';
import { Icon, RemoteImage, type IconName } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import {
  useAppDispatch,
  useAppSelector,
  selectAuthUser,
  selectMyTradieProfile,
  selectTradieStats,
  selectUsersLoading,
} from '../../store/hooks';
import { fetchProfileThunk } from '../../store/slices/authSlice';
import { fetchMyTradieProfileThunk, fetchTradieStatsThunk } from '../../store/slices/tradiesSlice';
import { deleteUserMeThunk } from '../../store/slices/usersSlice';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { isTradieProfileApproved } from '../../utils/authUser';
import { profileStatusLabel } from '../../utils/tradieProfileDraft';
import { colors, fontFamilies, nunitoSans } from '../../theme';

const TRADIE_BADGE: ImageSourcePropType = require('../../../assets/signup/tradie.png');
const DEFAULT_AVATAR = require('../../../assets/signup/customer.png');

type MenuItem = {
  key: string;
  icon: IconName;
  label: string;
};

const MENU_ITEMS: MenuItem[] = [
  { key: 'help', icon: 'help', label: 'Help & Support' },
  { key: 'terms', icon: 'terms', label: 'Terms & Conditions' },
  { key: 'about', icon: 'about', label: 'About' },
  { key: 'faq', icon: 'faq', label: "FAQ'S" },
  { key: 'privacy', icon: 'icn_privacy', label: 'Privacy Policy' },
  { key: 'delete', icon: 'trash', label: 'Delete Account' },
];

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { isLoggedIn, logout } = useAuth();
  const authUser = useAppSelector(selectAuthUser);
  const myTradieProfile = useAppSelector(selectMyTradieProfile);
  const tradieStats = useAppSelector(selectTradieStats);
  const usersLoading = useAppSelector(selectUsersLoading);

  const isTradie = authUser?.isTradie === true;
  const tradieProfileStatus = authUser?.tradieProfileStatus ?? null;
  const tradieApproved = isTradieProfileApproved(tradieProfileStatus);

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestAvatarUri, setGuestAvatarUri] = useState<string | null>(null);

  const displayName = authUser?.name ?? (guestName || 'Guest');
  const displayPhone = authUser?.phone ?? guestPhone;
  const displayAvatar = useMemo(() => {
    const raw = authUser?.avatar ?? guestAvatarUri;
    if (!raw) return null;
    return resolveMediaUrl(raw) ?? raw;
  }, [authUser?.avatar, guestAvatarUri]);
  const businessName = isTradie && tradieApproved ? myTradieProfile?.businessName : null;
  const profileStatus = isTradie ? tradieProfileStatus : null;

  const tabBarSpace = 96 + Math.max(insets.bottom, 14);

  useFocusEffect(
    useCallback(() => {
      if (!isLoggedIn) return;
      void dispatch(fetchProfileThunk());
      if (isTradie && tradieApproved) {
        void dispatch(fetchMyTradieProfileThunk());
        void dispatch(fetchTradieStatsThunk());
      }
    }, [dispatch, isLoggedIn, isTradie, tradieApproved]),
  );

  const getRootNav = useCallback(() => {
    return navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  }, [navigation]);

  const openSignIn = useCallback(() => {
    getRootNav()?.navigate('SignIn');
  }, [getRootNav]);

  const confirmDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const result = await dispatch(deleteUserMeThunk());
              if (deleteUserMeThunk.rejected.match(result)) {
                Alert.alert('Error', (result.payload as string) ?? 'Could not delete account.');
                return;
              }
              await logout();
            })();
          },
        },
      ],
    );
  }, [dispatch, logout]);

  const onMenuPress = useCallback(
    (key: string) => {
      if (key === 'delete') {
        if (isLoggedIn) {
          confirmDeleteAccount();
        } else {
          openSignIn();
        }
        return;
      }
      if (key === 'terms') {
        getRootNav()?.navigate('TermsAndConditions');
        return;
      }
      if (key === 'privacy') {
        getRootNav()?.navigate('PrivacyPolicy');
        return;
      }
      if (key === 'help') {
        getRootNav()?.navigate('HelpSupport');
        return;
      }
      if (key === 'faq') {
        getRootNav()?.navigate('Faq');
        return;
      }
    },
    [getRootNav, confirmDeleteAccount, isLoggedIn, openSignIn],
  );

  const onManageTradie = useCallback(() => {
    if (!isLoggedIn) {
      openSignIn();
      return;
    }
    getRootNav()?.navigate('ManageTradies');
  }, [getRootNav, isLoggedIn, openSignIn]);

  const onBecomeTradie = useCallback(() => {
    if (!isLoggedIn) {
      openSignIn();
      return;
    }
    getRootNav()?.navigate('BecomeTradie', { mode: 'create' });
  }, [getRootNav, isLoggedIn, openSignIn]);

  const formatRating = (value: number | undefined) =>
    value != null && Number.isFinite(value) ? value.toFixed(1) : '—';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarSpace }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.identity}>
                <View style={styles.avatarWrap}>
                  <RemoteImage
                    uri={displayAvatar}
                    fallback={DEFAULT_AVATAR}
                    style={styles.avatar}
                    containerStyle={styles.avatar}
                    resizeMode="cover"
                    accessibilityLabel="Profile photo"
                  />
                </View>
                <View style={styles.identityText}>
                  <Text style={styles.displayName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  {/* {businessName ? (
                    <Text style={styles.businessName} numberOfLines={1}>
                      {businessName}
                    </Text>
                  ) : null} */}
                  {displayPhone ? (
                    <Text style={styles.phone} numberOfLines={1}>
                      {displayPhone}
                    </Text>
                  ) : null}
                  {profileStatus ? (
                    <Text style={styles.statusBadge}>{profileStatusLabel(profileStatus)}</Text>
                  ) : null}
                </View>
              </View>

              <Pressable
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Edit profile"
                style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
                onPress={() => {
                  if (!isLoggedIn) {
                    openSignIn();
                    return;
                  }
                  setEditProfileOpen(true);
                }}
              >
                <Icon name="icn_edit-02" width={18} height={18} color={colors.onboardingTitle} />
              </Pressable>
            </View>

            {/* {isTradie && tradieStats ? (
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{tradieStats.visitCount}</Text>
                  <Text style={styles.statLabel}>Visits</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{tradieStats.reviewCount}</Text>
                  <Text style={styles.statLabel}>Reviews</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatRating(tradieStats.averageRating)}</Text>
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
              </View>
            ) : null} */}

            <View style={styles.heroDivider} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isTradie ? 'Manage Tradie' : 'Become a Tradie'}
              onPress={isTradie ? onManageTradie : onBecomeTradie}
              style={({ pressed }) => [styles.tradieRow, pressed && styles.pressed]}
            >
              <Image source={TRADIE_BADGE} style={styles.tradieBadge} resizeMode="cover" />
              <Text style={styles.tradieLabel} numberOfLines={1}>
                {isTradie ? 'Manage Tradie' : 'Become a Tradie'}
              </Text>
              <Icon name="arrow-right-01" width={18} height={18} color={colors.primary} />
            </Pressable>

            {isLoggedIn && usersLoading ? (
              <ActivityIndicator style={styles.heroLoader} color={colors.primary} />
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.menuCard}>
            {MENU_ITEMS.map((item, idx) => (
              <ProfileMenuRow
                key={item.key}
                icon={item.icon}
                label={item.label}
                onPress={() => onMenuPress(item.key)}
                showBorderTop={idx > 0}
              />
            ))}
          </View>
        </View>

        <View style={styles.logoutWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isLoggedIn ? 'Logout' : 'Sign in'}
            onPress={isLoggedIn ? () => void logout() : openSignIn}
            style={({ pressed }) => [styles.logoutCard, pressed && styles.pressed]}
          >
            <Icon name="logout-01" width={24} height={24} color={colors.onboardingTitle} />
            <Text style={styles.logoutLabel}>{isLoggedIn ? 'Logout' : 'Sign in'}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <EditProfileBottomSheet
        visible={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        isLoggedIn={isLoggedIn}
        initialName={displayName}
        initialPhone={displayPhone ?? ''}
        initialAvatarUri={displayAvatar ?? ''}
        onSaved={({ name, phone, profilePhotoUri }) => {
          if (!isLoggedIn) {
            setGuestName(name);
            setGuestPhone(phone);
            setGuestAvatarUri(profilePhotoUri);
          }
        }}
      />
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
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.onboardingTitle,
  },
  scroll: {
    paddingTop: 12,
    gap: 20,
  },
  section: {
    paddingHorizontal: 20,
  },
  heroCard: {
    backgroundColor: '#FFF0EF',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: '#E6E6E6',
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  identityText: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  displayName: {
    ...nunitoSans.medium,
    fontSize: 20,
    lineHeight: 26,
    color: colors.onboardingTitle,
    textTransform: 'capitalize',
  },
  businessName: {
    ...nunitoSans.regular,
    fontSize: 14,
    lineHeight: 18,
    color: colors.primary,
  },
  phone: {
    ...nunitoSans.regular,
    fontSize: 14,
    lineHeight: 18,
    color: '#717171',
  },
  statusBadge: {
    fontFamily: fontFamilies.inter.medium,
    fontSize: 12,
    lineHeight: 16,
    color: '#B45309',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    marginTop: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 16,
    lineHeight: 20,
    color: colors.onboardingTitle,
  },
  statLabel: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 11,
    lineHeight: 14,
    color: '#717171',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#F1D9D6',
  },
  editBtn: {
    width: 42,
    height: 42,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDivider: {
    height: 1,
    backgroundColor: '#F1D9D6',
    marginVertical: 4,
  },
  tradieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  tradieBadge: {
    width: 32,
    height: 30,
    borderRadius: 16,
  },
  tradieLabel: {
    flex: 1,
    ...nunitoSans.medium,
    fontSize: 18,
    lineHeight: 24,
    color: colors.primary,
  },
  heroLoader: {
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: fontFamilies.inter.medium,
    fontSize: 16,
    lineHeight: 20,
    color: '#616161',
    marginBottom: 16,
  },
  menuCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: '#EAEAEF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logoutWrap: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  logoutCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: '#EAEAEF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoutLabel: {
    flex: 1,
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    lineHeight: 18,
    color: colors.onboardingTitle,
  },
  pressed: {
    opacity: 0.7,
  },
});
