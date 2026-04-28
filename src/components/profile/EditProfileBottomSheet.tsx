import { useCallback, useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../ui/AppButton';
import { AppTextField } from '../ui/AppTextField';
import { Icon } from '../ui/Icon';
import { colors, fontFamilies } from '../../theme';

export type EditProfilePayload = {
  name: string;
  phone: string;
  profilePhotoUri: string | null;
};

export type EditProfileBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  initialName: string;
  initialPhone: string;
  initialAvatarUri: string;
  onSaved?: (data: EditProfilePayload) => void;
};

const pickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.85,
};

export function EditProfileBottomSheet({
  visible,
  onClose,
  initialName,
  initialPhone,
  initialAvatarUri,
  onSaved,
}: EditProfileBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [photoUri, setPhotoUri] = useState<string>(initialAvatarUri);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setPhone(initialPhone);
      setPhotoUri(initialAvatarUri);
    }
  }, [visible, initialName, initialPhone, initialAvatarUri]);

  const launchCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera', 'Camera access is needed to take a profile photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync(pickerOptions);
    if (!result.canceled && result.assets[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  }, []);

  const launchLibrary = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Photos', 'Photo library access is needed to choose a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
    if (!result.canceled && result.assets[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  }, []);

  const openPhotoOptions = useCallback(() => {
    const runCamera = () => void launchCamera();
    const runLibrary = () => void launchLibrary();

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take photo', 'Choose from library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) runCamera();
          if (buttonIndex === 2) runLibrary();
        },
      );
    } else {
      Alert.alert('Profile photo', 'Choose a source', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take photo', onPress: runCamera },
        { text: 'Choose from library', onPress: runLibrary },
      ]);
    }
  }, [launchCamera, launchLibrary]);

  const onSave = useCallback(() => {
    const payload: EditProfilePayload = {
      name: name.trim(),
      phone: phone.trim(),
      profilePhotoUri: photoUri.trim() || null,
    };
    console.log('Edit profile — save', payload);
    onSaved?.(payload);
    onClose();
  }, [name, phone, photoUri, onClose, onSaved]);

  const inputColor = { color: colors.onboardingTitle };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardRoot}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss" />

          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Edit profile</Text>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change profile photo"
                onPress={openPhotoOptions}
                style={({ pressed }) => [styles.avatarBlock, pressed && styles.pressedAvatar]}
              >
                <View style={styles.avatarWrap}>
                  <View style={styles.avatarClip}>
                    <Image source={{ uri: photoUri }} style={styles.avatarImage} resizeMode="cover" />
                  </View>
                  <View style={styles.avatarFab} pointerEvents="none">
                    <Icon name="album-02" width={18} height={18} color={colors.onPrimary} />
                  </View>
                </View>
                <Text style={styles.avatarHint}>Tap to use camera or gallery</Text>
              </Pressable>

              <View style={styles.fields}>
                <AppTextField
                  label="Full name"
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  autoCapitalize="words"
                  leftIconName="user-03"
                  inputStyle={inputColor}
                />
                <AppTextField
                  label="Phone number"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                  leftIconName="smart-phone-02"
                  inputStyle={inputColor}
                />
              </View>

              <AppButton title="Save" onPress={onSave} containerStyle={styles.saveBtn} />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: fontFamilies.inter.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.onboardingTitle,
    textAlign: 'center',
    marginBottom: 20,
  },
  scrollContent: {
    paddingBottom: 8,
    gap: 4,
  },
  avatarBlock: {
    alignItems: 'center',
    marginBottom: 20,
  },
  pressedAvatar: {
    opacity: 0.85,
  },
  avatarWrap: {
    width: 108,
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarClip: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFab: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  avatarHint: {
    marginTop: 10,
    fontFamily: fontFamilies.inter.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.placeholder,
  },
  fields: {
    gap: 16,
    marginBottom: 20,
  },
  saveBtn: {
    marginTop: 4,
  },
});
