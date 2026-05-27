import { BlurView, type BlurViewProps } from 'expo-blur';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

export type AdaptiveBlurViewProps = Omit<BlurViewProps, 'experimentalBlurMethod' | 'intensity'> & {
  style?: StyleProp<ViewStyle>;
  /** iOS-style intensity (1–100). Android is scaled to look similar. */
  intensity?: number;
  /**
   * When true, skips native blur on Android and uses a translucent scrim only.
   * Defaults to true on Android — dimezisBlurView can crash on physical devices
   * (e.g. guest detail screen login overlay) while simulators often work fine.
   */
  androidScrimOnly?: boolean;
};

/** Map iOS intensity to Android blur radius (accounts for blurReductionFactor). */
function androidBlurIntensity(iosIntensity: number): number {
  return Math.min(100, Math.max(24, Math.round(iosIntensity * 5)));
}

/**
 * Blur overlay that matches iOS on Android via expo-blur's Dimezis BlurView.
 * Android defaults to a flat scrim unless `experimentalBlurMethod="dimezisBlurView"` is set.
 */
export function AdaptiveBlurView({
  intensity = 10,
  tint = 'light',
  style,
  androidScrimOnly = Platform.OS === 'android',
  ...rest
}: AdaptiveBlurViewProps) {
  if (Platform.OS === 'android' && androidScrimOnly) {
    return <BlurScrimFallback style={style} {...rest} />;
  }

  if (Platform.OS === 'android') {
    return (
      <BlurView
        intensity={androidBlurIntensity(intensity)}
        tint={tint}
        experimentalBlurMethod="dimezisBlurView"
        blurReductionFactor={4}
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
export function BlurScrimFallback({
  style,
  ...rest
}: { style?: StyleProp<ViewStyle> } & Omit<BlurViewProps, 'intensity' | 'tint'>) {
  return <View style={[styles.fill, styles.scrim, style]} {...rest} />;
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  scrim: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
  },
});
