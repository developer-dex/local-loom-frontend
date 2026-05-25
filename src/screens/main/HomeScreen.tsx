import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, NearYouCard, PillChip, RemoteImage, type NearYouItem } from '../../components/ui';
import type { MainTabParamList } from '../../navigation/mainTabTypes';
import type { RootStackParamList } from '../../navigation/types';
import type { FetchTradiesParams } from '../../api/tradies';
import { colors, fontFamilies, nunitoSans } from '../../theme';
import {
  useAppSelector,
  useAppDispatch,
  selectAuthUser,
  selectCategories,
  selectCategoriesStatus,
  selectTradieList,
  selectTradieListStatus,
} from '../../store/hooks';
import { fetchCategoriesThunk } from '../../store/slices/categoriesSlice';
import { clearTradieList, fetchTradiesThunk } from '../../store/slices/tradiesSlice';
import type { TradieListItem, TradieRegion } from '../../api/tradieTypes';
import { resolveMediaUrl } from '../../utils/mediaUrl';

function formatTradieRegions(regions: TradieRegion[] | undefined): string {
  if (!regions?.length) return '';
  return regions.map((r) => r.name).join(', ');
}

type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

type HomeRouteProp = RouteProp<MainTabParamList, 'Home'>;

/** Fallback image when the tradie has no businessImage. */
const FALLBACK_IMAGE = require('../../../assets/first.png');
const HEADER_AVATAR_FALLBACK = require('../../../assets/signup/customer.png');

