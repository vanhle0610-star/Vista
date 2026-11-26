import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { TripBudgetScreen } from '@/features/budget';
import { tripApi, TripDto } from '@/services/api/tripApi';
import { authStorage } from '@/services/auth/authStorage';
import { resolveTripStatus } from '@/utils/tripStatus';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { tokens } from '@/theme/tokens';

/**
 * Lựa chọn chuyến đi mặc định hiển thị trên Sổ quỹ:
 * 1. Ưu tiên chuyến đang diễn ra (ACTIVE hoặc ONGOING).
 * 2. Nếu không có, ưu tiên chuyến đang lên kế hoạch (PLANNING).
 * 3. Nếu không có, chọn chuyến đầu tiên trong danh sách (fallback).
 * 4. Nếu danh sách rỗng, trả về null để hiển thị Empty State.
 */
export function pickDefaultTrip(
  trips: TripDto[],
  currentDate: Date = new Date()
): TripDto | null {
  if (!trips || trips.length === 0) {
    return null;
  }
  const activeTrip = trips.find(
    (t: TripDto) => resolveTripStatus(t.startDate, t.endDate, t.status, currentDate) === 'ACTIVE'
  );
  if (activeTrip) {
    return activeTrip;
  }
  const planningTrip = trips.find(
    (t: TripDto) => resolveTripStatus(t.startDate, t.endDate, t.status, currentDate) === 'PLANNING'
  );
  if (planningTrip) {
    return planningTrip;
  }
  return trips[0] || null;
}

export default function TreasuryRoute() {
  const { tripId: paramTripId } = useLocalSearchParams<{ tripId?: string }>();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<TripDto | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const token = await authStorage.getAccessToken();
    if (!token) {
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }
    setIsAuthenticated(true);
    try {
      const myTrips = await tripApi.fetchMyTrips();
      const matched = paramTripId ? myTrips.find((t) => t.id === paramTripId) : undefined;
      const chosen = matched || pickDefaultTrip(myTrips);
      setSelectedTrip(chosen);
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  }, [paramTripId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  if (isAuthenticated === false) {
    return <TripBudgetScreen />;
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={tokens.colors.primary} />
      </View>
    );
  }

  if (!selectedTrip) {
    return (
      <View style={styles.emptyContainer}>
        <AppText style={styles.emptyIcon}>👛</AppText>
        <AppText style={styles.emptyTitle}>Chưa có sổ quỹ nào</AppText>
        <AppText style={styles.emptyDesc}>
          Bạn chưa tham gia chuyến đi nào. Hãy bắt đầu bằng việc tạo chuyến đi để quản lý ngân sách và chia tiền nhóm minh bạch!
        </AppText>
        <View style={{ width: 220, marginTop: 16 }}>
          <AppButton
            label="+ Tạo chuyến đi mới"
            onPress={() => router.push('/trip/create')}
          />
        </View>
      </View>
    );
  }

  return (
    <TripBudgetScreen
      tripId={selectedTrip.id}
      budgetTotal={selectedTrip.budgetTotal || 0}
      tripTitle={selectedTrip.title}
      startDate={selectedTrip.startDate}
      endDate={selectedTrip.endDate}
      status={resolveTripStatus(selectedTrip.startDate, selectedTrip.endDate, selectedTrip.status)}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#faf8ff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#faf8ff',
  },
  emptyIcon: {
    fontSize: 54,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
});
