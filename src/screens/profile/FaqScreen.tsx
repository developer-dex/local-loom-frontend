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
        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={styles.heroIconWrap}>
            <Text style={styles.heroQuestionMark}>?</Text>
          </View>
          <Text style={styles.heroTitle}>Frequently Asked Questions</Text>
          <Text style={styles.heroSubtitle}>
            Got questions? We've got answers.
          </Text>
        </View>

        {/* FAQ Items */}
        {FAQ_ITEMS.map((item) => {
          const expanded = openId === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => toggle(item.id)}
              style={({ pressed }) => [
                styles.card,
                expanded && styles.cardExpanded,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.numberBadge, expanded && styles.numberBadgeActive]}>
                  <Text style={[styles.numberText, expanded && styles.numberTextActive]}>
                    {item.number}
                  </Text>
                </View>
                <Text style={[styles.question, expanded && styles.questionExpanded]}>
                  {item.question}
                </Text>
                <View style={[styles.chevronWrap, expanded && styles.chevronWrapExpanded]}>
                  <Icon
                    name={expanded ? 'arrow-up-01' : 'arrow-down-01'}
                    width={16}
                    height={16}
                    color={expanded ? colors.onPrimary : '#9A9A9A'}
                  />
                </View>
              </View>
              {expanded ? (
                <View style={styles.answerBlock}>
                  <Text style={styles.answer}>{item.answer}</Text>
                </View>
              ) : null}
            </Pressable>
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
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  // Hero
  heroSection: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
    marginBottom: 8,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(245, 142, 131, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  heroQuestionMark: {
    fontFamily: fontFamilies.inter.bold,
    fontSize: 28,
    color: colors.primary,
  },
  heroTitle: {
    fontFamily: fontFamilies.inter.bold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.onboardingTitle,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 13,
    lineHeight: 18,
    color: '#717171',
  },
  // Cards
  card: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: '#1B1B4D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardExpanded: {
    backgroundColor: '#FFFAF9',
    borderColor: colors.primary,
    borderWidth: 1.5,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  numberBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberBadgeActive: {
    backgroundColor: colors.primary,
  },
  numberText: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 13,
    color: '#717171',
  },
  numberTextActive: {
    color: colors.onPrimary,
  },
  question: {
    flex: 1,
    fontFamily: fontFamilies.inter.medium,
    fontSize: 14,
    lineHeight: 19,
    color: '#252525',
  },
  questionExpanded: {
    fontFamily: fontFamilies.inter.semibold,
    color: colors.onboardingTitle,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronWrapExpanded: {
    backgroundColor: colors.primary,
  },
  answerBlock: {
    marginTop: 12,
    marginLeft: 42,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 142, 131, 0.2)',
  },
  answer: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 13,
    lineHeight: 20,
    color: '#555555',
  },
  pressed: {
    opacity: 0.85,
  },
});
