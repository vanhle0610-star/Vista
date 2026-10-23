import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { tokens } from '@/theme/tokens';
import { tripApi } from '../services/tripApi';

export function CreateTripScreen() {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [destinationSummary, setDestinationSummary] = useState('');
  const [budgetTotal, setBudgetTotal] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề chuyến đi');
      return;
    }
    if (!startDate.trim() || !endDate.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập ngày bắt đầu và kết thúc (Định dạng YYYY-MM-DD)');
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate.trim()) || !dateRegex.test(endDate.trim())) {
      Alert.alert('Lỗi định dạng ngày', 'Vui lòng nhập ngày theo định dạng YYYY-MM-DD (Ví dụ: 2026-11-01)');
      return;
    }

    if (endDate.trim() < startDate.trim()) {
      Alert.alert('Lỗi', 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu');
      return;
    }

    let budgetNum: number | undefined = undefined;
    if (budgetTotal.trim()) {
      budgetNum = parseFloat(budgetTotal.trim());
      if (isNaN(budgetNum) || budgetNum < 0) {
        Alert.alert('Lỗi', 'Ngân sách dự kiến phải là số không âm');
        return;
      }
    }

    setSubmitting(true);
    try {
      const created = await tripApi.createTrip({
        title: title.trim(),
        startDate: startDate.trim(),
        endDate: endDate.trim(),
        destinationSummary: destinationSummary.trim() || undefined,
        budgetTotal: budgetNum,
        currency: 'VND',
        visibility: 'PRIVATE',
      });

      Alert.alert(
        'Thành công',
        `Chuyến đi "${created.title}" đã được tạo thành công! Bạn là Chủ chuyến đi.`,
        [
          {
            text: 'Xem chi tiết',
            onPress: () => router.replace(`/trip/${created.id}`),
          },
        ]
      );
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Không thể tạo chuyến đi. Vui lòng kiểm tra lại thông tin.';
      Alert.alert('Lỗi tạo chuyến đi', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <AppText style={styles.title}>Tạo chuyến đi mới</AppText>
          <AppText style={styles.subtitle}>
            Lên kế hoạch du lịch và mời bạn bè tham gia
          </AppText>
        </View>

        <View style={styles.formGroup}>
          <AppText style={styles.label}>Tên chuyến đi *</AppText>
          <AppInput
            placeholder="Ví dụ: Khám phá Đà Nẵng 3 ngày 2 đêm"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <AppText style={styles.label}>Ngày đi (YYYY-MM-DD) *</AppText>
            <AppInput
              placeholder="2026-11-01"
              value={startDate}
              onChangeText={setStartDate}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <AppText style={styles.label}>Ngày về (YYYY-MM-DD) *</AppText>
            <AppInput
              placeholder="2026-11-03"
              value={endDate}
              onChangeText={setEndDate}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <AppText style={styles.label}>Điểm đến / Tóm tắt hành trình</AppText>
          <AppInput
            placeholder="Ví dụ: Bà Nà Hills, Bán đảo Sơn Trà, Cầu Rồng..."
            value={destinationSummary}
            onChangeText={setDestinationSummary}
          />
        </View>

        <View style={styles.formGroup}>
          <AppText style={styles.label}>Ngân sách dự kiến (VND)</AppText>
          <AppInput
            placeholder="Ví dụ: 5000000"
            keyboardType="numeric"
            value={budgetTotal}
            onChangeText={setBudgetTotal}
          />
        </View>

        <View style={styles.actions}>
          <AppButton
            label={submitting ? 'Đang tạo...' : 'Tạo chuyến đi'}
            onPress={handleSubmit}
            disabled={submitting}
          />
          <AppButton
            label="Hủy bỏ"
            variant="secondary"
            onPress={() => router.back()}
            disabled={submitting}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
    backgroundColor: tokens.colors.canvas,
    flexGrow: 1,
  },
  header: {
    marginBottom: tokens.spacing.sm,
  },
  title: {
    fontSize: tokens.font.heading,
    fontWeight: '800',
    color: tokens.colors.ink,
  },
  subtitle: {
    fontSize: tokens.font.body,
    color: tokens.colors.muted,
    marginTop: 4,
  },
  formGroup: {
    gap: tokens.spacing.xs,
  },
  label: {
    fontSize: tokens.font.small,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  row: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
  },
  actions: {
    marginTop: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
});

