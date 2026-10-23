import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { AppText } from '../../components/ui/AppText';
import { AppCard } from '../../components/ui/AppCard';
import { tokens } from '../../theme/tokens';
import { useFavorites, useDestinationHistory } from '../../features/favorites';

export default function ProfileRoute() {
  const [activeTab, setActiveTab] = useState<'favorites' | 'history'>('favorites');
  const {
    favorites,
    isGuest: isFavGuest,
    isLoading: favLoading,
    toggleFavorite,
  } = useFavorites();
  const {
    history,
    isGuest: isHistGuest,
    isLoading: histLoading,
  } = useDestinationHistory(20);

  const isGuest = isFavGuest || isHistGuest;
  const currentList = activeTab === 'favorites' ? favorites : history;
  const isLoading = activeTab === 'favorites' ? favLoading : histLoading;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <AppText style={styles.title}>Hồ sơ cá nhân</AppText>
        <AppText style={styles.subtitle}>
          Quản lý tài khoản, điểm đến yêu thích và lịch sử khám phá.
        </AppText>
      </View>

      {/* Thông tin tài khoản / Chế độ Khách */}
      <AppCard>
        <View style={styles.guestCard}>
          <View style={styles.avatarCircle}>
            <AppText style={styles.avatarEmoji}>👤</AppText>
          </View>
          <View style={styles.guestInfo}>
            <AppText style={styles.guestTitle}>
              {isGuest ? 'Chế độ Khách vãng lai' : 'Thành viên VISTA'}
            </AppText>
            <AppText style={styles.guestDesc}>
              {isGuest
                ? 'Dữ liệu yêu thích và lịch sử đang được lưu tạm thời trên máy này. Đăng nhập để đồng bộ an toàn lên tài khoản của bạn.'
                : 'Tài khoản của bạn đã được kết nối và đồng bộ đám mây trên toàn hệ thống VISTA.'}
            </AppText>
          </View>
          {isGuest && (
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.85}
            >
              <AppText style={styles.loginBtnText}>Đăng nhập / Đăng ký</AppText>
            </TouchableOpacity>
          )}
        </View>
      </AppCard>

      {/* Tabs chuyển đổi Danh mục Lưu trữ */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'favorites' && styles.tabItemActive]}
          onPress={() => setActiveTab('favorites')}
          activeOpacity={0.8}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill={activeTab === 'favorites' ? '#ef4444' : 'none'}>
            <Path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              stroke={activeTab === 'favorites' ? '#ef4444' : '#64748b'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <AppText style={[styles.tabLabel, activeTab === 'favorites' && styles.tabLabelActive]}>
            Yêu thích ({favorites.length})
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'history' && styles.tabItemActive]}
          onPress={() => setActiveTab('history')}
          activeOpacity={0.8}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              stroke={activeTab === 'history' ? tokens.colors.primary : '#64748b'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <AppText style={[styles.tabLabel, activeTab === 'history' && styles.tabLabelActive]}>
            Đã xem gần đây ({history.length})
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Sync Status Badge */}
      <View style={styles.syncStatusRow}>
        <View style={[styles.statusDot, isGuest ? styles.dotLocal : styles.dotSynced]} />
        <AppText style={styles.syncStatusText}>
          {isGuest
            ? 'Lưu cục bộ trên thiết bị này'
            : 'Đã đồng bộ bảo mật với máy chủ VISTA'}
        </AppText>
      </View>

      {/* Danh sách địa điểm */}
      {isLoading ? (
        <View style={styles.emptyContainer}>
          <AppText style={styles.emptySubtitle}>Đang tải danh sách...</AppText>
        </View>
      ) : currentList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <AppText style={styles.emptyIcon}>
            {activeTab === 'favorites' ? '❤️' : '🕒'}
          </AppText>
          <AppText style={styles.emptyTitle}>
            {activeTab === 'favorites'
              ? 'Chưa có điểm đến yêu thích'
              : 'Chưa có lịch sử xem điểm đến'}
          </AppText>
          <AppText style={styles.emptySubtitle}>
            {activeTab === 'favorites'
              ? 'Nhấn vào biểu tượng trái tim ở bất kỳ địa điểm nào để lưu lại những nơi bạn muốn ghé thăm.'
              : 'Khi bạn xem chi tiết các điểm đến du lịch, các địa danh đó sẽ xuất hiện tại đây.'}
          </AppText>
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={() => router.push('/(tabs)/discover')}
            activeOpacity={0.85}
          >
            <AppText style={styles.exploreBtnText}>Khám phá điểm đến ngay</AppText>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {currentList.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.destItemCard}
              onPress={() =>
                router.push({
                  pathname: '/destination/[id]',
                  params: { id: item.id },
                })
              }
              activeOpacity={0.85}
            >
              <Image
                source={{
                  uri: item.imageUrl?.startsWith('http')
                    ? item.imageUrl
                    : 'https://images.unsplash.com/photo-1528127269322-539801943592?w=800&q=80',
                }}
                style={styles.destThumbnail}
                resizeMode="cover"
              />
              <View style={styles.destInfo}>
                <View style={styles.destTagRow}>
                  <AppText style={styles.destProvince}>{item.province}</AppText>
                  <AppText style={styles.destCategory}>{item.category}</AppText>
                </View>
                <AppText style={styles.destName} numberOfLines={1}>
                  {item.name}
                </AppText>
                <AppText style={styles.destLink}>Xem chi tiết →</AppText>
              </View>

              {activeTab === 'favorites' && (
                <TouchableOpacity
                  style={styles.removeFavBtn}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    toggleFavorite(item);
                  }}
                  activeOpacity={0.7}
                >
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="#ef4444">
                    <Path
                      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                      stroke="#ef4444"
                      strokeWidth="2"
                    />
                  </Svg>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.versionSection}>
        <AppText style={styles.versionText}>VISTA Mobile • Tuần 3 (W3-TV1)</AppText>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
    marginBottom: tokens.spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: tokens.colors.ink,
  },
  subtitle: {
    fontSize: 13.5,
    color: tokens.colors.muted,
  },
  guestCard: {
    padding: tokens.spacing.sm,
    gap: 16,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 32,
  },
  guestInfo: {
    alignItems: 'center',
    gap: 6,
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.colors.ink,
  },
  guestDesc: {
    fontSize: 13,
    color: tokens.colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  loginBtn: {
    backgroundColor: tokens.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  loginBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginTop: 20,
    gap: 6,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabItemActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabLabelActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotLocal: {
    backgroundColor: '#f59e0b',
  },
  dotSynced: {
    backgroundColor: '#10b981',
  },
  syncStatusText: {
    fontSize: 12,
    color: '#64748b',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 4,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  exploreBtn: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  exploreBtnText: {
    color: '#0284c7',
    fontWeight: '700',
    fontSize: 13,
  },
  listContainer: {
    gap: 10,
  },
  destItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  destThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#cbd5e1',
  },
  destInfo: {
    flex: 1,
    gap: 3,
  },
  destTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  destProvince: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  destCategory: {
    fontSize: 11,
    color: '#64748b',
  },
  destName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  destLink: {
    fontSize: 12,
    fontWeight: '600',
    color: tokens.colors.primary,
  },
  removeFavBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#fef2f2',
  },
  versionSection: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  versionText: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
