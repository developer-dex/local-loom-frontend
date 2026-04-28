import { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, NearYouCard, PillChip, type NearYouItem } from '../../components/ui';
import type { RootStackParamList } from '../../navigation/types';
import { colors, fontFamilies } from '../../theme';

/** Remote assets — replace avatar with a local file when ready. */
const assets = {
  avatar: 'https://www.figma.com/api/mcp/asset/3d597b90-42da-45fc-b8bc-341bc585a1a7',
} as const;

const CATEGORIES: string[] = [
  'Plumber',
  'Electrician',
  'AC Repair',
  'Services',
  'Automotive',
  "Men's Salon",
  'Carpenter',
  'Cleaner',
  'Painter',
];

const NEAR_YOU: NearYouItem[] = [
  {
    id: '1',
    image: require('../../../assets/first.png'),
    title: 'John The Plumber',
    category: 'Plumber',
    status: 'open',
    distance: 'Melbourne, Australia',
    rating: '5.0',
    reviews: '(127)',
  },
  {
    id: '2',
    image: require('../../../assets/second.png'),
    title: "Mark's electical",
    category: 'Electrician',
    status: 'open',
    distance: 'Adelaide, Australia',
    rating: '4.7',
    reviews: '(89)',
  },
  {
    id: '3',
    image: require('../../../assets/third.png'),
    title: 'Herry Ac works',
    category: 'AC Repair',
    status: 'closed',
    distance: 'Sydney, Australia',
    rating: '4.2',
    reviews: '(56)',
  },
];

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const tabBarSpace = useMemo(() => 88 + Math.max(insets.bottom, 14), [insets.bottom]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const openServiceDetail = useCallback(
    (providerId: string) => {
      const parent = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
      parent?.navigate('ServiceDetail', { providerId });
    },
    [navigation],
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={{ uri: assets.avatar }} style={styles.avatar} />
          <View style={styles.headerTextCol}>
            <Text style={styles.userName} numberOfLines={1}>
              Olivia White
            </Text>
            <Text style={styles.userLocation} numberOfLines={1}>
              Building 1234, Road 5678..
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel="Notifications">
            <Icon name="notification-01" width={24} height={24} color={colors.onboardingTitle} />
          </Pressable>
          <Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel="Messages">
            <Icon name="bubble-chat" width={24} height={24} color={colors.onboardingTitle} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarSpace }]}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Categories</Text>
            <Pressable>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>
          <FlatList
            data={CATEGORIES}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item}
            extraData={selectedCategory}
            renderItem={({ item }) => (
              <PillChip
                variant="home"
                label={item}
                selected={selectedCategory === item}
                onPress={() => setSelectedCategory(item)}
              />
            )}
            contentContainerStyle={styles.categoriesRow}
            style={styles.categoriesList}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitleNear}>Near You</Text>
          <View style={styles.nearList}>
            {NEAR_YOU.map((item) => (
              <NearYouCard key={item.id} item={item} onPress={() => openServiceDetail(item.id)} />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    // paddingTop: 8,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
    paddingBottom: 24,
    // minHeight: 48,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
  },
  headerTextCol: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  userName: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.onboardingTitle,
  },
  userLocation: {
    fontFamily: fontFamilies.nunitoSans.regular,
    fontSize: 14,
    lineHeight: 18,
    color: colors.onboardingBody,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#FFF0EF',
    borderRadius: 20,
    padding: 16,
    gap: 20,
  },
  greetingBlock: {
    gap: 6,
  },
  greetingLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  greetingText: {
    fontFamily: fontFamilies.nunitoSans.bold,
    fontSize: 20,
    lineHeight: 26,
  },
  greetingHey: {
    color: colors.primary,
  },
  greetingName: {
    color: colors.onboardingTitle,
  },
  greetingEmoji: {
    fontFamily: fontFamilies.manrope.semibold,
    fontSize: 24,
    lineHeight: 26,
    color: colors.onboardingTitle,
  },
  greetingSub: {
    fontFamily: fontFamilies.nunitoSans.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.placeholder,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 40,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderRadius: 40,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    padding: 0,
    fontFamily: fontFamilies.nunitoSans.regular,
    fontSize: 14,
    lineHeight: 18,
    color: colors.onboardingTitle,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: fontFamilies.nunitoSans.medium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.onboardingTitle,
  },
  sectionTitleNear: {
    fontFamily: fontFamilies.nunitoSans.medium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.onboardingTitle,
  },
  seeAll: {
    fontFamily: fontFamilies.nunitoSans.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.label,
  },
  /** `flexGrow: 0` keeps a horizontal `FlatList` from fighting the parent vertical `ScrollView` layout. */
  categoriesList: {
    flexGrow: 0,
  },
  categoriesRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 4,
  },
  nearList: {
    gap: 12,
  },
});
