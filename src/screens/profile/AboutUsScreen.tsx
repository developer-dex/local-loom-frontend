import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/ui';
import { colors, fontFamilies } from '../../theme';

export function AboutUsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={10}
          onPress={() => {
            if (navigation.canGoBack()) navigation.goBack();
          }}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Icon name="arrow-left-01" width={24} height={24} color={colors.onboardingTitle} />
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          About Us
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 14) + 24 }]}
      >
        <Text style={styles.body}>
          LocalLoom is Australia's local tradie directory, helping homeowners and businesses find
          trusted local professionals quickly and easily.
        </Text>

        <Text style={styles.body}>
          Browse detailed tradie profiles, business information, contact details, services, and
          customer reviews all in one place. Whether you need a plumber, electrician, carpenter,
          painter, landscaper, cleaner, or other local service provider, LocalLoom makes it simple
          to connect directly with the right tradie.
        </Text>

        <Text style={styles.body}>
          Our mission is to support local businesses while making it easier for Australians to
          discover reliable service providers in their community. No complicated lead systems—just
          straightforward connections between customers and local tradies.
        </Text>

        <Text style={styles.tagline}>
          Find local. Connect direct. Support local business.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 48,
    paddingHorizontal: 20,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.background,
  },
  backBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: '#252525',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 16,
  },
  body: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    lineHeight: 22,
    color: '#212327',
  },
  tagline: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 15,
    lineHeight: 22,
    color: colors.primary,
    marginTop: 8,
  },
  pressed: {
    opacity: 0.7,
  },
});
