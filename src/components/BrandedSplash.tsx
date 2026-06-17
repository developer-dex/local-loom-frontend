import { Image, StyleSheet, View } from 'react-native';

/**
 * Same artwork as native splash (`assets/LOLO_Splash.png`), shown from JS so the logo
 * appears reliably in Expo Go and after `hideAsync` in dev/production builds.
 */
export function BrandedSplash() {
  return (
    <View style={styles.root} accessibilityLabel="LocalLoom splash">
      <Image
        source={require('../../assets/LOLO_Splash.png')}
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 180,
    height: 180,
  },
});
