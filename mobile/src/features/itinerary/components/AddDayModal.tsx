import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { tokens } from '@/theme/tokens';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { itineraryApi } from '../api';

interface AddDayModalProps {
  visible: boolean;
  tripId: string;
  nextDayNumber: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddDayModal({
  visible,
  tripId,
  nextDayNumber,
  onClose,
  onSuccess,
}: AddDayModalProps) {
  const [dayNumber, setDayNumber] = useState(String(nextDayNumber));
  const [tripDate, setTripDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  const handleAddDay = async () => {
    const num = parseInt(dayNumber, 10);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Lỗi', 'Thứ tự ngày không hợp lệ.');
      return;
    }
    if (!tripDate.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập ngày (YYYY-MM-DD).');
      return;
    }

    setSubmitting(true);
    try {
      await itineraryApi.createDay(tripId, num, tripDate.trim());
      Alert.alert('Thành công', `Đã thêm Ngày ${num} vào lịch trình.`);
      onClose();
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Không thể tạo ngày mới.';
      Alert.alert('Lỗi', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <AppText style={styles.modalTitle}>Thêm ngày vào lịch trình</AppText>
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

          <View style={styles.formGroup}>
            <AppText style={styles.inputLabel}>Thứ tự ngày</AppText>
            <TextInput
              style={styles.textInput}
              value={dayNumber}
              onChangeText={setDayNumber}
              keyboardType="number-pad"
              placeholder="1, 2, 3..."
              placeholderTextColor={tokens.colors.textDisabled}
            />
          </View>

          <View style={styles.formGroup}>
            <AppText style={styles.inputLabel}>Ngày diễn ra (YYYY-MM-DD)</AppText>
            <TextInput
              style={styles.textInput}
              value={tripDate}
              onChangeText={setTripDate}
              placeholder="2026-11-15"
              placeholderTextColor={tokens.colors.textDisabled}
            />
          </View>

          <View style={styles.actions}>
            <AppButton
              label={submitting ? 'Đang tạo...' : 'Tạo ngày'}
              onPress={handleAddDay}
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
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.lg,
  },
  modalTitle: {
    fontSize: tokens.font.heading,
    fontWeight: '700',
    color: tokens.colors.ink,
    lineHeight: 24,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
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
  actions: {
    marginTop: tokens.spacing.sm,
  },
});

