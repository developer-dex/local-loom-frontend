import { useCallback, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, NearYouCard } from '../../components/ui';
import { providersForCategory } from '../../data/mockProviders';
import type { CategoryStackParamList } from '../../navigation/categoryTypes';
import type { RootStackParamList } from '../../navigation/types';
import { colors, fontFamilies } from '../../theme';

type Props = NativeStackScreenProps<CategoryStackParamList, 'ServiceList'>;

export function ServiceListScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { categoryId, categoryTitle } = route.params;
  const tabBarSpace = useMemo(() => 88 + Math.max(insets.bottom, 14), [insets.bottom]);

  const items = useMemo(() => providersForCategory(categoryId), [categoryId]);

  const openServiceDetail = useCallback(
    (providerId: string) => {
      const root = navigation.getParent()?.getParent<NativeStackNavigationProp<RootStackParamList>>();
      root?.navigate('ServiceDetail', { providerId });
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

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarSpace }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.empty}>No services in this category yet.</Text>
        }
        renderItem={({ item }) => (
          <NearYouCard item={item} onPress={() => openServiceDetail(item.id)} />
        )}
      />
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
    fontFamily: fontFamilies.nunitoSans.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.onboardingTitle,
    textAlign: 'center',
  },
  list: {
    gap: 12,
    paddingTop: 8,
  },
  empty: {
    fontFamily: fontFamilies.nunitoSans.regular,
    fontSize: 14,
    color: colors.label,
    textAlign: 'center',
    marginTop: 32,
  },
});
