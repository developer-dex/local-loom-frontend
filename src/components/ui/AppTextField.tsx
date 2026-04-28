import { StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import { Icon, type IconName } from './Icon';
import { colors, fontFamilies, fontFamily, spacing } from '../../theme';

export type AppTextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  leftIconName?: IconName;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

export function AppTextField({
  label,
  error,
  leftIconName,
  containerStyle,
  inputStyle,
  style,
  ...inputProps
}: AppTextFieldProps) {
  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, error ? styles.inputError : null]}>
        {leftIconName ? (
          <Icon
            name={leftIconName}
            width={18}
            height={18}
            // Most of our SVG set is stroke-based (fill="none").
            stroke={colors.textMuted}
            color={colors.placeholder}
          />
        ) : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.placeholder}
          style={[styles.input, inputStyle, style]}
          {...inputProps}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.label,
  },
  inputWrap: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    fontFamily: fontFamilies.inter.regular,
    fontSize: 16,
    lineHeight: 22,
    color: colors.placeholderText,
  },
  inputError: {
    borderColor: colors.error,
  },
  error: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 12,
    color: colors.error,
  },
});
