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
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { authStorage } from '@/services/auth/authStorage';
import { tokens } from '../../../theme/tokens';
import { tripApi, CreateTripPayload, TripDto } from '../../../services/api/tripApi';
import { LockIcon, GlobeIcon, SparkleIcon, CheckIcon } from '../../../components/icons/StitchIcons';

const POPULAR_DESTINATIONS = [
  'Đà Nẵng',
  'Phú Quốc',
  'Hà Nội',
  'Đà Lạt',
  'Hội An',
  'Nha Trang',
];

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
  const [isPrivate, setIsPrivate] = useState(true);
  const [aiSuggestionsEnabled, setAiSuggestionsEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const token = await authStorage.getAccessToken();
    if (!token) {
      Alert.alert(
        'Yêu cầu đăng nhập',
        'Bạn cần đăng nhập tài khoản VISTA để tạo chuyến đi mới.',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Đăng nhập',
            onPress: () => {
              onClose();
              router.push('/(auth)/login');
            },
          },
        ]
      );
      return;
    }

    if (!title.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên chuyến đi.');
      return;
    }
    if (!startDate || !endDate) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập ngày bắt đầu và kết thúc (YYYY-MM-DD).');
      return;
    }
    if (startDate < today) {
      Alert.alert('Lỗi ngày', 'Ngày bắt đầu không được chọn trong quá khứ!');
      return;
    }
    if (endDate < startDate) {
      Alert.alert('Lỗi ngày', 'Ngày kết thúc phải diễn ra sau hoặc cùng ngày với ngày bắt đầu!');
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
        visibility: isPrivate ? 'PRIVATE' : 'PUBLIC',
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
              <Text style={styles.label}>Điểm đến hoặc khu vực</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: Đà Nẵng, Quảng Nam"
                placeholderTextColor={tokens.colors.muted}
                value={destinationSummary}
                onChangeText={setDestinationSummary}
              />
              {/* Quick Destination Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipsScroll}
                contentContainerStyle={styles.chipsContent}
              >
                <Text style={styles.chipHint}>Gợi ý:</Text>
                {POPULAR_DESTINATIONS.map((dest) => {
                  const isSelected = destinationSummary.includes(dest);
                  return (
                    <TouchableOpacity
                      key={dest}
                      style={[styles.destChip, isSelected && styles.destChipActive]}
                      onPress={() => setDestinationSummary(dest)}
                      activeOpacity={0.8}
                    >
                      {isSelected ? (
                        <CheckIcon size={12} color="#ffffff" style={{ marginRight: 4 }} />
                      ) : null}
                      <Text
                        style={[styles.destChipText, isSelected && styles.destChipTextActive]}
                      >
                        {dest}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Dates row */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Ngày đi (YYYY-MM-DD) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={tokens.colors.muted}
                  value={startDate}
                  onChangeText={setStartDate}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Ngày về (YYYY-MM-DD) *</Text>
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

            {/* Privacy Section */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Quyền riêng tư</Text>
              <View style={styles.privacyContainer}>
                <TouchableOpacity
                  style={[styles.privacyCard, isPrivate && styles.privacyCardSelected]}
                  onPress={() => setIsPrivate(true)}
                  activeOpacity={0.85}
                >
                  <View style={styles.privacyIconWrap}>
                    <LockIcon size={18} color={isPrivate ? tokens.colors.primary : tokens.colors.textMuted} />
                  </View>
                  <View style={styles.privacyMeta}>
                    <View style={styles.privacyHeaderRow}>
                      <Text style={[styles.privacyTitle, isPrivate && styles.privacyTitleActive]}>
                        Chỉ thành viên được mời
                      </Text>
                      {isPrivate ? (
                        <View style={styles.recommendedBadge}>
                          <Text style={styles.recommendedBadgeText}>Khuyên dùng</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.privacyDesc}>
                      Chỉ những người nhận được mã mời hoặc link mới xem & chỉnh sửa.
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.privacyCard, !isPrivate && styles.privacyCardSelected]}
                  onPress={() => setIsPrivate(false)}
                  activeOpacity={0.85}
                >
                  <View style={styles.privacyIconWrap}>
                    <GlobeIcon size={18} color={!isPrivate ? tokens.colors.primary : tokens.colors.textMuted} />
                  </View>
                  <View style={styles.privacyMeta}>
                    <Text style={[styles.privacyTitle, !isPrivate && styles.privacyTitleActive]}>
                      Công khai trên VISTA Community
                    </Text>
                    <Text style={styles.privacyDesc}>
                      Mọi người có thể tìm kiếm, tham khảo lịch trình của nhóm bạn.
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* AI Assistant Toggle */}
            <View style={styles.aiCard}>
              <View style={styles.aiLeft}>
                <View style={styles.aiIconWrap}>
                  <SparkleIcon size={18} color="#ffffff" />
                </View>
                <View style={styles.aiMeta}>
                  <View style={styles.aiHeaderRow}>
                    <Text style={styles.aiTitle}>VISTA AI Lịch trình</Text>
                    <View style={styles.aiBadge}>
                      <Text style={styles.aiBadgeText}>Thông minh</Text>
                    </View>
                  </View>
                  <Text style={styles.aiDesc}>
                    Tự động đề xuất lộ trình tối ưu điểm đến & thời gian di chuyển.
                  </Text>
                </View>
              </View>
              <Switch
                value={aiSuggestionsEnabled}
                onValueChange={setAiSuggestionsEnabled}
                trackColor={{ false: '#cbd5e1', true: tokens.colors.aiCoPilot }}
                thumbColor="#ffffff"
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
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: tokens.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: tokens.spacing.md,
    maxHeight: '92%',
    ...tokens.shadows.cardLift,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: tokens.colors.ink,
  },
  subtitle: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: tokens.colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 16,
    color: tokens.colors.textMuted,
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
    color: tokens.colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: tokens.colors.canvas,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: tokens.colors.ink,
  },
  chipsScroll: {
    marginTop: 8,
  },
  chipsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipHint: {
    fontSize: 11,
    fontWeight: '700',
    color: tokens.colors.textMuted,
    textTransform: 'uppercase',
    marginRight: 4,
  },
  destChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: tokens.colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  destChipActive: {
    backgroundColor: tokens.colors.primary,
    borderColor: tokens.colors.primary,
  },
  destChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: tokens.colors.textSecondary,
  },
  destChipTextActive: {
    color: '#ffffff',
  },
  privacyContainer: {
    gap: 8,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    backgroundColor: tokens.colors.canvas,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    gap: 10,
  },
  privacyCardSelected: {
    backgroundColor: tokens.colors.primarySoft,
    borderColor: tokens.colors.primaryLight,
  },
  privacyIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: tokens.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyMeta: {
    flex: 1,
  },
  privacyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  privacyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: tokens.colors.ink,
  },
  privacyTitleActive: {
    color: tokens.colors.primaryDark,
  },
  recommendedBadge: {
    backgroundColor: tokens.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  recommendedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  privacyDesc: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    marginTop: 2,
  },
  aiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: tokens.colors.aiSoft,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#b2e3e7',
    marginBottom: 14,
    gap: 10,
  },
  aiLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  aiIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: tokens.colors.aiCoPilot,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiMeta: {
    flex: 1,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  aiBadge: {
    backgroundColor: tokens.colors.aiCoPilot,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  aiDesc: {
    fontSize: 11,
    color: tokens.colors.textSecondary,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: tokens.colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: tokens.colors.textSecondary,
  },
  submitBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: tokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadows.buttonPrimary,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
