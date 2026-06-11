import { useCallback, useState } from 'react';
import { LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, Text, UIManager, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/ui';
import { colors, fontFamilies, nunitoSans } from '../../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type FaqItem = {
  id: string;
  number: number;
  question: string;
  answer: string;
};

const FAQ_ITEMS: FaqItem[] = [
  {
    id: '1',
    number: 1,
    question: 'What is LocalLoom?',
    answer:
      'LocalLoom is a platform that helps you find and connect with verified local service providers near you — with no commissions or hidden fees.',
  },
  {
    id: '2',
    number: 2,
    question: 'Is LocalLoom free to use?',
    answer:
      'Yes. Downloading the app, browsing service providers, and creating an account is free. You only pay for work you arrange directly with your service provider.',
  },
  {
    id: '3',
    number: 3,
    question: 'Does LocalLoom take any commission?',
    answer:
      'No. LocalLoom does not take a commission on jobs or add hidden platform fees. We focus on helping you discover and connect with local service providers.',
  },
  {
    id: '4',
    number: 4,
    question: 'Do I need to create an account?',
    answer:
      'Yes. An account lets you contact service providers, save providers you like, and leave reviews — which keeps the community trusted for everyone.',
  },
  {
    id: '5',
    number: 5,
    question: 'How do I find a service provider?',
    answer:
      'Browse by category from Home or Search, or search for a service. Each profile shows location, work photos, and reviews so you can compare service providers near you.',
  },
  {
    id: '6',
    number: 6,
    question: 'Can I trust the service providers on LocalLoom?',
    answer:
      'Service providers are independent professionals. We show profiles and reviews to help you decide; you should still confirm licences, insurance, and quotes before work begins.',
  },
  {
    id: '7',
    number: 7,
    question: 'How do I contact a service provider?',
    answer:
      'Open their profile and use the in-app options to message or call where available. Keep arrangements clear and only share what you need to book the job.',
  },
  {
    id: '8',
    number: 8,
    question: 'How do reviews work?',
    answer:
      'After a job, you can leave a star rating and short feedback. Reviews are public to help others choose quality service providers and reward great service.',
  },
];

const CHEVRON_COLOR = '#9A9A9A';

export function FaqScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [openId, setOpenId] = useState<string | null>('1');

  const toggle = useCallback((id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId((prev) => (prev === id ? null : id));
  }, []);

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
          FAQs
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 14) + 24 },
        ]}
      >
        {FAQ_ITEMS.map((item) => {
          const expanded = openId === item.id;
          return (
            <View key={item.id} style={styles.card}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                onPress={() => toggle(item.id)}
                style={({ pressed }) => [styles.cardHeader, pressed && styles.pressed]}
              >
                <Text style={styles.question}>
                  {item.number}. {item.question}
                </Text>
                <Icon
                  name={expanded ? 'arrow-up-01' : 'arrow-down-01'}
                  width={20}
                  height={20}
                  color={CHEVRON_COLOR}
                />
              </Pressable>
              {expanded ? (
                <View style={styles.answerBlock}>
                  <Text style={styles.answer}>{item.answer}</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
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
    color: '#252525',
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 12,
  },
  card: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#1B1B4D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 22.5,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  question: {
    flex: 1,
    ...nunitoSans.medium,
    fontSize: 14,
    lineHeight: 18,
    color: '#252525',
  },
  answerBlock: {
    marginTop: 12,
    paddingRight: 4,
  },
  answer: {
    ...nunitoSans.regular,
    fontSize: 14,
    lineHeight: 16,
    color: '#252525',
  },
  pressed: {
    opacity: 0.7,
  },
});
