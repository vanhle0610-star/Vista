import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { authStorage } from '@/services/auth/authStorage';
import { AppText } from '@/components/ui/AppText';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { tokens } from '@/theme/tokens';
import { tripApi, TripItem, TripMember } from '../services/tripApi';

export function TripDetailScreen({ tripId }: { tripId: string }) {
  const checkAuth = useCallback(async () => {
    const token = await authStorage.getAccessToken();
    if (!token) {
      router.replace('/(tabs)/discover');
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Auth Guard: Redirect to Home if not authenticated
  useFocusEffect(
    useCallback(() => {
      checkAuth();
    }, [checkAuth])
  );

  const [trip, setTrip] = useState<TripItem | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editDestination, setEditDestination] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [saving, setSaving] = useState(false);

  // Transfer Owner Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedNewOwnerId, setSelectedNewOwnerId] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);

  // Member Action Loading (remove/leave)
  const [actionLoading, setActionLoading] = useState(false);

  const reloadTripData = useCallback(async () => {
    try {
      const [tripData, membersData] = await Promise.all([
        tripApi.getTripById(tripId),
        tripApi.getTripMembers(tripId),
      ]);
      setTrip(tripData);
      setMembers(membersData);
      setError(null);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) {
        setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      } else if (status === 403) {
        setError('Bạn không có quyền truy cập thông tin chuyến đi này.');
      } else if (status === 404) {
        setError('Không tìm thấy thông tin chuyến đi.');
      } else {
        const msg =
          err?.response?.data?.detail ||
          'Không thể kết nối máy chủ. Vui lòng kiểm tra lại kết nối mạng.';
        setError(msg);
      }
    }
  }, [tripId]);

  useEffect(() => {
    let isMounted = true;
    const fetchInitialData = async () => {
      try {
        const [tripData, membersData] = await Promise.all([
          tripApi.getTripById(tripId),
          tripApi.getTripMembers(tripId),
        ]);
        if (isMounted) {
          setTrip(tripData);
          setMembers(membersData);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          const status = err?.response?.status;
          if (status === 401) {
            setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          } else if (status === 403) {
            setError('Bạn không có quyền truy cập thông tin chuyến đi này.');
          } else if (status === 404) {
            setError('Không tìm thấy thông tin chuyến đi.');
          } else {
            const msg =
              err?.response?.data?.detail ||
              'Không thể kết nối máy chủ. Vui lòng kiểm tra lại kết nối mạng.';
            setError(msg);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchInitialData();
    return () => {
      isMounted = false;
    };
  }, [tripId]);

  const openEditModal = () => {
    if (!trip) return;
    setEditTitle(trip.title);
    setEditStartDate(trip.startDate);
    setEditEndDate(trip.endDate);
    setEditDestination(trip.destinationSummary || '');
    setEditBudget(trip.budgetTotal != null ? trip.budgetTotal.toString() : '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (saving) return;
    if (!editTitle.trim()) {
      Alert.alert('Lỗi', 'Tiêu đề không được để trống');
      return;
    }
    if (editEndDate.trim() < editStartDate.trim()) {
      Alert.alert('Lỗi', 'Ngày về phải sau hoặc bằng ngày đi');
      return;
    }

    setSaving(true);
    try {
      const updated = await tripApi.patchTrip(tripId, {
        title: editTitle.trim(),
        startDate: editStartDate.trim() || undefined,
        endDate: editEndDate.trim() || undefined,
        destinationSummary: editDestination.trim() || undefined,
        budgetTotal: editBudget.trim() ? parseFloat(editBudget.trim()) : undefined,
      });
      setTrip(updated);
      setIsEditing(false);
      Alert.alert('Thành công', 'Thông tin chuyến đi đã được cập nhật thành công!');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Không thể cập nhật chuyến đi.';
      Alert.alert('Lỗi cập nhật', msg);
    } finally {
      setSaving(false);
    }
  };

  // Leave Trip (W4-TV2)
  const handleLeaveTrip = () => {
    if (actionLoading) return;
    Alert.alert(
      'Xác nhận rời chuyến',
      'Bạn có chắc chắn muốn rời khỏi chuyến đi này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Rời chuyến',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await tripApi.leaveTrip(tripId);
              // Clear local state to prevent sensitive data retention
              setTrip(null);
              setMembers([]);
              Alert.alert('Thành công', 'Bạn đã rời khỏi chuyến đi thành công.', [
                {
                  text: 'OK',
                  onPress: () => router.replace('/(tabs)/trips'),
                },
              ]);
            } catch (err: any) {
              const msg =
                err?.response?.data?.detail ||
                'Không thể rời chuyến đi. Chủ chuyến đi cần chuyển quyền trước khi rời.';
              Alert.alert('Không thể rời chuyến', msg);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Remove Member (W4-TV2)
  const handleRemoveMember = (member: TripMember) => {
    if (actionLoading) return;
    Alert.alert(
      'Xác nhận xóa thành viên',
      `Bạn có chắc chắn muốn xóa thành viên "${member.displayName}" khỏi chuyến đi không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await tripApi.removeMember(tripId, member.userId);
              Alert.alert('Thành công', `Đã xóa "${member.displayName}" khỏi chuyến đi.`);
              await reloadTripData();
            } catch (err: any) {
              const msg =
                err?.response?.data?.detail || 'Không thể xóa thành viên khỏi chuyến đi.';
              Alert.alert('Lỗi', msg);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Transfer Owner (W4-TV2)
  const openTransferModal = () => {
    setSelectedNewOwnerId(null);
    setIsTransferModalOpen(true);
  };

  const handleConfirmTransfer = async () => {
    if (transferring) return;
    if (!selectedNewOwnerId) {
      Alert.alert('Thông báo', 'Vui lòng chọn một thành viên để chuyển quyền chủ sở hữu.');
      return;
    }

    const selectedMember = members.find((m) => m.userId === selectedNewOwnerId);
    if (!selectedMember) return;

    Alert.alert(
      'Xác nhận chuyển quyền',
      `Bạn có chắc chắn muốn chuyển quyền Chủ sở hữu cho "${selectedMember.displayName}"?\n\nSau khi chuyển, bạn sẽ trở thành Thành viên thông thường.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận chuyển',
          style: 'destructive',
          onPress: async () => {
            setTransferring(true);
            try {
              const updatedTrip = await tripApi.transferOwner(tripId, selectedNewOwnerId);
              setTrip(updatedTrip);
              setIsTransferModalOpen(false);
              Alert.alert(
                'Thành công',
                `Đã chuyển quyền Chủ sở hữu cho "${selectedMember.displayName}".`
              );
              await reloadTripData();
            } catch (err: any) {
              const msg =
                err?.response?.data?.detail || 'Không thể chuyển quyền chủ sở hữu.';
              Alert.alert('Lỗi chuyển quyền', msg);
            } finally {
              setTransferring(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={tokens.colors.primary} />
        <AppText style={styles.loadingText}>Đang tải thông tin chuyến đi...</AppText>
      </View>
    );
  }

  if (error || !trip) {
    return (
      <View style={styles.centerContainer}>
        <AppText style={styles.errorText}>{error || 'Không tìm thấy chuyến đi'}</AppText>
        <AppButton label="Quay lại" onPress={() => router.back()} variant="secondary" />
      </View>
    );
  }

  const isOwner = trip.role === 'OWNER';
  // Eligible members for ownership transfer: must be ACTIVE and not the owner
  const activeMembersForTransfer = members.filter(
    (m) => m.role !== 'OWNER' && m.status === 'ACTIVE'
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <AppText style={styles.backButtonText}>← Quay lại</AppText>
        </TouchableOpacity>
        <View style={styles.roleBadgeWrapper}>
          <View style={[styles.badge, isOwner ? styles.ownerBadge : styles.memberBadge]}>
            <AppText
              style={[
                styles.badgeText,
                isOwner ? styles.ownerBadgeText : styles.memberBadgeText,
              ]}
            >
              {isOwner ? '👑 Chủ sở hữu' : '👤 Thành viên'}
            </AppText>
          </View>
        </View>
      </View>

      <AppCard style={styles.card}>
        <AppText style={styles.tripTitle}>{trip.title}</AppText>
        {trip.destinationSummary ? (
          <AppText style={styles.destination}>📍 {trip.destinationSummary}</AppText>
        ) : null}

        <View style={styles.infoRow}>
          <AppText style={styles.infoLabel}>Thời gian:</AppText>
          <AppText style={styles.infoValue}>
            {trip.startDate} → {trip.endDate}
          </AppText>
        </View>

        <View style={styles.infoRow}>
          <AppText style={styles.infoLabel}>Ngân sách:</AppText>
          <AppText
            style={[styles.infoValue, { color: tokens.colors.primaryDark, fontWeight: '700' }]}
          >
            {trip.budgetTotal != null
              ? `${Number(trip.budgetTotal).toLocaleString()} ${trip.currency}`
              : 'Chưa đặt ngân sách'}
          </AppText>
        </View>

        <View style={styles.infoRow}>
          <AppText style={styles.infoLabel}>Trạng thái:</AppText>
          <AppText style={styles.infoValue}>{trip.status}</AppText>
        </View>

        {/* Actions Row */}
        <View style={styles.actionsContainer}>
          {isOwner ? (
            <>
              <AppButton
                label="✏️ Chỉnh sửa chuyến đi"
                onPress={openEditModal}
                variant="secondary"
                disabled={actionLoading}
              />
              <AppButton
                label="👑 Chuyển quyền chủ sở hữu"
                onPress={openTransferModal}
                variant="secondary"
                disabled={actionLoading}
              />
            </>
          ) : (
            <AppButton
              label={actionLoading ? 'Đang xử lý...' : '🚪 Rời chuyến đi'}
              onPress={handleLeaveTrip}
              variant="secondary"
              disabled={actionLoading}
            />
          )}
        </View>
      </AppCard>

      {/* Members Section (W4-TV2) */}
      <View style={styles.sectionHeader}>
        <AppText style={styles.sectionTitle}>
          Thành viên trong nhóm ({members.length})
        </AppText>
      </View>

      <View style={styles.memberList}>
        {members.map((member) => {
          const memberIsOwner = member.role === 'OWNER';
          const canRemove = isOwner && !memberIsOwner;

          return (
            <AppCard key={member.userId} style={styles.memberCard}>
              <View style={styles.memberAvatar}>
                <AppText style={styles.avatarInitial}>
                  {(member.displayName || 'U').charAt(0).toUpperCase()}
                </AppText>
              </View>
              <View style={styles.memberInfo}>
                <AppText style={styles.memberName}>{member.displayName}</AppText>
                {member.email ? (
                  <AppText style={styles.memberEmail}>{member.email}</AppText>
                ) : null}
                <AppText style={styles.memberStatusText}>
                  Trạng thái: {member.status}
                </AppText>
              </View>
              <View style={styles.memberActions}>
                <View
                  style={[
                    styles.badge,
                    memberIsOwner ? styles.ownerBadge : styles.memberBadge,
                  ]}
                >
                  <AppText
                    style={[
                      styles.badgeText,
                      memberIsOwner ? styles.ownerBadgeText : styles.memberBadgeText,
                    ]}
                  >
                    {memberIsOwner ? 'Chủ chuyến đi' : 'Thành viên'}
                  </AppText>
                </View>

                {/* Remove button only visible for Owner when target is Member */}
                {canRemove ? (
                  <TouchableOpacity
                    style={styles.removeMemberButton}
                    onPress={() => handleRemoveMember(member)}
                    disabled={actionLoading}
                  >
                    <AppText style={styles.removeMemberButtonText}>Xóa</AppText>
                  </TouchableOpacity>
                ) : null}
              </View>
            </AppCard>
          );
        })}
      </View>

      {/* Transfer Owner Modal (W4-TV2) */}
      <Modal visible={isTransferModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <AppText style={styles.modalTitle}>Chuyển quyền Chủ sở hữu</AppText>
            <AppText style={styles.modalSubtitle}>
              Chọn một thành viên đang hoạt động (ACTIVE) để giao quyền quản lý chuyến đi:
            </AppText>

            {activeMembersForTransfer.length === 0 ? (
              <View style={styles.emptyMembersBox}>
                <AppText style={styles.emptyMembersText}>
                  Không có thành viên hoạt động nào khác để chuyển giao quyền.
                </AppText>
              </View>
            ) : (
              <ScrollView style={styles.transferMemberList}>
                {activeMembersForTransfer.map((m) => {
                  const isSelected = selectedNewOwnerId === m.userId;
                  return (
                    <TouchableOpacity
                      key={m.userId}
                      style={[
                        styles.transferMemberItem,
                        isSelected && styles.transferMemberItemSelected,
                      ]}
                      onPress={() => setSelectedNewOwnerId(m.userId)}
                    >
                      <View style={styles.memberInfo}>
                        <AppText
                          style={[
                            styles.memberName,
                            isSelected && { color: tokens.colors.primaryDark },
                          ]}
                        >
                          {m.displayName}
                        </AppText>
                        {m.email ? (
                          <AppText style={styles.memberEmail}>{m.email}</AppText>
                        ) : null}
                      </View>
                      <AppText style={styles.selectIndicator}>
                        {isSelected ? '✓ Đã chọn' : 'Chọn'}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <AppButton
                label={transferring ? 'Đang chuyển giao...' : 'Xác nhận chuyển'}
                onPress={handleConfirmTransfer}
                disabled={transferring || !selectedNewOwnerId}
              />
              <AppButton
                label="Hủy"
                variant="secondary"
                onPress={() => setIsTransferModalOpen(false)}
                disabled={transferring}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Trip Modal (W3-TV2-01 PATCH) */}
      <Modal visible={isEditing} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <AppText style={styles.modalTitle}>Chỉnh sửa chuyến đi</AppText>

            <View style={styles.formGroup}>
              <AppText style={styles.label}>Tiêu đề chuyến đi *</AppText>
              <AppInput value={editTitle} onChangeText={setEditTitle} />
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <AppText style={styles.label}>Ngày đi</AppText>
                <AppInput value={editStartDate} onChangeText={setEditStartDate} />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <AppText style={styles.label}>Ngày về</AppText>
                <AppInput value={editEndDate} onChangeText={setEditEndDate} />
              </View>
            </View>

            <View style={styles.formGroup}>
              <AppText style={styles.label}>Điểm đến</AppText>
              <AppInput value={editDestination} onChangeText={setEditDestination} />
            </View>

            <View style={styles.formGroup}>
              <AppText style={styles.label}>Ngân sách (VND)</AppText>
              <AppInput
                value={editBudget}
                onChangeText={setEditBudget}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalActions}>
              <AppButton
                label={saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                onPress={handleSaveEdit}
                disabled={saving}
              />
              <AppButton
                label="Hủy"
                variant="secondary"
                onPress={() => setIsEditing(false)}
                disabled={saving}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.xs,
  },
  backButton: {
    paddingVertical: tokens.spacing.xs,
  },
  backButtonText: {
    color: tokens.colors.primary,
    fontWeight: '700',
    fontSize: tokens.font.body,
  },
  roleBadgeWrapper: {},
  card: {
    padding: tokens.spacing.lg,
    borderRadius: tokens.radius.md,
    gap: tokens.spacing.sm,
  },
  tripTitle: {
    fontSize: tokens.font.heading,
    fontWeight: '800',
    color: tokens.colors.ink,
  },
  destination: {
    fontSize: tokens.font.body,
    color: tokens.colors.muted,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: tokens.font.small,
    color: tokens.colors.muted,
  },
  infoValue: {
    fontSize: tokens.font.small,
    fontWeight: '600',
    color: tokens.colors.ink,
  },
  actionsContainer: {
    marginTop: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  sectionHeader: {
    marginTop: tokens.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  memberList: {
    gap: tokens.spacing.sm,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    gap: tokens.spacing.md,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.colors.skyBlueLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: tokens.colors.primaryDark,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: tokens.font.body,
    fontWeight: '600',
    color: tokens.colors.ink,
  },
  memberEmail: {
    fontSize: 12,
    color: tokens.colors.muted,
  },
  memberStatusText: {
    fontSize: 11,
    color: tokens.colors.muted,
    marginTop: 2,
  },
  memberActions: {
    alignItems: 'flex-end',
    gap: tokens.spacing.xs,
  },
  removeMemberButton: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
    borderRadius: tokens.radius.sm,
    backgroundColor: '#FEE2E2',
  },
  removeMemberButtonText: {
    color: tokens.colors.danger,
    fontSize: 11,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
    borderRadius: tokens.radius.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  ownerBadge: {
    backgroundColor: tokens.colors.skyBlueLight,
  },
  ownerBadgeText: {
    color: tokens.colors.primaryDark,
    fontSize: 11,
    fontWeight: '700',
  },
  memberBadge: {
    backgroundColor: '#F1F5F9',
  },
  memberBadgeText: {
    color: tokens.colors.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing.xl,
    gap: tokens.spacing.md,
  },
  loadingText: {
    color: tokens.colors.muted,
    fontSize: tokens.font.body,
  },
  errorText: {
    color: tokens.colors.danger,
    fontSize: tokens.font.body,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: tokens.spacing.lg,
  },
  modalContent: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: tokens.colors.ink,
    marginBottom: tokens.spacing.xs,
  },
  modalSubtitle: {
    fontSize: tokens.font.small,
    color: tokens.colors.muted,
  },
  emptyMembersBox: {
    padding: tokens.spacing.md,
    backgroundColor: '#F8FAFC',
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
  },
  emptyMembersText: {
    fontSize: tokens.font.small,
    color: tokens.colors.muted,
    textAlign: 'center',
  },
  transferMemberList: {
    maxHeight: 200,
  },
  transferMemberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: tokens.spacing.xs,
  },
  transferMemberItemSelected: {
    borderColor: tokens.colors.primary,
    backgroundColor: tokens.colors.skyBlueLight,
  },
  selectIndicator: {
    fontSize: 12,
    fontWeight: '700',
    color: tokens.colors.primaryDark,
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
  modalActions: {
    marginTop: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
});
