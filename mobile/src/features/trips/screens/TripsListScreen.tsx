import React, { useCallback, useState } from 'react';
import {
  View,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { tokens } from '@/theme/tokens';
import { tripApi, TripItem } from '../services/tripApi';

export function TripsListScreen() {
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    try {
      setError(null);
      const data = await tripApi.getMyTrips();
      setTrips(data);
    } catch {
      setError('Không thể tải danh sách chuyến đi. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTrips();
    }, [fetchTrips])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrips();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <AppText style={styles.headerTitle}>Chuyến đi của tôi</AppText>
          <AppText style={styles.headerSubtitle}>
            Quản lý và đồng hành cùng nhóm bạn
          </AppText>
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/trip/create')}
        >
          <AppText style={styles.createButtonText}>+ Tạo mới</AppText>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={tokens.colors.primary} />
          <AppText style={styles.loadingText}>Đang tải danh sách chuyến đi...</AppText>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <AppText style={styles.errorText}>{error}</AppText>
          <AppButton label="Thử lại" onPress={fetchTrips} variant="secondary" />
        </View>
      ) : trips.length === 0 ? (
        <View style={styles.centerContainer}>
          <AppText style={styles.emptyTitle}>Chưa có chuyến đi nào</AppText>
          <AppText style={styles.emptySubtitle}>
            Hãy bắt đầu lên kế hoạch cho chuyến đi đầu tiên của bạn tại Việt Nam!
          </AppText>
          <View style={{ width: 200, marginTop: tokens.spacing.md }}>
            <AppButton
              label="Tạo chuyến đi"
              onPress={() => router.push('/trip/create')}
            />
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {trips.map((item) => {
            const isOwner = item.role === 'OWNER';
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                onPress={() => router.push(`/trip/${item.id}`)}
              >
                <AppCard style={styles.card}>
                  <View style={styles.cardHeader}>
                    <AppText style={styles.tripTitle} numberOfLines={1}>
                      {item.title}
                    </AppText>
                    <View
                      style={[
                        styles.badge,
                        isOwner ? styles.ownerBadge : styles.memberBadge,
                      ]}
                    >
                      <AppText
                        style={[
                          styles.badgeText,
                          isOwner ? styles.ownerBadgeText : styles.memberBadgeText,
                        ]}
                      >
                        {isOwner ? 'Chủ sở hữu' : 'Thành viên'}
                      </AppText>
                    </View>
                  </View>

                  {item.destinationSummary ? (
                    <AppText style={styles.destination} numberOfLines={2}>
                      📍 {item.destinationSummary}
                    </AppText>
                  ) : null}

                  <View style={styles.cardFooter}>
                    <AppText style={styles.dateText}>
                      📅 {item.startDate} → {item.endDate}
                    </AppText>
                    {item.budgetTotal != null ? (
                      <AppText style={styles.budgetText}>
                        💰 {Number(item.budgetTotal).toLocaleString()} {item.currency}
                      </AppText>
                    ) : null}
                  </View>
                </AppCard>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.canvas,
  },
  header: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: tokens.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  headerTitle: {
    fontSize: tokens.font.heading,
    fontWeight: '800',
    color: tokens.colors.ink,
  },
  headerSubtitle: {
    fontSize: tokens.font.small,
    color: tokens.colors.muted,
    marginTop: 2,
  },
  createButton: {
    backgroundColor: tokens.colors.primary,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: tokens.font.small,
  },
  listContent: {
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  card: {
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.xs,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: tokens.colors.ink,
    flex: 1,
    marginRight: tokens.spacing.sm,
  },
  badge: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 3,
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
  destination: {
    color: tokens.colors.ink,
    fontSize: tokens.font.small,
    marginBottom: tokens.spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: tokens.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  dateText: {
    fontSize: tokens.font.small,
    color: tokens.colors.muted,
  },
  budgetText: {
    fontSize: tokens.font.small,
    color: tokens.colors.primaryDark,
    fontWeight: '700',
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
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  emptySubtitle: {
    fontSize: tokens.font.body,
    color: tokens.colors.muted,
    textAlign: 'center',
  },
  errorText: {
    color: tokens.colors.danger,
    fontSize: tokens.font.body,
    textAlign: 'center',
  },
});

