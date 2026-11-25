import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { tokens } from '@/theme/tokens';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { ItineraryItem } from '../types';
import { itineraryApi } from '../api';

interface AddStopModalProps {
  visible: boolean;
  dayId: string;
  dayNumber: number;
  currentStopsCount: number;
  existingStops?: ItineraryItem[];
  onClose: () => void;
  onSuccess: () => void;
  onReviewStop?: (savedItem: ItineraryItem) => void;
}

export function AddStopModal({
  visible,
  dayId,
  dayNumber,
  currentStopsCount,
  existingStops,
  onClose,
  onSuccess,
  onReviewStop,
}: AddStopModalProps) {
  const [stopName, setStopName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!stopName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên điểm dừng.');
      return;
    }

    setSubmitting(true);
    try {
      const createdItem = await itineraryApi.createItem(dayId, {
        customStopName: stopName.trim(),
        startTime: startTime.trim() ? (startTime.includes(':') && startTime.length === 5 ? `${startTime.trim()}:00` : startTime.trim()) : null,
        endTime: endTime.trim() ? (endTime.includes(':') && endTime.length === 5 ? `${endTime.trim()}:00` : endTime.trim()) : null,
        note: note.trim() || undefined,
        sortOrder: currentStopsCount,
      });

      // Kiểm tra cảnh báo trùng giờ (V-02: M-01)
      const resWarnings = (createdItem as any)?.warnings as Array<{ code?: string; message?: string }> | undefined;
      const apiOverlapWarning = resWarnings?.find(
        (w) => w.code === 'TIME_OVERLAP' || (w.message && w.message.toLowerCase().includes('trùng'))
      );

      let clientOverlapPartner: string | null = null;
      if (!apiOverlapWarning && existingStops && existingStops.length > 0 && startTime && endTime) {
        const toMinutes = (timeStr: string) => {
          const parts = timeStr.split(':').map(Number);
          return parts[0] * 60 + parts[1];
        };
        const s1 = toMinutes(startTime.slice(0, 5));
        const e1 = toMinutes(endTime.slice(0, 5));
        if (s1 < e1) {
          const conflicting = existingStops.find((st) => {
            if (!st.startTime || !st.endTime) return false;
            const s2 = toMinutes(st.startTime.slice(0, 5));
            const e2 = toMinutes(st.endTime.slice(0, 5));
            return Math.max(s1, s2) < Math.min(e1, e2);
          });
          if (conflicting) {
            clientOverlapPartner = conflicting.customStopName || 'Điểm dừng khác';
          }
        }
      }

      const overlapPartnerName = apiOverlapWarning?.message
        ? apiOverlapWarning.message.replace(/^.*trùng với\s*/i, '').trim() || apiOverlapWarning.message
        : clientOverlapPartner;

      if (apiOverlapWarning || clientOverlapPartner) {
        Alert.alert(
          'Cảnh báo trùng giờ',
          `Điểm dừng đã lưu, nhưng đang trùng giờ với ${overlapPartnerName}. Bạn có muốn kiểm tra lại không?`,
          [
            {
              text: 'Để nguyên',
              style: 'default',
              onPress: () => {
                setStopName('');
                setNote('');
                onClose();
                onSuccess();
              },
            },
            {
              text: 'Kiểm tra lại',
              style: 'cancel',
              onPress: () => {
                onClose();
                onSuccess();
                if (onReviewStop) {
                  onReviewStop(createdItem);
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Thành công', 'Đã thêm điểm dừng mới vào lịch trình.');
        setStopName('');
        setNote('');
        onClose();
        onSuccess();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Không thể tạo điểm dừng mới.';
      Alert.alert('Lỗi', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View>
              <AppText style={styles.headerSubtitle}>Ngày {dayNumber} của chuyến đi</AppText>
              <AppText style={styles.modalTitle}>Thêm điểm dừng mới</AppText>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel="Đóng">
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M18 6L6 18M6 6l12 12"
                  stroke={tokens.colors.ink}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <AppText style={styles.inputLabel}>Tên điểm đến / trạm dừng *</AppText>
              <TextInput
                style={styles.textInput}
                value={stopName}
                onChangeText={setStopName}
                placeholder="VD: Cầu Rồng, Chùa Linh Ứng..."
                placeholderTextColor={tokens.colors.textDisabled}
              />
            </View>

            <View style={styles.timeInputsRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <AppText style={styles.inputLabel}>Giờ bắt đầu</AppText>
                <TextInput
                  style={styles.textInput}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="08:30"
                  placeholderTextColor={tokens.colors.textDisabled}
                  maxLength={5}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <AppText style={styles.inputLabel}>Giờ kết thúc</AppText>
                <TextInput
                  style={styles.textInput}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="10:30"
                  placeholderTextColor={tokens.colors.textDisabled}
                  maxLength={5}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <AppText style={styles.inputLabel}>Ghi chú cho nhóm (tùy chọn)</AppText>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={note}
                onChangeText={setNote}
                placeholder="Nhắc nhở trang phục, mua vé trước..."
                placeholderTextColor={tokens.colors.textDisabled}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.actionButtons}>
              <AppButton
                label={submitting ? 'Đang thêm...' : '+ Thêm vào lịch trình'}
                onPress={handleAdd}
                variant="primary"
                loading={submitting}
                fullWidth
              />
              <AppButton
                label="Hủy bỏ"
                onPress={onClose}
                variant="secondary"
                disabled={submitting}
                fullWidth
                style={{ marginTop: tokens.spacing.sm }}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: tokens.colors.surface,
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    maxHeight: '80%',
    paddingBottom: tokens.spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  headerSubtitle: {
    fontSize: tokens.font.caption,
    fontWeight: '600',
    color: tokens.colors.primary,
    lineHeight: 16,
  },
  modalTitle: {
    fontSize: tokens.font.heading,
    fontWeight: '700',
    color: tokens.colors.ink,
    lineHeight: 24,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.md,
  },
  formGroup: {
    marginBottom: tokens.spacing.md,
    gap: tokens.spacing.xs,
  },
  inputLabel: {
    fontSize: tokens.font.body,
    fontWeight: '600',
    color: tokens.colors.ink,
    lineHeight: 20,
  },
  textInput: {
    backgroundColor: tokens.colors.canvas,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
    fontSize: tokens.font.body,
    color: tokens.colors.ink,
    lineHeight: 20,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  timeInputsRow: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
  },
  actionButtons: {
    marginTop: tokens.spacing.sm,
    marginBottom: tokens.spacing.lg,
  },
});

