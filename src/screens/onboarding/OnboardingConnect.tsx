import { Dimensions, Image, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../components/ui';
import { colors, fontFamily, spacing } from '../../theme';

const connectBackground = require('../../../assets/onboarding/connect-bg.png');

const CARD_TOP_RADIUS = 28;
const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;
type Props = {
  width: number;
  onGetStarted: () => void;
  onSkip: () => void;
};

export function OnboardingConnect({ width, onGetStarted, onSkip }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { width, paddingTop: insets.top }]}>
      {/* <ImageBackground source={connectBackground} style={styles.bg} resizeMode="contain"> */}
        <View style={styles.topBar}>
          <View style={styles.topBarSpacer} />
          <AppButton title="Skip" variant="ghost" onPress={onSkip} hitSlop={12} />
        </View>
      <Image source={connectBackground} style={styles.bg} resizeMode="contain" width={screenWidth} height={screenHeight - 350}  />

        <View style={[styles.card, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Text style={styles.title}>Connect with Trusted Local Experts</Text>
          <Text style={styles.body}>
            LocalLoom helps customers find verified tradies and helps tradies grow their business.
          </Text>
          <AppButton title="Get Started" onPress={onGetStarted} />
        </View>
      {/* </ImageBackground> */}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bg: {
    // flex: 1,
    // minHeight: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  topBarSpacer: { flex: 1 },
  hero: {
    flex: 1,
    minHeight: 0,
  },
  card: {
    backgroundColor: colors.background,
    borderTopLeftRadius: CARD_TOP_RADIUS,
    borderTopRightRadius: CARD_TOP_RADIUS,
    paddingTop: spacing.xl,
    paddingHorizontal: 26,
    gap: 16,
  },
  title: {
    fontFamily: fontFamily.extrabold,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.48,
    color: colors.onboardingTitle,
    textAlign: 'center',
    alignSelf: 'center',
    maxWidth: 300,
  },
  body: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 18,
    color: colors.onboardingBody,
    textAlign: 'center',
  },
});
