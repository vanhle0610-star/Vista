import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';

import { tokens } from '@/theme/tokens';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { authStorage } from '@/services/auth/authStorage';
import { tripFeatureApi } from '../api';
import { Trip, TripMember } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Fallback high quality editorial cover photo matching mockup Da Nang theme
const DEFAULT_HERO_IMAGE =
  'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80';

// Format date range (e.g. 12/06/2026 – 15/06/2026)
function formatDateRange(startDateStr?: string, endDateStr?: string): string {
  if (!startDateStr && !endDateStr) return 'Chưa xác định thời gian';
  const formatSingle = (s?: string) => {
    if (!s) return '';
    try {
      const parts = s.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return s;
    } catch {
      return s;
    }
  };
  const start = formatSingle(startDateStr);
  const end = formatSingle(endDateStr);
  if (start && end) return `${start} – ${end}`;
  return start || end;
}

// Compute duration string (e.g. "4N3Đ" or "3 ngày")
function formatDuration(startDateStr?: string, endDateStr?: string): string {
  if (!startDateStr || !endDateStr) return '';
  try {
    const s = new Date(startDateStr.split('T')[0]);
    const e = new Date(endDateStr.split('T')[0]);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const days = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    if (days <= 1) return '1 Ngày';
    const nights = Math.max(1, days - 1);
    return `${days}N${nights}Đ`;
  } catch {
    return '';
  }
}

