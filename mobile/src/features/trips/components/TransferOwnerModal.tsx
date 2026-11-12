import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { tokens } from '@/theme/tokens';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { TripMember } from '../types';
import { tripFeatureApi } from '../api';

interface TransferOwnerModalProps {
  visible: boolean;
  tripId: string;
  members: TripMember[];
  currentUserId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function TransferOwnerModal({
  visible,
  tripId,
  members,
  currentUserId,
  onClose,
  onSuccess,
}: TransferOwnerModalProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Eligible members: must be MEMBER and not the current owner
  const candidateMembers = members.filter(
    (m) => m.role !== 'OWNER' && m.userId !== currentUserId
  );

  const handleConfirmTransfer = async () => {
    if (!selectedMemberId) {
      Alert.alert('Chưa chọn thành viên', 'Vui lòng chọn một thành viên để chuyển quyền Trưởng nhóm.');
      return;
    }

    const targetMember = members.find((m) => m.userId === selectedMemberId);

    Alert.alert(
      'Xác nhận chuyển quyền Trưởng nhóm',
      `Bạn có chắc chắn muốn chuyển quyền Trưởng nhóm cho "${targetMember?.displayName || 'thành viên này'}"?\n\nSau khi chuyển giao, bạn sẽ trở thành thành viên thông thường.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận chuyển',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await tripFeatureApi.transferOwnership(tripId, selectedMemberId);
              Alert.alert(
                'Thành công',
                `Đã chuyển quyền Trưởng nhóm cho "${targetMember?.displayName || 'thành viên'}" thành công.`
              );
              onClose();
              onSuccess();
            } catch (err: any) {
              const msg =
                err?.response?.data?.detail || 'Không thể chuyển quyền trưởng nhóm lúc này.';
              Alert.alert('Lỗi', msg);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View>
              <AppText style={styles.headerSubtitle}>QUẢN TRỊ CHUYẾN ĐI</AppText>
              <AppText style={styles.modalTitle}>Chuyển quyền Trưởng nhóm</AppText>
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

          <AppText style={styles.explanationText}>
            Chọn một thành viên trong chuyến đi để giao quyền Trưởng nhóm. Sau khi hoàn tất, trưởng nhóm mới sẽ có toàn quyền quản trị chuyến đi:
          </AppText>

          {candidateMembers.length === 0 ? (
            <View style={styles.emptyCandidatesBox}>
              <AppText style={styles.emptyCandidatesText}>
                Hiện chưa có thành viên nào khác trong nhóm để chuyển giao quyền. Vui lòng mời thêm thành viên trước.
              </AppText>
            </View>
          ) : (
            <ScrollView style={styles.membersList} showsVerticalScrollIndicator={false}>
              {candidateMembers.map((member) => {
                const isSelected = selectedMemberId === member.userId;
                return (
                  <TouchableOpacity
                    key={member.userId}
                    style={[styles.memberItem, isSelected && styles.memberItemSelected]}
                    onPress={() => setSelectedMemberId(member.userId)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.avatarCircle}>
                      <AppText style={styles.avatarInitial}>
                        {(member.displayName || 'M').charAt(0).toUpperCase()}
                      </AppText>
                    </View>
                    <View style={styles.memberInfo}>
                      <AppText style={styles.memberName}>{member.displayName}</AppText>
                      {member.email ? (
                        <AppText style={styles.memberEmail}>{member.email}</AppText>
                      ) : null}
                    </View>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected ? <View style={styles.radioInner} /> : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.actions}>
            <AppButton
              label={submitting ? 'Đang chuyển giao...' : 'Xác nhận chuyển quyền'}
              onPress={handleConfirmTransfer}
              variant="primary"
              disabled={submitting || candidateMembers.length === 0 || !selectedMemberId}
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
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: tokens.colors.surface,
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xxl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  headerSubtitle: {
    fontSize: tokens.font.micro,
    fontWeight: '800',
    color: tokens.colors.primary,
    letterSpacing: 0.8,
    lineHeight: 14,
  },
  modalTitle: {
    fontSize: tokens.font.heading,
    fontWeight: '800',
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
  explanationText: {
    fontSize: tokens.font.body,
    color: tokens.colors.textMuted,
    lineHeight: 20,
    marginBottom: tokens.spacing.md,
  },
  emptyCandidatesBox: {
    backgroundColor: tokens.colors.surfaceSubtle,
    padding: tokens.spacing.lg,
    borderRadius: tokens.radius.lg,
    alignItems: 'center',
    marginBottom: tokens.spacing.lg,
  },
  emptyCandidatesText: {
    fontSize: tokens.font.body,
    color: tokens.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  membersList: {
    maxHeight: 240,
    marginBottom: tokens.spacing.md,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.canvas,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    marginBottom: tokens.spacing.sm,
  },
  memberItemSelected: {
    borderColor: tokens.colors.primary,
    backgroundColor: tokens.colors.primarySoft,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: tokens.spacing.md,
  },
  avatarInitial: {
    fontSize: tokens.font.body,
    fontWeight: '800',
    color: tokens.colors.surface,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: tokens.font.body,
    fontWeight: '700',
    color: tokens.colors.ink,
    lineHeight: 20,
  },
  memberEmail: {
    fontSize: tokens.font.caption,
    color: tokens.colors.textMuted,
    lineHeight: 16,
    marginTop: 1,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: tokens.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: tokens.colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: tokens.colors.primary,
  },
  actions: {
    marginTop: tokens.spacing.xs,
  },
});

