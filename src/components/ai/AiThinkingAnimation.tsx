import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontFamilies, nunitoSans } from '../../theme';

const THINKING_LINES = [
  'Reading your request…',
  'Understanding what you need…',
  'Matching service category…',
  'Pinpointing your region…',
  'Curating service provider matches…',
];

const MODEL_CHIPS = [
  { label: 'LocalLoom AI', colors: ['#F58E83', '#E8A87C'] as const },
  { label: 'Classifier', colors: ['#7C9CE8', '#9B8FD9'] as const },
  { label: 'Matcher', colors: ['#6BCB9A', '#4ECDC4'] as const },
];

function TypingDots() {
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(a, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [a]);

  return (
    <View style={styles.dotsRow}>
      {[0, 1, 2].map((i) => {
        const opacity = a.interpolate({
          inputRange: [0, 0.33, 0.66, 1],
          outputRange:
            i === 0 ? [0.35, 1, 0.35, 0.35] : i === 1 ? [0.35, 0.35, 1, 0.35] : [0.35, 0.35, 0.35, 1],
        });
        return <Animated.View key={i} style={[styles.dot, { opacity }]} />;
      })}
    </View>
  );
}

export function AiThinkingAnimation({ prompt }: { prompt: string }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const lineFade = useRef(new Animated.Value(1)).current;
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    const spinLoop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true }),
    );
    pulseLoop.start();
    spinLoop.start();
    return () => {
      pulseLoop.stop();
      spinLoop.stop();
    };
  }, [pulse, spin]);

  useEffect(() => {
    const id = setInterval(() => {
      Animated.sequence([
        Animated.timing(lineFade, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(lineFade, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
      setLineIndex((i) => (i + 1) % THINKING_LINES.length);
    }, 2200);
    return () => clearInterval(id);
  }, [lineFade]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.85] });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.wrap}>
      <View style={styles.orbArea}>
        <Animated.View style={[styles.glowRing, { opacity: glowOpacity, transform: [{ scale }] }]}>
          <LinearGradient
            colors={['rgba(245,142,131,0.35)', 'rgba(155,143,217,0.25)', 'rgba(110,203,154,0.2)']}
            style={styles.glowGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
        <Animated.View style={[styles.ringWrap, { transform: [{ rotate }] }]}>
          <LinearGradient
            colors={['#F58E83', '#C9A0DC', '#6BCB9A', '#F58E83']}
            style={styles.ring}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
        <View style={styles.orbCore}>
          <LinearGradient
            colors={['#FFF5F4', '#FFFFFF']}
            style={styles.orbInner}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
          >
            <Text style={styles.orbEmoji}>✦</Text>
          </LinearGradient>
        </View>
      </View>

      <View style={styles.chipsRow}>
        {MODEL_CHIPS.map((chip, idx) => (
          <LinearGradient
            key={chip.label}
            colors={chip.colors}
            style={[styles.chip, idx === 1 && styles.chipCenter]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.chipText}>{chip.label}</Text>
          </LinearGradient>
        ))}
      </View>

      <Animated.Text style={[styles.thinkingLine, { opacity: lineFade }]}>
        {THINKING_LINES[lineIndex]}
      </Animated.Text>
      <TypingDots />

      {prompt.trim() ? (
        <View style={styles.promptBubble}>
          <Text style={styles.promptLabel}>You asked</Text>
          <Text style={styles.promptText} numberOfLines={3}>
            "{prompt.trim()}"
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 20,
  },
  orbArea: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 60,
    overflow: 'hidden',
  },
  glowGradient: {
    flex: 1,
    borderRadius: 60,
  },
  ringWrap: {
    position: 'absolute',
    width: 108,
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: 108,
    height: 108,
    borderRadius: 54,
    opacity: 0.85,
  },
  orbCore: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F58E83',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  orbInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbEmoji: {
    fontSize: 32,
    color: colors.primary,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    opacity: 0.92,
  },
  chipCenter: {
    transform: [{ scale: 1.05 }],
  },
  chipText: {
    fontFamily: fontFamilies.inter.medium,
    fontSize: 11,
    lineHeight: 14,
    color: colors.onPrimary,
  },
  thinkingLine: {
    ...nunitoSans.medium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.onboardingTitle,
    textAlign: 'center',
    marginTop: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: -8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  promptBubble: {
    width: '100%',
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFF0EF',
    borderWidth: 1,
    borderColor: '#F1D9D6',
  },
  promptLabel: {
    fontFamily: fontFamilies.inter.medium,
    fontSize: 11,
    lineHeight: 14,
    color: colors.primary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  promptText: {
    ...nunitoSans.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onboardingBody,
    fontStyle: 'italic',
  },
});
