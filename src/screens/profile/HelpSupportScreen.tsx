import { useCallback } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/ui';
import { colors, fontFamilies } from '../../theme';

const SUPPORT_EMAIL = 'support@localloom.com';
const SUPPORT_PHONE_DISPLAY = '+91 12345 67890';
const SUPPORT_PHONE_TEL = '+911234567890';

type ContactRowProps = {
  icon: 'mail-01' | 'call-02';
  iconSize: number;
  title: string;
  subtitle: string;
  onPress: () => void;
};

function ContactRow({ icon, iconSize, title, subtitle, onPress }: ContactRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Icon name={icon} width={iconSize} height={iconSize} color={colors.primary} />
      </View>
      <View style={styles.cardTextCol}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

export function HelpSupportScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const openEmail = useCallback(() => {
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
  }, []);

  const openPhone = useCallback(() => {
    void Linking.openURL(`tel:${SUPPORT_PHONE_TEL}`);
  }, []);

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
          Help & Support
        </Text>
      </View>

      <View style={[styles.body, { paddingBottom: Math.max(insets.bottom, 14) + 24 }]}>
        <View style={styles.cardsCol}>
          <ContactRow
            icon="mail-01"
            iconSize={24}
            title="Email"
            subtitle={SUPPORT_EMAIL}
            onPress={openEmail}
          />
          <ContactRow
            icon="call-02"
            iconSize={20}
            title="Contact Number"
            subtitle={SUPPORT_PHONE_DISPLAY}
            onPress={openPhone}
          />
        </View>
      </View>
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
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  cardsCol: {
    gap: 12,
    alignItems: 'stretch',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    shadowColor: '#1B1B4D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 22.5,
    elevation: 3,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardTextCol: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  cardTitle: {
    fontFamily: fontFamilies.nunitoSans.bold,
    fontSize: 14,
    lineHeight: 18,
    color: '#252525',
  },
  cardSubtitle: {
    fontFamily: fontFamilies.nunitoSans.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#717171',
  },
  pressed: {
    opacity: 0.7,
  },
});
