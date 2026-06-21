import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
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
import type { Region } from '../../api/regionTypes';
import {
  useAppDispatch,
  useAppSelector,
  selectCategories,
  selectCategoriesStatus,
  selectCategoriesError,
  selectRegions,
  selectRegionsStatus,
} from '../../store/hooks';
import { fetchCategoriesThunk } from '../../store/slices/categoriesSlice';
import { fetchRegionsThunk } from '../../store/slices/regionsSlice';
import { colors, nunitoSans } from '../../theme';
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
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);

  const dispatch = useAppDispatch();
  const apiCategories = useAppSelector(selectCategories);
  const status = useAppSelector(selectCategoriesStatus);
  const apiError = useAppSelector(selectCategoriesError);
  const regions = useAppSelector(selectRegions);
  const regionsStatus = useAppSelector(selectRegionsStatus);
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
      navigation.navigate('ServiceList', {
        categoryId,
        categoryTitle,
        regionId: selectedRegion?.id,
      });
    },
    [navigation, selectedRegion],
  );

  const handleLocationPress = useCallback(() => {
    dispatch(fetchRegionsThunk());
    setShowLocationModal(true);
  }, [dispatch]);

  const handleRegionSelect = useCallback((region: Region) => {
    setSelectedRegion(region);
    setShowLocationModal(false);
  }, []);

  const handleClearRegion = useCallback(() => {
    setSelectedRegion(null);
    setShowLocationModal(false);
  }, []);

  const isLoading = status !== 'succeeded' && status !== 'failed';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Text style={styles.pageTitle}>All Categories</Text>

      <View style={styles.searchRow}>
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
        <Pressable
          style={[
            styles.locationBtn,
            selectedRegion && styles.locationBtnActive,
          ]}
          onPress={handleLocationPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Filter by location"
        >
          <Icon
            name="location-01"
            width={20}
            height={20}
            color={selectedRegion ? colors.background : colors.searchColor}
          />
        </Pressable>
      </View>

      {selectedRegion && (
        <View style={styles.selectedRegionChip}>
          <Icon name="location-01" width={14} height={14} color={colors.primary} />
          <Text style={styles.selectedRegionText} numberOfLines={1}>
            {selectedRegion.name}
          </Text>
          <Pressable onPress={handleClearRegion} hitSlop={8} accessibilityLabel="Clear location filter">
            <Icon name="cancel-01" width={16} height={16} color={colors.label} />
          </Pressable>
        </View>
      )}

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

      {/* Location filter modal */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Location</Text>
              <Pressable
                onPress={() => setShowLocationModal(false)}
                hitSlop={12}
                accessibilityLabel="Close location picker"
              >
                <Icon name="cancel-01" width={24} height={24} color={colors.onboardingTitle} />
              </Pressable>
            </View>

            {regionsStatus === 'loading' ? (
              <View style={styles.modalLoadingWrap}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <FlatList
                data={regions.filter((r) => r.isActive)}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                  <Pressable
                    style={styles.regionItem}
                    onPress={handleClearRegion}
                    accessibilityLabel="All locations"
                  >
                    <Icon name="location-01" width={18} height={18} color={colors.label} />
                    <Text style={[styles.regionItemText, !selectedRegion && styles.regionItemActive]}>
                      All Locations
                    </Text>
                    {!selectedRegion && (
                      <Icon name="checkmark-badge-01" width={18} height={18} color={colors.primary} />
                    )}
                  </Pressable>
                }
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.regionItem}
                    onPress={() => handleRegionSelect(item)}
                    accessibilityLabel={`Select ${item.name}`}
                  >
                    <Icon name="location-01" width={18} height={18} color={colors.primary} />
                    <Text
                      style={[
                        styles.regionItemText,
                        selectedRegion?.id === item.id && styles.regionItemActive,
                      ]}
                    >
                      {item.name}
                    </Text>
                    {selectedRegion?.id === item.id && (
                      <Icon name="checkmark-badge-01" width={18} height={18} color={colors.primary} />
                    )}
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Text style={styles.empty}>No locations available.</Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 40,
    paddingHorizontal: 16,
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
  locationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 2,
  },
  locationBtnActive: {
    backgroundColor: colors.primary,
  },
  selectedRegionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
    borderRadius: 20,
    backgroundColor: '#FFF0EB',
  },
  selectedRegionText: {
    ...nunitoSans.regular,
    fontSize: 13,
    color: colors.primary,
    maxWidth: 180,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    ...nunitoSans.bold,
    fontSize: 18,
    color: colors.onboardingTitle,
  },
  modalLoadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  regionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  regionItemText: {
    flex: 1,
    ...nunitoSans.regular,
    fontSize: 15,
    color: colors.onboardingTitle,
  },
  regionItemActive: {
    ...nunitoSans.semibold,
    color: colors.primary,
  },
});
