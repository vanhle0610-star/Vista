import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { tokens } from '../../../theme/tokens';
import { tripApi, CreateTripPayload, TripDto } from '../../../services/api/tripApi';

interface CreateTripModalProps {
  visible: boolean;
  onClose: () => void;
  onTripCreated: (trip: TripDto) => void;
}

export function CreateTripModal({ visible, onClose, onTripCreated }: CreateTripModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const next3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [destinationSummary, setDestinationSummary] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(next3Days);
  const [budgetText, setBudgetText] = useState('15000000');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên chuyến đi.');
      return;
    }
    if (!startDate || !endDate) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập ngày bắt đầu và kết thúc (YYYY-MM-DD).');
      return;
    }

    const budget = parseFloat(budgetText.replace(/\D/g, '')) || 0;

    setIsSubmitting(true);
    try {
      const payload: CreateTripPayload = {
        title: title.trim(),
        destinationSummary: destinationSummary.trim() || undefined,
        startDate,
        endDate,
        budgetTotal: budget > 0 ? budget : undefined,
        currency: 'VND',
      };

      const created = await tripApi.createTrip(payload);
      Alert.alert('Thành công', `Đã tạo chuyến đi "${created.title}"!`);
      onTripCreated(created);
      onClose();
      // Reset form
      setTitle('');
      setDestinationSummary('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo chuyến đi';
      Alert.alert('Lỗi', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Tạo chuyến đi mới</Text>
              <Text style={styles.subtitle}>Thiết lập hành trình và mời các bạn bè cùng đi</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tên chuyến đi *</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: Khám phá Đà Nẵng – Hội An"
                placeholderTextColor={tokens.colors.muted}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Destination */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Điểm đến chính</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: Đà Nẵng, Quảng Nam"
                placeholderTextColor={tokens.colors.muted}
                value={destinationSummary}
                onChangeText={setDestinationSummary}
              />
            </View>

            {/* Dates row */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Ngày đi (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={tokens.colors.muted}
                  value={startDate}
                  onChangeText={setStartDate}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Ngày về (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={tokens.colors.muted}
                  value={endDate}
                  onChangeText={setEndDate}
                />
              </View>
            </View>

            {/* Budget */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Dự toán ngân sách nhóm (VND)</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: 15.000.000"
                placeholderTextColor={tokens.colors.muted}
                keyboardType="numeric"
                value={budgetText}
                onChangeText={setBudgetText}
              />
            </View>
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitText}>+ Tạo hành trình</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  formScroll: {
    marginVertical: 4,
  },
  inputGroup: {
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  submitBtn: {
    flex: 2,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#005ea5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#005ea5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
