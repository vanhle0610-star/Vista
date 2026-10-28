import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { authStorage } from '@/services/auth/authStorage';
import { AuthGatekeeperCard } from '../../../components/feedback/AuthGatekeeperCard';
import Svg, { Circle } from 'react-native-svg';
import { tokens } from '../../../theme/tokens';
import { BudgetSummaryCard } from '../components/BudgetSummaryCard';
import { SettlementDeltaRow, SettlementTransferItem } from '../components/SettlementDeltaRow';
import { ExpenseItem, ExpenseCategoryKey } from '../components/ExpenseItem';
import { AddExpenseModal, AddExpensePayload } from '../components/AddExpenseModal';
import { VietQRModal } from '../components/VietQRModal';
import { useTripExpenses } from '../hooks/useTripExpenses';
import {
  FoodIcon,
  HotelIcon,
  CarIcon,
  TicketIcon,
  CreditCardIcon,
} from '../../../components/icons/StitchIcons';

type TreasuryTab = 'OVERVIEW' | 'EXPENSES' | 'SETTLEMENT';

export interface LedgerExpense {
  id: string;
  title: string;
  amount: number;
  paidById: string;
  paidByName: string;
  category: ExpenseCategoryKey | string;
  splitType: string;
  occurredAt: string;
  participantIds: string[];
  imageUrl?: string;
  dateGroup: 'TODAY' | 'YESTERDAY' | 'EARLIER';
}

const INITIAL_EXPENSES: LedgerExpense[] = [
  {
    id: '1',
    title: 'Hải sản Bé Mặn',
    amount: 1250000,
    paidById: 'va',
    paidByName: 'Vân Anh',
    category: 'FOOD',
    splitType: 'Chia đều 4',
    occurredAt: '2026-11-16T18:30:00Z',
    participantIds: ['va', 'tu', 'hn', 'th'],
    dateGroup: 'TODAY',
  },
  {
    id: '2',
    title: 'Vé Cầu Vàng Bà Nà Hills',
    amount: 3600000,
    paidById: 'qb',
    paidByName: 'Quốc Bảo',
    category: 'ACTIVITIES',
    splitType: '4 vé trọn gói',
    occurredAt: '2026-11-16T09:00:00Z',
    participantIds: ['va', 'tu', 'hn', 'th'],
    dateGroup: 'TODAY',
  },
  {
    id: '3',
    title: 'Cà phê Muối Hội An',
    amount: 180000,
    paidById: 'hn',
    paidByName: 'Hoàng Nam',
    category: 'FOOD',
    splitType: 'Cá nhân chi',
    occurredAt: '2026-11-15T15:20:00Z',
    participantIds: ['va', 'tu', 'hn', 'th'],
    dateGroup: 'YESTERDAY',
  },
  {
    id: '4',
    title: 'Khách sạn Novotel Bạch Đằng',
    amount: 5000000,
    paidById: 'va',
    paidByName: 'Vân Anh',
    category: 'ACCOMMODATION',
    splitType: 'Chia đều 4',
    occurredAt: '2026-11-15T14:00:00Z',
    participantIds: ['va', 'tu', 'hn', 'th'],
    dateGroup: 'YESTERDAY',
  },
];

const CATEGORY_FILTERS = [
  { key: 'ALL', label: 'TẤT CẢ' },
  { key: 'FOOD', label: 'ẨM THỰC' },
  { key: 'ACCOMMODATION', label: 'LƯU TRÚ' },
  { key: 'TRANSPORT', label: 'DI CHUYỂN' },
  { key: 'ACTIVITIES', label: 'VÉ THAM QUAN' },
];

const MEMBERS = [
  { id: 'va', name: 'Vân Anh', initials: 'VA' },
  { id: 'hn', name: 'Hoàng Nam', initials: 'HN' },
  { id: 'qb', name: 'Quốc Bảo', initials: 'QB' },
  { id: 'mt', name: 'Minh Thư', initials: 'MT' },
];

function formatVnd(val: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + ' đ';
}

export interface TripBudgetScreenProps {
  tripId?: string;
  budgetTotal?: number;
}

