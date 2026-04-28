import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/ui';
import type { RootStackParamList } from '../../navigation/types';
import { loadTradieDraft, loadTradieStatus } from '../../storage/tradieApplication';
import { colors, fontFamilies } from '../../theme';

export function ManageTradiesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const [status, setStatus] = useState<'under_review' | 'reviewed'>('under_review');
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draft, setDraft] = useState<Awaited<ReturnType<typeof loadTradieDraft>>>(null);

  useEffect(() => {
    let cancelled = false;
    if (!isFocused) return;
    (async () => {
      const [s, d] = await Promise.all([loadTradieStatus(), loadTradieDraft()]);
      if (cancelled) return;
      setStatus(s);
      setDraft(d);
      setDraftLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isFocused]);

  return (
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
        <Text numberOfLines={1} style={styles.headerTitle}>
          Manage Tradies
        </Text>
      </View>

      <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 14) + 24 }]}>
        <View style={styles.reviewCard}>
          <View style={styles.reviewCopy}>
            <Text style={styles.reviewTitle}>
              {status === 'reviewed' ? 'Your Application is Reviewed' : 'Your Application still Under Review'}
            </Text>
            <Text style={styles.reviewSubtitle}>
              Find what you're looking for, right in your local community.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={status === 'reviewed' ? 'Edit' : 'Contact'}
            onPress={() => {
              if (status === 'reviewed') {
                navigation.navigate('BecomeTradie', { mode: 'edit', initial: draft ?? undefined });
                return;
              }
              Alert.alert('Contact', 'We’ll add contact options here soon.');
            }}
            style={({ pressed }) => [styles.contactBtn, pressed && styles.pressed]}
          >
            <Text style={styles.contactBtnText}>{status === 'reviewed' ? 'Edit' : 'Contact'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 48,
    paddingHorizontal: 20,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.background,
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
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 26,
    backgroundColor: colors.background,
  },
  reviewCard: {
    backgroundColor: '#FFF0EF',
    borderRadius: 20,
    padding: 16,
    gap: 20,
  },
  reviewCopy: {
    gap: 6,
  },
  reviewTitle: {
    fontFamily: fontFamilies.nunitoSans.medium,
    fontSize: 18,
    lineHeight: 24,
    color: colors.primary,
  },
  reviewSubtitle: {
    fontFamily: fontFamilies.nunitoSans.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.placeholder,
  },
  contactBtn: {
    height: 40,
    width: 115,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  contactBtnText: {
    fontFamily: fontFamilies.inter.medium,
    fontSize: 14,
    lineHeight: 18,
    color: colors.onPrimary,
  },
  pressed: {
    opacity: 0.7,
  },
});

