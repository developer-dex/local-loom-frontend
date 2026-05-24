import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/ui';
import type { RootStackParamList } from '../../navigation/types';
import { colors, fontFamilies, nunitoSans } from '../../theme';

type ChatMessage = {
  id: string;
  text: string;
  time: string;
  fromMe: boolean;
};

const LOREM =
  'Lorem ipsum dolor sit amet consectetur. Diam convallis non morbi feugiat. Eu fermentum massa fames platea tortor egestas dictum vestibulum. Sapien lobortis auctor commodo leo odio.';

const SEED_MESSAGES: ChatMessage[] = [
  { id: '1', text: LOREM, time: '7:15pm', fromMe: false },
  { id: '2', text: LOREM, time: '7:15pm', fromMe: true },
];

export function ChatDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'ChatDetail'>>();
  const { name, avatarUri } = route.params ?? { chatId: '', name: 'Chat' };

  const [messages, setMessages] = useState<ChatMessage[]>(SEED_MESSAGES);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const onSend = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    const next: ChatMessage = {
      id: String(Date.now()),
      text,
      time: formatNow(),
      fromMe: true,
    };
    setMessages((prev) => [...prev, next]);
    setDraft('');
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [draft]);

  const renderItem: ListRenderItem<ChatMessage> = ({ item }) => {
    return (
      <View style={[styles.bubbleRow, item.fromMe ? styles.bubbleRowMe : styles.bubbleRowThem]}>
        <View style={[styles.bubble, item.fromMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={styles.bubbleText}>{item.text}</Text>
          <Text style={styles.bubbleTime}>{item.time}</Text>
        </View>
      </View>
    );
  };

  const headerInitial = useMemo(
    () => (name?.trim()?.charAt(0) || 'C').toUpperCase(),
    [name],
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={10}
            onPress={() => {
              if (navigation.canGoBack()) navigation.goBack();
            }}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Icon name="arrow-left-01" width={24} height={24} color={colors.onboardingTitle} />
          </Pressable>

          <View style={styles.headerAvatarWrap}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
                <Text style={styles.headerAvatarInitial}>{headerInitial}</Text>
              </View>
            )}
          </View>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {name}
          </Text>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.inputField}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add attachment"
              hitSlop={10}
              onPress={() => {
                // later: attachments
              }}
              style={({ pressed }) => [styles.plusBtn, pressed && styles.pressed]}
            >
              <Icon name="add-01" width={20} height={20} color={colors.placeholder} />
            </Pressable>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Message"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
              multiline
              returnKeyType="default"
            />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            onPress={onSend}
            disabled={draft.trim().length === 0}
            style={({ pressed }) => [
              styles.sendBtn,
              draft.trim().length === 0 && styles.sendBtnDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Icon name="sent" width={20} height={20} color={colors.onPrimary} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function formatNow(): string {
  const d = new Date();
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m}${ampm}`;
}

const HEADER_AVATAR = 36;

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.background,
  },
  backBtn: { width: 28, height: 28, alignItems: 'flex-start', justifyContent: 'center' },
  headerAvatarWrap: {
    width: HEADER_AVATAR,
    height: HEADER_AVATAR,
    borderRadius: HEADER_AVATAR / 2,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  headerAvatar: { width: '100%', height: '100%' },
  headerAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE7E4',
  },
  headerAvatarInitial: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 14,
    color: colors.primary,
  },
  headerTitle: {
    flex: 1,
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.onboardingTitle,
  },

  /* Messages */
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  bubbleRow: { width: '100%', flexDirection: 'row' },
  bubbleRowThem: { justifyContent: 'flex-start' },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
  },
  bubbleThem: {
    backgroundColor: '#EFF1F8',
    borderTopLeftRadius: 6,
  },
  bubbleMe: {
    backgroundColor: '#F4F4F5',
    borderTopRightRadius: 6,
  },
  bubbleText: {
    ...nunitoSans.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onboardingTitle,
  },
  bubbleTime: {
    marginTop: 4,
    alignSelf: 'flex-end',
    ...nunitoSans.regular,
    fontSize: 11,
    lineHeight: 14,
    color: colors.placeholder,
  },

  /* Input bar */
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: colors.background,
  },
  inputField: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F4F4F5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  plusBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    lineHeight: 18,
    color: colors.onboardingTitle,
    paddingTop: Platform.OS === 'ios' ? 6 : 0,
    paddingBottom: Platform.OS === 'ios' ? 6 : 0,
    maxHeight: 96,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },

  pressed: { opacity: 0.7 },
});
