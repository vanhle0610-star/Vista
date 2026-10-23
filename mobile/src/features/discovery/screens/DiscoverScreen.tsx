import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { AppText } from '../../../components/ui/AppText';
import { ErrorState, LoadingState, EmptyState } from '../../../components/feedback/States';
import { api, apiErrorMessage } from '../../../services/api/client';
import { tokens } from '../../../theme/tokens';
import { useFavorites } from '../../favorites';

export interface DestinationSummary {
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
}

export interface DestinationPage {
  items: DestinationSummary[];
  page: number;
  size: number;
  total: number;
}

const PROVINCE_FILTERS = [
  'Tất cả',
  'Hà Nội',
  'Đà Nẵng',
  'Hồ Chí Minh',
  'Thừa Thiên Huế',
  'Quảng Nam',
  'Quảng Ninh',
  'Ninh Bình',
  'Hải Phòng',
  'Cần Thơ',
  'Lâm Đồng',
];

export function DiscoverScreen() {
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('Tất cả');
  const { isFavorite, toggleFavorite } = useFavorites();

  const { data, isPending, isError, error, refetch } = useQuery<DestinationPage>({
    queryKey: ['destinations', keyword, selectedProvince],
    queryFn: async () => {
      const params: Record<string, string | number> = { size: 50 };
      if (keyword.trim()) {
        params.keyword = keyword.trim();
      }
      if (selectedProvince !== 'Tất cả') {
        params.province = selectedProvince;
      }

      const res = await api.get<DestinationPage>('/destinations', { params });
      return res.data;
    },
  });

  const handleSearchSubmit = () => {
    setKeyword(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setKeyword('');
  };

  const formatPrice = (min?: number | null, max?: number | null) => {
    if (min === null || min === undefined || max === null || max === undefined) {
      return 'Chưa có thông tin giá vé';
    }
    if (min === 0 && max === 0) {
      return 'Miễn phí vé vào cổng';
    }
    if (min === max) {
      return `${min.toLocaleString('vi-VN')} đ`;
    }
    return `${min.toLocaleString('vi-VN')} đ – ${max.toLocaleString('vi-VN')} đ`;
  };

  return (
    <ScreenContainer>
      {/* 1. Header Tiêu đề */}
      <View style={styles.headerBox}>
        <View style={styles.badgeRow}>
          <Text style={styles.badgeText}>VIETNAM SMART TRAVEL</Text>
        </View>
        <AppText style={styles.mainTitle}>Khám phá Việt Nam</AppText>
        <AppText style={styles.subTitle}>
          Tìm kiếm địa danh nổi tiếng, di tích lịch sử và danh lam thắng cảnh trên khắp mọi miền đất nước.
        </AppText>
      </View>

      {/* 2. Thanh tìm kiếm */}
      <View style={styles.searchBarContainer}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" style={styles.searchIcon}>
          <Path
            d="M 21 21 L 16.65 16.65 M 19 11 A 8 8 0 1 1 3 11 A 8 8 0 0 1 19 11 Z"
            stroke="#64748b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm tên địa điểm, di tích, bãi biển..."
          placeholderTextColor="#94a3b8"
          value={searchInput}
          onChangeText={setSearchInput}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
        />
        {searchInput.length > 0 && (
          <TouchableOpacity onPress={handleClearSearch} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearchSubmit}>
          <Text style={styles.searchBtnText}>Tìm</Text>
        </TouchableOpacity>
      </View>

      {/* 3. Bộ lọc Tỉnh/Thành */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsRow}
        >
          {PROVINCE_FILTERS.map((prov) => {
            const isSelected = selectedProvince === prov;
            return (
              <TouchableOpacity
                key={prov}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setSelectedProvince(prov)}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {prov}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 4. Nội dung danh sách */}
      <View style={styles.listSection}>
        {isPending ? (
          <View style={styles.feedbackContainer}>
            <LoadingState label="Đang tải danh sách địa điểm..." />
          </View>
        ) : isError ? (
          <View style={styles.feedbackContainer}>
            <ErrorState
              message={apiErrorMessage(error)}
              onRetry={() => refetch()}
            />
          </View>
        ) : !data || data.items.length === 0 ? (
          <View style={styles.feedbackContainer}>
            <EmptyState message="Không tìm thấy điểm đến nào phù hợp với bộ lọc hiện tại." />
            {(keyword || selectedProvince !== 'Tất cả') && (
              <TouchableOpacity
                style={styles.resetFilterBtn}
                onPress={() => {
                  setSearchInput('');
                  setKeyword('');
                  setSelectedProvince('Tất cả');
                }}
              >
                <Text style={styles.resetFilterText}>Xóa bộ lọc</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.destinationsGrid}>
            <View style={styles.resultInfoRow}>
              <Text style={styles.resultCountText}>
                Tìm thấy <Text style={{ fontWeight: '800', color: tokens.colors.primary }}>{data.total}</Text> điểm đến xuất bản
              </Text>
            </View>

            {data.items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.destinationCard}
                onPress={() =>
                  router.push({
                    pathname: '/destination/[id]',
                    params: { id: item.id },
                  })
                }
                activeOpacity={0.88}
              >
                {/* Ảnh địa điểm */}
                <View style={styles.cardMediaBox}>
                  {item.imageUrl ? (
                    <Image
                      source={{ uri: item.imageUrl.startsWith('http') ? item.imageUrl : `https://images.unsplash.com/photo-1528127269322-539801943592?w=800&q=80` }}
                      style={styles.cardImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.cardImagePlaceholder}>
                      <Text style={styles.placeholderEmoji}>📍</Text>
                    </View>
                  )}
                  <View style={styles.provinceTag}>
                    <Text style={styles.provinceTagText}>{item.province}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.cardFavBtn, isFavorite(item.id) && styles.cardFavBtnActive]}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      toggleFavorite(item);
                    }}
                    activeOpacity={0.75}
                  >
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill={isFavorite(item.id) ? '#ef4444' : 'none'}>
                      <Path
                        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                        stroke={isFavorite(item.id) ? '#ef4444' : '#ffffff'}
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  </TouchableOpacity>
                </View>

                {/* Thông tin */}
                <View style={styles.cardContent}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{item.category}</Text>
                  </View>

                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.name}
                  </Text>

                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Giá vé:</Text>
                    <Text style={styles.priceValue}>
                      {formatPrice(item.priceMin, item.priceMax)}
                    </Text>
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.viewDetailLink}>Xem chi tiết →</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerBox: {
    marginBottom: tokens.spacing.md,
  },
  badgeRow: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  badgeText: {
    color: '#0284c7',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: tokens.colors.ink,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 13.5,
    color: tokens.colors.muted,
    lineHeight: 20,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: tokens.radius.md,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    marginBottom: tokens.spacing.md,
    height: 48,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: tokens.colors.ink,
    paddingVertical: 8,
  },
  clearBtn: {
    padding: 6,
  },
  clearBtnText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  searchBtn: {
    backgroundColor: tokens.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 6,
  },
  searchBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  filterSection: {
    marginBottom: tokens.spacing.md,
  },
  filterChipsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  filterChipActive: {
    backgroundColor: tokens.colors.primary,
    borderColor: tokens.colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: tokens.colors.ink,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  listSection: {
    flex: 1,
    paddingBottom: 24,
  },
  feedbackContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  resetFilterBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#e0f2fe',
    borderRadius: 8,
  },
  resetFilterText: {
    color: tokens.colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  destinationsGrid: {
    gap: 16,
  },
  resultInfoRow: {
    marginBottom: 4,
  },
  resultCountText: {
    fontSize: 13,
    color: tokens.colors.muted,
  },
  destinationCard: {
    backgroundColor: '#ffffff',
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardMediaBox: {
    height: 160,
    width: '100%',
    backgroundColor: '#e2e8f0',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#bae6fd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 48,
  },
  provinceTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  provinceTagText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  cardFavBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  cardFavBtnActive: {
    backgroundColor: '#ffffff',
  },
  cardContent: {
    padding: tokens.spacing.md,
    gap: 6,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: tokens.colors.ink,
    lineHeight: 22,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  priceLabel: {
    fontSize: 12,
    color: tokens.colors.muted,
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '700',
    color: tokens.colors.primaryDark,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    marginTop: 4,
    alignItems: 'flex-end',
  },
  viewDetailLink: {
    fontSize: 13,
    fontWeight: '700',
    color: tokens.colors.primary,
  },
});