/** Map a TradieListItem to the NearYouItem shape expected by NearYouCard. */
function toNearYouItem(tradie: TradieListItem): NearYouItem {
  const imageUri = tradie.businessImage
    ? (resolveMediaUrl(tradie.businessImage) ?? tradie.businessImage)
    : undefined;
  return {
    id: tradie.id,
    image: imageUri ? { uri: imageUri } : FALLBACK_IMAGE,
    title: tradie.businessName,
    category: tradie.services[0]?.name ?? '',
    status: tradie.isOpen ? 'open' : 'closed',
    region: formatTradieRegions(tradie.regions),
    rating: String(tradie.averageRating ?? 0),
    reviews: `(${tradie.totalRatingCount ?? 0})`,
    isFavourite: tradie.isFavourite === true,
  };
}

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<HomeNav>();
  const route = useRoute<HomeRouteProp>();
  const dispatch = useAppDispatch();
  const tabBarSpace = useMemo(() => 88 + Math.max(insets.bottom, 14), [insets.bottom]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    () => route.params?.categoryId ?? null,
  );
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(
    () => route.params?.regionId ?? null,
  );
  const [aiBannerPrompt, setAiBannerPrompt] = useState<string | null>(
    () => route.params?.aiPrompt ?? null,
  );
  const authUser = useAppSelector(selectAuthUser);
  const categories = useAppSelector(selectCategories);
  const categoriesStatus = useAppSelector(selectCategoriesStatus);
  const tradieList = useAppSelector(selectTradieList);
  const listStatus = useAppSelector(selectTradieListStatus);

  const displayName = authUser?.name ?? 'Guest';
  const displayAvatar = useMemo(() => {
    if (!authUser?.avatar) return null;
    return resolveMediaUrl(authUser.avatar) ?? authUser.avatar;
  }, [authUser?.avatar]);

  const popularCategories = useMemo(
    () => [...categories].filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );

  useEffect(() => {
    dispatch(fetchCategoriesThunk());
  }, [dispatch]);

  useEffect(() => {
    const params = route.params;
    if (params?.categoryId) setSelectedCategoryId(params.categoryId);
    if (params?.regionId) setSelectedRegionId(params.regionId);
    if (params?.aiPrompt) setAiBannerPrompt(params.aiPrompt);
  }, [route.params?.categoryId, route.params?.regionId, route.params?.aiPrompt]);

  const tradieFetchParams = useMemo((): FetchTradiesParams | undefined => {
    const params: FetchTradiesParams = {};
    if (selectedCategoryId) params.categoryId = selectedCategoryId;
    if (selectedRegionId) params.regionId = selectedRegionId;
    return Object.keys(params).length > 0 ? params : undefined;
  }, [selectedCategoryId, selectedRegionId]);

  const isAiFilteredMode = Boolean(aiBannerPrompt ?? route.params?.aiPrompt);

  useEffect(() => {
    if (isAiFilteredMode) {
      const categoryId = selectedCategoryId ?? route.params?.categoryId;
      const regionId = selectedRegionId ?? route.params?.regionId;
      if (!categoryId || !regionId) return;

      dispatch(clearTradieList());
      dispatch(fetchTradiesThunk({ categoryId, regionId }));
      return;
    }

    dispatch(fetchTradiesThunk(tradieFetchParams));
  }, [
    dispatch,
    isAiFilteredMode,
    selectedCategoryId,
    selectedRegionId,
    route.params?.categoryId,
    route.params?.regionId,
    tradieFetchParams,
  ]);

  const selectedCategoryName = useMemo(() => {
    if (!selectedCategoryId) return null;
    return categories.find((c) => c.id === selectedCategoryId)?.name ?? null;
  }, [categories, selectedCategoryId]);

  const openServiceDetail = useCallback(
    (providerId: string) => {
      if (!providerId) return;
      navigation.navigate('ServiceDetail', { providerId });
    },
    [navigation],
  );

  const goToCategoryTab = useCallback(() => {
    navigation.navigate('Category');
  }, [navigation]);

  const goToChatTab = useCallback(() => {
    navigation.navigate('Chat');
  }, [navigation]);

  const openAiSearch = useCallback(() => {
    navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate('AiSearch');
  }, [navigation]);

  const clearAiFilters = useCallback(() => {
    setSelectedCategoryId(null);
    setSelectedRegionId(null);
    setAiBannerPrompt(null);
    navigation.setParams({ categoryId: undefined, regionId: undefined, aiPrompt: undefined });
  }, [navigation]);

  const nearYouItems = useMemo<NearYouItem[]>(() => tradieList.map(toNearYouItem), [tradieList]);

  const categoriesPending =
    categoriesStatus !== 'succeeded' && categoriesStatus !== 'failed';
  const tradiesPending = listStatus !== 'succeeded' && listStatus !== 'failed';
  const showCategories = categoriesStatus === 'succeeded' && popularCategories.length > 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <RemoteImage
            uri={displayAvatar}
            fallback={HEADER_AVATAR_FALLBACK}
            style={styles.avatar}
            containerStyle={[styles.avatar, !displayAvatar && styles.avatarPlaceholder]}
            resizeMode="cover"
            accessibilityLabel="Your profile photo"
          />
          <View style={styles.headerTextCol}>
            <Text style={styles.userName} numberOfLines={1}>
              {displayName}
            </Text>
            {/* <Text style={styles.userLocation} numberOfLines={1}>
              Building 1234, Road 5678..
            </Text> */}
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="AI search"
            onPress={openAiSearch}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <LinearGradient
              colors={['#F58E83', '#C9A0DC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.aiChip}
            >
              <Text style={styles.aiChipText}>✦ AI</Text>
            </LinearGradient>
          </Pressable>
          <Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel="Notifications">
            <Icon name="notification-01" width={24} height={24} color={colors.onboardingTitle} />
          </Pressable>
          <Pressable
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Messages"
            onPress={goToChatTab}
          >
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
        {aiBannerPrompt ? (
          <View style={styles.aiBanner}>
            <View style={styles.aiBannerCopy}>
              <Text style={styles.aiBannerTitle}>AI results</Text>
              <Text style={styles.aiBannerText} numberOfLines={2}>
                "{aiBannerPrompt}"
                {selectedCategoryName ? ` · ${selectedCategoryName}` : ''}
              </Text>
            </View>
            <Pressable
              onPress={clearAiFilters}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear AI filters"
            >
              <Icon name="cancel-01" width={18} height={18} color={colors.primary} />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Categories</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="See all categories"
              onPress={goToCategoryTab}
            >
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>
          {categoriesPending ? (
            <ActivityIndicator color={colors.primary} style={styles.categoriesLoader} />
          ) : showCategories ? (
            <FlatList
              data={popularCategories}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              extraData={selectedCategoryId}
              renderItem={({ item }) => (
                <PillChip
                  variant="home"
                  label={item.name}
                  selected={selectedCategoryId === item.id}
                  onPress={() =>
                    setSelectedCategoryId((prev) => (prev === item.id ? null : item.id))
                  }
                />
              )}
              contentContainerStyle={styles.categoriesRow}
              style={styles.categoriesList}
            />
          ) : (
            <Text style={styles.emptyText}>No categories available.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitleNear}>Near You</Text>
          {tradiesPending ? (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={styles.loader}
              accessibilityLabel="Loading tradies"
            />
          ) : nearYouItems.length > 0 ? (
            <View style={styles.nearList}>
              {nearYouItems.map((item) => (
                <NearYouCard
                  key={item.id}
                  item={item}
                  onPress={() => openServiceDetail(item.id)}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No tradies available.</Text>
          )}
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
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
    paddingBottom: 24,
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
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
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
    ...nunitoSans.regular,
    fontSize: 14,
    lineHeight: 18,
    color: colors.onboardingBody,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 48,
    alignItems: 'center',
  },
  aiChipText: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 12,
    lineHeight: 14,
    color: colors.onPrimary,
  },
  pressed: {
    opacity: 0.75,
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFF0EF',
    borderWidth: 1,
    borderColor: '#F1D9D6',
  },
  aiBannerCopy: {
    flex: 1,
    gap: 4,
  },
  aiBannerTitle: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 13,
    lineHeight: 16,
    color: colors.primary,
  },
  aiBannerText: {
    ...nunitoSans.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onboardingBody,
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
    ...nunitoSans.medium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.onboardingTitle,
  },
  sectionTitleNear: {
    ...nunitoSans.medium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.onboardingTitle,
  },
  seeAll: {
    ...nunitoSans.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.label,
  },
  categoriesList: {
    flexGrow: 0,
  },
  categoriesLoader: {
    alignSelf: 'flex-start',
    marginVertical: 8,
  },
  categoriesRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 4,
  },
  nearList: {
    gap: 12,
  },
  loader: {
    marginVertical: 32,
  },
  emptyText: {
    ...nunitoSans.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.label,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
