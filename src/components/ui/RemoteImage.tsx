import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  View,
  type ImageResizeMode,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors } from '../../theme';

export type RemoteImageProps = {
  /** Remote image URL. When empty, `fallback` is shown with no loader. */
  uri?: string | null;
  fallback: ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  resizeMode?: ImageResizeMode;
  accessibilityLabel?: string;
};

/**
 * Shows a spinner while a remote image loads; falls back on error or missing URI.
 */
export function RemoteImage({
  uri,
  fallback,
  style,
  containerStyle,
  resizeMode = 'cover',
  accessibilityLabel,
}: RemoteImageProps) {
  const [loading, setLoading] = useState(Boolean(uri));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLoading(Boolean(uri));
  }, [uri]);

  const useRemote = Boolean(uri) && !failed;
  const source: ImageSourcePropType = useRemote ? { uri: uri! } : fallback;

  return (
    <View style={[styles.container, containerStyle]}>
      {loading && useRemote ? (
        <View style={styles.loaderWrap} pointerEvents="none">
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : null}
      <Image
        source={source}
        style={[style, loading && useRemote ? styles.hiddenWhileLoading : null]}
        resizeMode={resizeMode}
        accessibilityLabel={accessibilityLabel}
        onLoadStart={() => {
          if (useRemote) setLoading(true);
        }}
        onLoad={() => setLoading(false)}
        onError={() => {
          setFailed(true);
          setLoading(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  loaderWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  hiddenWhileLoading: {
    opacity: 0,
  },
});
