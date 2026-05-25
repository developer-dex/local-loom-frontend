import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View, 
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/ui/Icon';
import { useToast } from '../../components/ui';
import { classifyServiceApi } from '../../api/ai';
import { ApiError } from '../../api/errors';
import type { RootStackParamList } from '../../navigation/types';
import { colors, fontFamilies, nunitoSans } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AiSearch'>;

const PLACEHOLDER = 'Describe what you need…';

const MIN_LOADING_MS = 2000;

const STATUS_LINES = [
  'Planning next moves',
  'Understanding your request',
  'Matching service category',
  'Pinpointing your region',
  'Almost there',
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForMinLoading(startedAt: number): Promise<void> {
  const remaining = MIN_LOADING_MS - (Date.now() - startedAt);
  if (remaining > 0) await delay(remaining);
}

function ShimmerText({ text }: { text: string }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1600,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.45, 1, 0.45],
  });

  return (
    <Animated.Text style={[styles.statusText, { opacity }]} numberOfLines={1}>
      {text}
    </Animated.Text>
  );
}

export function AiSearchScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittedPrompt, setSubmittedPrompt] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusIndex, setStatusIndex] = useState(0);

  // Cycle status lines while loading.
  useEffect(() => {
    if (!loading) {
      setStatusIndex(0);
      return;
    }
    const id = setInterval(() => {
      setStatusIndex((i) => (i + 1) % STATUS_LINES.length);
    }, 1600);
    return () => clearInterval(id);
  }, [loading]);

  const onSubmit = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      showToast({ message: 'Describe what you need first.', type: 'error' });
      return;
    }
    if (trimmed.length < 3) {
      showToast({ message: 'Please enter a bit more detail.', type: 'error' });
      return;
    }

    Keyboard.dismiss();
    setSubmittedPrompt(trimmed);
    setErrorMessage(null);
    setPrompt('');
    setLoading(true);

    const startedAt = Date.now();

    try {
      const res = await classifyServiceApi({ prompt: trimmed });
      await waitForMinLoading(startedAt);

      const { categoryId, regionId } = res.data;
      navigation.navigate('MainTabs', {
        screen: 'Home',
        params: { categoryId, regionId, aiPrompt: trimmed },
      });
    } catch (err: unknown) {
      await waitForMinLoading(startedAt);

      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not understand your request. Try again.';
      setErrorMessage(message);
      setLoading(false);
    }
  }, [prompt, navigation, showToast]);

  const onBack = useCallback(() => {
    if (loading) return;
    navigation.goBack();
  }, [loading, navigation]);

  const canSend = prompt.trim().length >= 3 && !loading;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          disabled={loading}
          style={({ pressed }) => [styles.backBtn, pressed && !loading && styles.pressed]}
        >
          <Icon name="arrow-left-01" width={24} height={24} color={colors.onboardingTitle} />
        </Pressable>
        <Text style={styles.headerTitle}>AI Search</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!loading && !submittedPrompt ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Ask LocalLoom AI</Text>
              <Text style={styles.emptyHint}>
                Describe the job in plain language. We&apos;ll find the right service and area.
              </Text>
            </View>
          ) : null}

          {submittedPrompt ? (
            <View style={styles.promptRow}>
              <Text style={styles.promptText}>{submittedPrompt}</Text>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.statusRow}>
              <ShimmerText text={STATUS_LINES[statusIndex]} />
            </View>
          ) : null}

          {errorMessage && !loading ? (
            <View style={styles.troubleshootRow}>
              <Text style={styles.troubleshootLabel}>Troubleshoot</Text>
              <Text style={styles.troubleshootText}>{errorMessage}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.composerWrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              value={prompt}
              onChangeText={setPrompt}
              placeholder={PLACEHOLDER}
              placeholderTextColor={colors.placeholder}
              multiline
              textAlignVertical="top"
              editable={!loading}
              maxLength={500}
              accessibilityLabel="Describe the service you need"
              onSubmitEditing={() => {
                if (canSend) void onSubmit();
              }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send prompt"
              onPress={() => void onSubmit()}
              disabled={!canSend}
              hitSlop={6}
              style={({ pressed }) => [
                styles.sendBtn,
                canSend ? styles.sendBtnActive : styles.sendBtnDisabled,
                pressed && canSend && styles.pressed,
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Icon
                  name="arrow-up-01"
                  width={18}
                  height={18}
                  color={canSend ? colors.onPrimary : colors.placeholder}
                />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    minHeight: 48,
    gap: 12,
  },
  backBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.onboardingTitle,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 24,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    gap: 12,
    flexGrow: 1,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
    gap: 8,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    ...nunitoSans.semibold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.onboardingTitle,
  },
  emptyHint: {
    ...nunitoSans.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onboardingBody,
    textAlign: 'center',
  },
  promptRow: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  promptText: {
    ...nunitoSans.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.onboardingTitle,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusText: {
    ...nunitoSans.regular,
    fontSize: 14,
    lineHeight: 20,
    color: '#9A9A9A',
  },
  troubleshootRow: {
    alignSelf: 'flex-start',
    maxWidth: '90%',
    marginTop: 4,
    gap: 4,
  },
  troubleshootLabel: {
    ...nunitoSans.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.error,
  },
  troubleshootText: {
    ...nunitoSans.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.error,
  },
  composerWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: colors.background,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 22,
    backgroundColor: '#FAFAFA',
    minHeight: 48,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 24,
    paddingVertical: 2,
    ...nunitoSans.regular,
    fontSize: 16,
    lineHeight: 20,
    color: colors.onboardingTitle,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: colors.primary,
  },
  sendBtnDisabled: {
    backgroundColor: '#E5E5E5',
  },
  pressed: {
    opacity: 0.75,
  },
});