export function TripDetailScreen({ tripId }: { tripId: string }) {
  const insets = useSafeAreaInsets();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Danger Zone / Delete Trip Modal State
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load current user and trip data
  const loadTripData = useCallback(async () => {
    try {
      setErrorStatus(null);
      setErrorMessage(null);

      const user = await authStorage.getUser<{ id?: string; sub?: string }>();
      const uid = user?.id || user?.sub || null;
      setCurrentUserId(uid);

      const tripData = await tripFeatureApi.fetchTrip(tripId);
      setTrip(tripData);

      // Attempt to load member list
      try {
        const memberList = await tripFeatureApi.fetchTripMembers(tripId);
        setMembers(memberList);
      } catch {
        // Fallback to members embedded in trip response if any
        if (tripData.members) {
          setMembers(tripData.members);
        }
      }
    } catch (err: any) {
      const status = err?.response?.status;
      setErrorStatus(status || 500);
      if (status === 403) {
        setErrorMessage('Bạn không có quyền xem chuyến đi này');
      } else if (status === 404) {
        setErrorMessage('Không tìm thấy thông tin chuyến đi');
      } else {
        setErrorMessage(
          err?.response?.data?.detail ||
            'Không thể kết nối máy chủ. Vui lòng kiểm tra lại kết nối mạng.'
        );
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [tripId]);

  useFocusEffect(
    useCallback(() => {
      loadTripData();
    }, [loadTripData])
  );

  // Check if current user is owner
  const isOwner =
    Boolean(trip?.role === 'OWNER') ||
    Boolean(currentUserId && trip?.ownerId && currentUserId === trip.ownerId);

  // Execute Trip Deletion (CHỈ OWNER)
  const handleConfirmDeleteTrip = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await tripFeatureApi.deleteTrip(tripId);
      setIsDeleteModalVisible(false);
      Alert.alert('Thành công', 'Chuyến đi đã được xóa thành công.', [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)/trips'),
        },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Không thể xóa chuyến đi này.';
      Alert.alert('Lỗi', msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // 1. Loading Skeleton State
  if (loading && !isRefreshing) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />
        {/* Header Skeleton */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Quay lại"
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M19 12H5M12 19l-7-7 7-7"
                stroke={tokens.colors.ink}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
          <View style={styles.skeletonTitle} />
          <View style={{ width: 40 }} />
        </View>

        {/* Hero Skeleton */}
        <View style={styles.skeletonHero}>
          <ActivityIndicator size="large" color={tokens.colors.primary} />
          <AppText style={styles.skeletonText}>Đang tải chi tiết chuyến đi...</AppText>
        </View>

        {/* Pills Skeleton */}
        <View style={styles.skeletonPillsRow}>
          <View style={styles.skeletonPill} />
          <View style={styles.skeletonPill} />
          <View style={styles.skeletonPill} />
        </View>

        {/* Content Skeleton */}
        <View style={styles.skeletonCard} />
        <View style={styles.skeletonCard} />
      </View>
    );
  }

  // 2. Error 403: Forbidden Screen (Người ngoài không có quyền xem)
  if (errorStatus === 403) {
    return (
      <View style={[styles.centerScreen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.forbiddenIconContainer}>
          <Svg width={44} height={44} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              stroke={tokens.colors.danger}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
        <AppText style={styles.forbiddenTitle}>Bạn không có quyền xem chuyến đi này</AppText>
        <AppText style={styles.forbiddenSubtitle}>
          Chuyến đi này ở chế độ riêng tư hoặc bạn chưa tham gia vào danh sách thành viên. Vui lòng liên hệ Trưởng nhóm để nhận liên kết mời.
        </AppText>
        <View style={styles.forbiddenActionWrapper}>
          <AppButton
            label="Quay lại trang chủ"
            onPress={() => router.replace('/(tabs)/discover')}
            variant="primary"
            fullWidth
          />
        </View>
      </View>
    );
  }

  // 3. Network or 404 Error Screen
  if (errorMessage || !trip) {
    return (
      <View style={[styles.centerScreen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.errorIconContainer}>
          <Svg width={44} height={44} viewBox="0 0 24 24" fill="none">
            <Circle cx={12} cy={12} r={10} stroke={tokens.colors.warning} strokeWidth={2} />
            <Path d="M12 8v4M12 16h.01" stroke={tokens.colors.warning} strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </View>
        <AppText style={styles.errorTitle}>
          {errorStatus === 404 ? 'Không tìm thấy chuyến đi' : 'Không thể tải dữ liệu'}
        </AppText>
        <AppText style={styles.errorSubtitle}>
          {errorMessage || 'Đã có lỗi xảy ra trong quá trình tải thông tin chuyến đi.'}
        </AppText>
        <View style={styles.errorActionsRow}>
          <AppButton
            label="Thử lại"
            onPress={() => {
              setLoading(true);
              loadTripData();
            }}
            variant="primary"
            style={{ flex: 1 }}
          />
          <AppButton
            label="Quay lại"
            onPress={() => router.back()}
            variant="secondary"
            style={{ flex: 1 }}
          />
        </View>
      </View>
    );
  }

  // Compute metrics
  const durationLabel = formatDuration(trip.startDate, trip.endDate);
  const dateRangeLabel = formatDateRange(trip.startDate, trip.endDate);
  const memberCount = members.length > 0 ? members.length : trip.members?.length || 1;
  const coverUrl = trip.coverImageUrl || trip.coverPhotoUrl || DEFAULT_HERO_IMAGE;

  // Budget calculations
  const hasBudgetTotal = trip.budgetTotal != null && Number(trip.budgetTotal) > 0;
  const budgetTotalNum = Number(trip.budgetTotal || 0);
  const budgetSpentNum = Number(trip.budgetSpent || 0);
  const showBudgetPercent = hasBudgetTotal && trip.budgetSpent != null;
  const budgetPercent = showBudgetPercent
    ? Math.min(100, Math.round((budgetSpentNum / budgetTotalNum) * 100))
    : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Floating Header */}
      <View style={[styles.floatingHeader, { top: insets.top + 6 }]}>
        <TouchableOpacity
          style={styles.floatingBackButton}
          onPress={() => router.back()}
          accessibilityLabel="Quay lại"
        >
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path
              d="M19 12H5M12 19l-7-7 7-7"
              stroke={tokens.colors.surface}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>

        <View style={styles.floatingHeaderRight}>
          <TouchableOpacity
            style={styles.floatingIconButton}
            onPress={() => {
              // Share trip modal or link
              Alert.alert('Chia sẻ chuyến đi', `Mã chuyến đi: ${trip.id}\nTiêu đề: ${trip.title}`);
            }}
            accessibilityLabel="Chia sẻ chuyến đi"
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"
                stroke={tokens.colors.surface}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroWrapper}>
          <Image
            source={{ uri: coverUrl }}
            style={styles.heroImage}
            contentFit="cover"
            transition={300}
          />
          {/* Subtle overlay gradients */}
          <LinearGradient
            colors={['rgba(15, 23, 42, 0.45)', 'transparent', 'rgba(15, 23, 42, 0.9)']}
            style={StyleSheet.absoluteFill}
          />

          {/* Hero Meta Overlay */}
          <View style={styles.heroOverlayContent}>
            <View style={styles.heroBadgeRow}>
              <StatusBadge status={trip.status || 'PLANNING'} size="small" />
              {durationLabel ? (
                <View style={styles.durationChip}>
                  <AppText style={styles.durationChipText}>{durationLabel}</AppText>
                </View>
              ) : null}
            </View>

            <AppText style={styles.heroTitle} numberOfLines={2}>
              {trip.title}
            </AppText>

            <View style={styles.heroInfoRow}>
              {trip.destinationSummary ? (
                <View style={styles.heroLocation}>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M12 2a8 8 0 00-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 00-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z"
                      fill={tokens.colors.primaryLight}
                    />
                  </Svg>
                  <AppText style={styles.heroLocationText} numberOfLines={1}>
                    {trip.destinationSummary}
                  </AppText>
                </View>
              ) : null}

              <View style={styles.heroDate}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"
                    fill={tokens.colors.primaryLight}
                  />
                </Svg>
                <AppText style={styles.heroDateText}>{dateRangeLabel}</AppText>
              </View>
            </View>
          </View>
        </View>

        {/* 3-Pill Quick Navigation Bento Strip */}
        <View style={styles.quickNavSection}>
          <View style={styles.quickNavGrid}>
            {/* Pill 1: Lịch trình */}
            <TouchableOpacity
              style={styles.bentoPill}
              activeOpacity={0.8}
              onPress={() => router.push(`/trip/${tripId}/itinerary` as any)}
            >
              <View style={styles.bentoPillHeader}>
                <View style={[styles.pillIconBadge, { backgroundColor: tokens.colors.primarySoft }]}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      stroke={tokens.colors.primary}
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  </Svg>
                </View>
                <AppText style={styles.pillActionHint}>Mở →</AppText>
              </View>
              <View style={styles.bentoPillBody}>
                <AppText style={styles.bentoPillTitle}>Lịch trình</AppText>
                <AppText style={styles.bentoPillSubtitle}>
                  {durationLabel ? `${durationLabel} chi tiết` : 'Theo ngày & trạm'}
                </AppText>
              </View>
            </TouchableOpacity>

            {/* Pill 2: Thành viên */}
            <TouchableOpacity
              style={styles.bentoPill}
              activeOpacity={0.8}
              onPress={() => router.push(`/trip/${tripId}/members` as any)}
            >
              <View style={styles.bentoPillHeader}>
                <View style={[styles.pillIconBadge, { backgroundColor: tokens.colors.aiSoft }]}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm14 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                      stroke={tokens.colors.aiTeal}
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  </Svg>
                </View>
                <AppText style={[styles.pillActionHint, { color: tokens.colors.aiTeal }]}>Xem →</AppText>
              </View>
              <View style={styles.bentoPillBody}>
                <AppText style={styles.bentoPillTitle}>Thành viên</AppText>
                <AppText style={styles.bentoPillSubtitle}>{memberCount} người tham gia</AppText>
              </View>
            </TouchableOpacity>

            {/* Pill 3: Ngân sách (% chi tiêu) */}
            <TouchableOpacity
              style={styles.bentoPill}
              activeOpacity={0.8}
              onPress={() => {
                // Điều hướng sang màn treasury của TV4
                router.push({
                  pathname: '/(tabs)/treasury',
                  params: { tripId },
                } as any);
              }}
            >
              <View style={styles.bentoPillHeader}>
                <View style={[styles.pillIconBadge, { backgroundColor: tokens.colors.warningSoft }]}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"
                      stroke={tokens.colors.warning}
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  </Svg>
                </View>
                {showBudgetPercent && budgetPercent !== null ? (
                  <View style={styles.budgetPercentChip}>
                    <AppText style={styles.budgetPercentText}>{budgetPercent}%</AppText>
                  </View>
                ) : (
                  <AppText style={styles.pillActionHint}>Sổ quỹ →</AppText>
                )}
              </View>
              <View style={styles.bentoPillBody}>
                <AppText style={styles.bentoPillTitle}>Ngân sách</AppText>
                <AppText style={styles.bentoPillSubtitle}>
                  {hasBudgetTotal
                    ? `${Number(trip.budgetTotal).toLocaleString('vi-VN')} ${trip.currency || 'VND'}`
                    : 'Chưa đặt hạn mức'}
                </AppText>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Member Role Banner */}
        <View style={styles.roleBannerContainer}>
          <View
            style={[
              styles.roleBanner,
              isOwner ? styles.roleBannerOwner : styles.roleBannerMember,
            ]}
          >
            <View
              style={[
                styles.roleIconWrapper,
                { backgroundColor: isOwner ? tokens.colors.primarySoft : tokens.colors.surfaceSubtle },
              ]}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d={
                    isOwner
                      ? 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'
                      : 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z'
                  }
                  stroke={isOwner ? tokens.colors.primary : tokens.colors.ink}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <View style={styles.roleBannerContent}>
              <View style={styles.roleBannerHeader}>
                <AppText style={styles.roleBannerTitle}>
                  {isOwner ? '👑 Bạn là Trưởng nhóm' : '👤 Thành viên chuyến đi'}
                </AppText>
              </View>
              <AppText style={styles.roleBannerDescription}>
                {isOwner
                  ? 'Bạn có toàn quyền quản lý thành viên, điều phối lịch trình và phân quyền nhóm.'
                  : 'Bạn có thể xem lịch trình, tạo liên kết mời bạn bè và biểu quyết các điểm dừng.'}
              </AppText>
            </View>
          </View>
        </View>

        {/* Primary Action Button: Open Itinerary */}
        <View style={styles.primaryActionSection}>
          <TouchableOpacity
            style={styles.primaryActionButton}
            activeOpacity={0.88}
            onPress={() => router.push(`/trip/${tripId}/itinerary` as any)}
          >
            <View style={styles.primaryActionLeft}>
              <View style={styles.primaryActionIconBg}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 2a8 8 0 00-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 00-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z"
                    stroke={tokens.colors.surface}
                    strokeWidth={2}
                  />
                </Svg>
              </View>
              <View>
                <AppText style={styles.primaryActionTitle}>Xem lịch trình theo ngày</AppText>
                <AppText style={styles.primaryActionSubtitle}>Chi tiết trạm dừng, bản đồ & di chuyển</AppText>
              </View>
            </View>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path
                d="M5 12h14M12 5l7 7-7 7"
                stroke={tokens.colors.surface}
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
        </View>

        {/* Trip Summary / Description Card */}
        {trip.destinationSummary ? (
          <View style={styles.summarySection}>
            <AppCard style={styles.summaryCard}>
              <View style={styles.summaryCardHeader}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                    stroke={tokens.colors.primary}
                    strokeWidth={2}
                  />
                  <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={tokens.colors.primary} strokeWidth={2} />
                </Svg>
                <AppText style={styles.summaryCardTitle}>Tóm tắt điểm đến</AppText>
              </View>
              <AppText style={styles.summaryCardBody}>{trip.destinationSummary}</AppText>
            </AppCard>
          </View>
        ) : null}

        {/* Danger Zone: CHỈ OWNER MỚI THẤY (MEMBER KHÔNG THẤY) */}
        {isOwner ? (
          <View style={styles.dangerZoneSection}>
            <View style={styles.dangerZoneCard}>
              <View style={styles.dangerZoneHeader}>
                <View style={styles.dangerZoneIconBg}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"
                      stroke={tokens.colors.danger}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
                <View style={styles.dangerZoneHeaderText}>
                  <AppText style={styles.dangerZoneTitle}>Khu vực quản trị nhóm</AppText>
                  <AppText style={styles.dangerZoneSubtitle}>
                    Thao tác thay đổi vĩnh viễn cấu trúc chuyến đi của toàn bộ thành viên.
                  </AppText>
                </View>
              </View>

              <View style={styles.dangerZoneDivider} />

              <TouchableOpacity
                style={styles.dangerDeleteButton}
                activeOpacity={0.8}
                onPress={() => setIsDeleteModalVisible(true)}
              >
                <View style={styles.dangerDeleteButtonLeft}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"
                      stroke={tokens.colors.danger}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                  <AppText style={styles.dangerDeleteButtonText}>Hủy & Xóa chuyến đi này</AppText>
                </View>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M9 18l6-6-6-6"
                    stroke={tokens.colors.danger}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>
              <AppText style={styles.dangerNoticeFootnote}>
                * Hành động xóa sẽ hiển thị hộp thoại xác nhận bảo vệ trước khi thực thi.
              </AppText>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* 2-Step Confirmation Modal: Xóa chuyến đi */}
      <Modal
        visible={isDeleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isDeleting) setIsDeleteModalVisible(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.deleteModalContainer}>
            <View style={styles.deleteModalIcon}>
              <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  stroke={tokens.colors.danger}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>

            <AppText style={styles.deleteModalTitle}>Xác nhận xóa chuyến đi?</AppText>

            <AppText style={styles.deleteModalMessage}>
              Toàn bộ lịch trình, danh sách điểm dừng và thông tin thành viên của chuyến đi{' '}
              <AppText style={{ fontWeight: '700', color: tokens.colors.ink }}>"{trip.title}"</AppText>{' '}
              sẽ bị xóa vĩnh viễn và không thể khôi phục.
            </AppText>

            <View style={styles.deleteModalActions}>
              <AppButton
                label={isDeleting ? 'Đang xóa...' : 'Tôi hiểu, Xóa vĩnh viễn'}
                onPress={handleConfirmDeleteTrip}
                variant="danger"
                loading={isDeleting}
                fullWidth
              />
              <AppButton
                label="Hủy bỏ"
                onPress={() => setIsDeleteModalVisible(false)}
                variant="secondary"
                disabled={isDeleting}
                fullWidth
                style={{ marginTop: tokens.spacing.sm }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.canvas,
  },
  scrollContent: {
    paddingBottom: tokens.spacing.xxl,
  },

  // Floating Header
  floatingHeader: {
    position: 'absolute',
    left: tokens.spacing.lg,
    right: tokens.spacing.lg,
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  floatingBackButton: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.full,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  floatingIconButton: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.full,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Hero Section
  heroWrapper: {
    width: SCREEN_WIDTH,
    height: 290,
    position: 'relative',
    backgroundColor: tokens.colors.ink,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlayContent: {
    position: 'absolute',
    bottom: tokens.spacing.lg,
    left: tokens.spacing.lg,
    right: tokens.spacing.lg,
    gap: tokens.spacing.xs,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.xs,
  },
  durationChip: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.full,
    backgroundColor: 'rgba(241, 245, 249, 0.9)',
  },
  durationChipText: {
    fontSize: tokens.font.small,
    fontWeight: '700',
    color: tokens.colors.ink,
    lineHeight: 16,
  },
  heroTitle: {
    fontSize: tokens.font.display,
    fontWeight: '800',
    color: tokens.colors.surface,
    letterSpacing: -0.4,
    lineHeight: 32,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroInfoRow: {
    flexDirection: 'column',
    gap: 4,
    marginTop: tokens.spacing.xs,
  },
  heroLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroLocationText: {
    fontSize: tokens.font.body,
    fontWeight: '600',
    color: tokens.colors.surface,
    lineHeight: 20,
  },
  heroDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroDateText: {
    fontSize: tokens.font.caption,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 18,
  },

  // Quick Navigation Bento Strip (3 Pills)
  quickNavSection: {
    paddingHorizontal: tokens.spacing.lg,
    marginTop: -tokens.spacing.md,
    zIndex: 10,
  },
  quickNavGrid: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  bentoPill: {
    flex: 1,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    shadowColor: tokens.colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    justifyContent: 'space-between',
    minHeight: 96,
  },
  bentoPillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pillIconBadge: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillActionHint: {
    fontSize: tokens.font.micro,
    fontWeight: '700',
    color: tokens.colors.primary,
    lineHeight: 14,
  },
  budgetPercentChip: {
    backgroundColor: tokens.colors.warningSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
  },
  budgetPercentText: {
    fontSize: tokens.font.micro,
    fontWeight: '800',
    color: tokens.colors.warning,
    lineHeight: 14,
  },
  bentoPillBody: {
    marginTop: tokens.spacing.sm,
  },
  bentoPillTitle: {
    fontSize: tokens.font.body,
    fontWeight: '700',
    color: tokens.colors.ink,
    lineHeight: 19,
  },
  bentoPillSubtitle: {
    fontSize: tokens.font.micro,
    fontWeight: '500',
    color: tokens.colors.textMuted,
    lineHeight: 14,
    marginTop: 2,
  },

  // Role Banner
  roleBannerContainer: {
    paddingHorizontal: tokens.spacing.lg,
    marginTop: tokens.spacing.md,
  },
  roleBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    gap: tokens.spacing.md,
    borderWidth: 1,
  },
  roleBannerOwner: {
    backgroundColor: tokens.colors.primarySoft,
    borderColor: tokens.colors.borderSubtle,
  },
  roleBannerMember: {
    backgroundColor: tokens.colors.surfaceSubtle,
    borderColor: tokens.colors.border,
  },
  roleIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleBannerContent: {
    flex: 1,
  },
  roleBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  roleBannerTitle: {
    fontSize: tokens.font.body,
    fontWeight: '700',
    color: tokens.colors.ink,
    lineHeight: 20,
  },
  roleBannerDescription: {
    fontSize: tokens.font.caption,
    color: tokens.colors.textMuted,
    lineHeight: 17,
    marginTop: 2,
  },

  // Primary Action Section
  primaryActionSection: {
    paddingHorizontal: tokens.spacing.lg,
    marginTop: tokens.spacing.md,
  },
  primaryActionButton: {
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: tokens.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
    flex: 1,
  },
  primaryActionIconBg: {
    width: 38,
    height: 38,
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryActionTitle: {
    fontSize: tokens.font.body,
    fontWeight: '700',
    color: tokens.colors.surface,
    lineHeight: 20,
  },
  primaryActionSubtitle: {
    fontSize: tokens.font.caption,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 16,
    marginTop: 2,
  },

  // Summary / Description Section
  summarySection: {
    paddingHorizontal: tokens.spacing.lg,
    marginTop: tokens.spacing.md,
  },
  summaryCard: {
    padding: tokens.spacing.lg,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.xs,
  },
  summaryCardTitle: {
    fontSize: tokens.font.body,
    fontWeight: '700',
    color: tokens.colors.ink,
    lineHeight: 20,
  },
  summaryCardBody: {
    fontSize: tokens.font.body,
    color: tokens.colors.textSecondary,
    lineHeight: 21,
  },

  // Danger Zone (CHỈ OWNER)
  dangerZoneSection: {
    paddingHorizontal: tokens.spacing.lg,
    marginTop: tokens.spacing.lg,
  },
  dangerZoneCard: {
    backgroundColor: tokens.colors.dangerSoft,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.colors.dangerLight,
  },
  dangerZoneHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing.md,
  },
  dangerZoneIconBg: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.full,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerZoneHeaderText: {
    flex: 1,
  },
  dangerZoneTitle: {
    fontSize: tokens.font.body,
    fontWeight: '700',
    color: tokens.colors.danger,
    lineHeight: 20,
  },
  dangerZoneSubtitle: {
    fontSize: tokens.font.caption,
    color: tokens.colors.textMuted,
    lineHeight: 17,
    marginTop: 2,
  },
  dangerZoneDivider: {
    height: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    marginVertical: tokens.spacing.md,
  },
  dangerDeleteButton: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  dangerDeleteButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  dangerDeleteButtonText: {
    fontSize: tokens.font.body,
    fontWeight: '700',
    color: tokens.colors.danger,
    lineHeight: 20,
  },
  dangerNoticeFootnote: {
    fontSize: tokens.font.micro,
    color: tokens.colors.textMuted,
    lineHeight: 14,
    marginTop: tokens.spacing.sm,
  },

  // 2-Step Confirmation Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing.lg,
  },
  deleteModalContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.xl,
    alignItems: 'center',
    shadowColor: tokens.colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  deleteModalIcon: {
    width: 60,
    height: 60,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.dangerSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  deleteModalTitle: {
    fontSize: tokens.font.heading,
    fontWeight: '800',
    color: tokens.colors.ink,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: tokens.spacing.sm,
  },
  deleteModalMessage: {
    fontSize: tokens.font.body,
    color: tokens.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: tokens.spacing.lg,
  },
  deleteModalActions: {
    width: '100%',
  },

  // Skeleton States
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonTitle: {
    width: 140,
    height: 18,
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.colors.border,
  },
  skeletonHero: {
    width: '100%',
    height: 240,
    backgroundColor: tokens.colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  skeletonText: {
    fontSize: tokens.font.caption,
    color: tokens.colors.textMuted,
    lineHeight: 18,
  },
  skeletonPillsRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
    marginTop: tokens.spacing.md,
  },
  skeletonPill: {
    flex: 1,
    height: 80,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surfaceSubtle,
  },
  skeletonCard: {
    height: 90,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surfaceSubtle,
    marginHorizontal: tokens.spacing.lg,
    marginTop: tokens.spacing.md,
  },

  // 403 Forbidden & Error States
  centerScreen: {
    flex: 1,
    backgroundColor: tokens.colors.canvas,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.xl,
  },
  forbiddenIconContainer: {
    width: 80,
    height: 80,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.dangerSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: tokens.spacing.lg,
  },
  forbiddenTitle: {
    fontSize: tokens.font.heading,
    fontWeight: '800',
    color: tokens.colors.ink,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: tokens.spacing.sm,
  },
  forbiddenSubtitle: {
    fontSize: tokens.font.body,
    color: tokens.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: tokens.spacing.xl,
  },
  forbiddenActionWrapper: {
    width: '100%',
    maxWidth: 280,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.warningSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: tokens.spacing.lg,
  },
  errorTitle: {
    fontSize: tokens.font.heading,
    fontWeight: '800',
    color: tokens.colors.ink,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: tokens.spacing.sm,
  },
  errorSubtitle: {
    fontSize: tokens.font.body,
    color: tokens.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: tokens.spacing.xl,
  },
  errorActionsRow: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
    width: '100%',
    maxWidth: 320,
  },
});
