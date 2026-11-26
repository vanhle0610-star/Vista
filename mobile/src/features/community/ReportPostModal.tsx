import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { tokens } from '@/theme/tokens';
import { api, apiErrorMessage } from '@/services/api/client';
import { CloseIcon } from '@/components/icons/StitchIcons';

export interface ReportPostModalProps {
  visible: boolean;
  postId: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const REPORT_REASONS = [
  'Nội dung phản cảm hoặc bạo lực',
  'Thông tin sai lệch hoặc lừa đảo',
  'Spam hoặc quảng cáo trái phép',
  'Quấy rối hoặc ngôn từ thù địch',
  'Lý do khác',
];

export function ReportPostModal({
  visible,
  postId,
  onClose,
  onSuccess,
}: ReportPostModalProps) {
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!postId || submitting) return;
    setSubmitting(true);
    setError(null);

    const fullReason = details.trim()
      ? `${selectedReason}: ${details.trim()}`
      : selectedReason;

    try {
      await api.post(`/posts/${postId}/reports`, {
        reason: fullReason,
        targetType: 'POST',
      });
      Alert.alert(
        'Đã gửi báo cáo',
        'Báo cáo của bạn đã được ghi nhận và gửi tới ban kiểm duyệt.',
        [{ text: 'Đóng', onPress: () => {
          onClose();
          onSuccess?.();
        }}],
      );
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
              <AppText style={styles.title}>Báo cáo bài viết</AppText>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Đóng"
                onPress={onClose}
                style={styles.closeBtn}
              >
                <CloseIcon size={18} color={tokens.colors.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.body}>
              <AppText style={styles.prompt}>
                Vui lòng chọn lý do bài viết này vi phạm tiêu chuẩn cộng đồng:
              </AppText>

              {REPORT_REASONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    activeOpacity={0.7}
                    style={[
                      styles.reasonRow,
                      isSelected && styles.reasonRowSelected,
                    ]}
                    onPress={() => setSelectedReason(reason)}
                  >
                    <View style={styles.radioOuter}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <AppText style={styles.reasonText}>{reason}</AppText>
                  </TouchableOpacity>
                );
              })}

              <AppText style={styles.label}>Chi tiết bổ sung (tùy chọn):</AppText>
              <TextInput
                style={styles.detailsInput}
                multiline
                numberOfLines={3}
                placeholder="Mô tả cụ thể vi phạm…"
                placeholderTextColor={tokens.colors.textMuted}
                value={details}
                onChangeText={setDetails}
                maxLength={400}
              />

              {error && (
                <AppText style={styles.errorText} accessibilityLiveRegion="polite">
                  {error}
                </AppText>
              )}
            </ScrollView>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                disabled={submitting}
              >
                <AppText style={styles.cancelBtnText}>Hủy</AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <AppText style={styles.submitBtnText}>Gửi báo cáo</AppText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 420,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    padding: 20,
    gap: 12,
  },
  prompt: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reasonRowSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: tokens.colors.primary,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: tokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: tokens.colors.primary,
  },
  reasonText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 6,
  },
  detailsInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  submitBtn: {
    backgroundColor: tokens.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

