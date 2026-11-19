import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';

import { tokens } from '@/theme/tokens';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { ItineraryDay, ItineraryItem, ItineraryValidationWarning } from '../types';
import { itineraryApi } from '../api';
import { StopDetailModal } from '../components/StopDetailModal';
import { AddStopModal } from '../components/AddStopModal';
import { AddDayModal } from '../components/AddDayModal';
import { tripFeatureApi } from '@/features/trips/api';
import { Trip } from '@/features/trips/types';

// Format short date (DD/MM)
function formatShortDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

// Format time string (HH:mm)
function formatTime(timeStr?: string | null): string {
  if (!timeStr) return '';
  try {
    return timeStr.slice(0, 5);
  } catch {
    return timeStr;
  }
}

export function ItineraryScreen({ tripId }: { tripId: string }) {
  const insets = useSafeAreaInsets();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [warnings, setWarnings] = useState<ItineraryValidationWarning[]>([]);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  // Modals state
  const [selectedStop, setSelectedStop] = useState<ItineraryItem | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isAddStopModalVisible, setIsAddStopModalVisible] = useState(false);
  const [isAddDayModalVisible, setIsAddDayModalVisible] = useState(false);

  // Load all itinerary data and validation warnings
  const loadData = useCallback(async () => {
    try {
      setErrorStatus(null);
      const [tripData, daysData] = await Promise.all([
        tripFeatureApi.fetchTrip(tripId).catch(() => null),
        itineraryApi.fetchDays(tripId),
      ]);

      if (tripData) setTrip(tripData);
      setDays(daysData || []);

      // Validate itinerary warnings
      try {
        const valWarnings = await itineraryApi.validateItinerary(tripId);
        setWarnings(valWarnings || []);
      } catch {
        // Validation endpoint is non-blocking
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

  const activeDay = days.length > 0 ? days[Math.min(selectedDayIdx, days.length - 1)] : null;
  const activeStops = activeDay?.items || [];

  // Warnings for the currently active day
  const activeDayWarnings = warnings.filter(
    (w) => w.dayId === activeDay?.id || !w.dayId
  );

  // Analytics for the selected day (Chỉ số & Phân tích, Nhịp độ, Thời tiết)
  const analytics = useMemo(() => {
    const actCount = activeStops.length;
    let estCost = 0;
    let sightCost = 0;
    let foodCost = 0;
    let transportCost = 0;
    let otherCost = 0;

    activeStops.forEach((item) => {
      const name = (item.customStopName || '').toLowerCase();
      const note = (item.note || '').toLowerCase();
      const combined = `${name} ${note}`;
      let cost = 100000;

      if (combined.includes('cáp treo') || combined.includes('vé') || combined.includes('bà nà') || combined.includes('tham quan')) {
        cost = 350000;
        sightCost += cost;
      } else if (
        combined.includes('ăn') ||
        combined.includes('uống') ||
        combined.includes('buffet') ||
        combined.includes('chợ') ||
        combined.includes('ẩm thực') ||
        combined.includes('nhà hàng')
      ) {
        cost = 150000;
        foodCost += cost;
      } else if (
        combined.includes('xe') ||
        combined.includes('sân bay') ||
        combined.includes('di chuyển') ||
        combined.includes('taxi')
      ) {
        cost = 80000;
        transportCost += cost;
      } else {
        cost = 100000;
        sightCost += cost;
      }
      estCost += cost;
    });

    if (actCount === 0) {
      estCost = 260000;
      sightCost = 80000;
      foodCost = 120000;
      transportCost = 0;
      otherCost = 60000;
    }

    const totalCat = sightCost + foodCost + transportCost + otherCost || 1;
    const sightPct = Math.round((sightCost / totalCat) * 100);
    const foodPct = Math.round((foodCost / totalCat) * 100);
    const transportPct = Math.round((transportCost / totalCat) * 100);
    const otherPct = Math.max(0, 100 - sightPct - foodPct - transportPct);

    const distanceKm = Math.round((actCount * 3.6 + 1.2) * 10) / 10;
    const durationHours = Math.round((actCount * 1.5 + 0.5) * 10) / 10;
    const totalBudget = trip?.budgetTotal || 10000000;
    const percentOfBudget =
      totalBudget > 0 ? Math.min(100, Math.round((estCost / totalBudget) * 100)) : 2;

    return {
      actCount: actCount || 3,
      estCost,
      percentOfBudget,
      sightPct,
      foodPct,
      transportPct,
      otherPct,
      distanceKm: distanceKm || 12,
      durationHours: durationHours || 5,
    };
  }, [activeStops, trip?.budgetTotal]);

  // Reorder items (Move item up / down)
  const handleMoveStop = async (currentIndex: number, direction: 'UP' | 'DOWN') => {
    if (!activeDay || activeStops.length <= 1) return;
    const targetIndex = direction === 'UP' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= activeStops.length) return;

    const reordered = [...activeStops];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    // Optimistically update local state
    const updatedDays = [...days];
    const currentDayIdx = days.findIndex((d) => d.id === activeDay.id);
    if (currentDayIdx !== -1) {
      updatedDays[currentDayIdx] = {
        ...activeDay,
        items: reordered,
      };
      setDays(updatedDays);
    }

    try {
      const orderedItemIds = reordered.map((item) => item.id);
      await itineraryApi.reorderItems(activeDay.id, orderedItemIds);
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể đổi thứ tự điểm dừng.');
      loadData(); // Revert
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <View style={[styles.centerScreen, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={tokens.colors.primary} />
        <AppText style={styles.loadingText}>Đang tải lịch trình theo ngày...</AppText>
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
        <AppText style={styles.forbiddenTitle}>Bạn không có quyền xem lịch trình này</AppText>
        <AppButton
          label="Quay lại trang chủ"
          onPress={() => router.replace('/(tabs)/discover')}
          variant="primary"
          style={{ marginTop: tokens.spacing.lg }}
        />
      </View>
    );
  }

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
          <AppText style={styles.headerTitle}>Lịch trình chuyến đi</AppText>
          {trip?.title ? (
            <AppText style={styles.headerTripSubtitle} numberOfLines={1}>
              {trip.title}
            </AppText>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.mapHeaderBtn}
          onPress={() => router.push('/(tabs)/map' as any)}
          accessibilityLabel="Xem bản đồ"
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              stroke={tokens.colors.primary}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Horizontal Day Selector Tabs */}
      <View style={styles.dayTabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayTabsContainer}
        >
          {days.map((day, idx) => {
            const isActive = idx === selectedDayIdx;
            return (
              <TouchableOpacity
                key={day.id || idx}
                style={[styles.dayTabItem, isActive && styles.dayTabItemActive]}
                onPress={() => setSelectedDayIdx(idx)}
                activeOpacity={0.8}
              >
                <AppText style={[styles.dayTabTitle, isActive && styles.dayTabTitleActive]}>
                  Ngày {day.dayNumber}
                </AppText>
                <AppText style={[styles.dayTabDate, isActive && styles.dayTabDateActive]}>
                  {formatShortDate(day.tripDate)}
                </AppText>
              </TouchableOpacity>
            );
          })}

          {/* Add Day Button */}
          <TouchableOpacity
            style={styles.addDayTabBtn}
            onPress={() => setIsAddDayModalVisible(true)}
            activeOpacity={0.8}
            accessibilityLabel="Thêm ngày mới"
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 5v14M5 12h14"
                stroke={tokens.colors.primary}
                strokeWidth={2.2}
                strokeLinecap="round"
              />
            </Svg>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={[styles.mainScrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Day Header Info */}
        <View style={styles.dayInfoSection}>
          <View style={styles.dayInfoTextGroup}>
            <AppText style={styles.dayInfoHeadline}>
              {activeDay ? `Ngày ${activeDay.dayNumber}: Lộ trình khám phá` : 'Chưa có ngày lịch trình'}
            </AppText>
            <View style={styles.dayMetaRow}>
              <AppText style={styles.dayStopsCountText}>
                {activeStops.length} điểm dừng
              </AppText>
              {activeDay?.tripDate ? (
                <>
                  <AppText style={styles.metaDot}>•</AppText>
                  <AppText style={styles.dayDateFormatted}>{activeDay.tripDate}</AppText>
                </>
              ) : null}
            </View>
          </View>

          {/* Map Link Pill */}
          <TouchableOpacity
            style={styles.mapPillBtn}
            onPress={() => router.push('/(tabs)/map' as any)}
            activeOpacity={0.8}
          >
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                stroke={tokens.colors.aiTeal}
                strokeWidth={2}
              />
            </Svg>
            <AppText style={styles.mapPillText}>Bản đồ</AppText>
          </TouchableOpacity>
        </View>

        {/* Validation Warnings Card */}
        {activeDayWarnings.length > 0 ? (
          <View style={styles.warningsContainer}>
            {activeDayWarnings.map((warn, i) => (
              <View key={i} style={styles.warningItem}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                    stroke={tokens.colors.warning}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <AppText style={styles.warningMessageText}>{warn.message}</AppText>
              </View>
            ))}
          </View>
        ) : null}

        {/* ─── AI ITINERARY ANALYTICS & INSIGHTS (Đồng bộ với Web) ─── */}
        <View style={styles.insightsSection}>
          {/* Card 1: Chỉ số & Phân tích */}
          <View style={styles.analyticsCard}>
            <View style={styles.analyticsHeader}>
              <View style={styles.analyticsTitleRow}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M23 6l-9.5 9.5-5-5L1 18"
                    stroke={tokens.colors.primary}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M17 6h6v6"
                    stroke={tokens.colors.primary}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <AppText style={styles.analyticsCardTitle}>Chỉ số & Phân tích</AppText>
              </View>
              <View style={styles.dayIndicatorPill}>
                <AppText style={styles.dayIndicatorPillText}>
                  Ngày {activeDay?.dayNumber || 1}
                </AppText>
              </View>
            </View>

            <AppText style={styles.analyticsBigCost}>
              {analytics.estCost.toLocaleString('vi-VN')}đ
            </AppText>
            <AppText style={styles.analyticsCostSub}>
              Chi phí dự kiến ({analytics.percentOfBudget}% tổng ngân sách)
            </AppText>

            {/* Segmented Progress Bar */}
            <View style={styles.categoryProgressBar}>
              <View
                style={[
                  styles.catProgressSeg,
                  { width: `${analytics.sightPct}%`, backgroundColor: '#6366F1' },
                ]}
              />
              <View
                style={[
                  styles.catProgressSeg,
                  { width: `${analytics.foodPct}%`, backgroundColor: '#F59E0B' },
                ]}
              />
              <View
                style={[
                  styles.catProgressSeg,
                  { width: `${analytics.transportPct}%`, backgroundColor: '#10B981' },
                ]}
              />
              {analytics.otherPct > 0 ? (
                <View
                  style={[
                    styles.catProgressSeg,
                    { width: `${analytics.otherPct}%`, backgroundColor: '#0284C7' },
                  ]}
                />
              ) : null}
            </View>

            {/* Category Legend Grid */}
            <View style={styles.categoryLegendGrid}>
              <View style={styles.catLegendItem}>
                <View style={[styles.catLegendDot, { backgroundColor: '#6366F1' }]} />
                <AppText style={styles.catLegendText}>
                  Vé tham quan: {analytics.sightPct}%
                </AppText>
              </View>
              <View style={styles.catLegendItem}>
                <View style={[styles.catLegendDot, { backgroundColor: '#F59E0B' }]} />
                <AppText style={styles.catLegendText}>
                  Ẩm thực: {analytics.foodPct}%
                </AppText>
              </View>
              <View style={styles.catLegendItem}>
                <View style={[styles.catLegendDot, { backgroundColor: '#10B981' }]} />
                <AppText style={styles.catLegendText}>
                  Di chuyển: {analytics.transportPct}%
                </AppText>
              </View>
              <View style={styles.catLegendItem}>
                <View style={[styles.catLegendDot, { backgroundColor: '#0284C7' }]} />
                <AppText style={styles.catLegendText}>
                  Dịch vụ khác: {analytics.otherPct}%
                </AppText>
              </View>
            </View>
          </View>

          {/* Card 2: Nhịp độ hành trình */}
          <View style={styles.analyticsCard}>
            <View style={styles.analyticsHeader}>
              <View style={styles.analyticsTitleRow}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Circle cx={12} cy={12} r={10} stroke="#0EA5E9" strokeWidth={2} />
                  <Path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" stroke="#0EA5E9" strokeWidth={2} />
                </Svg>
                <AppText style={styles.analyticsCardTitle}>Nhịp độ hành trình</AppText>
              </View>
            </View>

            {/* 3 Pace Pills */}
            <View style={styles.pacePillsRow}>
              <View style={[styles.pacePill, { backgroundColor: '#EEF2FF', borderColor: '#E0E7FF' }]}>
                <AppText style={[styles.pacePillVal, { color: '#4F46E5' }]}>
                  {analytics.actCount}
                </AppText>
                <AppText style={styles.pacePillLabel}>Điểm đến</AppText>
              </View>
              <View style={[styles.pacePill, { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' }]}>
                <AppText style={[styles.pacePillVal, { color: '#059669' }]}>
                  ~{analytics.distanceKm} km
                </AppText>
                <AppText style={styles.pacePillLabel}>Di chuyển</AppText>
              </View>
              <View style={[styles.pacePill, { backgroundColor: '#FFFBEB', borderColor: '#FEF3C7' }]}>
                <AppText style={[styles.pacePillVal, { color: '#D97706' }]}>
                  ~{analytics.durationHours}h
                </AppText>
                <AppText style={styles.pacePillLabel}>Thời lượng</AppText>
              </View>
            </View>

            {/* Pace Verdict */}
            <View style={styles.paceVerdict}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Circle cx={12} cy={12} r={10} stroke="#059669" strokeWidth={2} />
                <Path d="M9 12l2 2 4-4" stroke="#059669" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <AppText style={styles.paceVerdictText}>
                Nhịp độ cân bằng • Không quá tải
              </AppText>
            </View>
          </View>

          {/* Card 3: Thời điểm vàng & Thời tiết */}
          <View style={styles.analyticsCard}>
            <View style={styles.analyticsHeader}>
              <View style={styles.analyticsTitleRow}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Circle cx={12} cy={12} r={5} stroke="#F59E0B" strokeWidth={2} />
                  <Path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="#F59E0B" strokeWidth={2} strokeLinecap="round" />
                </Svg>
                <AppText style={styles.analyticsCardTitle}>Thời điểm vàng & Thời tiết</AppText>
              </View>
            </View>

            <View style={styles.goldenHourList}>
              {/* Highlight 1: Ảnh đẹp */}
              <View style={styles.goldenHourItem}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="#D97706" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  <Circle cx={12} cy={13} r={4} stroke="#D97706" strokeWidth={2} />
                </Svg>
                <View style={styles.goldenHourTextCol}>
                  <AppText style={styles.goldenHourTitle}>
                    Khung giờ ảnh đẹp (06:30 - 08:00 & 17:00 - 18:30)
                  </AppText>
                  <AppText style={styles.goldenHourDesc}>
                    Ánh sáng sớm mai và hoàng hôn mang lại góc chụp lung linh nhất cho các điểm di tích & phố cổ.
                  </AppText>
                </View>
              </View>

              {/* Highlight 2: Thời tiết */}
              <View style={[styles.goldenHourItem, { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' }]}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Circle cx={12} cy={12} r={5} stroke="#059669" strokeWidth={2} />
                  <Path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="#059669" strokeWidth={2} />
                </Svg>
                <View style={styles.goldenHourTextCol}>
                  <AppText style={[styles.goldenHourTitle, { color: '#065F46' }]}>
                    Thời tiết thuận lợi (24°C - 28°C)
                  </AppText>
                  <AppText style={[styles.goldenHourDesc, { color: '#047857' }]}>
                    Trời khô ráo thoáng đãng, gió nhẹ, lý tưởng cho trải nghiệm ngoài trời.
                  </AppText>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Timeline / Stops Section */}
        {activeStops.length === 0 ? (
          <View style={styles.emptyStopsContainer}>
            <View style={styles.emptyIconBg}>
              <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 2a8 8 0 00-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 00-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z"
                  stroke={tokens.colors.primary}
                  strokeWidth={2}
                />
              </Svg>
            </View>
            <AppText style={styles.emptyTitle}>Chưa có điểm dừng nào</AppText>
            <AppText style={styles.emptySub}>
              Hãy thêm các địa điểm tham quan, ẩm thực hoặc nghỉ ngơi để hoàn thiện ngày này.
            </AppText>
            <AppButton
              label="+ Thêm điểm dừng đầu tiên"
              onPress={() => setIsAddStopModalVisible(true)}
              variant="primary"
              style={{ marginTop: tokens.spacing.md }}
            />
          </View>
        ) : (
          <View style={styles.timelineWrapper}>
            {/* Continuous Vertical Rail Line */}
            <View style={styles.verticalRail} />

            {/* List of stops */}
            {activeStops.map((item, idx) => {
              const startTimeFormatted = formatTime(item.startTime);
              const endTimeFormatted = formatTime(item.endTime);
              const timeDisplay =
                startTimeFormatted && endTimeFormatted
                  ? `${startTimeFormatted} - ${endTimeFormatted}`
                  : startTimeFormatted || 'Linh hoạt';

              return (
                <View key={item.id} style={styles.timelineRow}>
                  {/* Numbered Node Badge */}
                  <View style={styles.nodeBadge}>
                    <AppText style={styles.nodeBadgeText}>{idx + 1}</AppText>
                  </View>

                  {/* Stop Card */}
                  <TouchableOpacity
                    style={styles.stopCard}
                    activeOpacity={0.88}
                    onPress={() => {
                      setSelectedStop(item);
                      setIsDetailModalVisible(true);
                    }}
                  >
                    <View style={styles.stopCardHeader}>
                      <View style={styles.timeTag}>
                        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                          <Circle cx={12} cy={12} r={9} stroke={tokens.colors.primary} strokeWidth={2} />
                          <Path d="M12 7v5l3 2" stroke={tokens.colors.primary} strokeWidth={2} strokeLinecap="round" />
                        </Svg>
                        <AppText style={styles.timeTagText}>{timeDisplay}</AppText>
                      </View>

                      {/* Reorder Buttons */}
                      <View style={styles.reorderBtns}>
                        {idx > 0 && (
                          <TouchableOpacity
                            style={styles.arrowBtn}
                            onPress={() => handleMoveStop(idx, 'UP')}
                            accessibilityLabel="Di chuyển lên"
                          >
                            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                              <Path d="M18 15l-6-6-6 6" stroke={tokens.colors.textMuted} strokeWidth={2.2} strokeLinecap="round" />
                            </Svg>
                          </TouchableOpacity>
                        )}
                        {idx < activeStops.length - 1 && (
                          <TouchableOpacity
                            style={styles.arrowBtn}
                            onPress={() => handleMoveStop(idx, 'DOWN')}
                            accessibilityLabel="Di chuyển xuống"
                          >
                            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                              <Path d="M6 9l6 6 6-6" stroke={tokens.colors.textMuted} strokeWidth={2.2} strokeLinecap="round" />
                            </Svg>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    <AppText style={styles.stopTitle} numberOfLines={2}>
                      {item.customStopName || 'Điểm dừng'}
                    </AppText>

                    {item.note ? (
                      <AppText style={styles.stopNote} numberOfLines={2}>
                        📝 {item.note}
                      </AppText>
                    ) : null}

                    <View style={styles.stopCardFooter}>
                      <AppText style={styles.stopActionHint}>Chi tiết & chỉnh sửa →</AppText>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      {activeDay ? (
        <View style={[styles.fabContainer, { bottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={styles.fabBtn}
            onPress={() => setIsAddStopModalVisible(true)}
            activeOpacity={0.9}
          >
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path d="M12 5v14M5 12h14" stroke={tokens.colors.surface} strokeWidth={2.5} strokeLinecap="round" />
            </Svg>
            <AppText style={styles.fabText}>Thêm điểm dừng</AppText>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Modals */}
      <StopDetailModal
        visible={isDetailModalVisible}
        item={selectedStop}
        dayNumber={activeDay?.dayNumber || 1}
        tripDate={activeDay?.tripDate}
        onClose={() => {
          setIsDetailModalVisible(false);
          setSelectedStop(null);
        }}
        onSuccess={loadData}
      />

      {activeDay ? (
        <AddStopModal
          visible={isAddStopModalVisible}
          dayId={activeDay.id}
          dayNumber={activeDay.dayNumber}
          currentStopsCount={activeStops.length}
          onClose={() => setIsAddStopModalVisible(false)}
          onSuccess={loadData}
        />
      ) : null}

      <AddDayModal
        visible={isAddDayModalVisible}
        tripId={tripId}
        nextDayNumber={days.length + 1}
        onClose={() => setIsAddDayModalVisible(false)}
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
  mapHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: tokens.colors.primarySoft,
  },

  // Day Tabs
  dayTabsWrapper: {
    backgroundColor: tokens.colors.surface,
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  dayTabsContainer: {
    paddingHorizontal: tokens.spacing.lg,
    gap: tokens.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayTabItem: {
    minWidth: 76,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTabItemActive: {
    backgroundColor: tokens.colors.primary,
    shadowColor: tokens.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  dayTabTitle: {
    fontSize: tokens.font.caption,
    fontWeight: '700',
    color: tokens.colors.ink,
    lineHeight: 18,
  },
  dayTabTitleActive: {
    color: tokens.colors.surface,
  },
  dayTabDate: {
    fontSize: tokens.font.micro,
    fontWeight: '500',
    color: tokens.colors.textMuted,
    lineHeight: 14,
    marginTop: 2,
  },
  dayTabDateActive: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  addDayTabBtn: {
    width: 44,
    height: 48,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },

  // Main Content
  mainScrollContent: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.md,
  },
  dayInfoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokens.spacing.md,
  },
  dayInfoTextGroup: {
    flex: 1,
  },
  dayInfoHeadline: {
    fontSize: tokens.font.heading,
    fontWeight: '800',
    color: tokens.colors.ink,
    lineHeight: 24,
  },
  dayMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  dayStopsCountText: {
    fontSize: tokens.font.caption,
    fontWeight: '600',
    color: tokens.colors.textMuted,
    lineHeight: 16,
  },
  metaDot: {
    color: tokens.colors.textDisabled,
  },
  dayDateFormatted: {
    fontSize: tokens.font.caption,
    color: tokens.colors.textMuted,
    lineHeight: 16,
  },
  mapPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: tokens.colors.aiSoft,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
  },
  mapPillText: {
    fontSize: tokens.font.caption,
    fontWeight: '700',
    color: tokens.colors.aiTeal,
    lineHeight: 16,
  },

  // Validation Warnings
  warningsContainer: {
    marginBottom: tokens.spacing.md,
    gap: tokens.spacing.xs,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    backgroundColor: tokens.colors.warningSoft,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  warningMessageText: {
    flex: 1,
    fontSize: tokens.font.caption,
    fontWeight: '600',
    color: tokens.colors.warning,
    lineHeight: 18,
  },

  // ─── AI ITINERARY ANALYTICS (Đồng bộ với Web) ───
  insightsSection: {
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.lg,
  },
  analyticsCard: {
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
  },
  analyticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.xs,
  },
  analyticsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  analyticsCardTitle: {
    fontSize: tokens.font.body,
    fontWeight: '700',
    color: tokens.colors.ink,
    lineHeight: 20,
  },
  dayIndicatorPill: {
    backgroundColor: tokens.colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
  },
  dayIndicatorPillText: {
    fontSize: tokens.font.micro,
    fontWeight: '700',
    color: tokens.colors.primary,
    lineHeight: 14,
  },
  analyticsBigCost: {
    fontSize: tokens.font.display,
    fontWeight: '800',
    color: tokens.colors.ink,
    lineHeight: 30,
    marginTop: 4,
  },
  analyticsCostSub: {
    fontSize: tokens.font.caption,
    color: tokens.colors.textMuted,
    lineHeight: 16,
    marginTop: 2,
    marginBottom: tokens.spacing.sm,
  },
  categoryProgressBar: {
    height: 8,
    width: '100%',
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.border,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: tokens.spacing.sm,
  },
  catProgressSeg: {
    height: '100%',
  },
  categoryLegendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
    paddingTop: 4,
  },
  catLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '46%',
  },
  catLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  catLegendText: {
    fontSize: tokens.font.micro,
    color: tokens.colors.textSecondary,
    lineHeight: 14,
  },

  // Pace Section
  pacePillsRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    marginVertical: tokens.spacing.sm,
  },
  pacePill: {
    flex: 1,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.xs,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pacePillVal: {
    fontSize: tokens.font.subtitle,
    fontWeight: '800',
    lineHeight: 22,
  },
  pacePillLabel: {
    fontSize: tokens.font.micro,
    color: tokens.colors.textMuted,
    lineHeight: 14,
    marginTop: 2,
  },
  paceVerdict: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 6,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    marginTop: 2,
  },
  paceVerdictText: {
    fontSize: tokens.font.caption,
    fontWeight: '600',
    color: '#059669',
    lineHeight: 16,
  },

  // Golden Hour / Weather
  goldenHourList: {
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
  },
  goldenHourItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing.sm,
    backgroundColor: '#FFFBEB',
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  goldenHourTextCol: {
    flex: 1,
  },
  goldenHourTitle: {
    fontSize: tokens.font.caption,
    fontWeight: '700',
    color: '#92400E',
    lineHeight: 18,
  },
  goldenHourDesc: {
    fontSize: tokens.font.micro,
    color: '#B45309',
    lineHeight: 15,
    marginTop: 2,
  },

  // Timeline
  timelineWrapper: {
    position: 'relative',
    paddingLeft: 42,
    gap: tokens.spacing.md,
    marginTop: tokens.spacing.xs,
  },
  verticalRail: {
    position: 'absolute',
    left: 17,
    top: 16,
    bottom: 24,
    width: 2,
    backgroundColor: tokens.colors.border,
  },
  timelineRow: {
    position: 'relative',
  },
  nodeBadge: {
    position: 'absolute',
    left: -42,
    top: 14,
    width: 34,
    height: 34,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: tokens.colors.canvas,
    zIndex: 10,
    shadowColor: tokens.colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  nodeBadgeText: {
    fontSize: tokens.font.body,
    fontWeight: '800',
    color: tokens.colors.surface,
    lineHeight: 18,
  },
  stopCard: {
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
  },
  stopCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.xs,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: tokens.colors.primarySoft,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 3,
    borderRadius: tokens.radius.full,
  },
  timeTagText: {
    fontSize: tokens.font.micro,
    fontWeight: '700',
    color: tokens.colors.primary,
    lineHeight: 14,
  },
  reorderBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  arrowBtn: {
    width: 28,
    height: 28,
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopTitle: {
    fontSize: tokens.font.subtitle,
    fontWeight: '700',
    color: tokens.colors.ink,
    lineHeight: 22,
    marginVertical: 4,
  },
  stopNote: {
    fontSize: tokens.font.caption,
    color: tokens.colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  stopCardFooter: {
    marginTop: tokens.spacing.sm,
    alignItems: 'flex-end',
  },
  stopActionHint: {
    fontSize: tokens.font.micro,
    fontWeight: '700',
    color: tokens.colors.primary,
    lineHeight: 14,
  },

  // Empty State
  emptyStopsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.xl,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    marginTop: tokens.spacing.md,
  },
  emptyIconBg: {
    width: 68,
    height: 68,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  emptyTitle: {
    fontSize: tokens.font.heading,
    fontWeight: '700',
    color: tokens.colors.ink,
    lineHeight: 24,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: tokens.font.body,
    color: tokens.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },

  // FAB
  fabContainer: {
    position: 'absolute',
    right: tokens.spacing.lg,
  },
  fabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    backgroundColor: tokens.colors.primary,
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.lg,
    borderRadius: tokens.radius.full,
    shadowColor: tokens.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  fabText: {
    fontSize: tokens.font.body,
    fontWeight: '700',
    color: tokens.colors.surface,
    lineHeight: 20,
  },
});
