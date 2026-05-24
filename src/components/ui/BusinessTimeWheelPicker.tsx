import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Icon } from './Icon';
import { colors, fontFamilies } from '../../theme';
import {
  DEFAULT_BUSINESS_TIME,
  formatBusinessTimeDisplay,
  type BusinessTimeValue,
} from '../../utils/businessTime';

const ITEM_HEIGHT = 36;
const WHEEL_HEIGHT = ITEM_HEIGHT * 5;
const PADDING_ITEMS = 2;

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES_SECONDS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const PERIODS: BusinessTimeValue['period'][] = ['AM', 'PM'];

type WheelColumnProps = {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  width?: number;
};

const WheelColumn = memo(function WheelColumn({
  items,
  selectedIndex,
  onSelect,
  width = 44,
}: WheelColumnProps) {
  const scrollRef = useRef<ScrollView>(null);
  const mounted = useRef(false);

  useEffect(() => {
    const y = selectedIndex * ITEM_HEIGHT;
    scrollRef.current?.scrollTo({ y, animated: mounted.current });
    mounted.current = true;
  }, [selectedIndex]);

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
      onSelect(Math.max(0, Math.min(items.length - 1, index)));
    },
    [items.length, onSelect],
  );

  return (
    <ScrollView
      ref={scrollRef}
      style={{ width, height: WHEEL_HEIGHT }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_HEIGHT}
      decelerationRate="fast"
      nestedScrollEnabled
      onMomentumScrollEnd={onScrollEnd}
      contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * PADDING_ITEMS }}
    >
      {items.map((item, index) => {
        const selected = index === selectedIndex;
        return (
          <View key={`${item}-${index}`} style={styles.wheelItem}>
            <Text style={[styles.wheelText, selected ? styles.wheelTextSelected : styles.wheelTextMuted]}>
              {item}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
});

export type BusinessTimeWheelPickerProps = {
  label?: string;
  placeholder?: string;
  value: BusinessTimeValue | null;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (value: BusinessTimeValue) => void;
  error?: string;
};

export const BusinessTimeWheelPicker = memo(function BusinessTimeWheelPicker({
  label,
  placeholder = 'Select Time',
  value,
  isOpen,
  onToggle,
  onChange,
  error,
}: BusinessTimeWheelPickerProps) {
  const current = value ?? DEFAULT_BUSINESS_TIME;

  const hourIndex = Math.max(0, Math.min(11, current.hour - 1));
  const minuteIndex = Math.max(0, Math.min(59, current.minute));
  const secondIndex = Math.max(0, Math.min(59, current.second));
  const periodIndex = current.period === 'PM' ? 1 : 0;

  const patch = useCallback(
    (partial: Partial<BusinessTimeValue>) => {
      onChange({ ...current, ...partial });
    },
    [current, onChange],
  );

  const headerText = useMemo(
    () => (value ? formatBusinessTimeDisplay(value) : null),
    [value],
  );

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        style={({ pressed }) => [styles.header, error ? styles.headerError : null, pressed && styles.pressed]}
      >
        <Text style={[styles.headerText, headerText ? styles.headerTextFilled : null]} numberOfLines={1}>
          {headerText ?? placeholder}
        </Text>
        <Icon
          name={isOpen ? 'arrow-up-01' : 'arrow-down-01'}
          width={18}
          height={18}
          color={colors.placeholder}
        />
      </Pressable>

      {isOpen ? (
        <View style={styles.pickerCard}>
          <View style={styles.selectionOverlay} pointerEvents="none">
            <View style={styles.selectionLine} />
            <View style={styles.selectionLine} />
          </View>
          <View style={styles.columnsRow}>
            <WheelColumn
              items={HOURS}
              selectedIndex={hourIndex}
              onSelect={(index) => patch({ hour: index + 1 })}
            />
            <Text style={styles.separator}>:</Text>
            <WheelColumn
              items={MINUTES_SECONDS}
              selectedIndex={minuteIndex}
              onSelect={(index) => patch({ minute: index })}
            />
            <Text style={styles.separator}>:</Text>
            <WheelColumn
              items={MINUTES_SECONDS}
              selectedIndex={secondIndex}
              onSelect={(index) => patch({ second: index })}
            />
            <WheelColumn
              items={PERIODS}
              selectedIndex={periodIndex}
              onSelect={(index) => patch({ period: PERIODS[index] })}
              width={52}
            />
          </View>
        </View>
      ) : null}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    gap: 8,
  },
  label: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.label,
  },
  header: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerError: {
    borderColor: colors.error,
  },
  fieldError: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.error,
    marginTop: 4,
  },
  headerText: {
    flex: 1,
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    color: colors.placeholder,
    marginRight: 8,
  },
  headerTextFilled: {
    color: colors.onboardingTitle,
    fontFamily: fontFamilies.inter.semibold,
  },
  pickerCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    overflow: 'hidden',
    height: WHEEL_HEIGHT,
    position: 'relative',
  },
  selectionOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: ITEM_HEIGHT - 2,
  },
  selectionLine: {
    height: 1,
    backgroundColor: colors.border,
  },
  columnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  separator: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 16,
    color: colors.onboardingTitle,
    marginHorizontal: 2,
    marginBottom: 2,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelText: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 16,
    lineHeight: 20,
  },
  wheelTextSelected: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 17,
    color: colors.onboardingTitle,
  },
  wheelTextMuted: {
    color: colors.placeholder,
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.7,
  },
});
