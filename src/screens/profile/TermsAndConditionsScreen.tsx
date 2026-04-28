import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/ui';
import { colors, fontFamilies } from '../../theme';

type Bullet = { type: 'bullet'; text: string };
type Paragraph = { type: 'paragraph'; text: string };
type Numbered = { type: 'numbered'; number: number; title: string; body?: string; bullets?: string[]; subSections?: { label: string; bullets: string[] }[] };
type Block = Paragraph | Numbered;

function BulletRow({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>{'\u2022'}</Text>
      <Text style={styles.body}>{text}</Text>
    </View>
  );
}

export function TermsAndConditionsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const blocks: Block[] = useMemo(
    () => [
      { type: 'paragraph', text: 'Welcome to LocalLoom.' },
      {
        type: 'paragraph',
        text: 'By accessing or using our mobile application, you agree to comply with and be bound by these Terms & Conditions.',
      },
      {
        type: 'paragraph',
        text: 'LocalLoom is a platform that connects customers with independent local tradies. We do not provide tradie services directly.',
      },
      {
        type: 'numbered',
        number: 1,
        title: 'Introduction',
        body: 'LocalLoom is a platform that connects customers with independent local tradies. We do not provide tradie services directly.',
      },
      {
        type: 'numbered',
        number: 2,
        title: 'Eligibility',
        bullets: [
          'You must be at least 18 years old to use this app.',
          'By using LocalLoom, you confirm that all information provided is accurate and complete.',
        ],
      },
      {
        type: 'numbered',
        number: 3,
        title: 'Platform Role (Very Important)',
        bullets: [
          'LocalLoom acts only as a connection platform between customers and tradies.',
          'We do not:',
          'Provide services',
          'Guarantee work quality',
          'Take commissions or fees from jobs',
        ],
      },
      {
        type: 'numbered',
        number: 4,
        title: 'User Responsibilities',
        subSections: [
          {
            label: 'For Customers:',
            bullets: [
              'Provide honest and accurate reviews',
              'Use the platform respectfully',
              'Do not misuse tradie contact details',
            ],
          },
          {
            label: 'For Tradies:',
            bullets: [
              'Provide accurate business information',
              'Maintain valid licenses (where required)',
              'Deliver services professionally and legally',
            ],
          },
        ],
      },
    ],
    [],
  );

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
          Terms and Conditions
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 14) + 24 }]}
      >
        {blocks.map((b, idx) => {
          if (b.type === 'paragraph') {
            return (
              <Text key={`${idx}`} style={styles.body}>
                {b.text}
              </Text>
            );
          }

          return (
            <View key={`${idx}`} style={styles.section}>
              <Text style={styles.sectionTitle}>{`${b.number}. ${b.title}`}</Text>
              {b.body ? <Text style={styles.body}>{b.body}</Text> : null}
              {b.bullets ? (
                <View style={styles.bullets}>
                  {b.bullets.map((t, i) => (
                    <BulletRow key={`${idx}-b-${i}`} text={t} />
                  ))}
                </View>
              ) : null}
              {b.subSections ? (
                <View style={styles.subSections}>
                  {b.subSections.map((s, si) => (
                    <View key={`${idx}-s-${si}`} style={styles.subSection}>
                      <Text style={styles.body}>{s.label}</Text>
                      <View style={styles.bullets}>
                        {s.bullets.map((t, bi) => (
                          <BulletRow key={`${idx}-s-${si}-b-${bi}`} text={t} />
                        ))}
                      </View>
                    </View>
                  ))}
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
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  body: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    lineHeight: 18,
    color: '#212327',
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 14,
    lineHeight: 18,
    color: '#212327',
  },
  bullets: {
    gap: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bulletDot: {
    width: 21,
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    lineHeight: 18,
    color: '#212327',
  },
  subSections: {
    gap: 8,
  },
  subSection: {
    gap: 8,
  },
  pressed: {
    opacity: 0.7,
  },
});

