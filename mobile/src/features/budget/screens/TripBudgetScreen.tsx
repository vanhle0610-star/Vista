import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ImageBackground,
  RefreshControl,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { tokens } from '../../../theme/tokens';
import { BudgetSummaryCard } from '../components/BudgetSummaryCard';
import { SettlementDeltaRow, SettlementTransferItem } from '../components/SettlementDeltaRow';
import { ExpenseItem, ExpenseCategoryKey } from '../components/ExpenseItem';
import { AddExpenseModal, AddExpensePayload } from '../components/AddExpenseModal';
import { useTripExpenses } from '../hooks/useTripExpenses';

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
    title: 'Hải sản Năm Đảnh',
    amount: 1850000,
    paidById: 'va',
    paidByName: 'Vân Ánh',
    category: 'FOOD',
    splitType: 'Split equally',
    occurredAt: '2026-10-19T18:30:00Z',
    participantIds: ['va', 'tu', 'hn', 'th'],
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&q=80',
    dateGroup: 'TODAY',
  },
  {
    id: '2',
    title: 'Khách sạn Novotel Bạch Đằng',
    amount: 3600000,
    paidById: 'tu',
    paidByName: 'Tuấn Anh',
    category: 'ACCOMMODATION',
    splitType: 'Split equally',
    occurredAt: '2026-10-19T14:00:00Z',
    participantIds: ['va', 'tu', 'hn', 'th'],
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300&q=80',
    dateGroup: 'TODAY',
  },
  {
    id: '3',
    title: 'Vé cano Cù Lao Chàm',
    amount: 1400000,
    paidById: 'hn',
    paidByName: 'Hải Nam',
    category: 'ACTIVITIES',
    splitType: 'Split equally',
    occurredAt: '2026-10-18T09:15:00Z',
    participantIds: ['va', 'tu', 'hn', 'th'],
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&q=80',
    dateGroup: 'YESTERDAY',
  },
  {
    id: '4',
    title: 'Taxi sân bay Đà Nẵng',
    amount: 220000,
    paidById: 'tu',
    paidByName: 'Tuấn Anh',
    category: 'TRANSPORT',
    splitType: 'Split equally',
    occurredAt: '2026-10-18T07:45:00Z',
    participantIds: ['va', 'tu', 'hn', 'th'],
    imageUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=300&q=80',
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
  { id: 'va', name: 'Vân Ánh', initials: 'VA' },
  { id: 'tu', name: 'Tuấn Anh', initials: 'TA' },
  { id: 'hn', name: 'Hải Nam', initials: 'HN' },
  { id: 'th', name: 'Thanh Hằng', initials: 'TH' },
];

export interface TripBudgetScreenProps {
  tripId?: string;
  budgetTotal?: number;
}

