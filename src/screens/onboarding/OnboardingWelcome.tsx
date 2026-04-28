import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamily, spacing } from '../../theme';

const welcomeBackground = require('../../../assets/onboarding/welcome-bg.png');

type Props = {
  width: number;
  onNext: () => void;
};

export function OnboardingWelcome({ width, onNext }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground
      source={welcomeBackground}
      style={[styles.root, { width }]}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.92)', colors.background]}
        locations={[0.54, 0.72, 1]}
        style={styles.scrim}
        pointerEvents="none"
      />
      <View style={styles.flexSpacer} />
      <View
        style={[
          styles.footer,
          {
            paddingTop: spacing.xl,
            paddingBottom: insets.bottom + 40,
          },
        ]}
      >
        <Text style={styles.title}>Welcome to LocalLoom</Text>
        <Text style={styles.body}>
          LocalLoom helps customers find verified tradies — and helps tradies grow their business.
        </Text>
        <Pressable
          onPress={onNext}
          style={({ pressed }) => [styles.cta, pressed && { backgroundColor: colors.primaryPressed }]}
        >
          <Text style={styles.ctaLabel}>Next</Text>
        </Pressable>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,  
    top:40
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  flexSpacer: {
    flex: 1,
    minHeight: 0,
  },
  footer: {
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
  },
  body: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 18,
    color: colors.onboardingBody,
    textAlign: 'center',
  },
  cta: {
    height: 56,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.onPrimary,
  },
  homeBarWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  homeBar: {
    width: 134,
    height: 5,
    borderRadius: 51,
    backgroundColor: '#101010',
  },
});
