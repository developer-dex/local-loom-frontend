import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/ui';
import { colors, fontFamilies, fontFamily, spacing } from '../../theme';

const customerArt = require('../../../assets/signup/customer.png');
const tradieArt = require('../../../assets/signup/tradie.png');

type Props = {
  onSelectCustomer: () => void;
  onSelectProvider: () => void;
};

export function RoleSelectionScreen({ onSelectCustomer, onSelectProvider }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['rgba(245, 142, 131, 0.14)', 'rgba(255, 255, 255, 0)', colors.background]}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + spacing.lg,
            paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.md,
          },
        ]}
      >
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Icon name="home-09" width={22} height={22} color={colors.primary} />
          </View>
          <Text style={styles.brandName}>LocalLoom</Text>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>How will you use LocalLoom?</Text>
          <Text style={styles.subtitle}>
            Choose your path so we can take you to the right experience. You can always sign in later.
          </Text>
        </View>

        <View style={styles.cards}>
          <RoleCard
            title="I'm a Customer"
            description="Browse trusted local service providers, compare services, and book with confidence."
            image={customerArt}
            accentColor={colors.primary}
            onPress={onSelectCustomer}
            testID="role-customer"
          />
          <RoleCard
            title="I'm a Service Provider"
            description="Sign in to manage your profile, respond to leads, and grow your business."
            image={tradieArt}
            accentColor="#E8A87C"
            onPress={onSelectProvider}
            testID="role-provider"
          />
        </View>

        <Text style={styles.footerHint}>
          Service providers need an account. Customers can explore the app as a guest.
        </Text>
      </View>
    </View>
  );
}

function RoleCard({
  title,
  description,
  image,
  accentColor,
  onPress,
  testID,
}: {
  title: string;
  description: string;
  image: number;
  accentColor: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={title}
      testID={testID}
    >
      <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />
      <View style={styles.cardInner}>
        <View style={styles.cardImageWrap}>
          <Image source={image} style={styles.cardImage} resizeMode="cover" />
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDescription}>{description}</Text>
        </View>
        <View style={styles.cardChevron}>
          <Icon name="arrow-right-01" width={20} height={20} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.xl,
  },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 142, 131, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontFamily: fontFamily.extrabold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: colors.onboardingTitle,
  },
  header: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: fontFamily.extrabold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.56,
    color: colors.onboardingTitle,
  },
  subtitle: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.onboardingBody,
    maxWidth: 340,
  },
  cards: {
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  cardAccent: {
    height: 4,
    width: '100%',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  cardImageWrap: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#F4F4F4',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardCopy: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  cardTitle: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.onboardingTitle,
  },
  cardDescription: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  cardChevron: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 142, 131, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerHint: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
});
