import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { colors, fontFamilies, fontFamily } from '../../theme';

type Variant = 'primary' | 'secondary' | 'ghost';

export type AppButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: Variant;
  loading?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

export function AppButton({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  containerStyle,
  labelStyle,
  style: styleFromParent,
  ...rest
}: AppButtonProps) {
  const isDisabled = Boolean(disabled || loading);

  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      disabled={isDisabled}
      style={(state) => {
        const parent = typeof styleFromParent === 'function' ? styleFromParent(state) : styleFromParent;
        const variantStyle =
          variant === 'primary' ? styles.primary : variant === 'secondary' ? styles.secondary : styles.ghost;
        const pressedStyle =
          state.pressed &&
          !isDisabled &&
          (variant === 'primary'
            ? styles.primaryPressed
            : variant === 'secondary'
              ? styles.secondaryPressed
              : styles.ghostPressed);
        return [
          styles.base,
          variantStyle,
          pressedStyle,
          isDisabled && styles.disabled,
          containerStyle,
          parent,
        ];
      }}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'primary' ? colors.onPrimary : variant === 'ghost' ? colors.skipLabel : colors.primary
          }
        />
      ) : (
        <Text
          style={[
            variant === 'ghost' ? styles.labelGhost : styles.label,
            variant === 'primary'
              ? styles.labelPrimary
              : variant === 'secondary'
                ? styles.labelSecondary
                : undefined,
            labelStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    height: 54,
    borderRadius: 999,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
  },
  primaryPressed: {
    backgroundColor: colors.primaryPressed,
  },
  secondary: {
    height: 54,
    borderRadius: 999,
    paddingHorizontal: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryPressed: {
    backgroundColor: colors.border,
  },
  ghost: {
    minHeight: 36,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-end',
    backgroundColor: 'transparent',
  },
  ghostPressed: {
    opacity: 0.65,
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 18,
    lineHeight: 24,
  },
  labelPrimary: {
    color: colors.onPrimary,
  },
  labelSecondary: {
    color: colors.textPrimary,
  },
  labelGhost: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 18,
    color: colors.skipLabel,
  },
});
