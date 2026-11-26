import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { AppText } from '../../components/ui/AppText';
import { AppCard } from '../../components/ui/AppCard';
import { tokens } from '../../theme/tokens';
import { useFavorites, useDestinationHistory } from '../../features/favorites';
import { authStorage } from '@/services/auth/authStorage';
import { userApi, UserProfileResponse } from '@/services/api/userApi';
import {
  DestinationRequestItem,
  fetchMyDestinationRequests,
} from '@/services/api/destinationRequestApi';
import { DestinationRequestModal } from '@/components/destination/DestinationRequestModal';
import Constants from 'expo-constants';

interface StoredUser {
  id?: string;
  email?: string;
  displayName?: string;
  role?: string;
  phoneNumber?: string | null;
  bio?: string | null;
  bankAccountNumber?: string | null;
  bankCode?: string | null;
}

export default function ProfileRoute() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'favorites' | 'history' | 'requests'>('favorites');
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [myRequests, setMyRequests] = useState<DestinationRequestItem[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [editingRequest, setEditingRequest] = useState<DestinationRequestItem | null>(null);

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

  const loadUser = useCallback(async () => {
    const token = await authStorage.getAccessToken();
    if (!token) {
      setCurrentUser(null);
      return;
    }
    try {
      const profile = await userApi.getProfile();
      const updatedUser: StoredUser = {
        id: profile.id,
        email: profile.email,
        displayName: profile.displayName,
        role: profile.roles?.[0] || 'USER',
        phoneNumber: profile.phoneNumber,
        bio: profile.bio,
        bankAccountNumber: profile.bankAccountNumber,
        bankCode: profile.bankCode,
      };
      setCurrentUser(updatedUser);
      await authStorage.setUser({
        id: profile.id,
        email: profile.email,
        displayName: profile.displayName,
        roles: profile.roles,
      });
    } catch {
      const u = await authStorage.getUser<StoredUser>();
      setCurrentUser(u);
    }
  }, []);

  const loadMyRequests = useCallback(async () => {
    const token = await authStorage.getAccessToken();
    if (!token) {
      setMyRequests([]);
      return;
    }
    try {
      setRequestsLoading(true);
      const page = await fetchMyDestinationRequests('ALL', 0, 50);
      setMyRequests(page.items || []);
    } catch {
      // ignore
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
    void loadMyRequests();
  }, [loadUser, loadMyRequests]);

  // Reload user info on focus
  useFocusEffect(
    useCallback(() => {
      loadUser();
      void loadMyRequests();
    }, [loadUser, loadMyRequests])
  );

  const isGuest = !currentUser;
  const currentList = activeTab === 'favorites' ? favorites : history;
  const isLoading = activeTab === 'favorites' ? favLoading : histLoading;

  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Khách vãng lai';
  const email = currentUser?.email || 'Đăng nhập để đồng bộ dữ liệu';

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || 'NS';
  };

  const handleLogout = () => {
    const performLogout = async () => {
      await authStorage.clearSession();
      queryClient.clear();
      setCurrentUser(null);
      router.replace('/(tabs)/discover');
    };

    if (Platform.OS === 'web') {
      void performLogout();
    } else {
      Alert.alert(
        'Đăng xuất',
        'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản VISTA này không?',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Đăng xuất', style: 'destructive', onPress: performLogout },
        ]
      );
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <AppText style={styles.title}>Hồ sơ cá nhân</AppText>
        <AppText style={styles.subtitle}>
          Quản lý tài khoản, chuyến đi và tùy chọn cá nhân.
        </AppText>
      </View>

      {/* ================= 1. USER PROFILE CARD (STITCH MOCKUP) ================= */}
      <AppCard>
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarLargeCircle}>
            <AppText style={styles.avatarLargeText}>
              {currentUser ? getInitials(displayName) : '👤'}
            </AppText>
          </View>

          <View style={styles.profileMetaInfo}>
            <View style={styles.roleBadgeRow}>
              <View style={styles.roleBadge}>
                <AppText style={styles.roleBadgeText}>
                  {currentUser ? (currentUser.role === 'ADMIN' ? 'Quản trị viên VISTA' : 'Thành viên VISTA') : 'Khách tham quan'}
                </AppText>
              </View>
            </View>
            <AppText style={styles.profileNameText}>{displayName}</AppText>
            <AppText style={styles.profileEmailText}>{email}</AppText>
          </View>
        </View>

        {isGuest ? (
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.85}
          >
            <AppText style={styles.loginBtnText}>Đăng nhập / Đăng ký</AppText>
          </TouchableOpacity>
        ) : (
          <View style={styles.quickShortcutsRow}>
            <TouchableOpacity
              style={styles.shortcutBtn}
              onPress={() => router.push('/(tabs)/trips')}
              activeOpacity={0.8}
            >
              <AppText style={styles.shortcutIcon}>🧳</AppText>
              <AppText style={styles.shortcutLabel}>Chuyến đi của tôi</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shortcutBtn}
              onPress={() => router.push('/trip/create')}
              activeOpacity={0.8}
            >
              <AppText style={styles.shortcutIcon}>➕</AppText>
              <AppText style={styles.shortcutLabel}>Tạo chuyến đi</AppText>
            </TouchableOpacity>
          </View>
        )}
      </AppCard>

      {/* ================= 2. SETTINGS & PREFERENCES ================= */}
      <View style={styles.settingsSection}>
        <View style={styles.settingItemRow}>
          <View style={styles.settingLabelGroup}>
            <AppText style={styles.settingTitle}>Thông báo đẩy</AppText>
            <AppText style={styles.settingDesc}>Nhận cập nhật về lịch trình và biểu quyết</AppText>
          </View>
          <Switch
            value={pushNotifications}
            onValueChange={setPushNotifications}
            trackColor={{ false: '#e2e8f0', true: tokens.colors.primary }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.settingItemRow}>
          <View style={styles.settingLabelGroup}>
            <AppText style={styles.settingTitle}>Ngôn ngữ hiển thị</AppText>
            <AppText style={styles.settingDesc}>Giao diện Tiếng Việt chuẩn hóa</AppText>
          </View>
          <AppText style={styles.settingValueBadge}>Tiếng Việt 🇻🇳</AppText>
        </View>
      </View>

      {/* ================= 3. TABS: YÊU THÍCH & LỊCH SỬ ================= */}
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
            Đã xem ({history.length})
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'requests' && styles.tabItemActive]}
          onPress={() => {
            setActiveTab('requests');
            void loadMyRequests();
          }}
          activeOpacity={0.8}
        >
          <AppText style={[styles.tabLabel, activeTab === 'requests' && styles.tabLabelActive]}>
            Đóng góp ({myRequests.length})
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Sync Status Badge */}
      <View style={styles.syncStatusRow}>
        <View style={[styles.statusDot, isGuest ? styles.dotLocal : styles.dotSynced]} />
        <AppText style={styles.syncStatusText}>
          {isGuest
            ? 'Đang lưu cục bộ trên thiết bị này'
            : 'Đã đồng bộ bảo mật với đám mây VISTA'}
        </AppText>
      </View>

      {/* Danh sách địa điểm hoặc Đóng góp của tôi */}
      {activeTab === 'requests' ? (
        isGuest ? (
          <View style={styles.emptyContainer}>
            <AppText style={styles.emptyIcon}>📝</AppText>
            <AppText style={styles.emptyTitle}>Đăng nhập để xem đóng góp</AppText>
            <AppText style={styles.emptySubtitle}>
              Theo dõi trạng thái duyệt các địa điểm bạn đã đề xuất hoặc yêu cầu chỉnh sửa.
            </AppText>
            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.85}
            >
              <AppText style={styles.exploreBtnText}>Đăng nhập ngay</AppText>
            </TouchableOpacity>
          </View>
        ) : requestsLoading ? (
          <View style={styles.emptyContainer}>
            <AppText style={styles.emptySubtitle}>Đang tải đóng góp của bạn...</AppText>
          </View>
        ) : myRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <AppText style={styles.emptyIcon}>📍</AppText>
            <AppText style={styles.emptyTitle}>Chưa có đóng góp nào</AppText>
            <AppText style={styles.emptySubtitle}>
              Bạn có thể đề xuất thêm địa điểm còn thiếu từ Bản đồ hoặc yêu cầu cập nhật trên trang chi tiết địa điểm.
            </AppText>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {myRequests.map((req) => {
              const title = req.name || req.targetDestinationName || 'Đề xuất địa điểm';
              const badgeColor =
                req.status === 'APPROVED'
                  ? { bg: '#dcfce7', text: '#166534', label: 'Đã duyệt' }
                  : req.status === 'REJECTED'
                    ? { bg: '#fee2e2', text: '#b91c1c', label: 'Bị từ chối' }
                    : { bg: '#fef3c7', text: '#b45309', label: 'Chờ duyệt' };
              return (
                <View key={req.id} style={[styles.destItemCard, { flexDirection: 'column', alignItems: 'stretch', padding: 14, gap: 6 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <AppText style={{ fontSize: 12, fontWeight: '700', color: '#0284c7' }}>
                      {req.requestType === 'CREATE' ? '+ Thêm mới' : '✏️ Cập nhật'}
                    </AppText>
                    <View style={{ backgroundColor: badgeColor.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                      <AppText style={{ fontSize: 11.5, fontWeight: '700', color: badgeColor.text }}>
                        {badgeColor.label}
                      </AppText>
                    </View>
                  </View>
                  <AppText style={styles.destName}>{title}</AppText>
                  {req.provinceName && (
                    <AppText style={{ fontSize: 12.5, color: '#64748b' }}>
                      📍 {req.provinceName} {req.categoryName ? `· ${req.categoryName}` : ''}
                    </AppText>
                  )}
                  {req.note && (
                    <AppText style={{ fontSize: 12.5, color: '#334155' }}>
                      Ghi chú: {req.note}
                    </AppText>
                  )}
                  {req.status === 'REJECTED' && req.rejectionReason && (
                    <View style={{ backgroundColor: '#fef2f2', padding: 8, borderRadius: 8 }}>
                      <AppText style={{ fontSize: 12, color: '#b91c1c', fontWeight: '600' }}>
                        Lý do từ chối: {req.rejectionReason}
                      </AppText>
                    </View>
                  )}
                  {(req.status === 'PENDING' || req.status === 'REJECTED') && (
                    <TouchableOpacity
                      style={{ alignSelf: 'flex-start', marginTop: 4, backgroundColor: '#e0f2fe', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                      onPress={() => setEditingRequest(req)}
                    >
                      <AppText style={{ fontSize: 12.5, fontWeight: '700', color: '#0369a1' }}>
                        {req.status === 'REJECTED' ? 'Sửa & gửi lại' : 'Chỉnh sửa'}
                      </AppText>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )
      ) : isLoading ? (
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

      {/* ================= 4. LOGOUT BUTTON ================= */}
      {!isGuest && (
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <AppText style={styles.logoutBtnText}>Đăng xuất tài khoản</AppText>
        </TouchableOpacity>
      )}

      <View style={styles.versionSection}>
        <AppText style={styles.versionText}>
          VISTA Mobile • Phiên bản {Constants.expoConfig?.version || '1.0.0'}
        </AppText>
      </View>

      <DestinationRequestModal
        visible={Boolean(editingRequest)}
        mode="EDIT"
        existingRequest={editingRequest}
        onClose={() => setEditingRequest(null)}
        onSubmitted={() => void loadMyRequests()}
      />
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
  profileHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  avatarLargeCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarLargeText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  profileMetaInfo: {
    flex: 1,
    gap: 2,
  },
  roleBadgeRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  roleBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  profileNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.colors.ink,
  },
  profileEmailText: {
    fontSize: 13,
    color: tokens.colors.muted,
  },
  loginBtn: {
    backgroundColor: tokens.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginTop: 14,
  },
  loginBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  quickShortcutsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  shortcutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  shortcutIcon: {
    fontSize: 15,
  },
  shortcutLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  settingsSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginTop: 16,
    gap: 14,
  },
  settingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabelGroup: {
    gap: 2,
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  settingDesc: {
    fontSize: 12,
    color: '#64748b',
  },
  settingValueBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284c7',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
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
    paddingVertical: 36,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 4,
  },
  emptyIcon: {
    fontSize: 36,
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
  logoutBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtnText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
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
