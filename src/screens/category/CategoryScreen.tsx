import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryTile } from '../../components/category';
import { Icon } from '../../components/ui';
import { useToast } from '../../components/ui';
import type { CategoryStackParamList } from '../../navigation/categoryTypes';
import {
  useAppDispatch,
  useAppSelector,
  selectCategories,
  selectCategoriesStatus,
  selectCategoriesError,
} from '../../store/hooks';
import { fetchCategoriesThunk } from '../../store/slices/categoriesSlice';
import { colors, fontFamilies, nunitoSans } from '../../theme';
import { prefetchRemoteImages } from '../../utils/prefetchImages';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import type { IconName } from '../../components/ui/Icon';

type Props = NativeStackScreenProps<CategoryStackParamList, 'CategoryHome'>;

/** Map API category name → local icon name for categories that have no remote icon. */
const ICON_FALLBACK: Record<string, IconName> = {
  Plumber: 'work',
  Electrician: 'flash',
  'AC Repair': 'time-04',
  Services: 'dashboard-square-02',
  Automotive: 'motorbike-02',
  "Men's Salon": 'user-03',
  Carpenter: 'pencil-edit-02',
  Cleaner: 'album-02',
  Painter: 'align-box-top-left',
};

export function CategoryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const tabBarSpace = useMemo(() => 88 + Math.max(insets.bottom, 14), [insets.bottom]);
  const [query, setQuery] = useState('');

  const dispatch = useAppDispatch();
  const apiCategories = useAppSelector(selectCategories);
  const status = useAppSelector(selectCategoriesStatus);
  const apiError = useAppSelector(selectCategoriesError);
  const { showToast } = useToast();

  // Fetch on mount (skipped automatically if already succeeded)
  useEffect(() => {
    dispatch(fetchCategoriesThunk());
  }, [dispatch]);

  // Show API errors as a toast
  useEffect(() => {
    if (apiError) {
      showToast({ message: apiError, type: 'error', duration: 5_000 });
    }
  }, [apiError, showToast]);

  // Warm image cache so category tiles load faster on scroll
  useEffect(() => {
    if (apiCategories.length > 0) {
      void prefetchRemoteImages(apiCategories.map((c) => c.icon));
    }
  }, [apiCategories]);

  const displayCategories = useMemo(() => {
    if (status !== 'succeeded' || apiCategories.length === 0) {
      return [];
    }
    return apiCategories.map((c) => ({
      id: c.id,
      title: c.name,
      imageUri: resolveMediaUrl(c.icon) ?? c.icon,
      icon: ICON_FALLBACK[c.name] as IconName | undefined,
    }));
  }, [apiCategories, status]);

  const emptyMessage = useMemo(() => {
    if (query.trim()) {
      return 'No categories match your search.';
    }
    return 'No categories available.';
  }, [query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return displayCategories;
    return displayCategories.filter((c) => c.title.toLowerCase().includes(q));
  }, [query, displayCategories]);

  const onSelect = useCallback(
    (categoryId: string, categoryTitle: string) => {
      navigation.navigate('ServiceList', { categoryId, categoryTitle });
    },
    [navigation],
  );

  const isLoading = status !== 'succeeded' && status !== 'failed';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Text style={styles.pageTitle}>All Categories</Text>

      <View style={styles.searchWrap}>
        <Icon name="search-01" width={20} height={20} color={colors.searchColor} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search categories..."
          placeholderTextColor={colors.placeholder}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          accessibilityLabel="Search categories"
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={3}
          columnWrapperStyle={styles.columnWrap}
          contentContainerStyle={[styles.listContent, { paddingBottom: tabBarSpace }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <CategoryTile
              title={item.title}
              icon={item.icon}
              imageUri={item.imageUri}
              onPress={() => onSelect(item.id, item.title)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.empty}>{emptyMessage}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
  },
  pageTitle: {
    ...nunitoSans.bold,
    fontSize: 18,
    lineHeight: 28,
    color: colors.onboardingTitle,
    paddingVertical: 12,
    marginBottom: 10,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 40,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderRadius: 999,
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    padding: 0,
    ...nunitoSans.regular,
    fontSize: 14,
    lineHeight: 18,
    color: colors.onboardingTitle,
    borderRadius: 40,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  columnWrap: {
    gap: 10,
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  listContent: {
    paddingTop: 4,
    flexGrow: 1,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
    minHeight: 200,
  },
  empty: {
    ...nunitoSans.regular,
    fontSize: 14,
    color: colors.label,
    textAlign: 'center',
    marginTop: 24,
  },
});
