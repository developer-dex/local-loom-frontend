import { Image } from 'expo-image';
import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
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
  /** Remote image URL. When empty, `fallback` / `renderFallback` is shown with no loader. */
  uri?: string | null;
  fallback: ImageSourcePropType;
  /** Shown instead of `fallback` when URI is missing or load fails. */
  renderFallback?: () => ReactNode;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  resizeMode?: ImageResizeMode;
  accessibilityLabel?: string;
  /** Disk + memory cache (default). Use `memory` for highly volatile URLs. */
  cachePolicy?: 'disk' | 'memory' | 'memory-disk' | 'none';
};

function resizeModeToContentFit(mode: ImageResizeMode): 'cover' | 'contain' | 'fill' | 'none' {
  switch (mode) {
    case 'contain':
      return 'contain';
    case 'stretch':
      return 'fill';
    case 'center':
      return 'none';
    default:
      return 'cover';
  }
}

/**
 * Remote image with loader and disk/memory cache via expo-image.
 */
export function RemoteImage({
  uri,
  fallback,
  renderFallback,
  style,
  containerStyle,
  resizeMode = 'cover',
  accessibilityLabel,
  cachePolicy = 'memory-disk',
}: RemoteImageProps) {
  const [loading, setLoading] = useState(Boolean(uri));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLoading(Boolean(uri));
  }, [uri]);

  const useRemote = Boolean(uri) && !failed;

  if (!useRemote) {
    if (renderFallback) {
      return <View style={[styles.container, containerStyle]}>{renderFallback()}</View>;
    }
    return (
      <View style={[styles.container, containerStyle]}>
        <Image
          source={fallback}
          style={style}
          contentFit={resizeModeToContentFit(resizeMode)}
          accessibilityLabel={accessibilityLabel}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {loading ? (
        <View style={styles.loaderWrap} pointerEvents="none">
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : null}
      <Image
        source={{ uri: uri! }}
        recyclingKey={uri!}
        cachePolicy={cachePolicy}
        style={[style, loading ? styles.hiddenWhileLoading : null]}
        contentFit={resizeModeToContentFit(resizeMode)}
        accessibilityLabel={accessibilityLabel}
        transition={150}
        onLoadStart={() => setLoading(true)}
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
