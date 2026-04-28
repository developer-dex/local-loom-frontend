import { useCallback, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EditProfileBottomSheet, ProfileMenuRow } from '../../components/profile';
import { Icon, type IconName } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { colors, fontFamilies } from '../../theme';

const AVATAR_URI =
  'https://www.figma.com/api/mcp/asset/3d597b90-42da-45fc-b8bc-341bc585a1a7';

const TRADIE_BADGE: ImageSourcePropType = require('../../../assets/signup/tradie.png');

type MenuItem = {
  key: string;
  icon: IconName;
  label: string;
};

const MENU_ITEMS: MenuItem[] = [
  { key: 'help', icon: 'help', label: 'Help & Support' },
  { key: 'terms', icon: 'terms', label: 'Terms & Conditions' },
  { key: 'about', icon: 'about', label: 'About' },
  { key: 'faq', icon: 'faq', label: "FAQ’S" },
  { key: 'privacy', icon: 'icn_privacy', label: 'Privacy Policy' },
  { key: 'delete', icon: 'trash', label: 'Delete Account' },
];

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isLoggedIn, logout } = useAuth();
  const [profileName, setProfileName] = useState('James David');
  const [profilePhone, setProfilePhone] = useState('9979656770');
  const [profileAvatarUri, setProfileAvatarUri] = useState(AVATAR_URI);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  const tabBarSpace = 96 + Math.max(insets.bottom, 14);

  const getRootNav = useCallback(() => {
    return navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  }, [navigation]);

  const openSignIn = useCallback(() => {
    getRootNav()?.navigate('SignIn');
  }, [getRootNav]);

  const onMenuPress = useCallback((key: string) => {
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

    void key;
  }, [getRootNav]);

  const onBecomeTradie = useCallback(() => {
    getRootNav()?.navigate('BecomeTradie');
  }, [getRootNav]);

  const onLogout = useCallback(() => {
    if (isLoggedIn) {
      void logout();
    } else {
      openSignIn();
    }
  }, [isLoggedIn, logout, openSignIn]);

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
                  <Image source={{ uri: profileAvatarUri }} style={styles.avatar} resizeMode="cover" />
                </View>
                <View style={styles.identityText}>
                  <Text style={styles.displayName} numberOfLines={1}>
                    {profileName}
                  </Text>
                  <Text style={styles.phone} numberOfLines={1}>
                    {profilePhone}
                  </Text>
                </View>
              </View>

              <Pressable
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Edit profile"
                style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
                onPress={() => setEditProfileOpen(true)}
              >
                <Icon name="icn_edit-02" width={18} height={18} color={colors.onboardingTitle} />
              </Pressable>
            </View>

            <View style={styles.heroDivider} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Become a Tradies"
              onPress={onBecomeTradie}
              style={({ pressed }) => [styles.tradieRow, pressed && styles.pressed]}
            >
              <Image source={TRADIE_BADGE} style={styles.tradieBadge} resizeMode="cover" />
              <Text style={styles.tradieLabel} numberOfLines={1}>
                Become  A Tradies
              </Text>
              <Icon name="arrow-right-01" width={18} height={18} color={colors.primary} />
            </Pressable>
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
            onPress={onLogout}
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
        initialName={profileName}
        initialPhone={profilePhone}
        initialAvatarUri={profileAvatarUri}
        onSaved={({ name, phone, profilePhotoUri }) => {
          setProfileName(name);
          setProfilePhone(phone);
          if (profilePhotoUri) {
            setProfileAvatarUri(profilePhotoUri);
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
  /* Hero ----------------------------------------------------------------- */
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
    fontFamily: fontFamilies.nunitoSans.medium,
    fontSize: 20,
    lineHeight: 26,
    color: colors.onboardingTitle,
    textTransform: 'capitalize',
  },
  phone: {
    fontFamily: fontFamilies.nunitoSans.regular,
    fontSize: 14,
    lineHeight: 18,
    color: '#717171',
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
    fontFamily: fontFamilies.nunitoSans.medium,
    fontSize: 18,
    lineHeight: 24,
    color: colors.primary,
  },
  /* About card ----------------------------------------------------------- */
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
  /* Logout --------------------------------------------------------------- */
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
