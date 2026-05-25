import { BlurView, type BlurViewProps } from 'expo-blur';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

export type AdaptiveBlurViewProps = Omit<BlurViewProps, 'experimentalBlurMethod' | 'intensity'> & {
  style?: StyleProp<ViewStyle>;
  /** iOS-style intensity (1–100). Android is tuned to look similar. */
  intensity?: number;
};

/**
 * Blur overlay that matches iOS on Android via expo-blur's Dimezis implementation.
 * On Android, BlurView defaults to a flat scrim unless `experimentalBlurMethod` is set.
 */
export function AdaptiveBlurView({
  intensity = 10,
  tint = 'light',
  style,
  ...rest
}: AdaptiveBlurViewProps) {
  if (Platform.OS === 'android') {
    return (
      <BlurView
        intensity={intensity * 4}
        tint={tint}
        experimentalBlurMethod="dimezisBlurView"
        blurReductionFactor={1}
        style={[styles.fill, style]}
        {...rest}
      />
    );
  }

  return (
    <BlurView
      intensity={intensity}
      tint={tint}
      style={[styles.fill, style]}
      {...rest}
    />
  );
}

/**
 * Fallback when native Android blur is unavailable (very old devices / build issues).
 */
export function BlurScrimFallback({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.fill, styles.scrim, style]} />;
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  scrim: {
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
});
