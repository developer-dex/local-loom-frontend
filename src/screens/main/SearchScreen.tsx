import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamilies, spacing } from '../../theme';

export function SearchScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Search</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, justifyContent: 'center' },
  title: { fontFamily: fontFamilies.inter.bold, fontSize: 24, color: colors.onboardingTitle },
});

