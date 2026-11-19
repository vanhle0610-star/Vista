import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { tokens } from '@/theme/tokens';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { ItineraryItem } from '../types';
import { itineraryApi } from '../api';

interface StopDetailModalProps {
  visible: boolean;
  item: ItineraryItem | null;
  dayNumber?: number;
  tripDate?: string;
  onClose: () => void;
  onSuccess: () => void;
}

// Helper to compute duration string e.g. "2 giờ 30 phút"
function computeDurationText(start?: string | null, end?: string | null): string {
  if (!start || !end) return 'Chưa xác định';
  try {
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    const totalMinutes = h2 * 60 + m2 - (h1 * 60 + m1);
    if (totalMinutes <= 0) return 'Khung giờ linh hoạt';
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours > 0 && mins > 0) return `${hours} giờ ${mins} phút`;
    if (hours > 0) return `${hours} giờ`;
    return `${mins} phút`;
  } catch {
    return 'Linh hoạt';
  }
}

export function StopDetailModal({
  visible,
  item,
  dayNumber = 1,
  tripDate,
  onClose,
  onSuccess,
}: StopDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [stopName, setStopName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (item) {
      setStopName(item.customStopName || '');
      setStartTime(item.startTime ? item.startTime.slice(0, 5) : '09:00');
      setEndTime(item.endTime ? item.endTime.slice(0, 5) : '11:00');
      setNote(item.note || '');
      setIsEditing(false);
    }
  }, [item]);

  if (!item) return null;

  // Handle saving updates with optimistic locking
  const handleSave = async () => {
    if (!stopName.trim()) {
      Alert.alert('Lỗi', 'Tên điểm dừng không được để trống.');
      return;
    }

    setSaving(true);
    try {
      await itineraryApi.updateItem(item.id, {
        customStopName: stopName.trim(),
        startTime: startTime.trim() ? (startTime.includes(':') && startTime.length === 5 ? `${startTime.trim()}:00` : startTime.trim()) : null,
        endTime: endTime.trim() ? (endTime.includes(':') && endTime.length === 5 ? `${endTime.trim()}:00` : endTime.trim()) : null,
        note: note.trim() || undefined,
        expected_updated_at: item.updatedAt,
      });

      Alert.alert('Thành công', 'Thông tin điểm dừng đã được cập nhật.');
      setIsEditing(false);
      onSuccess();
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        Alert.alert(
          'Xung đột dữ liệu (409)',
          'Điểm dừng này vừa được cập nhật bởi thành viên khác trong nhóm. Vui lòng làm mới trang để đồng bộ dữ liệu mới nhất.'
        );
      } else {
        const msg = err?.response?.data?.detail || 'Không thể cập nhật điểm dừng.';
        Alert.alert('Lỗi', msg);
      }
    } finally {
      setSaving(false);
    }
  };

  // Handle delete stop
  const handleDelete = () => {
    Alert.alert(
      'Xác nhận xóa điểm dừng',
      `Bạn có chắc chắn muốn xóa "${item.customStopName || 'Điểm dừng'}" khỏi lịch trình ngày ${dayNumber}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await itineraryApi.deleteItem(item.id);
              Alert.alert('Đã xóa', 'Điểm dừng đã được gỡ khỏi lịch trình.');
              onClose();
              onSuccess();
            } catch (err: any) {
              const msg = err?.response?.data?.detail || 'Không thể xóa điểm dừng này.';
              Alert.alert('Lỗi', msg);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const durationStr = computeDurationText(startTime, endTime);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalSheet}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.categoryBadge}>
                <AppText style={styles.categoryBadgeText}>Điểm dừng #{item.sortOrder + 1}</AppText>
              </View>
              <AppText style={styles.modalTitle} numberOfLines={1}>
                {isEditing ? 'Chỉnh sửa điểm dừng' : item.customStopName || 'Chi tiết điểm dừng'}
              </AppText>
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
            {/* Context Badge: Day & Date */}
            <View style={styles.dayContextPill}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"
                  fill={tokens.colors.primary}
                />
              </Svg>
              <AppText style={styles.dayContextText}>
                Ngày {dayNumber} {tripDate ? `• ${tripDate}` : ''} • Khung giờ: {startTime || '09:00'} - {endTime || '11:00'}
              </AppText>
            </View>

            {isEditing ? (
              /* Edit Form */
              <View style={styles.editForm}>
                <View style={styles.inputGroup}>
                  <AppText style={styles.inputLabel}>Tên điểm đến / trạm dừng *</AppText>
                  <TextInput
                    style={styles.textInput}
                    value={stopName}
                    onChangeText={setStopName}
                    placeholder="VD: Cầu Rồng, Bảo tàng Chăm..."
                    placeholderTextColor={tokens.colors.textDisabled}
                  />
                </View>

                <View style={styles.timeInputsRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <AppText style={styles.inputLabel}>Giờ bắt đầu</AppText>
                    <TextInput
                      style={styles.textInput}
                      value={startTime}
                      onChangeText={setStartTime}
                      placeholder="09:00"
                      placeholderTextColor={tokens.colors.textDisabled}
                      maxLength={5}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <AppText style={styles.inputLabel}>Giờ kết thúc</AppText>
                    <TextInput
                      style={styles.textInput}
                      value={endTime}
                      onChangeText={setEndTime}
                      placeholder="11:30"
                      placeholderTextColor={tokens.colors.textDisabled}
                      maxLength={5}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <AppText style={styles.inputLabel}>Ghi chú cho nhóm (Lưu ý, số vé, nhắc nhở)</AppText>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={note}
                    onChangeText={setNote}
                    placeholder="VD: Mang nón, giày thể thao, mua vé trước..."
                    placeholderTextColor={tokens.colors.textDisabled}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.editActions}>
                  <AppButton
                    label={saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    onPress={handleSave}
                    variant="primary"
                    loading={saving}
                    fullWidth
                  />
                  <AppButton
                    label="Hủy chỉnh sửa"
                    onPress={() => setIsEditing(false)}
                    variant="secondary"
                    fullWidth
                    style={{ marginTop: tokens.spacing.sm }}
                  />
                </View>
              </View>
            ) : (
              /* View Detail Mode */
              <View style={styles.viewContent}>
                {/* Time & Duration Bento */}
                <View style={styles.bentoTimeCard}>
                  <View style={styles.bentoTimeCol}>
                    <AppText style={styles.bentoLabel}>Khung giờ dự kiến</AppText>
                    <AppText style={styles.bentoTimeVal}>
                      {startTime || '09:00'} — {endTime || '11:00'}
                    </AppText>
                    <AppText style={styles.bentoSub}>Theo giờ địa phương</AppText>
                  </View>
                  <View style={styles.bentoDivider} />
                  <View style={styles.bentoTimeCol}>
                    <AppText style={styles.bentoLabel}>Thời lượng</AppText>
                    <AppText style={styles.bentoDurationVal}>{durationStr}</AppText>
                    <AppText style={styles.bentoSub}>Dự kiến hoạt động</AppText>
                  </View>
                </View>

                {/* Group Collaborative Notes Card */}
                <View style={styles.notesCard}>
                  <View style={styles.notesCardHeader}>
                    <View style={styles.notesTitleRow}>
                      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                          stroke={tokens.colors.aiTeal}
                          strokeWidth={2}
                        />
                        <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={tokens.colors.aiTeal} strokeWidth={2} />
                      </Svg>
                      <AppText style={styles.notesTitle}>Ghi chú hành trình</AppText>
                    </View>
                    <View style={styles.notesTag}>
                      <AppText style={styles.notesTagText}>LƯU Ý</AppText>
                    </View>
                  </View>
                  <AppText style={styles.notesBody}>
                    {item.note || 'Chưa có ghi chú đặc biệt cho điểm dừng này. Bạn có thể nhấn Chỉnh sửa để thêm lưu ý cho cả nhóm.'}
                  </AppText>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtonsCol}>
                  <AppButton
                    label="✏️ Chỉnh sửa điểm dừng"
                    onPress={() => setIsEditing(true)}
                    variant="primary"
                    fullWidth
                  />
                  <AppButton
                    label={deleting ? 'Đang xóa...' : '🗑️ Xóa điểm dừng này'}
                    onPress={handleDelete}
                    variant="danger"
                    loading={deleting}
                    fullWidth
                    style={{ marginTop: tokens.spacing.sm }}
                  />
                </View>
              </View>
            )}
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
    maxHeight: '85%',
    paddingBottom: tokens.spacing.xl,
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
  headerTitleGroup: {
    flex: 1,
    paddingRight: tokens.spacing.md,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: tokens.colors.primarySoft,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
    marginBottom: 4,
  },
  categoryBadgeText: {
    fontSize: tokens.font.micro,
    fontWeight: '700',
    color: tokens.colors.primary,
    lineHeight: 14,
  },
  modalTitle: {
    fontSize: tokens.font.heading,
    fontWeight: '700',
    color: tokens.colors.ink,
    lineHeight: 24,
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

  // Context Pill
  dayContextPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    backgroundColor: tokens.colors.surfaceSubtle,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.full,
    marginBottom: tokens.spacing.md,
  },
  dayContextText: {
    fontSize: tokens.font.caption,
    fontWeight: '600',
    color: tokens.colors.ink,
    lineHeight: 18,
  },

  // Bento Time Card
  bentoTimeCard: {
    flexDirection: 'row',
    backgroundColor: tokens.colors.canvas,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
  },
  bentoTimeCol: {
    flex: 1,
  },
  bentoDivider: {
    width: 1,
    backgroundColor: tokens.colors.border,
    marginHorizontal: tokens.spacing.md,
  },
  bentoLabel: {
    fontSize: tokens.font.micro,
    fontWeight: '600',
    color: tokens.colors.textMuted,
    lineHeight: 14,
  },
  bentoTimeVal: {
    fontSize: tokens.font.subtitle,
    fontWeight: '700',
    color: tokens.colors.primary,
    lineHeight: 22,
    marginTop: 2,
  },
  bentoDurationVal: {
    fontSize: tokens.font.subtitle,
    fontWeight: '700',
    color: tokens.colors.ink,
    lineHeight: 22,
    marginTop: 2,
  },
  bentoSub: {
    fontSize: tokens.font.micro,
    color: tokens.colors.textMuted,
    lineHeight: 14,
    marginTop: 2,
  },

  // Notes Card
  notesCard: {
    backgroundColor: tokens.colors.aiSoft,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  notesCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.xs,
  },
  notesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  notesTitle: {
    fontSize: tokens.font.body,
    fontWeight: '700',
    color: tokens.colors.ink,
    lineHeight: 20,
  },
  notesTag: {
    backgroundColor: tokens.colors.aiTeal,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: tokens.radius.xs,
  },
  notesTagText: {
    fontSize: tokens.font.micro,
    fontWeight: '800',
    color: tokens.colors.surface,
    lineHeight: 12,
  },
  notesBody: {
    fontSize: tokens.font.body,
    color: tokens.colors.textSecondary,
    lineHeight: 21,
    marginTop: 4,
  },

  // Action Buttons
  actionButtonsCol: {
    marginTop: tokens.spacing.sm,
    marginBottom: tokens.spacing.lg,
  },

  // Form Inputs
  editForm: {
    gap: tokens.spacing.md,
    paddingBottom: tokens.spacing.xl,
  },
  inputGroup: {
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  timeInputsRow: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
  },
  editActions: {
    marginTop: tokens.spacing.sm,
  },
  viewContent: {
    paddingBottom: tokens.spacing.lg,
  },
});

