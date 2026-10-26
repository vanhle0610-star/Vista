import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { api, apiErrorMessage } from '../../services/api/client';
import { LoadingState, ErrorState } from '../../components/feedback/States';
import { useFavorites, useDestinationHistory } from '../../features/favorites';
import { AppButton } from '@/components/ui/AppButton';
import { validCoordinate } from '@/features/map/types';

export interface DestinationDetail {
  id: string;
  name: string;
  province: string;
  category: string;
  imageUrl?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  status: string;
  description?: string | null;
  openingHours?: Record<string, string> | null;
  sourceUrl?: string | null;
  verifiedAt?: string | null;
  isFavorite?: boolean;
}

const DAY_LABELS: Record<string, string> = {
  mon: 'Thứ Hai',
  tue: 'Thứ Ba',
  wed: 'Thứ Tư',
  thu: 'Thứ Năm',
  fri: 'Thứ Sáu',
  sat: 'Thứ Bảy',
  sun: 'Chủ Nhật',
};

export default function DestinationDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { recordView } = useDestinationHistory();
  const recordedRef = React.useRef(false);

  const { data, isPending, isError, error, refetch } = useQuery<DestinationDetail>({
    queryKey: ['destination', id],
    queryFn: async () => {
      if (!id) throw new Error('Thiếu mã địa điểm du lịch');
      const res = await api.get<DestinationDetail>(`/destinations/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });

  const isFav = data ? isFavorite(data.id) || Boolean(data.isFavorite) : false;

  React.useEffect(() => {
    if (data && !recordedRef.current) {
      recordedRef.current = true;
      recordView({
        id: data.id,
        name: data.name,
        province: data.province,
        category: data.category,
        imageUrl: data.imageUrl,
        priceMin: data.priceMin,
        priceMax: data.priceMax,
        latitude: data.latitude,
        longitude: data.longitude,
        status: data.status,
      });
    }
  }, [data, recordView]);

  const handleToggleFavorite = async () => {
    if (!data) return;
    await toggleFavorite({
      id: data.id,
      name: data.name,
      province: data.province,
      category: data.category,
      imageUrl: data.imageUrl,
      priceMin: data.priceMin,
      priceMax: data.priceMax,
      latitude: data.latitude,
      longitude: data.longitude,
      status: data.status,
    });
  };

  const formatPrice = (min?: number | null, max?: number | null) => {
    if (min === null || min === undefined || max === null || max === undefined) {
      return 'Chưa có thông tin giá vé';
    }
    if (min === 0 && max === 0) {
      return 'Miễn phí vào cổng';
    }
    if (min === max) {
      return `${min.toLocaleString('vi-VN')} đ`;
    }
    return `${min.toLocaleString('vi-VN')} đ – ${max.toLocaleString('vi-VN')} đ`;
  };

  const formatHours = (hoursVal?: string | null) => {
    if (!hoursVal) return 'Chưa rõ';
    if (hoursVal === 'closed') return 'Đóng cửa';
    if (hoursVal === '00:00-23:59') return 'Mở cửa 24/7';
    return hoursVal.replace('-', ' – ');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Thanh điều hướng trên cùng */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M 19 12 H 5 M 12 19 L 5 12 L 12 5"
              stroke="#0f172a"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.favBtn, isFav && styles.favBtnActive]}
          onPress={handleToggleFavorite}
          activeOpacity={0.7}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill={isFav ? '#ef4444' : 'none'}>
            <Path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              stroke={isFav ? '#ef4444' : '#64748b'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Nội dung chi tiết */}
      {isPending ? (
        <View style={styles.centerContainer}>
          <LoadingState label="Đang tải thông tin điểm đến..." />
        </View>
      ) : isError && !data ? (
        <View style={styles.centerContainer}>
          <ErrorState
            message={apiErrorMessage(error)}
            onRetry={() => refetch()}
          />
        </View>
      ) : !data ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Không tìm thấy thông tin địa điểm.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {validCoordinate(data) ? <View style={{ padding: 16, gap: 10 }}>
            <AppButton label="Xem trên bản đồ" onPress={() => router.push({ pathname: '/(tabs)/map', params: { destinationId: data.id } })} />
            <AppButton label="Chỉ đường" variant="secondary" onPress={() => router.push({ pathname: '/(tabs)/map', params: { destinationId: data.id, directions: '1' } })} />
          </View> : <Text style={{ padding: 16, color: '#64748b' }}>Địa điểm chưa có tọa độ hợp lệ để mở bản đồ hoặc tính tuyến.</Text>}
          {/* Ảnh lớn */}
          <View style={styles.heroImageBox}>
            {data.imageUrl ? (
              <Image
                source={{
                  uri: data.imageUrl.startsWith('http')
                    ? data.imageUrl
                    : 'https://images.unsplash.com/photo-1528127269322-539801943592?w=1000&q=80',
                }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.heroPlaceholder}>
                <Text style={styles.placeholderEmoji}>🏞️</Text>
              </View>
            )}
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>ĐÃ XÁC MINH</Text>
            </View>
          </View>

          {/* Tiêu đề & Địa danh */}
          <View style={styles.mainInfoCard}>
            <View style={styles.tagsRow}>
              <View style={styles.tagBadge}>
                <Text style={styles.tagBadgeText}>📍 {data.province}</Text>
              </View>
              <View style={[styles.tagBadge, { backgroundColor: '#fef3c7' }]}>
                <Text style={[styles.tagBadgeText, { color: '#b45309' }]}>🏷️ {data.category}</Text>
              </View>
            </View>

            <Text style={styles.destinationHeading}>{data.name}</Text>

            {/* Khối giá vé */}
            <View style={styles.priceHighlightBox}>
              <Text style={styles.priceHighlightLabel}>Giá vé tham khảo:</Text>
              <Text style={styles.priceHighlightValue}>
                {formatPrice(data.priceMin, data.priceMax)}
              </Text>
            </View>
          </View>

          {/* Mô tả */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Giới thiệu địa danh</Text>
            <Text style={styles.descriptionText}>
              {data.description || 'Chưa có thông tin mô tả chi tiết cho địa điểm này.'}
            </Text>
          </View>

          {/* Giờ mở cửa dạng cấu trúc 7 ngày */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Giờ mở cửa trong tuần</Text>
            {data.openingHours && Object.keys(data.openingHours).length > 0 ? (
              <View style={styles.hoursTable}>
                {Object.entries(DAY_LABELS).map(([key, label]) => {
                  const hours = data.openingHours ? data.openingHours[key] : null;
                  const isClosed = hours === 'closed';
                  return (
                    <View key={key} style={styles.hourRow}>
                      <Text style={styles.dayLabel}>{label}</Text>
                      <Text style={[styles.hoursValue, isClosed && styles.hoursClosed]}>
                        {formatHours(hours)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.emptyHoursText}>Chưa có thông tin lịch mở cửa chi tiết.</Text>
            )}
          </View>

          {/* Nguồn thông tin & Xác minh */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Nguồn dữ liệu & Kiểm chứng</Text>
            {data.sourceUrl ? (
              <TouchableOpacity
                style={styles.sourceLinkBox}
                onPress={() => Linking.openURL(data.sourceUrl!)}
                activeOpacity={0.8}
              >
                <Text style={styles.sourceLinkLabel} numberOfLines={1}>
                  🔗 Website chính thức: {data.sourceUrl}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.metaMuted}>Chưa có liên kết nguồn xác minh.</Text>
            )}
            {data.verifiedAt && (
              <Text style={styles.verifiedAtText}>
                Thời điểm kiểm chứng: {new Date(data.verifiedAt).toLocaleDateString('vi-VN')}
              </Text>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBtnActive: {
    backgroundColor: '#fee2e2',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    maxWidth: '70%',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  heroImageBox: {
    height: 240,
    width: '100%',
    backgroundColor: '#cbd5e1',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#bae6fd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 64,
  },
  statusBadge: {
    position: 'absolute',
    bottom: 12,
    right: 14,
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  mainInfoCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tagBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  destinationHeading: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: 28,
  },
  priceHighlightBox: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  priceHighlightLabel: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '600',
  },
  priceHighlightValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#15803d',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginTop: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  descriptionText: {
    fontSize: 14.5,
    lineHeight: 22,
    color: '#334155',
  },
  hoursTable: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  dayLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#475569',
  },
  hoursValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  hoursClosed: {
    color: '#ef4444',
  },
  emptyHoursText: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  sourceLinkBox: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
  },
  sourceLinkLabel: {
    fontSize: 13,
    color: '#0284c7',
    fontWeight: '600',
  },
  metaMuted: {
    fontSize: 13,
    color: '#94a3b8',
  },
  verifiedAtText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
});