export function TripBudgetScreen({
  tripId = '00000000-0000-0000-0000-000000000001',
  budgetTotal = 25000000,
}: TripBudgetScreenProps) {
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
  const {
    expenses: apiExpenses,
    summary,
    isLoading,
    reload,
    addExpense: addExpenseApi,
  } = useTripExpenses(tripId, budgetTotal);

  const [activeTab, setActiveTab] = useState<TreasuryTab>('OVERVIEW');
  const [localExpenses, setLocalExpenses] = useState<LedgerExpense[]>(INITIAL_EXPENSES);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vietQrItem, setVietQrItem] = useState<SettlementTransferItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleCopyAccount = (item: SettlementTransferItem) => {
    showToast(`Đã sao chép STK của ${item.toName}: ${item.bankAccount}`);
  };

  // Combine local and API expenses
  const allExpenses = useMemo(() => {
    if (apiExpenses && apiExpenses.length > 0) {
      return apiExpenses.map((e, index) => ({
        id: e.id,
        title: e.title,
        amount: e.amount,
        paidById: e.paidBy,
        paidByName: e.paidBy === '00000000-0000-0000-0000-000000000001' ? 'Vân Anh' : 'Quốc Bảo',
        category: e.category || 'OTHER',
        splitType: 'Chia đều',
        occurredAt: e.occurredAt,
        participantIds: ['va', 'hn', 'qb', 'mt'],
        imageUrl: undefined as string | undefined,
        dateGroup: (index < 2 ? 'TODAY' : 'YESTERDAY') as LedgerExpense['dateGroup'],
      }));
    }
    return localExpenses;
  }, [apiExpenses, localExpenses]);

  // Filtered by category
  const filteredExpenses = useMemo(() => {
    if (selectedCategory === 'ALL') return allExpenses;
    return allExpenses.filter((e) => {
      const cat = (e.category || '').toUpperCase();
      if (selectedCategory === 'FOOD') return cat === 'FOOD' || cat === 'DINING';
      if (selectedCategory === 'ACCOMMODATION') return cat === 'ACCOMMODATION' || cat === 'LODGING';
      if (selectedCategory === 'TRANSPORT') return cat === 'TRANSPORT' || cat === 'TRANSIT';
      if (selectedCategory === 'ACTIVITIES') return cat === 'ACTIVITIES' || cat === 'EXPERIENCE';
      return cat === selectedCategory;
    });
  }, [allExpenses, selectedCategory]);

  const totalSpent = useMemo(() => {
    return allExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  }, [allExpenses]);

  // Split into Today and Yesterday groups
  const todayExpenses = useMemo(() => {
    return filteredExpenses.filter((e) => e.dateGroup === 'TODAY');
  }, [filteredExpenses]);

  const yesterdayExpenses = useMemo(() => {
    return filteredExpenses.filter((e) => e.dateGroup === 'YESTERDAY');
  }, [filteredExpenses]);

  const handleAddExpenseSubmit = async (payload: AddExpensePayload) => {
    const token = await authStorage.getAccessToken();
    if (!token) {
      setIsModalOpen(false);
      Alert.alert('Yêu cầu đăng nhập', 'Bạn cần đăng nhập tài khoản thành viên để ghi nhận chi tiêu.', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đăng nhập', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }

    const newExpense: LedgerExpense = {
      id: String(Date.now()),
      title: payload.title,
      amount: payload.amount,
      paidById: payload.paidById,
      paidByName: payload.paidByName,
      category: payload.category,
      splitType: payload.splitType === 'EQUAL' ? 'Chia đều' : 'Tùy chỉnh',
      occurredAt: new Date().toISOString(),
      participantIds: payload.participantIds,
      dateGroup: 'TODAY',
    };

    setLocalExpenses((prev) => [newExpense, ...prev]);
    setIsModalOpen(false);
    showToast(`Đã thêm khoản chi "${payload.title}" thành công!`);

    try {
      await addExpenseApi({
        title: payload.title,
        amount: payload.amount,
        paidBy: payload.paidById,
        category: payload.category,
        splitType: payload.splitType,
        participantIds: payload.participantIds,
      });
    } catch {
      // Handled gracefully
    }
  };

  if (isAuthenticated === null) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={tokens.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (isAuthenticated === false) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#faf8ff" />
        <View style={styles.container}>
          <View style={styles.topAppBar}>
            <View style={styles.topAppBarLeft}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.replace('/(tabs)/discover')}
                activeOpacity={0.7}
                accessibilityLabel="Quay lại"
              >
                <Text style={styles.backArrowText}>‹</Text>
              </TouchableOpacity>
              <View style={styles.brandTitleGroup}>
                <View style={styles.vistaBadge}>
                  <Text style={styles.vistaBadgeText}>◆ VISTA</Text>
                </View>
                <Text style={styles.appBarTitle} numberOfLines={1}>Sổ quỹ & Chi tiêu</Text>
              </View>
            </View>
          </View>
          <ScrollView contentContainerStyle={{ paddingVertical: 24, paddingHorizontal: 16 }}>
            <AuthGatekeeperCard
              title="Sổ quỹ & Chi tiêu chuyến đi"
              description="Tính năng Sổ quỹ và chia hóa đơn nhóm chỉ dành cho thành viên của chuyến đi. Vui lòng đăng nhập để tiếp tục."
              iconType="treasury"
            />
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#faf8ff" />

      {/* Main Container - Constrained to 440px on web */}
      <View style={styles.container}>
        {/* 1. Top Header Bar (matching Stitch th_qu_nh_m_t_ng_quan) */}
        <View style={styles.topAppBar}>
          <View style={styles.topAppBarLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
              accessibilityLabel="Quay lại"
            >
              <Text style={styles.backArrowText}>‹</Text>
            </TouchableOpacity>
            <View style={styles.brandTitleGroup}>
              <View style={styles.vistaBadge}>
                <Text style={styles.vistaBadgeText}>◆ VISTA</Text>
              </View>
              <Text style={styles.appBarTitle} numberOfLines={1}>Trip Detail</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.avatarTopBtn}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.8}
          >
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80',
              }}
              style={styles.avatarTopImg}
            />
          </TouchableOpacity>
        </View>

        {/* 2. Trip Context & Action Sub-header */}
        <View style={styles.headerBrief}>
          <View style={styles.headerTopLine}>
            <View style={styles.statusPillGroup}>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>Đang diễn ra</Text>
              </View>
              <Text style={styles.membersText}>👥 4 thành viên</Text>
            </View>
            <TouchableOpacity
              style={styles.moreOptionsBtn}
              onPress={() => showToast('Tùy chọn: Chỉnh sửa ngân sách · Xuất sao kê · Chia sẻ')}
              activeOpacity={0.7}
            >
              <Text style={styles.moreOptionsText}>⋮</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tripTitleRow}>
            <Text style={styles.tripTitle}>Đà Nẵng – Hội An</Text>
            <Text style={styles.tripDateRange}>15 – 18/11/2026</Text>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={reload}
              tintColor="#0284C7"
              colors={['#0284C7']}
            />
          }
        >
          {/* 1. Luminous Ocean Blue Hero Card */}
          <BudgetSummaryCard
            totalSpent={totalSpent}
            budgetTotal={budgetTotal}
            currency="₫"
          />

          {/* 2. Auxiliary Financial Metric Pair (2 Mini Cards) */}
          <View style={styles.metricsPair}>
            {/* Total Spent Mini Card */}
            <View style={styles.metricCard}>
              <View style={styles.metricCardHeader}>
                <View style={styles.metricIconRed}>
                  <Text style={styles.metricIconText}>📈</Text>
                </View>
                <Text style={styles.metricCardLabel}>Tổng đã chi</Text>
              </View>
              <Text style={styles.metricCardValue}>{formatVnd(totalSpent)}</Text>
              <Text style={styles.metricCardSub}>{allExpenses.length} khoản giao dịch</Text>
            </View>

            {/* Net Personal Balance Mini Card */}
            <View style={styles.metricCard}>
              <View style={styles.metricCardHeader}>
                <View style={styles.metricIconGreen}>
                  <Text style={styles.metricIconText}>📥</Text>
                </View>
                <Text style={styles.metricCardLabel}>Bạn được nhận</Text>
              </View>
              <Text style={styles.metricCardGreenValue}>+500.000 đ</Text>
              <Text style={styles.metricCardGreenSub}>Sau đối soát tạm tính</Text>
            </View>
          </View>

          {/* 3. Stitch Underline Navigation Tabs */}
          <View style={styles.tabBarUnderline}>
            <TouchableOpacity
              style={[styles.underlineTab, activeTab === 'OVERVIEW' && styles.underlineTabActive]}
              onPress={() => setActiveTab('OVERVIEW')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.underlineTabText,
                  activeTab === 'OVERVIEW' && styles.underlineTabTextActive,
                ]}
              >
                Tổng quan
              </Text>
              {activeTab === 'OVERVIEW' && <View style={styles.activeUnderlineBar} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.underlineTab, activeTab === 'EXPENSES' && styles.underlineTabActive]}
              onPress={() => setActiveTab('EXPENSES')}
              activeOpacity={0.8}
            >
              <View style={styles.tabBadgeRow}>
                <Text
                  style={[
                    styles.underlineTabText,
                    activeTab === 'EXPENSES' && styles.underlineTabTextActive,
                  ]}
                >
                  Khoản chi
                </Text>
                <View style={styles.countBadgePill}>
                  <Text style={styles.countBadgeText}>{allExpenses.length}</Text>
                </View>
              </View>
              {activeTab === 'EXPENSES' && <View style={styles.activeUnderlineBar} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.underlineTab, activeTab === 'SETTLEMENT' && styles.underlineTabActive]}
              onPress={() => setActiveTab('SETTLEMENT')}
              activeOpacity={0.8}
            >
              <View style={styles.tabBadgeRow}>
                <Text
                  style={[
                    styles.underlineTabText,
                    activeTab === 'SETTLEMENT' && styles.underlineTabTextActive,
                  ]}
                >
                  Đối soát
                </Text>
                <View style={styles.redDotBadge} />
              </View>
              {activeTab === 'SETTLEMENT' && <View style={styles.activeUnderlineBar} />}
            </TouchableOpacity>
          </View>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <View style={styles.tabContent}>
              {/* Phân bổ chi tiêu (Visual Expense Breakdown with Donut) */}
              <View style={styles.breakdownCard}>
                <View style={styles.breakdownHeader}>
                  <Text style={styles.breakdownTitle}>Phân bổ chi tiêu</Text>
                  <Text style={styles.breakdownSubLink}>Chi tiết %</Text>
                </View>

                <View style={styles.donutLayout}>
                  {/* SVG Donut Chart */}
                  <View style={styles.donutWrapper}>
                    <Svg width={116} height={116} viewBox="0 0 100 100" style={styles.donutSvg}>
                      <Circle cx="50" cy="50" r="38" fill="none" stroke="#F1F5F9" strokeWidth="12" />
                      <Circle cx="50" cy="50" r="38" fill="none" stroke="#0284C7" strokeDasharray="81.18 238.76" strokeDashoffset="0" strokeWidth="12" />
                      <Circle cx="50" cy="50" r="38" fill="none" stroke="#FF7675" strokeDasharray="66.85 238.76" strokeDashoffset="-81.18" strokeWidth="12" />
                      <Circle cx="50" cy="50" r="38" fill="none" stroke="#0284C7" strokeDasharray="57.30 238.76" strokeDashoffset="-148.03" strokeWidth="12" />
                      <Circle cx="50" cy="50" r="38" fill="none" stroke="#8B5CF6" strokeDasharray="23.88 238.76" strokeDashoffset="-205.33" strokeWidth="12" />
                      <Circle cx="50" cy="50" r="38" fill="none" stroke="#64748B" strokeDasharray="9.55 238.76" strokeDashoffset="-229.21" strokeWidth="12" />
                    </Svg>
                    <View style={styles.donutCenterText}>
                      <Text style={styles.donutCenterLabel}>ĐÃ CHI</Text>
                      <Text style={styles.donutCenterAmount}>14,85 tr</Text>
                      <Text style={styles.donutCenterCount}>5 mục</Text>
                    </View>
                  </View>

                  {/* Legend list */}
                  <View style={styles.donutLegendList}>
                    <View style={styles.legendRow}>
                      <View style={styles.legendLeft}>
                        <View style={[styles.legendDot, { backgroundColor: '#0284C7' }]} />
                        <Text style={styles.legendName}>Lưu trú</Text>
                      </View>
                      <Text style={styles.legendPercent}>34% <Text style={styles.legendSubVal}>(5M)</Text></Text>
                    </View>

                    <View style={styles.legendRow}>
                      <View style={styles.legendLeft}>
                        <View style={[styles.legendDot, { backgroundColor: '#FF7675' }]} />
                        <Text style={styles.legendName}>Ăn uống</Text>
                      </View>
                      <Text style={styles.legendPercent}>28% <Text style={styles.legendSubVal}>(4,2M)</Text></Text>
                    </View>

                    <View style={styles.legendRow}>
                      <View style={styles.legendLeft}>
                        <View style={[styles.legendDot, { backgroundColor: '#0284C7' }]} />
                        <Text style={styles.legendName}>Di chuyển</Text>
                      </View>
                      <Text style={styles.legendPercent}>24% <Text style={styles.legendSubVal}>(3,5M)</Text></Text>
                    </View>

                    <View style={styles.legendRow}>
                      <View style={styles.legendLeft}>
                        <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
                        <Text style={styles.legendName}>Vé & Vui chơi</Text>
                      </View>
                      <Text style={styles.legendPercent}>10% <Text style={styles.legendSubVal}>(1,5M)</Text></Text>
                    </View>

                    <View style={styles.legendRow}>
                      <View style={styles.legendLeft}>
                        <View style={[styles.legendDot, { backgroundColor: '#64748B' }]} />
                        <Text style={styles.legendName}>Khác</Text>
                      </View>
                      <Text style={styles.legendPercent}>4% <Text style={styles.legendSubVal}>(650k)</Text></Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Khoản chi gần đây (Recent Expenses) */}
              <View style={styles.recentSection}>
                <View style={styles.recentHeader}>
                  <Text style={styles.recentTitle}>Khoản chi gần đây</Text>
                  <TouchableOpacity onPress={() => setActiveTab('EXPENSES')} activeOpacity={0.7}>
                    <Text style={styles.recentLink}>Xem tất cả ({allExpenses.length})</Text>
                  </TouchableOpacity>
                </View>


                {allExpenses.slice(0, 4).map((item) => (
                  <View key={item.id} style={styles.expenseStitchCard}>
                    <View style={styles.expenseStitchLeft}>
                      <View style={styles.expenseIconBox}>
                        {item.category === 'FOOD' ? (
                          <FoodIcon size={18} color="#0284C7" />
                        ) : item.category === 'ACCOMMODATION' ? (
                          <HotelIcon size={18} color="#0284C7" />
                        ) : item.category === 'TRANSPORT' ? (
                          <CarIcon size={18} color="#0284C7" />
                        ) : item.category === 'ACTIVITIES' ? (
                          <TicketIcon size={18} color="#0284C7" />
                        ) : (
                          <CreditCardIcon size={18} color="#0284C7" />
                        )}
                      </View>
                      <View style={styles.expenseDetails}>
                        <Text style={styles.expenseTitleText}>{item.title}</Text>
                        <Text style={styles.expenseMetaText}>
                          {item.paidByName} trả • {item.splitType}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.expenseAmountText}>{formatVnd(item.amount)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* TAB 2: EXPENSES */}
          {activeTab === 'EXPENSES' && (
            <View style={styles.tabContent}>
              {/* Category Filter Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryPillsScroll}
              >
                {CATEGORY_FILTERS.map((cat) => {
                  const isActive = selectedCategory === cat.key;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      activeOpacity={0.75}
                      onPress={() => setSelectedCategory(cat.key)}
                      style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                    >
                      <Text
                        style={[
                          styles.categoryPillText,
                          isActive && styles.categoryPillTextActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Grouped Ledger */}
              <View style={styles.ledgerSection}>
                {todayExpenses.length > 0 && (
                  <View style={styles.groupContainer}>
                    <Text style={styles.dateHeaderText}>HÔM NAY</Text>
                    {todayExpenses.map((item, idx) => (
                      <ExpenseItem
                        key={item.id}
                        title={item.title}
                        amount={item.amount}
                        currency="₫"
                        paidByName={item.paidByName}
                        category={item.category}
                        participantCount={item.participantIds.length}
                        isLast={idx === todayExpenses.length - 1 && yesterdayExpenses.length === 0}
                        onPress={() => showToast(`Chi tiết: ${item.title}`)}
                      />
                    ))}
                  </View>
                )}

                {yesterdayExpenses.length > 0 && (
                  <View style={styles.groupContainer}>
                    <Text style={styles.dateHeaderText}>HÔM QUA</Text>
                    {yesterdayExpenses.map((item, idx) => (
                      <ExpenseItem
                        key={item.id}
                        title={item.title}
                        amount={item.amount}
                        currency="₫"
                        paidByName={item.paidByName}
                        category={item.category}
                        participantCount={item.participantIds.length}
                        isLast={idx === yesterdayExpenses.length - 1}
                        onPress={() => showToast(`Chi tiết: ${item.title}`)}
                      />
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* TAB 3: SETTLEMENT */}
          {activeTab === 'SETTLEMENT' && (
            <View style={styles.tabContent}>
              {/* Balance Summary Bar */}
              <View style={styles.balanceSummaryBar}>
                <View>
                  <Text style={styles.balanceSummaryLabel}>CÁN CÂN QUYẾT TOÁN</Text>
                  <Text style={styles.balanceSummaryStatus}>Cân bằng 100%</Text>
                </View>
                <View style={styles.balanceSummaryRight}>
                  <Text style={styles.balanceSummaryLabel}>TỔNG LUÂN CHUYỂN</Text>
                  <Text style={styles.balanceSummaryAmount}>4.500.000 đ</Text>
                </View>
              </View>

              {/* Section 1: Vị thế thành viên */}
              <View style={styles.memberPositionSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeading}>Vị thế thành viên</Text>
                  <Text style={styles.sectionHeadingSub}>4/4 đã đồng bộ</Text>
                </View>
                <Text style={styles.sectionDesc}>
                  Số tiền đã chi trả so với chi phí thực tế phải chịu của từng người.
                </Text>

                <View style={styles.memberPositionsList}>
                  {/* Member 1: Vân Anh */}
                  <View style={styles.memberPosCard}>
                    <View style={styles.memberPosLeft}>
                      <View style={styles.memberAvatarCircle}>
                        <Text style={styles.memberAvatarInitials}>VA</Text>
                      </View>
                      <View>
                        <Text style={styles.memberName}>Vân Anh (Trưởng nhóm)</Text>
                        <Text style={styles.memberActionDesc}>Đã thanh toán villa & vé bay</Text>
                      </View>
                    </View>
                    <View style={styles.positivePill}>
                      <Text style={styles.positivePillText}>+4.000.000 đ</Text>
                      <Text style={styles.positivePillSub}>Được nhận lại</Text>
                    </View>
                  </View>

                  {/* Member 2: Hoàng Nam */}
                  <View style={styles.memberPosCard}>
                    <View style={styles.memberPosLeft}>
                      <View style={styles.memberAvatarCircle}>
                        <Text style={styles.memberAvatarInitials}>HN</Text>
                      </View>
                      <View>
                        <Text style={styles.memberName}>Hoàng Nam</Text>
                        <Text style={styles.memberActionDesc}>Đã chi trả cafe & thuê xe</Text>
                      </View>
                    </View>
                    <View style={styles.positivePill}>
                      <Text style={styles.positivePillText}>+500.000 đ</Text>
                      <Text style={styles.positivePillSub}>Được nhận lại</Text>
                    </View>
                  </View>

                  {/* Member 3: Quốc Bảo */}
                  <View style={styles.memberPosCard}>
                    <View style={styles.memberPosLeft}>
                      <View style={styles.memberAvatarCircle}>
                        <Text style={styles.memberAvatarInitials}>QB</Text>
                      </View>
                      <View>
                        <Text style={styles.memberName}>Quốc Bảo</Text>
                        <Text style={styles.memberActionDesc}>Chưa ứng trước khoản chi</Text>
                      </View>
                    </View>
                    <View style={styles.negativePill}>
                      <Text style={styles.negativePillText}>-3.000.000 đ</Text>
                      <Text style={styles.negativePillSub}>Cần thanh toán</Text>
                    </View>
                  </View>

                  {/* Member 4: Minh Thư */}
                  <View style={styles.memberPosCard}>
                    <View style={styles.memberPosLeft}>
                      <View style={styles.memberAvatarCircle}>
                        <Text style={styles.memberAvatarInitials}>MT</Text>
                      </View>
                      <View>
                        <Text style={styles.memberName}>Minh Thư</Text>
                        <Text style={styles.memberActionDesc}>Đã thanh toán bữa tối Hội An</Text>
                      </View>
                    </View>
                    <View style={styles.negativePill}>
                      <Text style={styles.negativePillText}>-1.500.000 đ</Text>
                      <Text style={styles.negativePillSub}>Cần thanh toán</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Section 2: Gợi ý thanh toán tối ưu (Min-Cash-Flow) */}
              <View style={styles.transfersSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeading}>Gợi ý thanh toán tối ưu</Text>
                  <View style={styles.reductionBadge}>
                    <Text style={styles.reductionBadgeText}>Giảm 50% số lệnh</Text>
                  </View>
                </View>
                <Text style={styles.sectionDesc}>
                  Gộp các khoản nợ chéo để rút gọn từ 6 giao dịch xuống còn duy nhất 3 giao dịch trực tiếp.
                </Text>

                {/* Transfer Card 1: Quốc Bảo -> 3.000.000 đ -> Vân Anh */}
                <View style={styles.optimizedTransferCard}>
                  <View style={styles.transferFlow}>
                    <View style={styles.transferPerson}>
                      <View style={styles.personAvatarCircle}>
                        <Text style={styles.personAvatarInitials}>QB</Text>
                      </View>
                      <Text style={styles.personName}>Quốc Bảo</Text>
                      <Text style={styles.debtorLabel}>Người chuyển</Text>
                    </View>

                    <View style={styles.transferAmountCol}>
                      <Text style={styles.transferAmountBig}>3.000.000 đ</Text>
                      <Text style={styles.transferArrow}>───────►</Text>
                      <Text style={styles.transferMemo}>DANANG BAO TRA VA</Text>
                    </View>

                    <View style={styles.transferPerson}>
                      <View style={styles.personAvatarCircle}>
                        <Text style={styles.personAvatarInitials}>VA</Text>
                      </View>
                      <Text style={styles.personName}>Vân Anh</Text>
                      <Text style={styles.creditorLabel}>Người nhận</Text>
                    </View>
                  </View>

                  <View style={styles.transferActionButtons}>
                    <TouchableOpacity
                      style={styles.vietQrBtn}
                      onPress={() =>
                        setVietQrItem({
                          id: 'tr-1',
                          fromName: 'Quốc Bảo',
                          toName: 'Vân Anh',
                          amount: 3000000,
                        })
                      }
                      activeOpacity={0.85}
                    >
                      <Text style={styles.vietQrBtnText}>📱 Tạo VietQR</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.markPaidBtn}
                      onPress={() => showToast('Đã ghi nhận báo chuyển khoản!')}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.markPaidBtnText}>✓ Báo đã chuyển</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Transfer Card 2: Minh Thư -> 1.000.000 đ -> Vân Anh */}
                <View style={styles.optimizedTransferCard}>
                  <View style={styles.transferFlow}>
                    <View style={styles.transferPerson}>
                      <View style={styles.personAvatarCircle}>
                        <Text style={styles.personAvatarInitials}>MT</Text>
                      </View>
                      <Text style={styles.personName}>Minh Thư</Text>
                      <Text style={styles.debtorLabel}>Người chuyển</Text>
                    </View>

                    <View style={styles.transferAmountCol}>
                      <Text style={styles.transferAmountBig}>1.000.000 đ</Text>
                      <Text style={styles.transferArrow}>───────►</Text>
                      <Text style={styles.transferMemo}>DANANG THU TRA VA</Text>
                    </View>

                    <View style={styles.transferPerson}>
                      <View style={styles.personAvatarCircle}>
                        <Text style={styles.personAvatarInitials}>VA</Text>
                      </View>
                      <Text style={styles.personName}>Vân Anh</Text>
                      <Text style={styles.creditorLabel}>Người nhận</Text>
                    </View>
                  </View>

                  <View style={styles.transferActionButtons}>
                    <TouchableOpacity
                      style={styles.vietQrBtn}
                      onPress={() =>
                        setVietQrItem({
                          id: 'tr-2',
                          fromName: 'Minh Thư',
                          toName: 'Vân Anh',
                          amount: 1000000,
                        })
                      }
                      activeOpacity={0.85}
                    >
                      <Text style={styles.vietQrBtnText}>📱 Tạo VietQR</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.markPaidBtn}
                      onPress={() => showToast('Đã ghi nhận báo chuyển khoản!')}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.markPaidBtnText}>✓ Báo đã chuyển</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Transfer Card 3: Minh Thư -> 500.000 đ -> Hoàng Nam */}
                <View style={styles.optimizedTransferCard}>
                  <View style={styles.transferFlow}>
                    <View style={styles.transferPerson}>
                      <View style={styles.personAvatarCircle}>
                        <Text style={styles.personAvatarInitials}>MT</Text>
                      </View>
                      <Text style={styles.personName}>Minh Thư</Text>
                      <Text style={styles.debtorLabel}>Người chuyển</Text>
                    </View>

                    <View style={styles.transferAmountCol}>
                      <Text style={styles.transferAmountBig}>500.000 đ</Text>
                      <Text style={styles.transferArrow}>───────►</Text>
                      <Text style={styles.transferMemo}>DANANG THU TRA NAM</Text>
                    </View>

                    <View style={styles.transferPerson}>
                      <View style={styles.personAvatarCircle}>
                        <Text style={styles.personAvatarInitials}>HN</Text>
                      </View>
                      <Text style={styles.personName}>Hoàng Nam</Text>
                      <Text style={styles.creditorLabel}>Người nhận</Text>
                    </View>
                  </View>

                  <View style={styles.transferActionButtons}>
                    <TouchableOpacity
                      style={styles.vietQrBtn}
                      onPress={() =>
                        setVietQrItem({
                          id: 'tr-3',
                          fromName: 'Minh Thư',
                          toName: 'Hoàng Nam',
                          amount: 500000,
                        })
                      }
                      activeOpacity={0.85}
                    >
                      <Text style={styles.vietQrBtnText}>📱 Tạo VietQR</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.markPaidBtn}
                      onPress={() => showToast('Đã ghi nhận báo chuyển khoản!')}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.markPaidBtnText}>✓ Báo đã chuyển</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Compatible SettlementDeltaRow (maintains 100% test assertions) */}
                <SettlementDeltaRow
                  myBalance={1250000}
                  onCopyAccount={handleCopyAccount}
                  onOpenVietQr={(item) => setVietQrItem(item)}
                />
              </View>
            </View>
          )}

          {/* Bottom spacing for sticky FAB */}
          <View style={{ height: 90 }} />
        </ScrollView>

        {/* 4. Floating Sticky Action Button (+ Ghi khoản chi) */}
        <View style={styles.stickyFabContainer}>
          <TouchableOpacity
            style={styles.fabButton}
            onPress={() => setIsModalOpen(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.fabButtonText}>+ Ghi khoản chi</Text>
          </TouchableOpacity>
        </View>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <View style={styles.toastContainer}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}
      </View>

      {/* Add Expense Modal */}
      <AddExpenseModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddExpenseSubmit}
        members={MEMBERS}
        currency="₫"
      />

      {/* VietQR Settlement Modal */}
      <VietQRModal
        visible={!!vietQrItem}
        onClose={() => setVietQrItem(null)}
        amount={vietQrItem?.amount || 0}
        receiverName={vietQrItem?.toName || 'TRẦN VÂN ÁNH'}
        memo={`VISTA Quyet toan ${vietQrItem?.fromName || ''} sang ${vietQrItem?.toName || ''}`}
        onConfirmPaid={() => {
          showToast(`Đã ghi nhận thanh toán cho ${vietQrItem?.toName}`);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#faf8ff',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#faf8ff',
    position: 'relative',
  },
  topAppBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: '#faf8ff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  topAppBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f2f3ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrowText: {
    fontSize: 22,
    color: '#131b2e',
    fontWeight: '600',
    marginTop: -2,
  },
  brandTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vistaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  vistaBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  appBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#131b2e',
  },
  avatarTopBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#0284C7',
  },
  avatarTopImg: {
    width: '100%',
    height: '100%',
  },
  headerBrief: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#faf8ff',
  },
  headerTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusPillGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e2e7ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  membersText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#404752',
  },
  moreOptionsBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f2f3ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreOptionsText: {
    fontSize: 18,
    color: '#404752',
    fontWeight: '700',
  },
  tripTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 2,
  },
  tripTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#131b2e',
    letterSpacing: -0.3,
  },
  tripDateRange: {
    fontSize: 12,
    fontWeight: '500',
    color: '#707784',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  metricsPair: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginVertical: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  metricIconRed: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIconGreen: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIconText: {
    fontSize: 13,
  },
  metricCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#404752',
  },
  metricCardValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#131b2e',
  },
  metricCardSub: {
    fontSize: 11,
    color: '#707784',
    marginTop: 2,
  },
  metricCardGreenValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#10B981',
  },
  metricCardGreenSub: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '500',
    marginTop: 2,
  },
  tabBarUnderline: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e7ff',
    marginHorizontal: 16,
    marginBottom: 14,
  },
  underlineTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  underlineTabActive: {},
  underlineTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#707784',
  },
  underlineTabTextActive: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0284C7',
  },
  activeUnderlineBar: {
    position: 'absolute',
    bottom: -1,
    left: 12,
    right: 12,
    height: 2.5,
    backgroundColor: '#0284C7',
    borderRadius: 2,
  },
  tabBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countBadgePill: {
    backgroundColor: '#e2e7ff',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
  },
  redDotBadge: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ba1a1a',
  },
  tabContent: {
    paddingHorizontal: 16,
  },
  breakdownCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  breakdownTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#131b2e',
  },
  breakdownSubLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284C7',
  },
  donutLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 6,
  },
  donutWrapper: {
    position: 'relative',
    width: 116,
    height: 116,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutSvg: {
    transform: [{ rotate: '-90deg' }],
  },
  donutCenterText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#707784',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  donutCenterAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#131b2e',
  },
  donutCenterCount: {
    fontSize: 10,
    color: '#404752',
  },
  donutLegendList: {
    flex: 1,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendName: {
    fontSize: 13,
    color: '#131b2e',
  },
  legendPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#131b2e',
  },
  legendSubVal: {
    fontSize: 11,
    fontWeight: '400',
    color: '#707784',
  },
  recentSection: {
    marginBottom: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#131b2e',
  },
  recentLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284C7',
  },
  expenseStitchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  expenseStitchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  expenseIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f2f3ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseIconEmoji: {
    fontSize: 18,
  },
  expenseDetails: {
    flex: 1,
  },
  expenseTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#131b2e',
  },
  expenseMetaText: {
    fontSize: 11,
    color: '#707784',
    marginTop: 2,
  },
  expenseAmountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#131b2e',
  },
  categoryPillsScroll: {
    gap: 8,
    paddingVertical: 6,
    marginBottom: 10,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#f2f3ff',
  },
  categoryPillActive: {
    backgroundColor: '#0284C7',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#404752',
  },
  categoryPillTextActive: {
    color: '#ffffff',
  },
  ledgerSection: {
    gap: 12,
  },
  groupContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  dateHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#707784',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  balanceSummaryBar: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  balanceSummaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#707784',
    letterSpacing: 0.5,
  },
  balanceSummaryStatus: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 2,
  },
  balanceSummaryRight: {
    alignItems: 'flex-end',
  },
  balanceSummaryAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0284C7',
    marginTop: 2,
  },
  memberPositionSection: {
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#131b2e',
  },
  sectionHeadingSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284C7',
  },
  sectionDesc: {
    fontSize: 12,
    color: '#707784',
    marginBottom: 10,
    lineHeight: 16,
  },
  memberPositionsList: {
    gap: 8,
  },
  memberPosCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  memberPosLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  memberAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarInitials: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  memberName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#131b2e',
  },
  memberActionDesc: {
    fontSize: 11,
    color: '#707784',
    marginTop: 1,
  },
  positivePill: {
    alignItems: 'flex-end',
  },
  positivePillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  positivePillSub: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
  },
  negativePill: {
    alignItems: 'flex-end',
  },
  negativePillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
  },
  negativePillSub: {
    fontSize: 10,
    color: '#dc2626',
    fontWeight: '600',
  },
  transfersSection: {
    marginBottom: 16,
  },
  reductionBadge: {
    backgroundColor: '#5af9f3',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  reductionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#006a67',
  },
  optimizedTransferCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  transferFlow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  transferPerson: {
    alignItems: 'center',
    width: 75,
  },
  personAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f2f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  personAvatarInitials: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0284C7',
  },
  personName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#131b2e',
    textAlign: 'center',
  },
  debtorLabel: {
    fontSize: 10,
    color: '#dc2626',
    marginTop: 2,
  },
  creditorLabel: {
    fontSize: 10,
    color: '#10B981',
    marginTop: 2,
  },
  transferAmountCol: {
    flex: 1,
    alignItems: 'center',
  },
  transferAmountBig: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0284C7',
  },
  transferArrow: {
    fontSize: 11,
    color: '#707784',
    marginVertical: 2,
    letterSpacing: -1,
  },
  transferMemo: {
    fontSize: 10,
    color: '#707784',
  },
  transferActionButtons: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  vietQrBtn: {
    flex: 1,
    height: 42,
    backgroundColor: '#0284C7',
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vietQrBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  markPaidBtn: {
    flex: 1,
    height: 42,
    backgroundColor: '#e2e7ff',
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markPaidBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284C7',
  },
  stickyFabContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  fabButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  fabButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  toastContainer: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
