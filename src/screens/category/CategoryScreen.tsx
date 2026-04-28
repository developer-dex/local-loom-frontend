import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryTile } from '../../components/category';
import { Icon } from '../../components/ui';
import { SERVICE_CATEGORIES } from '../../data/categories';
import type { CategoryStackParamList } from '../../navigation/categoryTypes';
import { colors, fontFamilies } from '../../theme';

type Props = NativeStackScreenProps<CategoryStackParamList, 'CategoryHome'>;

export function CategoryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const tabBarSpace = useMemo(() => 88 + Math.max(insets.bottom, 14), [insets.bottom]);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SERVICE_CATEGORIES;
    return SERVICE_CATEGORIES.filter((c) => c.title.toLowerCase().includes(q));
  }, [query]);

  const onSelect = useCallback(
    (categoryId: string, categoryTitle: string) => {
      navigation.navigate('ServiceList', { categoryId, categoryTitle });
    },
    [navigation],
  );

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
            serviceCount={item.serviceCount}
            onPress={() => onSelect(item.id, item.title)}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No categories match your search.</Text>
        }
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
  pageTitle: {
    fontFamily: fontFamilies.nunitoSans.bold,
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

    // backgroundColor: '#F5F5F5',
  },
  searchInput: {
    flex: 1,
    padding: 0,
    fontFamily: fontFamilies.nunitoSans.regular,
    fontSize: 14,
    lineHeight: 18,
    color: colors.onboardingTitle,
    borderRadius:40,
  },
  columnWrap: {
    gap: 10,
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  listContent: {
    paddingTop: 4,
  },
  empty: {
    fontFamily: fontFamilies.nunitoSans.regular,
    fontSize: 14,
    color: colors.label,
    textAlign: 'center',
    marginTop: 24,
  },
});
