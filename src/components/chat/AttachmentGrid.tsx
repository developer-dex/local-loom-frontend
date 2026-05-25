/**
 * AttachmentGrid — lays out 1–5 message attachments inside a chat bubble.
 *
 * Responsibilities (Task 11.2, Requirements 7.8, 23.5):
 *  - 1 attachment  → single full-width tile
 *  - 2 attachments → side-by-side row of two square tiles
 *  - 3+ attachments → 2x2 grid (max 4 visible tiles); when more than 4
 *    attachments are present, the 4th tile shows a "+N" overflow indicator
 *  - Image tiles render `<Image source={{ uri: <absolute media url> }} />`
 *    and expose `accessibilityRole="image"` (Req 7.8, 23.5).
 *  - Video tiles render a tappable thumbnail (`thumbnailUrl`) with a play
 *    overlay; they expose `accessibilityRole="button"` and
 *    `accessibilityLabel="Play video attachment"` (Req 7.9, 23.5) and invoke
 *    the optional `onPressVideo` callback when tapped.
 *
 * Server-relative paths (`/public/...`) are resolved to absolute URLs via
 * {@link resolveMediaUrl}, which prepends `env.apiBaseUrl` and leaves
 * fully-qualified `http(s)://` URLs untouched.
 */
import { memo } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import type { AttachmentDescriptor } from '../../api/chatTypes';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { Icon } from '../ui/Icon';
import { colors, fontFamilies } from '../../theme';

/** Maximum number of tiles rendered. Excess attachments collapse into "+N". */
const MAX_VISIBLE = 4;

export type AttachmentGridProps = {
  attachments: AttachmentDescriptor[];
  /** Invoked with the tapped attachment when a video tile is pressed. */
  onPressVideo?: (attachment: AttachmentDescriptor) => void;
  /** Optional override for the grid wrapper style. */
  style?: StyleProp<ViewStyle>;
};

export const AttachmentGrid = memo(function AttachmentGrid({
  attachments,
  onPressVideo,
  style,
}: AttachmentGridProps) {
  if (!attachments || attachments.length === 0) return null;

  const total = attachments.length;
  const visible = attachments.slice(0, MAX_VISIBLE);
  const overflow = total > MAX_VISIBLE ? total - MAX_VISIBLE : 0;

  // 1 attachment — full-width tile.
  if (total === 1) {
    return (
      <View style={[styles.container, style]}>
        <AttachmentTile
          attachment={visible[0]}
          variant="full"
          onPressVideo={onPressVideo}
        />
      </View>
    );
  }

  // 2+ attachments — flex-wrapped row of half-width tiles. With flexWrap +
  // 49% width, two tiles fit per row (and 3+ wraps into a 2x2 grid).
  return (
    <View style={[styles.container, styles.grid, style]}>
      {visible.map((attachment, index) => {
        const isLastVisible = index === visible.length - 1;
        const overflowCount = overflow > 0 && isLastVisible ? overflow : 0;
        return (
          <AttachmentTile
            key={`attachment-${index}`}
            attachment={attachment}
            variant="half"
            onPressVideo={onPressVideo}
            overflowCount={overflowCount}
          />
        );
      })}
    </View>
  );
});

// ─── Tile ────────────────────────────────────────────────────────────────────

type TileVariant = 'full' | 'half';

type AttachmentTileProps = {
  attachment: AttachmentDescriptor;
  variant: TileVariant;
  onPressVideo?: (attachment: AttachmentDescriptor) => void;
  /** When > 0, renders a "+N" overflow overlay on top of the tile. */
  overflowCount?: number;
};

const AttachmentTile = memo(function AttachmentTile({
  attachment,
  variant,
  onPressVideo,
  overflowCount = 0,
}: AttachmentTileProps) {
  const tileSizeStyle = variant === 'full' ? styles.tileFull : styles.tileHalf;

  if (attachment.type === 'video') {
    const thumbUri = resolveMediaUrl(attachment.thumbnailUrl);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Play video attachment"
        onPress={() => onPressVideo?.(attachment)}
        style={({ pressed }) => [
          styles.tile,
          tileSizeStyle,
          pressed && styles.pressed,
        ]}
      >
        {thumbUri ? (
          <Image
            source={{ uri: thumbUri }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.placeholder]} />
        )}
        <View style={styles.playOverlay} pointerEvents="none">
          <View style={styles.playBadge}>
            <Icon name="play" width={20} height={20} color={colors.onPrimary} />
          </View>
        </View>
        {overflowCount > 0 ? (
          <OverflowBadge count={overflowCount} />
        ) : null}
      </Pressable>
    );
  }

  // Image
  const uri = resolveMediaUrl(attachment.url);
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Image attachment"
      style={[styles.tile, tileSizeStyle]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.image, styles.placeholder]} />
      )}
      {overflowCount > 0 ? <OverflowBadge count={overflowCount} /> : null}
    </View>
  );
});

function OverflowBadge({ count }: { count: number }) {
  return (
    <View style={styles.overflowOverlay} pointerEvents="none">
      <Text style={styles.overflowText}>+{count}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const TILE_GAP = 4;
const TILE_RADIUS = 10;
/** Slightly under 50% so two tiles plus the gap always fit within one row. */
const HALF_WIDTH = '49%';

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TILE_GAP,
  },
  tile: {
    overflow: 'hidden',
    borderRadius: TILE_RADIUS,
    backgroundColor: colors.surface,
  },
  tileFull: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  tileHalf: {
    width: HALF_WIDTH,
    aspectRatio: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: colors.border,
  },
  pressed: {
    opacity: 0.85,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  playBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overflowOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overflowText: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 20,
    lineHeight: 24,
    color: colors.onPrimary,
  },
});
