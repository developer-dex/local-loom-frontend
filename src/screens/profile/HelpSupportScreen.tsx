import { useCallback, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppButton,
  AppTextField,
  Icon,
  KeyboardFormScrollView,
  useToast,
} from '../../components/ui';
import { authenticatedPost } from '../../api/client';
import { colors, fontFamilies } from '../../theme';

function validateName(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Name is required.';
  if (v.length < 2) return 'Name is too short.';
  return null;
}

function validateEmail(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address.';
  return null;
}

function validateMessage(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Message is required.';
  if (v.length < 10) return 'Please provide more details (at least 10 characters).';
  return null;
}

export function HelpSupportScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = useCallback(async () => {
    const ne = validateName(name);
    const ee = validateEmail(email);
    const me = validateMessage(message);
    setNameError(ne);
    setEmailError(ee);
    setMessageError(me);
    if (ne || ee || me) return;

    setSubmitting(true);
    try {
      await authenticatedPost('/help-desk', {
        body: {
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
        },
      });
      showToast({ message: 'Your message has been sent. We will get back to you soon!', type: 'success' });
      setName('');
      setEmail('');
      setMessage('');
      if (navigation.canGoBack()) navigation.goBack();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send message. Please try again.';
      showToast({ message: msg, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }, [name, email, message, showToast]);

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

      <KeyboardFormScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.body,
          { paddingBottom: Math.max(insets.bottom, 14) + 24 },
        ]}
      >
        <Text style={styles.subtitle}>
          Have a question or need help? Send us a message and we'll get back to you as soon as possible.
        </Text>

        <View style={styles.fields}>
          <AppTextField
            label="Name"
            leftIconName="user-03"
            value={name}
            onChangeText={(t) => {
              setName(t);
              setNameError(validateName(t));
            }}
            placeholder="Enter your name"
            autoComplete="name"
            error={nameError ?? undefined}
          />

          <AppTextField
            label="Email"
            leftIconName="mail-01"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setEmailError(validateEmail(t));
            }}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={emailError ?? undefined}
          />

          <View style={styles.messageField}>
            <Text style={styles.fieldLabel}>Message</Text>
            <View style={[styles.messageInputWrap, messageError ? styles.messageInputError : null]}>
              <TextInput
                value={message}
                onChangeText={(t) => {
                  setMessage(t);
                  setMessageError(validateMessage(t));
                }}
                placeholder="Describe your issue or question..."
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={10}
                textAlignVertical="top"
                style={styles.messageInput}
                accessibilityLabel="Message"
              />
            </View>
            {messageError ? <Text style={styles.fieldError}>{messageError}</Text> : null}
          </View>
        </View>

        <AppButton
          title="Submit"
          onPress={onSubmit}
          loading={submitting}
          containerStyle={styles.submitBtn}
        />
      </KeyboardFormScrollView>
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
  scroll: {
    flex: 1,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  subtitle: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    lineHeight: 20,
    color: '#717171',
    marginBottom: 24,
  },
  fields: {
    gap: 20,
  },
  messageField: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.label,
  },
  messageInputWrap: {
    minHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
  },
  messageInputError: {
    borderColor: colors.error,
  },
  messageInput: {
    flex: 1,
    fontFamily: fontFamilies.inter.regular,
    fontSize: 16,
    color: colors.onboardingTitle,
    minHeight: 150,
    paddingVertical: 0,
  },
  fieldError: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 12,
    color: colors.error,
  },
  submitBtn: {
    marginTop: 32,
    width: '100%',
  },
  pressed: {
    opacity: 0.7,
  },
});
