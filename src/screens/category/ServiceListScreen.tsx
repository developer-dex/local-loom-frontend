import { useCallback, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, NearYouCard, type NearYouItem } from '../../components/ui';
import type { TradieListItem, TradieRegion } from '../../api/tradieTypes';
import type { CategoryStackParamList } from '../../navigation/categoryTypes';
import type { RootStackParamList } from '../../navigation/types';
import {
  useAppDispatch,
  useAppSelector,
  selectTradieList,
  selectTradieListStatus,
  selectTradieListError,
} from '../../store/hooks';
import { clearTradieList, fetchTradiesThunk } from '../../store/slices/tradiesSlice';
import { colors, fontFamilies, nunitoSans } from '../../theme';
import { resolveMediaUrl } from '../../utils/mediaUrl';

type Props = NativeStackScreenProps<CategoryStackParamList, 'ServiceList'>;

const FALLBACK_IMAGE = require('../../../assets/first.png');

function formatTradieRegions(regions: TradieRegion[] | undefined): string {
  if (!regions?.length) return '';
  return regions.map((r) => r.name).join(', ');
}

function toNearYouItem(tradie: TradieListItem): NearYouItem {
  const imageUri = tradie.businessImage
    ? (resolveMediaUrl(tradie.businessImage) ?? tradie.businessImage)
    : undefined;
  const services = Array.isArray(tradie.services) ? tradie.services : [];
  return {
    id: tradie.id,
    image: imageUri ? { uri: imageUri } : FALLBACK_IMAGE,
    title: tradie.businessName ?? 'Business',
    category: services[0]?.name ?? '',
    status: tradie.isOpen ? 'open' : 'closed',
    region: formatTradieRegions(tradie.regions),
    rating: String(tradie.averageRating ?? 0),
    reviews: `(${tradie.totalRatingCount ?? 0})`,
    isFavourite: tradie.isFavourite === true,
    isEmergencyAvailable: tradie.isEmergencyAvailable === true,
  };
}

export function ServiceListScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { categoryId, categoryTitle, regionId } = route.params;
  const tabBarSpace = useMemo(() => 88 + Math.max(insets.bottom, 14), [insets.bottom]);
  const dispatch = useAppDispatch();
  const tradieList = useAppSelector(selectTradieList);
  const listStatus = useAppSelector(selectTradieListStatus);
  const listError = useAppSelector(selectTradieListError);

  useEffect(() => {
    dispatch(clearTradieList());
    dispatch(fetchTradiesThunk({ categoryId, regionId }));
  }, [dispatch, categoryId, regionId]);

  const items = useMemo<NearYouItem[]>(() => tradieList.map(toNearYouItem), [tradieList]);

  const isLoading = listStatus === 'loading';

  const openServiceDetail = useCallback(
    (providerId: string, isFavourite?: boolean) => {
      if (!providerId) return;
      const params = { providerId, isFavourite: isFavourite === true };
      const root = navigation.getParent()?.getParent<NativeStackNavigationProp<RootStackParamList>>();
      if (root) {
        root.navigate('ServiceDetail', params);
        return;
      }
      navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate(
        'ServiceDetail',
        params,
      );
    },
    [navigation],
  );

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
        <Text style={styles.topTitle} numberOfLines={1}>
          {categoryTitle}
        </Text>
        <View style={styles.topNavSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : listError ? (
        <Text style={styles.error}>{listError}</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarSpace }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.empty}>No service providers in this category yet.</Text>
          }
          renderItem={({ item }) => (
            <NearYouCard
              item={item}
              onPress={() => openServiceDetail(item.id, item.isFavourite)}
            />
          )}
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
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    minHeight: 48,
  },
  topNavSpacer: {
    width: 24,
  },
  topTitle: {
    flex: 1,
    ...nunitoSans.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.onboardingTitle,
    textAlign: 'center',
  },
  list: {
    gap: 12,
    paddingTop: 8,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    ...nunitoSans.regular,
    fontSize: 14,
    color: colors.label,
    textAlign: 'center',
    marginTop: 32,
  },
  error: {
    ...nunitoSans.regular,
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginTop: 32,
  },
});
