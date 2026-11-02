import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { authStorage } from '@/services/auth/authStorage';
import { AuthGatekeeperCard } from '../../../components/feedback/AuthGatekeeperCard';
import { tokens } from '../../../theme/tokens';
import { tripApi, TripDto } from '../../../services/api/tripApi';
import { expenseApi, TripExpenseSummaryDto } from '../../../services/api/expenseApi';
import { CreateTripModal } from './CreateTripModal';
import { InviteCodeModal } from './InviteCodeModal';
import { AvatarGroup } from '../../../components/ui/AvatarGroup';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import {
  WalletIcon,
  MapIcon,
  CalendarIcon,
  KeyIcon,
  VoteIcon,
  GroupIcon,
  SparkleIcon,
  LuggageIcon,
} from '../../../components/icons/StitchIcons';

type FilterTab = 'ALL' | 'PLANNING' | 'ACTIVE' | 'COMPLETED';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' đ';
}

function formatDateRange(startDate?: string, endDate?: string): string {
  if (!startDate || !endDate) return 'Chưa định ngày';
  try {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const sDay = s.getDate();
    const sMonth = s.getMonth() + 1;
    const eDay = e.getDate();
    const eMonth = e.getMonth() + 1;
    const eYear = e.getFullYear();

    if (sMonth === eMonth) {
      return `${sDay} – ${eDay}/${eMonth}/${eYear}`;
    }
    return `${sDay}/${sMonth} – ${eDay}/${eMonth}/${eYear}`;
  } catch {
    return `${startDate} – ${endDate}`;
  }
}

function getTripCoverImage(destinationSummary?: string | null): string {
  const d = (destinationSummary || '').toLowerCase();
  if (d.includes('hội an') || d.includes('đà nẵng') || d.includes('hoi an') || d.includes('da nang')) {
    return 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800&auto=format&fit=crop&q=80';
  }
  if (d.includes('hạ long') || d.includes('ha long')) {
    return 'https://images.unsplash.com/photo-1528127269322-539801943592?w=800&auto=format&fit=crop&q=80';
  }
  if (d.includes('đà lạt') || d.includes('da lat')) {
    return 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&auto=format&fit=crop&q=80';
  }
  if (d.includes('phú quốc') || d.includes('phu quoc')) {
    return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80';
  }
  return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop&q=80';
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'Đang diễn ra';
    case 'PLANNING':
      return 'Đang lên kế hoạch';
    case 'COMPLETED':
      return 'Đã hoàn thành';
    case 'CANCELLED':
      return 'Đã hủy';
    default:
      return status;
  }
}

