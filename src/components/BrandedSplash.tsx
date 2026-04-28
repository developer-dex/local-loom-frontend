import { Image, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

/**
 * Same artwork as native splash (`assets/splash.png`), shown from JS so the logo
 * appears reliably in Expo Go and after `hideAsync` in dev/production builds.
 */
export function BrandedSplash() {
  return (
    <View style={styles.root} accessibilityLabel="LocalLoom splash">
      <Image
        source={require('../../assets/splash.png')}
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
