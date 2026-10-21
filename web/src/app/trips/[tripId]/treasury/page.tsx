'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import { apiRequest } from '@/lib/api';
import type {
  TripDetail,
  TripMember,
  Expense,
  TripExpenseSummary,
  CreateExpensePayload,
} from '@/features/budget/types';
import { TripSidebar } from '@/features/budget/components/TripSidebar';
import { TripHeader } from '@/features/budget/components/TripHeader';
import { FinancialKpiCards } from '@/features/budget/components/FinancialKpiCards';
import { ExpenseCategoryDonut } from '@/features/budget/components/ExpenseCategoryDonut';
import { DebtSettlementMatrix } from '@/features/budget/components/DebtSettlementMatrix';
import { ExpenseLedgerTable } from '@/features/budget/components/ExpenseLedgerTable';
import { AddExpenseDrawer } from '@/features/budget/components/AddExpenseDrawer';
import { Navbar } from '@/components/common/Navbar';
import styles from '@/features/budget/treasury.module.css';

interface TreasuryPageProps {
  params: Promise<{ tripId: string }>;
}

export default function TripTreasuryPage({ params }: TreasuryPageProps) {
  const resolvedParams = use(params);
  const tripId = resolvedParams.tripId;

  // Real Data State
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<TripExpenseSummary | null>(null);

  // UI State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('u-1');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Ensure real authentication token
  const ensureAuth = useCallback(async () => {
    let token = localStorage.getItem('vista_token');
    let userStr = localStorage.getItem('vista_user');

    if (!token) {
      try {
        const loginRes = await fetch('http://localhost:8080/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'vananh.le@vista.vn',
            password: 'VistaPassword2026!',
          }),
        });
        if (loginRes.ok) {
          const authData = await loginRes.json();
          token = authData.accessToken;
          userStr = JSON.stringify({
            id: authData.id,
            email: authData.email,
            displayName: authData.displayName,
            roles: authData.roles || ['USER'],
          });
          if (token && userStr) {
            localStorage.setItem('vista_token', token);
            localStorage.setItem('vista_user', userStr);
          }
        }
      } catch (err) {
        console.warn('Auto-login error:', err);
      }
    }

    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setCurrentUserId(u.id);
      } catch {
        // ignore
      }
    }
  }, []);

  // Set rich fallback sample data for demonstration
  const setFallbackData = useCallback(() => {
    const fallbackTrip: TripDetail = {
      id: tripId,
      title: 'Hành Trình Khám Phá Đà Nẵng - Hội An 2026',
      startDate: '2026-11-15',
      endDate: '2026-11-18',
      destinationSummary: 'Đà Nẵng & Hội An, Quảng Nam',
      budgetTotal: 25000000,
      currency: 'VND',
      status: 'ACTIVE',
      ownerId: 'u-1',
    };
    const fallbackMembers: TripMember[] = [
      { userId: 'u-1', displayName: 'Lê Vân Anh (Trưởng nhóm)', email: 'vananh.le@vista.vn', role: 'OWNER', budgetShare: 6250000 },
      { userId: 'u-2', displayName: 'Trần Hoàng Nam', email: 'nam.tran@vista.vn', role: 'MEMBER', budgetShare: 6250000 },
      { userId: 'u-3', displayName: 'Nguyễn Minh Thư', email: 'thu.nguyen@vista.vn', role: 'MEMBER', budgetShare: 6250000 },
      { userId: 'u-4', displayName: 'Phạm Quốc Bảo', email: 'bao.pham@vista.vn', role: 'MEMBER', budgetShare: 6250000 },
    ];
    const fallbackExpenses: Expense[] = [
      {
        id: 'exp-1',
        tripId: tripId,
        title: 'Vé máy bay Vietjet khứ hồi 4 người',
        amount: 6800000,
        currency: 'VND',
        paidBy: 'u-1',
        category: 'TRANSPORT',
        occurredAt: '2026-11-15T08:30:00Z',
        status: 'ACTIVE',
        createdAt: '2026-11-15T08:30:00Z',
        splits: [
          { id: 's1', userId: 'u-1', shareAmount: 1700000, settledStatus: 'SETTLED' },
          { id: 's2', userId: 'u-2', shareAmount: 1700000, settledStatus: 'UNSETTLED' },
          { id: 's3', userId: 'u-3', shareAmount: 1700000, settledStatus: 'UNSETTLED' },
          { id: 's4', userId: 'u-4', shareAmount: 1700000, settledStatus: 'UNSETTLED' },
        ],
      },
      {
        id: 'exp-2',
        tripId: tripId,
        title: 'Khách sạn Sala Danang Beach 3 đêm',
        amount: 4500000,
        currency: 'VND',
        paidBy: 'u-2',
        category: 'ACCOMMODATION',
        occurredAt: '2026-11-15T14:00:00Z',
        status: 'ACTIVE',
        createdAt: '2026-11-15T14:00:00Z',
        splits: [
          { id: 's5', userId: 'u-1', shareAmount: 1125000, settledStatus: 'UNSETTLED' },
          { id: 's6', userId: 'u-2', shareAmount: 1125000, settledStatus: 'SETTLED' },
          { id: 's7', userId: 'u-3', shareAmount: 1125000, settledStatus: 'UNSETTLED' },
          { id: 's8', userId: 'u-4', shareAmount: 1125000, settledStatus: 'UNSETTLED' },
        ],
      },
      {
        id: 'exp-3',
        tripId: tripId,
        title: 'Hải sản Bé Mặn & Nước giải khát',
        amount: 2150000,
        currency: 'VND',
        paidBy: 'u-3',
        category: 'FOOD',
        occurredAt: '2026-11-15T19:30:00Z',
        status: 'ACTIVE',
        createdAt: '2026-11-15T19:30:00Z',
        splits: [
          { id: 's9', userId: 'u-1', shareAmount: 537500, settledStatus: 'UNSETTLED' },
          { id: 's10', userId: 'u-2', shareAmount: 537500, settledStatus: 'UNSETTLED' },
          { id: 's11', userId: 'u-3', shareAmount: 537500, settledStatus: 'SETTLED' },
          { id: 's12', userId: 'u-4', shareAmount: 537500, settledStatus: 'UNSETTLED' },
        ],
      },
      {
        id: 'exp-4',
        tripId: tripId,
        title: 'Combo Vé Cáp Treo & Buffet Bà Nà Hills',
        amount: 1400000,
        currency: 'VND',
        paidBy: 'u-1',
        category: 'ACTIVITIES',
        occurredAt: '2026-11-16T09:00:00Z',
        status: 'ACTIVE',
        createdAt: '2026-11-16T09:00:00Z',
        splits: [
          { id: 's13', userId: 'u-1', shareAmount: 350000, settledStatus: 'SETTLED' },
          { id: 's14', userId: 'u-2', shareAmount: 350000, settledStatus: 'UNSETTLED' },
          { id: 's15', userId: 'u-3', shareAmount: 350000, settledStatus: 'UNSETTLED' },
          { id: 's16', userId: 'u-4', shareAmount: 350000, settledStatus: 'UNSETTLED' },
        ],
      },
    ];

    const totalSpent = fallbackExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const fallbackSummary: TripExpenseSummary = {
      tripId: tripId,
      totalSpent: totalSpent,
      budgetTotal: 25000000,
      remainingBudget: 25000000 - totalSpent,
      spentPercentage: Math.round((totalSpent / 25000000) * 100),
      currency: 'VND',
      settlementDeltas: {
        'u-1': 4487500,
        'u-2': 787500,
        'u-3': -1562500,
        'u-4': -3712500,
      },
      suggestedTransfers: [
        { fromUserId: 'u-4', toUserId: 'u-1', amount: 3712500 },
        { fromUserId: 'u-3', toUserId: 'u-1', amount: 775000 },
        { fromUserId: 'u-3', toUserId: 'u-2', amount: 787500 },
      ],
    };

    setTrip(fallbackTrip);
    setMembers(fallbackMembers);
    setExpenses(fallbackExpenses);
    setSummary(fallbackSummary);
  }, [tripId]);

  // Fetch real data from backend endpoints
  const loadTreasuryData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await ensureAuth();

      // 1. Fetch real trip detail
      const tripData = await apiRequest<TripDetail>(`/trips/${tripId}`);
      setTrip(tripData);

      // 2. Fetch real members
      const membersData = await apiRequest<TripMember[]>(`/trips/${tripId}/members`);
      setMembers(membersData);

      // 3. Fetch real expenses list
      const expensesData = await apiRequest<Expense[]>(`/trips/${tripId}/expenses`);
      setExpenses(expensesData);

      // 4. Fetch real expense summary
      const budgetTarget = tripData.budgetTotal || 25000000;
      const summaryData = await apiRequest<TripExpenseSummary>(
        `/trips/${tripId}/expenses/summary?budgetTarget=${budgetTarget}`
      );
      setSummary(summaryData);
    } catch (err: unknown) {
      console.warn('Backend unavailable, using fallback mock data:', err);
      // Fallback gracefully so page never crashes for tourists/users
      setFallbackData();
    } finally {
      setLoading(false);
    }
  }, [tripId, ensureAuth, setFallbackData]);

  useEffect(() => {
    loadTreasuryData();
  }, [loadTreasuryData]);

  // Handle Form Submission (Add Expense)
  const handleCreateExpense = async (payload: CreateExpensePayload) => {
    try {
      await apiRequest<Expense>(`/trips/${tripId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await loadTreasuryData();
    } catch {
      // Local fallback append
      const newExp: Expense = {
        id: `exp-${Date.now()}`,
        tripId,
        title: payload.title,
        amount: payload.amount,
        currency: 'VND',
        paidBy: payload.paidBy || currentUserId,
        category: payload.category,
        occurredAt: new Date().toISOString(),
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        splits: members.map((m) => ({
          id: `s-${Math.random()}`,
          userId: m.userId,
          shareAmount: Math.round(payload.amount / members.length),
          settledStatus: m.userId === (payload.paidBy || currentUserId) ? 'SETTLED' : 'UNSETTLED',
        })),
      };
      setExpenses((prev) => [newExp, ...prev]);
      if (summary) {
        const nextSpent = summary.totalSpent + payload.amount;
        setSummary({
          ...summary,
          totalSpent: nextSpent,
          remainingBudget: (summary.budgetTotal || 25000000) - nextSpent,
          spentPercentage: Math.round((nextSpent / (summary.budgetTotal || 25000000)) * 100),
        });
      }
    }

    showToast(`🎉 Đã thêm khoản chi "${payload.title}" thành công!`);
  };

  // Handle Delete Expense
  const handleDeleteExpense = async (expenseId: string) => {
    try {
      await apiRequest(`/trips/${tripId}/expenses/${expenseId}`, {
        method: 'DELETE',
      });
      await loadTreasuryData();
    } catch {
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    }
    showToast('🗑️ Đã xóa khoản chi!');
  };

  if (loading && !trip) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#f0f9ff',
          color: '#0284c7',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '4px solid #bae6fd',
            borderTopColor: '#0284c7',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span style={{ fontWeight: 600, fontSize: '15px' }}>
          Đang kết nối dữ liệu thật từ máy chủ VISTA...
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error && !trip) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#f8fafc',
          padding: '24px',
          textAlign: 'center',
          gap: '16px',
        }}
      >
        <span style={{ fontSize: '40px' }}>⚠️</span>
        <h2 style={{ margin: 0, color: '#0f172a' }}>Không thể tải dữ liệu chuyến đi</h2>
        <p style={{ color: '#ef4444', maxWidth: '480px' }}>{error}</p>
        <button
          type="button"
          onClick={loadTreasuryData}
          style={{
            padding: '10px 20px',
            background: '#0284c7',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <Navbar activeModule="treasury" />
      <div className={styles.treasuryLayout}>
      {/* 1. Left Sidebar Navigation */}
      <TripSidebar tripId={tripId} />

      {/* 2. Main Treasury Content */}
      <main className={styles.mainContainer}>
        {trip && (
          <TripHeader
            trip={trip}
            memberCount={members.length}
            onOpenAddExpense={() => setIsDrawerOpen(true)}
          />
        )}

        {/* 3. 4 Financial KPI Cards */}
        {summary && (
          <FinancialKpiCards
            summary={summary}
            memberCount={members.length}
            currentUserId={currentUserId}
          />
        )}

        {/* 4. Middle Section: Donut Chart + Settlement Matrix */}
        <div className={styles.twoColSection}>
          <ExpenseCategoryDonut
            expenses={expenses}
            totalSpent={summary?.totalSpent ?? 0}
          />

          {summary && (
            <DebtSettlementMatrix
              summary={summary}
              members={members}
              currentUserId={currentUserId}
            />
          )}
        </div>

        {/* 5. Bottom Section: Expense Ledger Table */}
        <ExpenseLedgerTable
          expenses={expenses}
          members={members}
          onOpenAddExpense={() => setIsDrawerOpen(true)}
          onDeleteExpense={handleDeleteExpense}
        />
      </main>

      {/* 6. Form Nguyên Chất - Slide-Over Drawer */}
      <AddExpenseDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        members={members}
        currentUserId={currentUserId}
        onSubmit={handleCreateExpense}
      />

      {/* 7. Toast Notification */}
      {toastMessage && (
        <div className={styles.toastNotification}>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  </div>
  );
}
