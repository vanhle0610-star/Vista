import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Clipboard,
  StatusBar,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { tokens } from '@/theme/tokens';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { authStorage } from '@/services/auth/authStorage';
import { tripFeatureApi } from '../api';
import { Trip, TripMember, Invitation } from '../types';
import { InviteCodeModal } from '../components/InviteCodeModal';
import { TransferOwnerModal } from '../components/TransferOwnerModal';

export function TripMembersScreen({ tripId }: { tripId: string }) {
  const insets = useSafeAreaInsets();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  // Modals state
  const [isInviteModalVisible, setIsInviteModalVisible] = useState(false);
  const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setErrorStatus(null);
      const user = await authStorage.getUser<{ id?: string; sub?: string }>();
      const uid = user?.id || user?.sub || null;
      setCurrentUserId(uid);

      const [tripData, memberList] = await Promise.all([
        tripFeatureApi.fetchTrip(tripId),
        tripFeatureApi.fetchTripMembers(tripId),
      ]);

      setTrip(tripData);
      setMembers(memberList || []);

      // Fetch invitations (non-blocking)
      try {
        const invites = await tripFeatureApi.fetchInvitations(tripId);
        setInvitations(invites || []);
      } catch {
        // Invitations endpoint non-blocking
      }
    } catch (err: any) {
      const status = err?.response?.status;
      setErrorStatus(status || 500);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Check role
  const isOwner =
    Boolean(trip?.role === 'OWNER') ||
    Boolean(currentUserId && trip?.ownerId && currentUserId === trip.ownerId);

  const ownerMember = members.find((m) => m.role === 'OWNER') || {
    userId: trip?.ownerId || '',
    displayName: 'Trưởng nhóm',
    role: 'OWNER',
  };

  const regularMembers = members.filter((m) => m.role !== 'OWNER');

  // Handle Leave Trip (DELETE /trips/{tripId}/members/me)
  const handleLeaveTrip = () => {
    if (actionLoading) return;

    // Business Rule Check for OWNER
    if (isOwner) {
      if (members.length > 1) {
        Alert.alert(
          'Không thể rời nhóm',
          'Trưởng nhóm phải chuyển quyền cho thành viên khác trước khi rời nhóm.'
        );
        return;
      } else {
        Alert.alert(
          'Không thể rời nhóm',
          'Bạn là thành viên duy nhất. Vui lòng chọn Xóa chuyến đi thay vì rời nhóm.'
        );
        return;
      }
    }

    Alert.alert(
      'Xác nhận rời chuyến đi',
      'Bạn có chắc chắn muốn rời khỏi chuyến đi này? Các điểm lịch trình bạn từng đóng góp sẽ được giữ nguyên.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Rời nhóm',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await tripFeatureApi.leaveTrip(tripId);
              Alert.alert('Thành công', 'Bạn đã rời khỏi chuyến đi.', [
                {
                  text: 'OK',
                  onPress: () => router.replace('/(tabs)/trips'),
                },
              ]);
            } catch (err: any) {
              const msg =
                err?.response?.data?.detail || 'Không thể rời chuyến đi lúc này.';
              Alert.alert('Lỗi', msg);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Handle Remove Member (Owner only)
  const handleRemoveMember = (member: TripMember) => {
    if (!isOwner || actionLoading) return;

    Alert.alert(
      'Xóa thành viên khỏi chuyến',
      `Bạn có chắc chắn muốn xóa "${member.displayName}" khỏi chuyến đi?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa thành viên',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              // Delete member endpoint
              await tripFeatureApi.deleteTrip(`${tripId}/members/${member.userId}`);
              Alert.alert('Thành công', `Đã xóa "${member.displayName}" khỏi chuyến.`);
              loadData();
            } catch (err: any) {
              const msg = err?.response?.data?.detail || 'Không thể xóa thành viên này.';
              Alert.alert('Lỗi', msg);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Handle Revoke Invitation (Owner only)
  const handleRevokeInvite = async (invitationId: string) => {
    if (!isOwner) return;
    try {
      await tripFeatureApi.revokeInvitation(tripId, invitationId);
      Alert.alert('Thành công', 'Đã thu hồi lời mời.');
      loadData();
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể thu hồi lời mời này.');
    }
  };

  // Copy quick trip invite link
  const handleCopyLink = () => {
    const link = `https://vista.travel/trips/join?code=${tripId.slice(0, 6).toUpperCase()}`;
    Clipboard.setString(link);
    Alert.alert('Đã sao chép liên kết mời', link);
  };

  // 1. Loading State
  if (loading) {
    return (
      <View style={[styles.centerScreen, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={tokens.colors.primary} />
        <AppText style={styles.loadingText}>Đang tải danh sách thành viên...</AppText>
      </View>
    );
  }

  // 2. 403 Forbidden State
  if (errorStatus === 403) {
    return (
      <View style={[styles.centerScreen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.forbiddenIconContainer}>
          <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              stroke={tokens.colors.danger}
              strokeWidth={2}
            />
          </Svg>
        </View>
        <AppText style={styles.forbiddenTitle}>Bạn không có quyền xem nhóm này</AppText>
        <AppButton
          label="Quay lại trang chủ"
          onPress={() => router.replace('/(tabs)/discover')}
          variant="primary"
          style={{ marginTop: tokens.spacing.lg }}
        />
      </View>
    );
  }

  const maxCapacity = 8;
  const capacityPercent = Math.min(100, Math.round((members.length / maxCapacity) * 100));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={tokens.colors.surface} />

      {/* Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="Quay lại"
        >
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path
              d="M19 12H5M12 19l-7-7 7-7"
              stroke={tokens.colors.ink}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <AppText style={styles.headerTitle}>Thành Viên Chuyến Đi</AppText>
          {trip?.title ? (
            <AppText style={styles.headerTripSubtitle} numberOfLines={1}>
              {trip.title}
            </AppText>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.inviteHeaderBtn}
          onPress={() => setIsInviteModalVisible(true)}
          accessibilityLabel="Tạo lời mời"
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm10-3v6m3-3h-6"
              stroke={tokens.colors.primary}
              strokeWidth={2}
              strokeLinecap="round"
            />
          </Svg>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.mainScrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Context Banner */}
        <View style={styles.contextBanner}>
          <View style={styles.contextBannerTop}>
            <View style={styles.contextBannerTextCol}>
              <View style={styles.badgeRow}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm14 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                    stroke={tokens.colors.primary}
                    strokeWidth={2}
                  />
                </Svg>
                <AppText style={styles.badgeText}>ĐỒNG ĐỘI HÀNH TRÌNH</AppText>
              </View>
              <AppText style={styles.contextTripTitle} numberOfLines={1}>
                {trip?.title || 'Chuyến đi VISTA'}
              </AppText>
              {trip?.startDate ? (
                <AppText style={styles.contextDates}>
                  📅 {trip.startDate} {trip.endDate ? `— ${trip.endDate}` : ''}
                </AppText>
              ) : null}
            </View>
            <View style={styles.contextIconBox}>
              <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
                  fill={tokens.colors.primary}
                />
              </Svg>
            </View>
          </View>

          {/* Capacity Bar */}
          <View style={styles.capacitySection}>
            <View style={styles.capacityLabels}>
              <AppText style={styles.capacityMainText}>
                {members.length} thành viên đã tham gia
              </AppText>
              <AppText style={styles.capacitySubText}>Tối đa {maxCapacity} người</AppText>
            </View>
            <View style={styles.capacityTrack}>
              <View style={[styles.capacityFill, { width: `${capacityPercent}%` }]} />
            </View>
            <AppText style={styles.capacityAvailable}>
              ✓ Còn {Math.max(0, maxCapacity - members.length)} chỗ trống để mời thêm bạn đồng hành
            </AppText>
          </View>
        </View>

        {/* Primary Owner Card */}
        <View style={styles.ownerCard}>
          <View style={styles.ownerCardTop}>
            <View style={styles.ownerAvatar}>
              <AppText style={styles.ownerAvatarInitial}>
                {(ownerMember.displayName || 'T').charAt(0).toUpperCase()}
              </AppText>
              <View style={styles.crownBadge}>
                <AppText style={styles.crownIcon}>👑</AppText>
              </View>
            </View>
            <View style={styles.ownerInfo}>
              <View style={styles.ownerBadgeRow}>
                <AppText style={styles.ownerName}>{ownerMember.displayName}</AppText>
                <View style={styles.ownerRoleTag}>
                  <AppText style={styles.ownerRoleTagText}>CHỦ CHUYẾN ĐI</AppText>
                </View>
              </View>
              {ownerMember.email ? (
                <AppText style={styles.ownerEmail}>{ownerMember.email}</AppText>
              ) : null}
            </View>
          </View>

          <View style={styles.ownerPrivilegesBox}>
            <AppText style={styles.ownerPrivilegesText}>
              {isOwner
                ? 'Bạn có toàn quyền quản lý thành viên, kiểm duyệt chi tiêu nhóm và cập nhật lịch trình chuyến đi.'
                : 'Trưởng nhóm có quyền điều phối hành trình, thu hồi lời mời và duyệt thay đổi.'}
            </AppText>
          </View>

          {/* Fast Actions */}
          <View style={styles.ownerActionsRow}>
            <TouchableOpacity
              style={styles.primaryCtaBtn}
              onPress={() => setIsInviteModalVisible(true)}
              activeOpacity={0.88}
            >
              <AppText style={styles.primaryCtaBtnText}>+ Mời thành viên mới</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryCtaBtn}
              onPress={handleCopyLink}
              activeOpacity={0.88}
            >
              <AppText style={styles.secondaryCtaBtnText}>🔗 Link mời</AppText>
            </TouchableOpacity>
          </View>

          {/* Transfer Ownership CTA (CHỈ OWNER) */}
          {isOwner && regularMembers.length > 0 ? (
            <TouchableOpacity
              style={styles.transferOwnerBtn}
              onPress={() => setIsTransferModalVisible(true)}
              activeOpacity={0.85}
            >
              <AppText style={styles.transferOwnerBtnText}>👑 Chuyển quyền Trưởng nhóm</AppText>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Regular Members List */}
        <View style={styles.sectionHeader}>
          <AppText style={styles.sectionTitle}>
            Danh sách thành viên ({regularMembers.length})
          </AppText>
        </View>

        {regularMembers.length === 0 ? (
          <View style={styles.emptyMembersCard}>
            <AppText style={styles.emptyMembersTitle}>Chưa có thành viên nào khác</AppText>
            <AppText style={styles.emptyMembersSub}>
              Nhấn "Mời thành viên mới" để gửi vé mời qua link hoặc mã vé.
            </AppText>
          </View>
        ) : (
          <View style={styles.membersStack}>
            {regularMembers.map((member) => (
              <AppCard key={member.userId} style={styles.memberCard}>
                <View style={styles.memberCardLeft}>
                  <View style={styles.memberAvatar}>
                    <AppText style={styles.memberAvatarInitial}>
                      {(member.displayName || 'M').charAt(0).toUpperCase()}
                    </AppText>
                  </View>
                  <View style={styles.memberCardInfo}>
                    <AppText style={styles.memberName}>{member.displayName}</AppText>
                    {member.email ? (
                      <AppText style={styles.memberEmail}>{member.email}</AppText>
                    ) : null}
                    <View style={styles.memberRoleBadge}>
                      <AppText style={styles.memberRoleBadgeText}>Thành viên</AppText>
                    </View>
                  </View>
                </View>

                {/* Remove member button (Only OWNER can remove others) */}
                {isOwner ? (
                  <TouchableOpacity
                    style={styles.removeMemberBtn}
                    onPress={() => handleRemoveMember(member)}
                    disabled={actionLoading}
                    accessibilityLabel="Xóa thành viên"
                  >
                    <AppText style={styles.removeMemberBtnText}>Xóa</AppText>
                  </TouchableOpacity>
                ) : null}
              </AppCard>
            ))}
          </View>
        )}

        {/* Pending Invitations Section (If any) */}
        {invitations.length > 0 ? (
          <View style={styles.invitationsSection}>
            <View style={styles.sectionHeader}>
              <AppText style={styles.sectionTitle}>
                Lời mời đang chờ ({invitations.length})
              </AppText>
            </View>
            <View style={styles.invitesStack}>
              {invitations.map((inv) => (
                <View key={inv.id} style={styles.inviteItemCard}>
                  <View style={styles.inviteItemLeft}>
                    <AppText style={styles.inviteCodeText}>
                      Mã: {inv.rawToken || inv.token || inv.id.slice(0, 6).toUpperCase()}
                    </AppText>
                    <AppText style={styles.inviteStatusText}>
                      Trạng thái: {inv.status || 'PENDING'}
                    </AppText>
                  </View>
                  {isOwner && inv.status === 'PENDING' ? (
                    <TouchableOpacity
                      style={styles.revokeInviteBtn}
                      onPress={() => handleRevokeInvite(inv.id)}
                    >
                      <AppText style={styles.revokeInviteBtnText}>Thu hồi</AppText>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Leave Trip Action: dành cho MEMBER */}
        {!isOwner ? (
          <View style={styles.leaveSection}>
            <AppButton
              label={actionLoading ? 'Đang xử lý...' : '🚪 Rời khỏi chuyến đi'}
              onPress={handleLeaveTrip}
              variant="secondary"
              loading={actionLoading}
              fullWidth
            />
          </View>
        ) : (
          /* Nếu là OWNER muốn rời -> giải thích điều kiện */
          <View style={styles.leaveSection}>
            <TouchableOpacity
              style={styles.ownerLeaveNoticeBtn}
              onPress={handleLeaveTrip}
              activeOpacity={0.8}
            >
              <AppText style={styles.ownerLeaveNoticeText}>
                🚪 Rời nhóm (Cần chuyển giao quyền Trưởng nhóm trước)
              </AppText>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <InviteCodeModal
        visible={isInviteModalVisible}
        tripId={tripId}
        tripTitle={trip?.title}
        onClose={() => setIsInviteModalVisible(false)}
        onJoined={loadData}
      />

      <TransferOwnerModal
        visible={isTransferModalVisible}
        tripId={tripId}
        members={members}
        currentUserId={currentUserId}
        onClose={() => setIsTransferModalVisible(false)}
        onSuccess={loadData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.canvas,
  },
  centerScreen: {
    flex: 1,
    backgroundColor: tokens.colors.canvas,
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing.xl,
  },
  loadingText: {
    fontSize: tokens.font.body,
    color: tokens.colors.textMuted,
    lineHeight: 20,
    marginTop: tokens.spacing.md,
  },
  forbiddenIconContainer: {
    width: 72,
    height: 72,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.dangerSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  forbiddenTitle: {
    fontSize: tokens.font.heading,
    fontWeight: '700',
    color: tokens.colors.ink,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Top Header
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    backgroundColor: tokens.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleGroup: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.sm,
  },
  headerTitle: {
    fontSize: tokens.font.subtitle,
    fontWeight: '700',
    color: tokens.colors.ink,
    lineHeight: 22,
  },
  headerTripSubtitle: {
    fontSize: tokens.font.micro,
    color: tokens.colors.primary,
    fontWeight: '600',
    lineHeight: 14,
    marginTop: 1,
  },
  inviteHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: tokens.colors.primarySoft,
  },

  mainScrollContent: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.md,
  },

  // Context Banner
  contextBanner: {
    backgroundColor: tokens.colors.surfaceSubtle,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    marginBottom: tokens.spacing.md,
  },
  contextBannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  contextBannerTextCol: {
    flex: 1,
    paddingRight: tokens.spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: tokens.font.micro,
    fontWeight: '800',
    color: tokens.colors.primary,
    letterSpacing: 0.6,
    lineHeight: 14,
  },
  contextTripTitle: {
    fontSize: tokens.font.heading,
    fontWeight: '800',
    color: tokens.colors.ink,
    lineHeight: 24,
  },
  contextDates: {
    fontSize: tokens.font.caption,
    color: tokens.colors.textMuted,
    lineHeight: 18,
    marginTop: 2,
  },
  contextIconBox: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Capacity Section
  capacitySection: {
    marginTop: tokens.spacing.md,
    paddingTop: tokens.spacing.md,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border,
  },
  capacityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  capacityMainText: {
    fontSize: tokens.font.caption,
    fontWeight: '700',
    color: tokens.colors.ink,
    lineHeight: 16,
  },
  capacitySubText: {
    fontSize: tokens.font.micro,
    color: tokens.colors.textMuted,
    lineHeight: 14,
  },
  capacityTrack: {
    width: '100%',
    height: 6,
    backgroundColor: tokens.colors.border,
    borderRadius: tokens.radius.full,
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.full,
  },
  capacityAvailable: {
    fontSize: tokens.font.micro,
    color: tokens.colors.success,
    fontWeight: '600',
    lineHeight: 14,
    marginTop: 6,
  },

  // Owner Card
  ownerCard: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    shadowColor: tokens.colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: tokens.spacing.lg,
  },
  ownerCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
  },
  ownerAvatar: {
    width: 52,
    height: 52,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ownerAvatarInitial: {
    fontSize: tokens.font.heading,
    fontWeight: '800',
    color: tokens.colors.surface,
  },
  crownBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: tokens.colors.warningSoft,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: tokens.colors.surface,
  },
  crownIcon: {
    fontSize: 10,
  },
  ownerInfo: {
    flex: 1,
  },
  ownerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    flexWrap: 'wrap',
  },
  ownerName: {
    fontSize: tokens.font.subtitle,
    fontWeight: '700',
    color: tokens.colors.ink,
    lineHeight: 22,
  },
  ownerRoleTag: {
    backgroundColor: tokens.colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: tokens.radius.xs,
  },
  ownerRoleTagText: {
    fontSize: tokens.font.micro,
    fontWeight: '800',
    color: tokens.colors.primary,
    lineHeight: 12,
  },
  ownerEmail: {
    fontSize: tokens.font.caption,
    color: tokens.colors.textMuted,
    lineHeight: 16,
    marginTop: 2,
  },
  ownerPrivilegesBox: {
    backgroundColor: tokens.colors.surfaceSubtle,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.sm,
    marginTop: tokens.spacing.md,
  },
  ownerPrivilegesText: {
    fontSize: tokens.font.caption,
    color: tokens.colors.textSecondary,
    lineHeight: 17,
  },
  ownerActionsRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.md,
  },
  primaryCtaBtn: {
    flex: 2,
    backgroundColor: tokens.colors.primary,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaBtnText: {
    fontSize: tokens.font.body,
    fontWeight: '700',
    color: tokens.colors.surface,
    lineHeight: 20,
  },
  secondaryCtaBtn: {
    flex: 1,
    backgroundColor: tokens.colors.surfaceSubtle,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  secondaryCtaBtnText: {
    fontSize: tokens.font.body,
    fontWeight: '600',
    color: tokens.colors.ink,
    lineHeight: 20,
  },
  transferOwnerBtn: {
    marginTop: tokens.spacing.sm,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    alignItems: 'center',
  },
  transferOwnerBtnText: {
    fontSize: tokens.font.caption,
    fontWeight: '700',
    color: tokens.colors.primaryDark,
    lineHeight: 18,
  },

  // Section Header
  sectionHeader: {
    marginBottom: tokens.spacing.sm,
  },
  sectionTitle: {
    fontSize: tokens.font.subtitle,
    fontWeight: '700',
    color: tokens.colors.ink,
    lineHeight: 22,
  },

  // Members List
  membersStack: {
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.lg,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.spacing.md,
  },
  memberCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
    flex: 1,
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.aiSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarInitial: {
    fontSize: tokens.font.body,
    fontWeight: '700',
    color: tokens.colors.aiTeal,
  },
  memberCardInfo: {
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
  },
  memberRoleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: tokens.colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: tokens.radius.xs,
    marginTop: 2,
  },
  memberRoleBadgeText: {
    fontSize: tokens.font.micro,
    color: tokens.colors.textMuted,
    lineHeight: 14,
  },
  removeMemberBtn: {
    backgroundColor: tokens.colors.dangerSoft,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 6,
    borderRadius: tokens.radius.sm,
  },
  removeMemberBtnText: {
    fontSize: tokens.font.caption,
    fontWeight: '700',
    color: tokens.colors.danger,
    lineHeight: 16,
  },
  emptyMembersCard: {
    backgroundColor: tokens.colors.surface,
    padding: tokens.spacing.lg,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    alignItems: 'center',
    marginBottom: tokens.spacing.lg,
  },
  emptyMembersTitle: {
    fontSize: tokens.font.body,
    fontWeight: '700',
    color: tokens.colors.ink,
    lineHeight: 20,
    marginBottom: 4,
  },
  emptyMembersSub: {
    fontSize: tokens.font.caption,
    color: tokens.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Invitations
  invitationsSection: {
    marginBottom: tokens.spacing.lg,
  },
  invitesStack: {
    gap: tokens.spacing.sm,
  },
  inviteItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: tokens.colors.surface,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  inviteItemLeft: {
    flex: 1,
  },
  inviteCodeText: {
    fontSize: tokens.font.body,
    fontWeight: '700',
    color: tokens.colors.primary,
    lineHeight: 20,
  },
  inviteStatusText: {
    fontSize: tokens.font.caption,
    color: tokens.colors.textMuted,
    lineHeight: 16,
  },
  revokeInviteBtn: {
    backgroundColor: tokens.colors.dangerSoft,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 6,
    borderRadius: tokens.radius.sm,
  },
  revokeInviteBtnText: {
    fontSize: tokens.font.caption,
    fontWeight: '700',
    color: tokens.colors.danger,
    lineHeight: 16,
  },

  // Leave Section
  leaveSection: {
    marginTop: tokens.spacing.sm,
    marginBottom: tokens.spacing.lg,
  },
  ownerLeaveNoticeBtn: {
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    alignItems: 'center',
  },
  ownerLeaveNoticeText: {
    fontSize: tokens.font.caption,
    fontWeight: '600',
    color: tokens.colors.textMuted,
    lineHeight: 18,
    textAlign: 'center',
  },
});

