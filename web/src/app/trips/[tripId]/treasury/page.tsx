'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Home,
  BookOpen,
  Scale,
  Compass,
  BarChart3,
  Search,
  Bell,
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import type {
  TripDetail,
  TripMember,
  Expense,
  TripExpenseSummary,
  CreateExpensePayload,
} from '@/features/budget/types';
import { TripHeader } from '@/features/budget/components/TripHeader';
import { FinancialKpiCards } from '@/features/budget/components/FinancialKpiCards';
import { ExpenseCategoryDonut } from '@/features/budget/components/ExpenseCategoryDonut';
import { DebtSettlementMatrix } from '@/features/budget/components/DebtSettlementMatrix';
import { ExpenseLedgerTable } from '@/features/budget/components/ExpenseLedgerTable';
import { AddExpenseDrawer } from '@/features/budget/components/AddExpenseDrawer';
import { SkeletonKpiGrid, SkeletonTableRows } from '@/components/common/Skeleton';
import styles from '@/features/budget/treasury.module.css';

interface TreasuryPageProps {
  params: Promise<{ tripId: string }>;
}

export default function TripTreasuryPage({ params }: TreasuryPageProps) {
  const resolvedParams = use(params);
  const tripId = resolvedParams.tripId;
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('vista_token');
      if (!token) {
        setIsAuthenticated(false);
        router.replace('/login?returnUrl=' + encodeURIComponent(`/trips/${tripId}/treasury`));
      } else {
        setIsAuthenticated(true);
        if (!document.cookie.includes('vista_token=')) {
          document.cookie = `vista_token=${token}; path=/; max-age=604800; SameSite=Lax`;
        }
      }
    }
  }, [router, tripId]);

  // State
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<TripExpenseSummary | null>(null);

  // UI State
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('u-me');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeNavTab, setActiveNavTab] = useState<'OVERVIEW' | 'LEDGER' | 'DEBT' | 'REPORT'>('OVERVIEW');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Compute summary dynamically from expenses & members
  const computeSummary = useCallback(
    (expList: Expense[], targetBudget: number, memList: TripMember[]): TripExpenseSummary => {
      const totalSpent = expList.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      const remainingBudget = targetBudget - totalSpent;
      const spentPercentage = targetBudget > 0 ? Math.min(100, Math.round((totalSpent / targetBudget) * 100)) : 0;

      // Settlement deltas: calculate net credit/debit for each member
      const settlementDeltas: Record<string, number> = {};
      memList.forEach((m) => {
        settlementDeltas[m.userId] = 0;
      });

      expList.forEach((exp) => {
        const amt = Number(exp.amount) || 0;
        // Payer gets credited
        if (settlementDeltas[exp.paidBy] !== undefined) {
          settlementDeltas[exp.paidBy] += amt;
        }

        // Each split member gets debited
        if (exp.splits && exp.splits.length > 0) {
          exp.splits.forEach((s) => {
            const share = Number(s.shareAmount) || 0;
            if (settlementDeltas[s.userId] !== undefined) {
              settlementDeltas[s.userId] -= share;
            }
          });
        } else if (memList.length > 0) {
          // Equal split fallback
          const perPerson = amt / memList.length;
          memList.forEach((m) => {
            settlementDeltas[m.userId] -= perPerson;
          });
        }
      });

      // Compute minimum suggested transfers
      const creditors: Array<{ userId: string; amount: number }> = [];
      const debtors: Array<{ userId: string; amount: number }> = [];

      Object.entries(settlementDeltas).forEach(([uid, val]) => {
        const rounded = Math.round(val);
        if (rounded > 1000) {
          creditors.push({ userId: uid, amount: rounded });
        } else if (rounded < -1000) {
          debtors.push({ userId: uid, amount: -rounded });
        }
      });

      const suggestedTransfers: Array<{ fromUserId: string; toUserId: string; amount: number }> = [];
      let cIdx = 0;
      let dIdx = 0;

      while (cIdx < creditors.length && dIdx < debtors.length) {
        const cred = creditors[cIdx];
        const deb = debtors[dIdx];
        const settleAmt = Math.min(cred.amount, deb.amount);

        suggestedTransfers.push({
          fromUserId: deb.userId,
          toUserId: cred.userId,
          amount: settleAmt,
        });

        cred.amount -= settleAmt;
        deb.amount -= settleAmt;

        if (cred.amount <= 1000) cIdx++;
        if (deb.amount <= 1000) dIdx++;
      }

      return {
        tripId,
        totalSpent,
        budgetTotal: targetBudget,
        remainingBudget,
        spentPercentage,
        currency: 'VND',
        settlementDeltas,
        suggestedTransfers,
      };
    },
    [tripId]
  );

  // Load treasury data exclusively from the backend/database.
  const loadTreasuryData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);

      // 1. Get current logged in user
      let myId = 'u-me';
      try {
        const userStr = localStorage.getItem('vista_user');
        if (userStr) {
          const u = JSON.parse(userStr);
          if (u.id) myId = u.id;
        }
      } catch { }
      setCurrentUserId(myId);

      // Persisted trip IDs are UUIDs. Legacy/demo IDs must never be rendered.
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tripId);
      if (!isUuid) throw new Error('Chuyến đi này không tồn tại trong database.');

      const [serverTrip, serverMembers, apiExpenses] = await Promise.all([
        apiRequest<any>(`/trips/${tripId}`),
        apiRequest<any[]>(`/trips/${tripId}/members`),
        apiRequest<any[]>(`/trips/${tripId}/expenses`),
      ]);

      const activeTrip: TripDetail = {
        id: String(serverTrip.id),
        title: serverTrip.title || '',
        startDate: serverTrip.startDate || '',
        endDate: serverTrip.endDate || '',
        destinationSummary: serverTrip.destinationSummary || '',
        budgetTotal: Number(serverTrip.budgetTotal) || 0,
        currency: serverTrip.currency || 'VND',
        status: serverTrip.status || '',
        ownerId: String(serverTrip.ownerId || ''),
        coverImageUrl: serverTrip.coverImageUrl,
        description: serverTrip.description,
      };
      const activeMembers: TripMember[] = Array.isArray(serverMembers)
        ? serverMembers.map((m: any) => ({
            userId: String(m.userId),
            displayName: m.displayName || '',
            email: m.email || '',
            role: m.role === 'OWNER' ? 'OWNER' : 'MEMBER',
            budgetShare: Number(m.budgetShare) || 0,
          }))
        : [];

      setTrip(activeTrip);
      setMembers(activeMembers);

      if (typeof window !== 'undefined' && activeTrip?.id) {
        try {
          localStorage.setItem('vista_last_trip_id', activeTrip.id);
          window.dispatchEvent(new CustomEvent('vista-trip-selected', { detail: activeTrip.id }));
        } catch { }
      }

      // 3. Map expense rows returned by the database-backed API.
      const loadedExpenses: Expense[] = Array.isArray(apiExpenses) ? apiExpenses.map((e: any) => ({
        id: String(e.id), tripId: String(e.tripId), title: String(e.title), amount: Number(e.amount),
        currency: e.currency || 'VND', paidBy: String(e.paidBy), category: e.category || 'OTHER',
        occurredAt: e.occurredAt || '', status: e.status || '', createdAt: e.createdAt || '',
        splits: Array.isArray(e.splits) ? e.splits.map((s: any) => ({
          id: String(s.id), userId: String(s.userId), shareAmount: Number(s.shareAmount),
          settledStatus: s.settledStatus || 'UNSETTLED',
        })) : [], version: e.version,
      })) : [];
      let loadedBackendSummary: TripExpenseSummary | null = null;
      try {
        const apiSum = await apiRequest<any>(`/trips/${activeTrip.id}/expenses/summary`);
        if (apiSum) {
              loadedBackendSummary = {
                tripId: activeTrip.id,
                totalSpent: Number(apiSum.totalSpent) || 0,
                budgetTotal: Number(apiSum.budgetTotal) || activeTrip.budgetTotal,
                remainingBudget: Number(apiSum.remainingBudget) || 0,
                spentPercentage: Number(apiSum.spentPercentage) || 0,
                currency: apiSum.currency || 'VND',
                settlementDeltas: apiSum.settlementDeltas || {},
                suggestedTransfers: Array.isArray(apiSum.suggestedTransfers)
                  ? apiSum.suggestedTransfers.map((t: any) => ({
                    fromUserId: String(t.fromUserId),
                    toUserId: String(t.toUserId),
                    amount: Number(t.amount),
                  }))
                  : [],
              };
        }
      } catch { /* The local calculation still uses only database rows. */ }

      setExpenses(loadedExpenses);

      // 4. Set summary: Prioritize backend calculated summary if available, else compute locally
      if (loadedBackendSummary) {
        setSummary(loadedBackendSummary);
      } else {
        const sum = computeSummary(loadedExpenses, activeTrip.budgetTotal, activeMembers);
        setSummary(sum);
      }
    } catch (err) {
      console.warn('Notice: Could not load treasury data from backend:', err);
      setTrip(null);
      setMembers([]);
      setExpenses([]);
      setSummary(null);
      setLoadError(err instanceof Error ? err.message : 'Không thể kết nối đến máy chủ Thủ quỹ.');
    } finally {
      setLoading(false);
    }
  }, [tripId, computeSummary]);

  useEffect(() => {
    loadTreasuryData();
  }, [loadTreasuryData]);

  // Handle Create Expense
  const handleCreateExpense = async (payload: CreateExpensePayload) => {
    if (!trip) return;
    try {
      await apiRequest(`/trips/${trip.id}/expenses`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      await loadTreasuryData();
      setIsDrawerOpen(false);
      showToast(`Đã lưu khoản chi "${payload.title}" vào database.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể lưu khoản chi vào database.');
    }
  };

  // Handle Delete Expense
  const handleDeleteExpense = async (expenseId: string) => {
    if (!trip) return;

    try {
      await apiRequest(`/trips/${trip.id}/expenses/${expenseId}`, { method: 'DELETE' });
      await loadTreasuryData();
      showToast('Đã xóa khoản chi khỏi database.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể xóa khoản chi khỏi database.');
    }
  };

  if (isAuthenticated !== true) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
            Yêu cầu đăng nhập
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            Bạn cần đăng nhập để truy cập Sổ quỹ chuyến đi. Đang chuyển hướng...
          </p>
        </div>
      </div>
    );
  }

  // Filter expenses matching search input
  const filteredExpenses = expenses.filter((e) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const payer = members.find((m) => m.userId === e.paidBy)?.displayName || '';
    return (
      e.title.toLowerCase().includes(q) ||
      payer.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className={styles.vistaTreasuryPage}>
      <div className={styles.vistaTreasuryContainer}>
        {/* 0. Secondary Sub-Navbar Toolbar (Matching Reference Design) */}
        <div className={styles.vistaSubNav}>
          <div className={styles.vistaSubNavTabs}>
            <button
              type="button"
              className={`${styles.vistaSubNavTab} ${activeNavTab === 'OVERVIEW' ? styles.vistaSubNavTabActive : ''
                }`}
              onClick={() => {
                setActiveNavTab('OVERVIEW');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <Home size={14} />
              <span>Tổng quan</span>
            </button>

            <button
              type="button"
              className={`${styles.vistaSubNavTab} ${activeNavTab === 'LEDGER' ? styles.vistaSubNavTabActive : ''
                }`}
              onClick={() => {
                setActiveNavTab('LEDGER');
                document
                  .getElementById('nhat-ky-chi-tieu')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <BookOpen size={14} />
              <span>Nhật ký chi tiêu</span>
            </button>

            <button
              type="button"
              className={`${styles.vistaSubNavTab} ${activeNavTab === 'DEBT' ? styles.vistaSubNavTabActive : ''
                }`}
              onClick={() => {
                setActiveNavTab('DEBT');
                document
                  .getElementById('doi-soat-cong-no')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Scale size={14} />
              <span>Đối soát công nợ</span>
            </button>

            <Link
              href={`/trips/${tripId}`}
              className={styles.vistaSubNavTab}
              title="Xem lịch trình chi tiết"
            >
              <Compass size={14} />
              <span>Lịch trình</span>
            </Link>

            <button
              type="button"
              className={`${styles.vistaSubNavTab} ${activeNavTab === 'REPORT' ? styles.vistaSubNavTabActive : ''
                }`}
              onClick={() => {
                setActiveNavTab('REPORT');
                document
                  .getElementById('tong-quan-chuyen-di')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <BarChart3 size={14} />
              <span>Báo cáo</span>
            </button>
          </div>

          <div className={styles.vistaSubNavRight}>
            <div className={styles.vistaSubNavSearchWrapper}>
              <Search size={14} className={styles.vistaSubNavSearchIcon} />
              <input
                type="text"
                className={styles.vistaSubNavSearchInput}
                placeholder="Tìm kiếm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              type="button"
              className={styles.vistaSubNavBellBtn}
              title="Thông báo chuyến đi"
            >
              <Bell size={15} />
            </button>
          </div>
        </div>

        {loading ? (
          <>
            <SkeletonKpiGrid />
            <SkeletonTableRows count={5} />
          </>
        ) : loadError ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#475569' }}>
            <h2 style={{ color: '#0f172a', marginBottom: 8 }}>Chưa thể tải sổ quỹ</h2>
            <p style={{ marginBottom: 20 }}>
              Vui lòng kiểm tra kết nối và thử lại sau ít phút.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                className={styles.vistaBtnPrimary}
                onClick={loadTreasuryData}
              >
                Thử lại
              </button>
              <Link href="/trips" className={styles.vistaBtnPrimary}>
                Quay lại chuyến đi
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* 1. Trip Panoramic Banner */}
            {trip && (
              <TripHeader
                trip={trip}
                memberCount={members.length}
                expenses={expenses}
                members={members}
                onOpenAddExpense={() => setIsDrawerOpen(true)}
              />
            )}

            {/* 2. Top Row: Ngân sách chuyến đi (Left) & Đối soát công nợ (Right) */}
            {summary && (
              <div className={styles.vistaGridRowTop}>
                <FinancialKpiCards
                  summary={summary}
                  memberCount={members.length}
                  currentUserId={currentUserId}
                  members={members}
                  tripTitle={trip?.title}
                  tripDates={
                    trip?.startDate && trip?.endDate
                      ? `${trip.startDate} – ${trip.endDate}`
                      : 'Chưa thiết lập ngày'
                  }
                />
                <div id="doi-soat-cong-no">
                  <DebtSettlementMatrix
                    summary={summary}
                    members={members}
                    currentUserId={currentUserId}
                    tripId={trip?.id || 'VISTA'}
                  />
                </div>
              </div>
            )}

            {/* 3. Bottom Row: Nhật ký chi tiêu (Left) & Tổng quan chuyến đi (Right) */}
            <div className={styles.vistaGridRowBottom}>
              <div id="nhat-ky-chi-tieu">
                <ExpenseLedgerTable
                  expenses={filteredExpenses}
                  members={members}
                  currentUserId={currentUserId}
                  onOpenAddExpense={() => setIsDrawerOpen(true)}
                  onDeleteExpense={handleDeleteExpense}
                />
              </div>
              {summary && (
                <div id="tong-quan-chuyen-di">
                  <ExpenseCategoryDonut
                    expenses={expenses}
                    totalSpent={summary.totalSpent ?? 0}
                    remainingBudget={
                      summary.remainingBudget ??
                      ((trip?.budgetTotal || 0) - (summary.totalSpent ?? 0))
                    }
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* 4. Slide-Over Add Expense Drawer */}
        <AddExpenseDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          members={members}
          currentUserId={currentUserId}
          onSubmit={handleCreateExpense}
        />

        {/* 5. Toast Notification */}
        {toastMessage && (
          <div className={styles.toastNotification}>
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
