'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { Navbar } from '@/components/common/Navbar';
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('u-me');

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

  // Load Real Data synchronized with local storage & backend
  const loadTreasuryData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Get current logged in user
      let myId = 'u-me';
      let myName = 'Bạn';
      let myEmail = 'ban@vista.vn';
      try {
        const userStr = localStorage.getItem('vista_user');
        if (userStr) {
          const u = JSON.parse(userStr);
          if (u.id) myId = u.id;
          if (u.displayName) myName = u.displayName;
          if (u.email) myEmail = u.email;
        }
      } catch {}
      setCurrentUserId(myId);

      // 2. Lookup trip in vista_custom_trips
      let activeTrip: TripDetail | null = null;
      let activeMembers: TripMember[] = [];

      try {
        const customTripsStr = localStorage.getItem('vista_custom_trips');
        const customTrips = customTripsStr ? JSON.parse(customTripsStr) : [];

        // Match current tripId or pick first trip
        let matched = customTrips.find((t: any) => t.id === tripId);
        if (!matched && customTrips.length > 0) {
          matched = customTrips[0];
          // Keep browser address bar in exact sync with loaded trip
          if (matched && matched.id !== tripId) {
            router.replace(`/trips/${matched.id}/treasury`);
          }
        }

        if (matched) {
          const budget = matched.budgetTotal || 20000000;
          activeTrip = {
            id: matched.id,
            title: matched.title || 'Hành trình VISTA',
            startDate: matched.startDate || '15/11',
            endDate: matched.endDate || '18/11/2026',
            destinationSummary: matched.destination || 'Việt Nam',
            budgetTotal: budget,
            currency: 'VND',
            status: matched.status || 'ACTIVE',
            ownerId: matched.ownerId || matched.members?.[0]?.userId || myId,
          };

          if (Array.isArray(matched.members) && matched.members.length > 0) {
            activeMembers = matched.members.map((m: any, idx: number) => {
              const rawName = m.displayName || m.name || '';
              const cleanName = rawName.replace(/\s*\(Bạn\)/g, '').trim() || (idx === 0 ? myName : `Thành viên ${idx + 1}`);
              const isOwnerMember = idx === 0;
              const isMe = (m.userId && m.userId === myId) || cleanName.toLowerCase() === myName.toLowerCase() || (m.email && m.email.toLowerCase() === myEmail.toLowerCase());
              const memberId = isMe ? myId : (m.userId || (isOwnerMember ? (matched.ownerId || `u-${cleanName}`) : `mem-${idx}`));
              return {
                userId: memberId,
                displayName: cleanName,
                email: isMe ? myEmail : (m.email || `${cleanName.toLowerCase().replace(/\s+/g, '')}@vista.vn`),
                role: m.role || (isOwnerMember ? 'OWNER' : 'MEMBER'),
                budgetShare: Math.round(budget / matched.members.length),
              };
            });
          }
        }
      } catch {}

      // Fallback: If no custom trip exists, create a clean default trip for the current user
      if (!activeTrip) {
        activeTrip = {
          id: tripId,
          title: `Chuyến đi của ${myName}`,
          startDate: '15/11/2026',
          endDate: '18/11/2026',
          destinationSummary: 'Đà Nẵng & Hội An',
          budgetTotal: 20000000,
          currency: 'VND',
          status: 'ACTIVE',
          ownerId: myId,
        };

        activeMembers = [
          {
            userId: myId,
            displayName: myName,
            email: myEmail,
            role: 'OWNER',
            budgetShare: 10000000,
          },
          {
            userId: 'mem-2',
            displayName: 'Bạn đồng hành',
            email: 'donghanh@vista.vn',
            role: 'MEMBER',
            budgetShare: 10000000,
          },
        ];
      }

      if (activeMembers.length === 0) {
        activeMembers = [
          {
            userId: myId,
            displayName: myName,
            email: myEmail,
            role: 'OWNER',
            budgetShare: activeTrip.budgetTotal,
          },
        ];
      }

      setTrip(activeTrip);
      setMembers(activeMembers);

      // 3. Load Real Expenses for this trip
      let loadedExpenses: Expense[] = [];
      try {
        const storedExpensesStr = localStorage.getItem(`vista_expenses_${activeTrip.id}`);
        if (storedExpensesStr) {
          loadedExpenses = JSON.parse(storedExpensesStr);
        }
      } catch {}

      setExpenses(loadedExpenses);

      // 4. Compute real summary
      const sum = computeSummary(loadedExpenses, activeTrip.budgetTotal, activeMembers);
      setSummary(sum);
    } catch (err) {
      console.error('Error loading treasury data:', err);
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

    const payer = payload.paidBy || currentUserId;
    const participants =
      payload.participantIds && payload.participantIds.length > 0
        ? payload.participantIds
        : members.map((m) => m.userId);

    let splits: any[] = [];
    if (payload.splitType === 'EXACT' && payload.exactShares) {
      splits = Object.entries(payload.exactShares).map(([uid, share], idx) => ({
        id: `split-${idx}-${Date.now()}`,
        userId: uid,
        shareAmount: Number(share) || 0,
        settledStatus: uid === payer ? 'SETTLED' : 'UNSETTLED',
      }));
    } else {
      const perShare = Math.round(payload.amount / Math.max(1, participants.length));
      splits = participants.map((uid, idx) => ({
        id: `split-${idx}-${Date.now()}`,
        userId: uid,
        shareAmount: perShare,
        settledStatus: uid === payer ? 'SETTLED' : 'UNSETTLED',
      }));
    }

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      tripId: trip.id,
      title: payload.title,
      amount: payload.amount,
      currency: 'VND',
      paidBy: payer,
      category: payload.category,
      occurredAt: payload.occurredAt || new Date().toISOString(),
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      splits,
    };

    const updatedExpenses = [newExpense, ...expenses];
    setExpenses(updatedExpenses);

    // Persist to localStorage
    try {
      localStorage.setItem(`vista_expenses_${trip.id}`, JSON.stringify(updatedExpenses));

      // Update budgetSpent in vista_custom_trips
      const customTripsStr = localStorage.getItem('vista_custom_trips');
      if (customTripsStr) {
        const list = JSON.parse(customTripsStr);
        const idx = list.findIndex((t: any) => t.id === trip.id);
        if (idx !== -1) {
          const totalSpent = updatedExpenses.reduce((acc, curr) => acc + curr.amount, 0);
          list[idx].budgetSpent = totalSpent;
          list[idx].progressPercent = trip.budgetTotal > 0
            ? Math.min(100, Math.round((totalSpent / trip.budgetTotal) * 100))
            : 0;
          localStorage.setItem('vista_custom_trips', JSON.stringify(list));
        }
      }
    } catch (e) {
      console.warn('Storage save error:', e);
    }

    // Try optional backend sync if authenticated
    try {
      await apiRequest(`/trips/${trip.id}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Ignore if offline / mock mode
    }

    const updatedSummary = computeSummary(updatedExpenses, trip.budgetTotal, members);
    setSummary(updatedSummary);
    setIsDrawerOpen(false);
    showToast(`Đã thêm khoản chi "${payload.title}" thành công!`);
  };

  // Handle Delete Expense
  const handleDeleteExpense = async (expenseId: string) => {
    if (!trip) return;

    const updatedExpenses = expenses.filter((e) => e.id !== expenseId);
    setExpenses(updatedExpenses);

    try {
      localStorage.setItem(`vista_expenses_${trip.id}`, JSON.stringify(updatedExpenses));

      // Update budgetSpent in vista_custom_trips
      const customTripsStr = localStorage.getItem('vista_custom_trips');
      if (customTripsStr) {
        const list = JSON.parse(customTripsStr);
        const idx = list.findIndex((t: any) => t.id === trip.id);
        if (idx !== -1) {
          const totalSpent = updatedExpenses.reduce((acc, curr) => acc + curr.amount, 0);
          list[idx].budgetSpent = totalSpent;
          list[idx].progressPercent = trip.budgetTotal > 0
            ? Math.min(100, Math.round((totalSpent / trip.budgetTotal) * 100))
            : 0;
          localStorage.setItem('vista_custom_trips', JSON.stringify(list));
        }
      }
    } catch (e) {
      console.warn('Storage save error:', e);
    }

    const updatedSummary = computeSummary(updatedExpenses, trip.budgetTotal, members);
    setSummary(updatedSummary);
    showToast('Đã xóa khoản chi thành công!');
  };

  // Handle Add Member
  const handleAddMember = (newMemberName: string) => {
    if (!trip) return;
    const newMemberId = `mem-${Date.now()}`;
    const updatedMembers: TripMember[] = [
      ...members,
      {
        userId: newMemberId,
        displayName: newMemberName,
        email: `${newMemberName.toLowerCase().replace(/\s+/g, '')}@vista.vn`,
        role: 'MEMBER',
        budgetShare: Math.round(trip.budgetTotal / (members.length + 1)),
      },
    ];
    setMembers(updatedMembers);

    // Persist to vista_custom_trips
    try {
      const customTripsStr = localStorage.getItem('vista_custom_trips');
      if (customTripsStr) {
        const list = JSON.parse(customTripsStr);
        const idx = list.findIndex((t: any) => t.id === trip.id);
        if (idx !== -1) {
          list[idx].members = updatedMembers.map((m) => ({
            id: m.userId,
            name: m.displayName,
            avatar: m.displayName.slice(0, 2).toUpperCase(),
          }));
          localStorage.setItem('vista_custom_trips', JSON.stringify(list));
        }
      }
    } catch (e) {
      console.warn('Error saving members:', e);
    }

    const updatedSummary = computeSummary(expenses, trip.budgetTotal, updatedMembers);
    setSummary(updatedSummary);
    showToast(`Đã thêm bạn đồng hành "${newMemberName}" thành công!`);
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* ─── 1. GLOBAL NAVBAR ────────────────────────────────────────── */}
      <Navbar activeModule="treasury" />

      {/* ─── 2. MAIN FULL-WIDTH TREASURY WORKSPACE (NO SECOND SIDEBAR) ── */}
      <div className={styles.treasuryLayout}>
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

          {/* 4. Middle Section: Category Donut + Debt Settlement Matrix */}
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
                tripId={trip?.id || 'VISTA'}
                onAddMember={handleAddMember}
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

        {/* 6. Slide-Over Add Expense Drawer */}
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
