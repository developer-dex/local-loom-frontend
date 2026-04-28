import { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/ui';
import type { RootStackParamList } from '../../navigation/types';
import { colors, fontFamilies, spacing } from '../../theme';

type ChatRow = {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread?: number;
  avatarUri?: string;
};

const MOCK_CHATS: ChatRow[] = [
  {
    id: '1',
    name: 'John Smith',
    lastMessage: 'Sure — I can come tomorrow morning.',
    time: '9:41',
    unread: 2,
    avatarUri: 'https://i.pravatar.cc/120?img=12',
  },
  {
    id: '2',
    name: 'Plumbing Pros',
    lastMessage: 'Quote sent. Let me know if you have questions.',
    time: '8:12',
    unread: 0,
    avatarUri: 'https://i.pravatar.cc/120?img=32',
  },
  {
    id: '3',
    name: 'Sarah (Electrician)',
    lastMessage: 'Can you share a photo of the switchboard?',
    time: 'Yesterday',
    unread: 1,
    avatarUri: 'https://i.pravatar.cc/120?img=47',
  },
];

export function ChatsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [query, setQuery] = useState('');

  const openChat = (item: ChatRow) => {
    const root = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
    root?.navigate('ChatDetail', { chatId: item.id, name: item.name, avatarUri: item.avatarUri });
  };

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_CHATS;
    return MOCK_CHATS.filter((c) => (c.name + ' ' + c.lastMessage).toLowerCase().includes(q));
  }, [query]);

  const renderItem: ListRenderItem<ChatRow> = ({ item }) => {
    const hasUnread = (item.unread ?? 0) > 0;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open chat with ${item.name}`}
        onPress={() => openChat(item)}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <View style={styles.avatarWrap}>
          {item.avatarUri ? (
            <Image source={{ uri: item.avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Icon name="user-03" width={18} height={18} color={colors.placeholder} />
            </View>
          )}
        </View>

        <View style={styles.rowMain}>
          <View style={styles.rowTop}>
            <Text numberOfLines={1} style={styles.name}>
              {item.name}
            </Text>
            <Text style={styles.time}>{item.time}</Text>
          </View>

          <View style={styles.rowBottom}>
            <Text numberOfLines={1} style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]}>
              {item.lastMessage}
            </Text>
            {hasUnread ? (
              <View style={styles.unreadPill} accessibilityLabel={`${item.unread} unread messages`}>
                <Text style={styles.unreadText}>{item.unread}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat</Text>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchField}>
          <Icon name="search-01" width={18} height={18} color={colors.placeholder} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            placeholderTextColor={colors.placeholder}
            style={styles.searchInput}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 14) + spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No chats found</Text>
            <Text style={styles.emptyBody}>Try a different search.</Text>
          </View>
        }
      />
    </View>
  );
}

const AVATAR = 44;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
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
  searchWrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: colors.background,
  },
  searchField: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.background,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    lineHeight: 18,
    color: colors.onboardingTitle,
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  avatarWrap: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#EAEAEF',
  },
  avatar: { width: '100%', height: '100%' },
  avatarFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  rowMain: { flex: 1, gap: 6 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  name: {
    flex: 1,
    fontFamily: fontFamilies.nunitoSans.medium,
    fontSize: 16,
    lineHeight: 20,
    color: colors.onboardingTitle,
  },
  time: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.placeholder,
  },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  lastMessage: {
    flex: 1,
    fontFamily: fontFamilies.nunitoSans.regular,
    fontSize: 13,
    lineHeight: 16,
    color: colors.placeholder,
  },
  lastMessageUnread: { color: colors.onboardingTitle, fontFamily: fontFamilies.nunitoSans.medium },
  unreadPill: {
    minWidth: 22,
    height: 22,
    borderRadius: 999,
    paddingHorizontal: 7,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onPrimary,
  },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#EFEFF2' },
  empty: { paddingTop: 48, alignItems: 'center', gap: 6 },
  emptyTitle: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 16,
    lineHeight: 20,
    color: colors.onboardingTitle,
  },
  emptyBody: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.placeholder,
  },
  pressed: { opacity: 0.7 },
});