export function TripBudgetScreen({
  tripId = '00000000-0000-0000-0000-000000000001',
  budgetTotal = 25000000,
}: TripBudgetScreenProps) {
  const {
    expenses: apiExpenses,
    summary,
    isLoading,
    reload,
    addExpense: addExpenseApi,
  } = useTripExpenses(tripId, budgetTotal);

  const [localExpenses, setLocalExpenses] = useState<LedgerExpense[]>(INITIAL_EXPENSES);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
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
        paidByName: e.paidBy === '00000000-0000-0000-0000-000000000001' ? 'Vân Ánh' : 'Tuấn Anh',
        category: e.category || 'OTHER',
        splitType: 'Split equally',
        occurredAt: e.occurredAt,
        participantIds: ['va', 'tu', 'hn', 'th'],
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
      // Gracefully handled by local state
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0b1329" />

      <View style={styles.mobileShell}>
        {/* Da Nang scenic background subtle header */}
      <ImageBackground
        source={{
          uri: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200&q=80',
        }}
        style={styles.scenicHeaderBackground}
        imageStyle={styles.scenicImage}
      >
        <LinearGradient
          colors={[
            'rgba(11, 19, 41, 0.45)',
            'rgba(11, 19, 41, 0.85)',
            '#0b1329',
          ]}
          style={StyleSheet.absoluteFill}
        />

        {/* Top Bar Header */}
        <View style={styles.topBar}>
          <View style={styles.brandingCol}>
            <View style={styles.logoRow}>
              <View style={styles.logoDiamond} />
              <Text style={styles.logoText}>VISTA</Text>
            </View>
            <Text style={styles.tripTitle}>ĐÀ NẴNG & HỘI AN</Text>
            <Text style={styles.tripSubtitle}>4 NGÀY 3 ĐÊM • 4 THÀNH VIÊN</Text>
          </View>

          <View style={styles.topActionsCol}>
            <View style={styles.activePill}>
              <View style={styles.activeDot} />
              <Text style={styles.activePillText}>ĐANG DIỄN RA</Text>
            </View>
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.headerActionBtn}
                onPress={() => showToast('Đang tạo báo cáo chi tiêu...')}
              >
                <Text style={styles.headerActionText}>BÁO CÁO</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.headerActionBtn}
                onPress={() => showToast('Cài đặt quỹ chuyến đi')}
              >
                <Text style={styles.headerActionText}>CÀI ĐẶT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ImageBackground>

      {/* Main Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={reload}
            tintColor="#38BDF8"
            colors={['#38BDF8']}
          />
        }
      >
        {/* 1. The Luminous Hero Card */}
        <BudgetSummaryCard
          totalSpent={totalSpent}
          budgetTotal={budgetTotal}
          currency="₫"
        />

        {/* 2. Settlement Deltas & Transfers ("Vị thế tài chính của bạn") */}
        <SettlementDeltaRow
          myBalance={1250000}
          onCopyAccount={handleCopyAccount}
        />

        {/* 3. Category Filter Pills */}
        <View style={styles.categoryFiltersContainer}>
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
                  style={[
                    styles.categoryPill,
                    isActive && styles.categoryPillActive,
                  ]}
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
        </View>

        {/* 4. Expense Ledger Feed */}
        <View style={styles.ledgerSection}>
          {/* Today Group */}
          {todayExpenses.length > 0 && (
            <View style={styles.groupContainer}>
              <View style={styles.dateHeaderRow}>
                <Text style={styles.dateHeaderText}>HÔM NAY • 19 THÁNG 10</Text>
              </View>
              {todayExpenses.map((item, idx) => (
                <ExpenseItem
                  key={item.id}
                  title={item.title}
                  amount={item.amount}
                  currency="₫"
                  paidByName={item.paidByName}
                  category={item.category}
                  participantCount={item.participantIds.length}
                  imageUrl={item.imageUrl}
                  isLast={idx === todayExpenses.length - 1 && yesterdayExpenses.length === 0}
                  onPress={() => showToast(`Chi tiết: ${item.title}`)}
                />
              ))}
            </View>
          )}

          {/* Yesterday Group */}
          {yesterdayExpenses.length > 0 && (
            <View style={styles.groupContainer}>
              <View style={styles.dateHeaderRow}>
                <Text style={styles.dateHeaderText}>HÔM QUA • 18 THÁNG 10</Text>
              </View>
              {yesterdayExpenses.map((item, idx) => (
                <ExpenseItem
                  key={item.id}
                  title={item.title}
                  amount={item.amount}
                  currency="₫"
                  paidByName={item.paidByName}
                  category={item.category}
                  participantCount={item.participantIds.length}
                  imageUrl={item.imageUrl}
                  isLast={idx === yesterdayExpenses.length - 1}
                  onPress={() => showToast(`Chi tiết: ${item.title}`)}
                />
              ))}
            </View>
          )}

          {filteredExpenses.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Chưa có khoản chi nào trong mục này</Text>
            </View>
          )}
        </View>

        {/* Bottom spacer so list doesn't get covered by sticky action button */}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* 5. Sticky Floating Action Bar at Bottom */}
      <View style={styles.stickyBottomBar}>
        <LinearGradient
          colors={['transparent', 'rgba(11, 19, 41, 0.92)', '#0b1329']}
          style={styles.bottomBarSheen}
        />
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.floatingActionButton}
          onPress={() => setIsModalOpen(true)}
        >
          <LinearGradient
            colors={['#0984e3', '#00cec9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionButtonGradient}
          >
            <Text style={styles.actionButtonPlus}>+</Text>
            <Text style={styles.actionButtonText}>GHI KHOẢN CHI MỚI</Text>
          </LinearGradient>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#060d1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileShell: {
    width: '100%',
    maxWidth: 480,
    flex: 1,
    backgroundColor: '#0b1329',
    position: 'relative',
    overflow: 'hidden',
    borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
    borderRightWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: 'rgba(9, 132, 227, 0.25)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  scenicHeaderBackground: {
    paddingTop: Platform.OS === 'android' ? 24 : 10,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  scenicImage: {
    opacity: 0.35,
    resizeMode: 'cover',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brandingCol: {
    flex: 1,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  logoDiamond: {
    width: 9,
    height: 9,
    borderRadius: 2,
    backgroundColor: '#00cec9',
    transform: [{ rotate: '45deg' }],
    marginRight: 6,
  },
  logoText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#00cec9',
    letterSpacing: 1.5,
  },
  tripTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  tripSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
  topActionsCol: {
    alignItems: 'flex-end',
    gap: 8,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 184, 148, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(0, 184, 148, 0.35)',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00b894',
    marginRight: 5,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#55efc4',
    letterSpacing: 0.5,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  headerActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 32, 68, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(9, 132, 227, 0.3)',
  },
  headerActionText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#81ecec',
    letterSpacing: 0.4,
  },
  categoryFiltersContainer: {
    marginVertical: 10,
  },
  categoryPillsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 32, 68, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(9, 132, 227, 0.3)',
  },
  categoryPillActive: {
    backgroundColor: '#0984e3',
    borderColor: '#00cec9',
    shadowColor: '#00cec9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.4,
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  ledgerSection: {
    marginTop: 6,
  },
  groupContainer: {
    marginBottom: 14,
  },
  dateHeaderRow: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 4,
  },
  dateHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
  },
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    alignItems: 'center',
  },
  bottomBarSheen: {
    position: 'absolute',
    top: -24,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingActionButton: {
    width: '100%',
    borderRadius: 28,
    shadowColor: '#00cec9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 8,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 28,
    gap: 8,
  },
  actionButtonPlus: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  toastContainer: {
    position: 'absolute',
    top: 60,
    left: 24,
    right: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(9, 132, 227, 0.95)',
    borderWidth: 1,
    borderColor: '#00cec9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    zIndex: 9999,
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
});