export function TripsHubScreen() {
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const checkAuth = useCallback(async () => {
    const token = await authStorage.getAccessToken();
    setIsAuthenticated(!!token);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useFocusEffect(
    useCallback(() => {
      checkAuth();
    }, [checkAuth])
  );

  // 1. Fetch real trips from backend API
  const {
    data: trips = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['trips'],
    queryFn: tripApi.fetchMyTrips,
    enabled: !!isAuthenticated,
    staleTime: 15_000,
  });

  // Filter trips based on tab
  const filteredTrips = useMemo(() => {
    if (activeTab === 'ALL') return trips;
    return trips.filter((t) => t.status === activeTab);
  }, [trips, activeTab]);

  // Spotlight trip: Active trip first, or the first trip in current filtered list
  const spotlightTrip = useMemo(() => {
    if (trips.length === 0) return null;
    if (activeTab === 'ALL') {
      const active = trips.find((t) => t.status === 'ACTIVE');
      return active || trips[0];
    }
    return filteredTrips[0] || null;
  }, [trips, filteredTrips, activeTab]);

  // Secondary trips: All filtered trips except the spotlight one
  const secondaryTrips = useMemo(() => {
    if (!spotlightTrip) return [];
    return filteredTrips.filter((t) => t.id !== spotlightTrip.id);
  }, [filteredTrips, spotlightTrip]);

  // 2. Fetch live expenses summary for the spotlight trip (NO HARDCODING)
  const { data: expenseSummary } = useQuery<TripExpenseSummaryDto>({
    queryKey: ['trip-expense-summary', spotlightTrip?.id, spotlightTrip?.budgetTotal],
    queryFn: () =>
      spotlightTrip
        ? expenseApi.fetchTripExpenseSummary(spotlightTrip.id, spotlightTrip.budgetTotal || undefined)
        : Promise.reject('No spotlight trip'),
    enabled: !!spotlightTrip?.id,
    staleTime: 10_000,
  });

  const totalSpent = expenseSummary?.totalSpent ?? 0;
  const budgetTotal = spotlightTrip?.budgetTotal ?? expenseSummary?.budgetTotal ?? 0;
  const remainingBudget =
    budgetTotal > 0 ? Math.max(0, budgetTotal - totalSpent) : 0;
  const spentPercentage =
    budgetTotal > 0 ? Math.min(Math.round((totalSpent / budgetTotal) * 100), 100) : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading || isRefetching} onRefresh={refetch} />
        }
      >
        {/* Top Header: Title & Join Key Button */}
        <View style={styles.topSection}>
          <View style={styles.titleWrapper}>
            <Text style={styles.mainTitle}>Chuyến đi của bạn</Text>
            <Text style={styles.subTitle}>Hẹn nhau ở những hành trình mới</Text>
          </View>
          <TouchableOpacity
            style={styles.keyButton}
            onPress={() => {
              if (!isAuthenticated) {
                Alert.alert(
                  'Yêu cầu đăng nhập',
                  'Bạn cần đăng nhập tài khoản VISTA để tham gia chuyến đi qua mã mời.',
                  [
                    { text: 'Hủy', style: 'cancel' },
                    { text: 'Đăng nhập', onPress: () => router.push('/(auth)/login') },
                  ]
                );
                return;
              }
              setIsInviteModalOpen(true);
            }}
            activeOpacity={0.8}
          >
            <KeyIcon size={16} color={tokens.colors.primary} />
            <Text style={styles.keyButtonText}>Mã mời</Text>
          </TouchableOpacity>
        </View>

        {isAuthenticated === false ? (
          <AuthGatekeeperCard
            title="Lên kế hoạch cho hành trình của bạn"
            description="Đăng nhập hoặc đăng ký tài khoản VISTA để bắt đầu tạo chuyến đi, mời bạn bè cùng tham gia và theo dõi chi phí nhóm."
            iconType="trips"
          />
        ) : isAuthenticated === null ? (
          <View style={{ paddingVertical: 48, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={tokens.colors.primary} />
          </View>
        ) : (
          <>
        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabsContainer}
        >
          {(
            [
              { key: 'ALL', label: 'Tất cả' },
              { key: 'PLANNING', label: 'Đang lên kế hoạch' },
              { key: 'ACTIVE', label: 'Đang diễn ra' },
              { key: 'COMPLETED', label: 'Đã hoàn thành' },
            ] as const
          ).map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.85}
              >
                <Text
                  style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Loading State */}
        {isLoading && trips.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={tokens.colors.primary} />
            <Text style={styles.loadingText}>Đang tải danh sách chuyến đi...</Text>
          </View>
        ) : null}

        {/* Empty State */}
        {!isLoading && filteredTrips.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LuggageIcon size={44} color={tokens.colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {activeTab === 'ALL'
                ? 'Chưa có chuyến đi nào'
                : `Không có chuyến đi "${getStatusLabel(activeTab)}"`}
            </Text>
            <Text style={styles.emptyDesc}>
              Bắt đầu tạo kế hoạch mới hoặc để AI thiết kế lịch trình tối ưu và dự toán tài chính
              trong tích tắc.
            </Text>
            <TouchableOpacity
              style={styles.emptyCta}
              onPress={() => setIsCreateModalOpen(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyCtaText}>+ Tạo chuyến đi đầu tiên</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Spotlight Active Trip Card */}
        {spotlightTrip ? (
          <View style={styles.spotlightWrapper}>
            <View style={styles.spotlightCard}>
              {/* Banner Image */}
              <View style={styles.spotlightBanner}>
                <Image
                  source={{ uri: getTripCoverImage(spotlightTrip.destinationSummary) }}
                  style={styles.spotlightImage}
                  resizeMode="cover"
                />
                <View style={styles.bannerOverlay} />

                {/* Status Badge */}
                <View style={styles.spotlightBadgeWrap}>
                  <StatusBadge status={spotlightTrip.status} />
                </View>

                {/* Title & Dates on image */}
                <View style={styles.bannerBottomInfo}>
                  <Text style={styles.bannerTripTitle} numberOfLines={1}>
                    {spotlightTrip.title}
                  </Text>
                  <View style={styles.datePill}>
                    <CalendarIcon size={13} color="#ffffff" style={{ marginRight: 5 }} />
                    <Text style={styles.datePillText}>
                      {formatDateRange(spotlightTrip.startDate, spotlightTrip.endDate)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Card Body */}
              <View style={styles.cardBody}>
                {/* Members row & social vote badge */}
                <View style={styles.metaRow}>
                  <View style={styles.membersStack}>
                    <AvatarGroup
                      members={(spotlightTrip.members || []).map((m) => ({
                        name: m.displayName || 'Thành viên',
                      }))}
                      max={3}
                      size={26}
                    />
                    <Text style={styles.membersCountText}>
                      {spotlightTrip.members?.length || 1} thành viên
                    </Text>
                  </View>

                  <View style={styles.voteBadge}>
                    <VoteIcon size={13} color={tokens.colors.primaryDark} style={{ marginRight: 4 }} />
                    <Text style={styles.voteBadgeText} numberOfLines={1}>
                      {spotlightTrip.destinationSummary || 'Kế hoạch mở'}
                    </Text>
                  </View>
                </View>

                {/* Budget & Expense Progress Module */}
                <View style={styles.budgetModule}>
                  <View style={styles.budgetRowTop}>
                    <View style={styles.budgetLabelGroup}>
                      <Text style={styles.budgetSpentLabel}>Đã chi:</Text>
                      <Text style={styles.budgetSpentValue}>{formatCurrency(totalSpent)}</Text>
                    </View>
                    <Text style={styles.budgetPercentText}>{spentPercentage}%</Text>
                  </View>

                  {/* Progress Bar Track */}
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${Math.max(spentPercentage, 4)}%` },
                      ]}
                    />
                  </View>

                  <View style={styles.budgetRowBottom}>
                    <Text style={styles.budgetSubText}>
                      Ngân sách: {budgetTotal > 0 ? formatCurrency(budgetTotal) : 'Chưa đặt'}
                    </Text>
                    <Text style={styles.budgetRemainingText}>
                      Còn {formatCurrency(remainingBudget)}
                    </Text>
                  </View>
                </View>

                {/* Quick Action Buttons */}
                <View style={styles.actionButtonsGrid}>
                  <TouchableOpacity
                    style={styles.treasuryBtn}
                    onPress={() => router.push('/(tabs)/treasury')}
                    activeOpacity={0.85}
                  >
                    <WalletIcon size={18} color={tokens.colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.treasuryBtnText}>Thủ quỹ</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.itineraryBtn}
                    onPress={() => router.push(`/trip/${spotlightTrip.id}` as any)}
                    activeOpacity={0.85}
                  >
                    <MapIcon size={18} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.itineraryBtnText}>Lịch trình</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {/* Secondary Trips List */}
        {secondaryTrips.map((trip) => (
          <TouchableOpacity
            key={trip.id}
            style={styles.secondaryCard}
            onPress={() => router.push(`/trip/${trip.id}` as any)}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: getTripCoverImage(trip.destinationSummary) }}
              style={styles.secondaryThumb}
              resizeMode="cover"
            />
            <View style={styles.secondaryContent}>
              <View style={styles.secondaryHeader}>
                <StatusBadge status={trip.status} size="small" />
              </View>
              <Text style={styles.secondaryTitle} numberOfLines={1}>
                {trip.title}
              </Text>
              <View style={styles.secondaryDateRow}>
                <CalendarIcon size={12} color={tokens.colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={styles.secondaryDate}>
                  {formatDateRange(trip.startDate, trip.endDate)}
                </Text>
              </View>
              <View style={styles.secondaryFooter}>
                <View style={styles.secondaryMembersRow}>
                  <GroupIcon size={13} color={tokens.colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.secondaryMembers}>
                    {trip.members?.length || 1} thành viên
                  </Text>
                </View>
                <Text style={styles.secondaryDetailLink}>Chi tiết ›</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* Primary Hub Actions */}
        <View style={styles.hubActionsContainer}>
          <TouchableOpacity
            style={styles.primaryCreateBtn}
            onPress={() => setIsCreateModalOpen(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryCreateBtnText}>+ Tạo chuyến đi mới</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.aiPlannerBtn}
            onPress={() => router.push('/(tabs)/ai-planner')}
            activeOpacity={0.85}
          >
            <SparkleIcon size={18} color={tokens.colors.aiCoPilot} style={{ marginRight: 6 }} />
            <Text style={styles.aiPlannerBtnText}>Thử AI lập lịch trình</Text>
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>Mới</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Invite Code Prompt Sheetlet */}
        <View style={styles.invitePromptBox}>
          <View style={styles.invitePromptLeft}>
            <View style={styles.inviteIconCircle}>
              <KeyIcon size={18} color={tokens.colors.primary} />
            </View>
            <View style={styles.inviteTextWrapper}>
              <Text style={styles.invitePromptTitle}>Được bạn bè mời tham gia?</Text>
              <Text style={styles.invitePromptDesc}>Nhập mã 6 ký tự để đồng bộ dữ liệu nhóm</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.inviteActionBtn}
            onPress={() => setIsInviteModalOpen(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.inviteActionText}>Nhập mã</Text>
          </TouchableOpacity>
        </View>
        </>
        )}
      </ScrollView>

      {/* Modals */}
      <CreateTripModal
        visible={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTripCreated={() => refetch()}
      />

      <InviteCodeModal
        visible={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onJoined={() => refetch()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.canvas,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  topSection: {
    paddingHorizontal: tokens.spacing.md,
    paddingTop: tokens.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleWrapper: {
    flex: 1,
  },
  mainTitle: {
    fontSize: tokens.font.heading,
    fontWeight: '800',
    color: tokens.colors.ink,
    letterSpacing: -0.3,
  },
  subTitle: {
    fontSize: tokens.font.caption,
    color: tokens.colors.textMuted,
    marginTop: 2,
  },
  keyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 4,
  },
  keyButtonText: {
    color: tokens.colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  filterTabsContainer: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: tokens.colors.surfaceHighlight,
  },
  filterChipActive: {
    backgroundColor: tokens.colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: tokens.colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: tokens.colors.textMuted,
  },
  emptyContainer: {
    marginHorizontal: tokens.spacing.md,
    marginVertical: tokens.spacing.md,
    padding: tokens.spacing.lg,
    backgroundColor: tokens.colors.surface,
    borderRadius: 20,
    alignItems: 'center',
    ...tokens.shadows.card,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: tokens.colors.ink,
    marginBottom: 6,
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyCta: {
    backgroundColor: tokens.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    ...tokens.shadows.buttonPrimary,
  },
  emptyCtaText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  spotlightWrapper: {
    paddingHorizontal: tokens.spacing.md,
    marginTop: 4,
    marginBottom: tokens.spacing.sm,
  },
  spotlightCard: {
    backgroundColor: tokens.colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    ...tokens.shadows.cardLift,
  },
  spotlightBanner: {
    height: 170,
    position: 'relative',
  },
  spotlightImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  spotlightBadgeWrap: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  bannerBottomInfo: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    right: 14,
  },
  bannerTripTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  datePill: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  datePillText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '500',
  },
  cardBody: {
    padding: tokens.spacing.md,
    gap: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  membersStack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  membersCountText: {
    fontSize: 12,
    fontWeight: '500',
    color: tokens.colors.textSecondary,
  },
  voteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: '45%',
  },
  voteBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: tokens.colors.primaryDark,
  },
  budgetModule: {
    backgroundColor: tokens.colors.surfaceHighlight,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  budgetRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  budgetLabelGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  budgetSpentLabel: {
    fontSize: 12,
    color: tokens.colors.textSecondary,
  },
  budgetSpentValue: {
    fontSize: 15,
    fontWeight: '700',
    color: tokens.colors.primary,
  },
  budgetPercentText: {
    fontSize: 12,
    fontWeight: '700',
    color: tokens.colors.primary,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: tokens.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: tokens.colors.primary,
    borderRadius: 4,
  },
  budgetRowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetSubText: {
    fontSize: 11,
    color: tokens.colors.textMuted,
  },
  budgetRemainingText: {
    fontSize: 11,
    fontWeight: '600',
    color: tokens.colors.aiCoPilot,
  },
  actionButtonsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  treasuryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: tokens.colors.surfaceHighlight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  treasuryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: tokens.colors.ink,
  },
  itineraryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: tokens.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadows.buttonPrimary,
  },
  itineraryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryCard: {
    marginHorizontal: tokens.spacing.md,
    marginBottom: 10,
    backgroundColor: tokens.colors.surface,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    ...tokens.shadows.card,
  },
  secondaryThumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  secondaryContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  secondaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  secondaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  secondaryDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  secondaryDate: {
    fontSize: 11,
    color: tokens.colors.textMuted,
  },
  secondaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  secondaryMembersRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryMembers: {
    fontSize: 11,
    color: tokens.colors.primary,
    fontWeight: '500',
  },
  secondaryDetailLink: {
    fontSize: 11,
    fontWeight: '700',
    color: tokens.colors.primary,
  },
  hubActionsContainer: {
    paddingHorizontal: tokens.spacing.md,
    marginTop: 12,
    gap: 10,
  },
  primaryCreateBtn: {
    height: 48,
    backgroundColor: tokens.colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadows.buttonPrimary,
  },
  primaryCreateBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  aiPlannerBtn: {
    height: 48,
    backgroundColor: tokens.colors.surface,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    ...tokens.shadows.card,
  },
  aiPlannerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: tokens.colors.aiCoPilot,
  },
  newBadge: {
    backgroundColor: tokens.colors.aiSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: tokens.colors.aiCoPilot,
  },
  invitePromptBox: {
    marginHorizontal: tokens.spacing.md,
    marginTop: 14,
    backgroundColor: tokens.colors.surfaceHighlight,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  invitePromptLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  inviteIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteTextWrapper: {
    flex: 1,
  },
  invitePromptTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  invitePromptDesc: {
    fontSize: 11,
    color: tokens.colors.textMuted,
    marginTop: 1,
  },
  inviteActionBtn: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  inviteActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: tokens.colors.primary,
  },
});
