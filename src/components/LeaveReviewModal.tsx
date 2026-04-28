import { memo, useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from './ui/AppButton';
import { Icon } from './ui/Icon';
import { StarRatingInput } from './ui/StarRatingInput';
import { colors, fontFamilies } from '../theme';

export type LeaveReviewModalProps = {
  visible: boolean;
  providerName: string;
  onClose: () => void;
  onPost: (payload: { rating: number; text: string }) => void;
};

export const LeaveReviewModal = memo(function LeaveReviewModal({
  visible,
  providerName,
  onClose,
  onPost,
}: LeaveReviewModalProps) {
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!visible) {
      setRating(0);
      setText('');
    }
  }, [visible]);

  const submit = useCallback(() => {
    if (rating < 1) return;
    onPost({ rating, text: text.trim() });
    onClose();
  }, [rating, text, onPost, onClose]);

  const canPost = rating >= 1 && text.trim().length > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss" />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderSpacer} />
              <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
                <Icon name="cancel-01" width={24} height={24} color={colors.onboardingTitle} />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetScroll}
            >
              <Text style={styles.modalTitle}>Leave a Review for {providerName}</Text>
              <Text style={styles.modalSubtitle}>How would you rate your experience with {providerName}?</Text>

              <View style={styles.starsBlock}>
                <StarRatingInput value={rating} onChange={setRating} starSize={22} gap={12} />
              </View>

              <TextInput
                style={styles.textArea}
                placeholder="Share details about your experience…"
                placeholderTextColor={colors.placeholder}
                multiline
                textAlignVertical="top"
                value={text}
                onChangeText={setText}
                accessibilityLabel="Review text"
              />

              <AppButton title="Post" onPress={submit} disabled={!canPost} containerStyle={styles.postBtn}  labelStyle={styles.postBtnText}/>

              <Text style={styles.disclaimer}>
                All reviews on LocalLoom are verified within 48 hours before posting to ensure authenticity and accuracy.
              </Text>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  sheetHeaderSpacer: { flex: 1 },
  sheetScroll: {
    paddingBottom: 16,
    gap: 0,
  },
  modalTitle: {
    fontFamily: fontFamilies.nunitoSans.medium,
    fontSize: 14,
    lineHeight: 24,
    color: colors.onboardingTitle,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontFamily: fontFamilies.nunitoSans.regular,
    fontSize: 12,
    lineHeight: 20,
    color: '#6B6B6B',
    textAlign: 'center',
    marginBottom: 20,
  },
  starsBlock: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontFamily: fontFamilies.nunitoSans.medium,
    fontSize: 14,
    lineHeight: 20,
    color: '#3E4143',
    marginBottom: 8,
  },
  textArea: {
    minHeight: 120,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fontFamilies.nunitoSans.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onboardingTitle,
    marginBottom: 20,
  },
  postBtn: {
    width: '40%',
    alignSelf: 'center',
    height: 36,
    // width: '100%',
    marginBottom: 16,
  },
  postBtnText: {
    fontFamily: fontFamilies.nunitoSans.semibold,
    fontSize: 14,
    lineHeight: 16,
    color: colors.background,
  },
  disclaimer: {
    fontFamily: fontFamilies.nunitoSans.regular,
    fontSize: 10,
    lineHeight: 16,
    color: colors.label,
    textAlign: 'center',
  },
});
