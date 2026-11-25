import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { api, apiErrorMessage } from '@/services/api/client';
import { authStorage } from '@/services/auth/authStorage';
import { tokens } from '@/theme/tokens';
import { PinIcon, CrosshairIcon, CloseIcon, DirectionsIcon } from '@/components/icons/StitchIcons';

export interface TripSafetyToolsProps {
  tripId: string;
  isOwner?: boolean;
}

export interface LocationShareItem {
  id: string;
  tripId: string;
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  latitude: number;
  longitude: number;
  startedAt: string;
  expiresAt: string;
  lastUpdatedAt?: string;
  enabled: boolean;
  sessionId?: string;
}

export interface MeetupPointItem {
  id: string;
  tripId: string;
  createdBy: string;
  creatorName?: string;
  label: string;
  description?: string;
  latitude: number;
  longitude: number;
  targetTime?: string;
  createdAt: string;
}

export interface CheckInItem {
  id: string;
  tripId: string;
  userId: string;
  userDisplayName?: string;
  userAvatarUrl?: string;
  latitude: number;
  longitude: number;
  checkedInAt: string;
}

export function TripSafetyTools({ tripId, isOwner }: TripSafetyToolsProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sharingDurationHours, setSharingDurationHours] = useState<number>(2);
  const [isStartingShare, setIsStartingShare] = useState(false);
  const [isStoppingShare, setIsStoppingShare] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // Meetup modal state
  const [showMeetupModal, setShowMeetupModal] = useState(false);
  const [meetupLabel, setMeetupLabel] = useState('');
  const [meetupDesc, setMeetupDesc] = useState('');
  const [meetupLat, setMeetupLat] = useState('16.061168');
  const [meetupLng, setMeetupLng] = useState('108.227897');
  const [isCreatingMeetup, setIsCreatingMeetup] = useState(false);

  // Load current user
  useEffect(() => {
    void authStorage.getUser<{ id: string }>().then((u) => {
      if (u?.id) setCurrentUserId(u.id);
    });
  }, []);

  // 1. Fetch active location shares (polling every 12 seconds per D3)
  const {
    data: locationShares = [],
    refetch: refetchShares,
    isLoading: isLoadingShares,
  } = useQuery<LocationShareItem[]>({
    queryKey: ['trip-location-shares', tripId],
    queryFn: async () => {
      const res = await api.get<{ content?: LocationShareItem[]; items?: LocationShareItem[] }>(
        `/trips/${tripId}/location-shares`,
      );
      return res.data.content ?? res.data.items ?? (Array.isArray(res.data) ? res.data : []);
    },
    enabled: !!tripId,
    refetchInterval: 12000,
  });

  // 2. Fetch meetup points
  const {
    data: meetupPoints = [],
    refetch: refetchMeetups,
    isLoading: isLoadingMeetups,
  } = useQuery<MeetupPointItem[]>({
    queryKey: ['trip-meetups', tripId],
    queryFn: async () => {
      const res = await api.get<MeetupPointItem[]>(`/trips/${tripId}/meetup-points`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!tripId,
  });

  // 3. Fetch check-ins
  const {
    data: checkIns = [],
    refetch: refetchCheckIns,
    isLoading: isLoadingCheckIns,
  } = useQuery<CheckInItem[]>({
    queryKey: ['trip-checkins', tripId],
    queryFn: async () => {
      const res = await api.get<CheckInItem[]>(`/trips/${tripId}/check-ins`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!tripId,
  });

  // My current active share
  const myShare = locationShares.find(
    (s) => s.userId === currentUserId && s.enabled && new Date(s.expiresAt) > new Date(),
  );

  // Start Location Share (Opt-in)
  const handleStartShare = async () => {
    try {
      setIsStartingShare(true);
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Chưa cấp quyền', 'Vui lòng cấp quyền vị trí để bật tính năng chia sẻ vị trí nhóm.');
        return;
      }

      let lat = 16.061168;
      let lng = 108.227897;
      try {
        const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = fix.coords.latitude;
        lng = fix.coords.longitude;
      } catch {
        // Fallback
      }

      const expiresAt = new Date(Date.now() + sharingDurationHours * 3600 * 1000).toISOString();

      await api.put(`/trips/${tripId}/location-shares/me`, {
        consent: true,
        expiresAt,
        latitude: lat,
        longitude: lng,
      });

      Alert.alert(
        'Đã bật chia sẻ vị trí',
        `Vị trí của bạn đang được chia sẻ cho các thành viên trong nhóm trong ${sharingDurationHours} giờ.`,
      );
      await refetchShares();
    } catch (err) {
      Alert.alert('Không thể bật chia sẻ', apiErrorMessage(err));
    } finally {
      setIsStartingShare(false);
    }
  };

  // Stop Location Share (Opt-out)
  const handleStopShare = async () => {
    try {
      setIsStoppingShare(true);
      await api.delete(`/trips/${tripId}/location-shares/me`);
      Alert.alert('Đã dừng chia sẻ', 'Bạn đã dừng chia sẻ vị trí nhóm thành công.');
      await refetchShares();
    } catch (err) {
      Alert.alert('Lỗi', apiErrorMessage(err));
    } finally {
      setIsStoppingShare(false);
    }
  };

  // Check-in
  const handleCheckIn = async () => {
    try {
      setIsCheckingIn(true);
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Chưa cấp quyền', 'Vui lòng cho phép truy cập vị trí để thực hiện check-in.');
        return;
      }

      const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await api.post(`/trips/${tripId}/check-ins`, {
        latitude: fix.coords.latitude,
        longitude: fix.coords.longitude,
      });

      Alert.alert('Check-in thành công', 'Vị trí check-in của bạn đã được ghi nhận vào chuyến đi.');
      await refetchCheckIns();
    } catch (err) {
      Alert.alert('Lỗi check-in', apiErrorMessage(err));
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Create Meetup Point
  const handleCreateMeetup = async () => {
    if (!meetupLabel.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên điểm hẹn.');
      return;
    }
    const latNum = parseFloat(meetupLat);
    const lngNum = parseFloat(meetupLng);
    if (isNaN(latNum) || isNaN(lngNum)) {
      Alert.alert('Lỗi tọa độ', 'Tọa độ không hợp lệ.');
      return;
    }

    try {
      setIsCreatingMeetup(true);
      await api.post(`/trips/${tripId}/meetup-points`, {
        label: meetupLabel.trim(),
        description: meetupDesc.trim() || undefined,
        latitude: latNum,
        longitude: lngNum,
      });

      Alert.alert('Thành công', 'Đã tạo điểm hẹn mới cho chuyến đi.');
      setShowMeetupModal(false);
      setMeetupLabel('');
      setMeetupDesc('');
      await refetchMeetups();
    } catch (err) {
      Alert.alert('Lỗi tạo điểm hẹn', apiErrorMessage(err));
    } finally {
      setIsCreatingMeetup(false);
    }
  };

  // Delete Meetup Point
  const handleDeleteMeetup = async (meetupId: string) => {
    Alert.alert('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa điểm hẹn này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/trips/${tripId}/meetup-points/${meetupId}`);
            await refetchMeetups();
          } catch (err) {
            Alert.alert('Lỗi', apiErrorMessage(err));
          }
        },
      },
    ]);
  };

  // Open Navigation in Google Maps
  const handleOpenNav = (lat: number, lng: number, label: string) => {
    const url = Platform.select({
      ios: `maps://?daddr=${lat},${lng}&q=${encodeURIComponent(label)}`,
      android: `google.navigation:q=${lat},${lng}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    });
    void Linking.openURL(url).catch(() => {
      void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. Group Location Sharing Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <CrosshairIcon size={20} color={tokens.colors.primary} />
          <Text style={styles.cardTitle}>Chia sẻ vị trí nhóm (Opt-in)</Text>
        </View>

        <Text style={styles.cardDesc}>
          Bật chia sẻ vị trí để các thành viên trong chuyến đi có thể thấy bạn trên bản đồ. Vị trí chỉ
          chia sẻ khi bạn chủ động đồng ý và tự động hết hạn sau thời gian lựa chọn.
        </Text>

        {myShare ? (
          <View style={styles.activeShareBox}>
            <View style={styles.statusRow}>
              <View style={styles.statusDotActive} />
              <Text style={styles.statusTextActive}>
                Đang chia sẻ (Hết hạn lúc {new Date(myShare.expiresAt).toLocaleTimeString('vi-VN')})
              </Text>
            </View>

            <TouchableOpacity
              style={styles.stopShareBtn}
              activeOpacity={0.8}
              disabled={isStoppingShare}
              onPress={handleStopShare}
            >
              {isStoppingShare ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.stopShareBtnText}>Dừng chia sẻ ngay</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inactiveShareBox}>
            <Text style={styles.durationLabel}>Chọn thời gian chia sẻ:</Text>
            <View style={styles.durationPills}>
              {[1, 2, 4].map((h) => (
                <TouchableOpacity
                  key={h}
                  style={[
                    styles.durationPill,
                    sharingDurationHours === h && styles.durationPillActive,
                  ]}
                  onPress={() => setSharingDurationHours(h)}
                >
                  <Text
                    style={[
                      styles.durationPillText,
                      sharingDurationHours === h && styles.durationPillTextActive,
                    ]}
                  >
                    {h} giờ
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.startShareBtn}
              activeOpacity={0.85}
              disabled={isStartingShare}
              onPress={handleStartShare}
            >
              {isStartingShare ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.startShareBtnText}>Tôi đồng ý & Bật chia sẻ vị trí</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Member location shares list */}
        <View style={styles.subSection}>
          <Text style={styles.subHeading}>
            Vị trí thành viên ({locationShares.filter((s) => s.enabled).length})
          </Text>
          {isLoadingShares ? (
            <ActivityIndicator size="small" color="#005ea5" />
          ) : locationShares.filter((s) => s.enabled).length === 0 ? (
            <Text style={styles.emptyText}>Chưa có thành viên nào đang bật chia sẻ vị trí.</Text>
          ) : (
            locationShares
              .filter((s) => s.enabled)
              .map((share) => (
                <View key={share.id} style={styles.memberShareRow}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberInitial}>
                      {(share.displayName || 'U').slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {share.displayName || 'Thành viên'} {share.userId === currentUserId ? '(Bạn)' : ''}
                    </Text>
                    <Text style={styles.memberMeta}>
                      Tọa độ: {share.latitude?.toFixed(4)}, {share.longitude?.toFixed(4)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.navIconBtn}
                    onPress={() => handleOpenNav(share.latitude, share.longitude, share.displayName || 'Thành viên')}
                  >
                    <DirectionsIcon size={16} color="#005ea5" />
                  </TouchableOpacity>
                </View>
              ))
          )}
        </View>
      </View>

      {/* 2. Meetup Points Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <PinIcon size={20} color="#DC2626" />
          <Text style={styles.cardTitle}>Điểm hẹn chung (Meetup Points)</Text>
        </View>

        <Text style={styles.cardDesc}>
          Thiết lập các điểm tập trung cho đoàn để các thành viên dễ dàng tìm thấy nhau.
        </Text>

        <TouchableOpacity
          style={styles.createMeetupCta}
          activeOpacity={0.85}
          onPress={async () => {
            try {
              const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
              setMeetupLat(fix.coords.latitude.toFixed(6));
              setMeetupLng(fix.coords.longitude.toFixed(6));
            } catch {
              // fallback
            }
            setShowMeetupModal(true);
          }}
        >
          <Text style={styles.createMeetupCtaText}>+ Tạo điểm hẹn mới</Text>
        </TouchableOpacity>

        {isLoadingMeetups ? (
          <ActivityIndicator size="small" color="#005ea5" />
        ) : meetupPoints.length === 0 ? (
          <Text style={styles.emptyText}>Chưa có điểm hẹn nào trong chuyến đi.</Text>
        ) : (
          meetupPoints.map((mp) => (
            <View key={mp.id} style={styles.meetupCard}>
              <View style={styles.meetupCardTop}>
                <Text style={styles.meetupLabel}>{mp.label}</Text>
                <View style={styles.meetupActions}>
                  <TouchableOpacity
                    style={styles.navBtnSmall}
                    onPress={() => handleOpenNav(mp.latitude, mp.longitude, mp.label)}
                  >
                    <Text style={styles.navBtnSmallText}>Chỉ đường</Text>
                  </TouchableOpacity>
                  {(isOwner || mp.createdBy === currentUserId) && (
                    <TouchableOpacity
                      style={styles.deleteBtnSmall}
                      onPress={() => handleDeleteMeetup(mp.id)}
                    >
                      <Text style={styles.deleteBtnSmallText}>Xóa</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {mp.description ? <Text style={styles.meetupDesc}>{mp.description}</Text> : null}
              <Text style={styles.meetupCoords}>
                📍 {mp.latitude.toFixed(4)}, {mp.longitude.toFixed(4)} · Tạo bởi {mp.creatorName || 'Thành viên'}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* 3. Check-in Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Check-in tại điểm dừng</Text>
        </View>

        <Text style={styles.cardDesc}>
          Xác nhận bạn đã có mặt tại điểm tham quan hoặc điểm hẹn để cả nhóm cùng nắm tiến độ.
        </Text>

        <TouchableOpacity
          style={styles.checkInBtn}
          activeOpacity={0.85}
          disabled={isCheckingIn}
          onPress={handleCheckIn}
        >
          {isCheckingIn ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.checkInBtnText}>📍 Check-in vị trí hiện tại</Text>
          )}
        </TouchableOpacity>

        <View style={styles.subSection}>
          <Text style={styles.subHeading}>Lịch sử check-in gần đây ({checkIns.length})</Text>
          {isLoadingCheckIns ? (
            <ActivityIndicator size="small" color="#005ea5" />
          ) : checkIns.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có lượt check-in nào.</Text>
          ) : (
            checkIns.slice(0, 5).map((ci) => (
              <View key={ci.id} style={styles.checkInRow}>
                <Text style={styles.checkInUser}>{ci.userDisplayName || 'Thành viên'}</Text>
                <Text style={styles.checkInTime}>
                  {new Date(ci.checkedInAt).toLocaleString('vi-VN')}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Modal Create Meetup Point */}
      <Modal
        visible={showMeetupModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowMeetupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tạo điểm hẹn chung</Text>
              <TouchableOpacity onPress={() => setShowMeetupModal(false)}>
                <CloseIcon size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Tên điểm hẹn *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="VD: Cổng vào Cầu Rồng, Quán cafe A..."
              value={meetupLabel}
              onChangeText={setMeetupLabel}
            />

            <Text style={styles.inputLabel}>Ghi chú thêm</Text>
            <TextInput
              style={styles.textInput}
              placeholder="VD: Tập trung trước 8h30 để mua vé"
              value={meetupDesc}
              onChangeText={setMeetupDesc}
            />

            <View style={styles.coordsRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Vĩ độ (Lat)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={meetupLat}
                  onChangeText={setMeetupLat}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Kinh độ (Lng)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={meetupLng}
                  onChangeText={setMeetupLng}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.submitMeetupBtn}
              activeOpacity={0.85}
              disabled={isCreatingMeetup}
              onPress={handleCreateMeetup}
            >
              {isCreatingMeetup ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitMeetupBtnText}>Lưu điểm hẹn</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  activeShareBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#16A34A',
  },
  statusTextActive: {
    fontSize: 13,
    fontWeight: '600',
    color: '#15803D',
    flex: 1,
  },
  stopShareBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  stopShareBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  inactiveShareBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  durationLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  durationPills: {
    flexDirection: 'row',
    gap: 8,
  },
  durationPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  durationPillActive: {
    backgroundColor: '#005ea5',
    borderColor: '#005ea5',
  },
  durationPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  durationPillTextActive: {
    color: '#FFFFFF',
  },
  startShareBtn: {
    backgroundColor: '#005ea5',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  startShareBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  subSection: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    gap: 8,
  },
  subHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  memberShareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0369A1',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  memberMeta: {
    fontSize: 11,
    color: '#64748B',
  },
  navIconBtn: {
    padding: 6,
  },
  createMeetupCta: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  createMeetupCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  meetupCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  meetupCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meetupLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  meetupActions: {
    flexDirection: 'row',
    gap: 6,
  },
  navBtnSmall: {
    backgroundColor: '#005ea5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  navBtnSmallText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  deleteBtnSmall: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deleteBtnSmallText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '600',
  },
  meetupDesc: {
    fontSize: 12,
    color: '#475569',
  },
  meetupCoords: {
    fontSize: 11,
    color: '#94A3B8',
  },
  checkInBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  checkInBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  checkInRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  checkInUser: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  checkInTime: {
    fontSize: 11,
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  coordsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  submitMeetupBtn: {
    backgroundColor: '#005ea5',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  submitMeetupBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

