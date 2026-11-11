'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
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

interface ExpenseExtraMeta {
  receiptUrl?: string | null;
  note?: string | null;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(val?: string | null): boolean {
  if (!val) return false;
  return UUID_REGEX.test(val.trim());
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('u-me');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const getExpenseMetaMap = (targetTripId: string): Record<string, ExpenseExtraMeta> => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(`vista_expense_meta_${targetTripId}`);
      return raw ? (JSON.parse(raw) as Record<string, ExpenseExtraMeta>) : {};
    } catch {
      return {};
    }
  };

  const saveExpenseMeta = (targetTripId: string, expenseId: string, meta: ExpenseExtraMeta) => {
    if (typeof window === 'undefined') return;
    try {
      const current = getExpenseMetaMap(targetTripId);
      current[expenseId] = meta;
      localStorage.setItem(`vista_expense_meta_${targetTripId}`, JSON.stringify(current));
    } catch {
      // Ignore storage quota errors
    }
  };

  // Compute summary dynamically from expenses & members
  const computeSummary = useCallback(
    (expList: Expense[], targetBudget: number, memList: TripMember[]): TripExpenseSummary => {
      const totalSpent = expList.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      const remainingBudget = targetBudget - totalSpent;
      const spentPercentage =
        targetBudget > 0 ? Math.min(100, Math.round((totalSpent / targetBudget) * 100)) : 0;

      const settlementDeltas: Record<string, number> = {};
      memList.forEach((m) => {
        settlementDeltas[m.userId] = 0;
      });

      expList.forEach((exp) => {
        const amt = Number(exp.amount) || 0;
        if (settlementDeltas[exp.paidBy] === undefined) {
          settlementDeltas[exp.paidBy] = 0;
        }
        settlementDeltas[exp.paidBy] += amt;

        if (exp.splits && exp.splits.length > 0) {
          exp.splits.forEach((s) => {
            const share = Number(s.shareAmount) || 0;
            if (settlementDeltas[s.userId] === undefined) {
              settlementDeltas[s.userId] = 0;
            }
            settlementDeltas[s.userId] -= share;
          });
        } else if (memList.length > 0) {
          const perPerson = amt / memList.length;
          memList.forEach((m) => {
            settlementDeltas[m.userId] -= perPerson;
          });
        }
      });

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

      const suggestedTransfers: Array<{ fromUserId: string; toUserId: string; amount: number }> =
        [];
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

  const loadTreasuryData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Identify current logged-in user (from localStorage + JWT sub)
      let myId = 'u-me';
      let myName = 'Bạn';
      let myEmail = 'ban@vista.vn';
      let hasToken = false;

      try {
        const userStr = localStorage.getItem('vista_user');
        if (userStr) {
          const u = JSON.parse(userStr);
          if (u.id) myId = u.id;
          if (u.displayName) myName = u.displayName;
          if (u.email) myEmail = u.email;
        }
        const token = localStorage.getItem('vista_token');
        if (token) {
          hasToken = true;
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (payload.sub && !isValidUuid(myId)) {
              myId = payload.sub;
            }
          }
        }
      } catch {
        // Ignore parse error
      }
      setCurrentUserId(myId);

      let activeTrip: TripDetail | null = null;
      let activeMembers: TripMember[] = [];
      let backendSynced = false;

      // 2. Try loading Trip & Members from real Backend API if authenticated
      if (hasToken) {
        try {
          const myTrips = await apiRequest<
            Array<{
              id: string;
              title: string;
              startDate: string;
              endDate: string;
              destinationSummary?: string;
              budgetTotal?: number;
              currency?: string;
              status?: string;
              ownerId: string;
            }>
          >('/trips');

          let targetBackendTrip = myTrips.find((t) => t.id === tripId);

          if (!targetBackendTrip && myTrips.length > 0) {
            targetBackendTrip = myTrips[0];
          } else if (!targetBackendTrip && myTrips.length === 0) {
            // Auto-create a real trip in PostgreSQL for this user so expenses save to DB
            targetBackendTrip = await apiRequest('/trips', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: `Hành trình Đà Nẵng – Hội An (${myName})`,
                startDate: '2026-11-15',
                endDate: '2026-11-18',
                destinationSummary: 'Đà Nẵng & Hội An',
                budgetTotal: 20000000,
                currency: 'VND',
              }),
            });
          }

          if (targetBackendTrip) {
            backendSynced = true;
            if (targetBackendTrip.id !== tripId) {
              router.replace(`/trips/${targetBackendTrip.id}/treasury`);
            }

            const budget = Number(targetBackendTrip.budgetTotal) || 20000000;
            activeTrip = {
              id: targetBackendTrip.id,
              title: targetBackendTrip.title || 'Hành trình VISTA',
              startDate: targetBackendTrip.startDate || '2026-11-15',
              endDate: targetBackendTrip.endDate || '2026-11-18',
              destinationSummary: targetBackendTrip.destinationSummary || 'Việt Nam',
              budgetTotal: budget,
              currency: targetBackendTrip.currency || 'VND',
              status: targetBackendTrip.status || 'ACTIVE',
              ownerId: targetBackendTrip.ownerId || myId,
            };

            const backendMembers = await apiRequest<
              Array<{
                userId: string;
                displayName: string;
                email: string;
                role: string;
                budgetShare?: number;
              }>
            >(`/trips/${targetBackendTrip.id}/members`).catch(() => []);

            if (backendMembers.length > 0) {
              activeMembers = backendMembers.map((m) => ({
                userId: m.userId,
                displayName: m.displayName || m.email,
                email: m.email,
                role: m.role,
                budgetShare: Number(m.budgetShare) || Math.round(budget / backendMembers.length),
              }));
            }
          }
        } catch {
          // Backend unreachable or unauthenticated — fall back to local trip state
        }
      }

      // 3. Fallback / Merge with vista_custom_trips if needed
      try {
        const customTripsStr = localStorage.getItem('vista_custom_trips');
        const customTrips = customTripsStr ? JSON.parse(customTripsStr) : [];
        const matched =
          customTrips.find((t: { id?: string }) => t.id === (activeTrip?.id ?? tripId)) ||
          (!activeTrip && customTrips.length > 0 ? customTrips[0] : null);

        if (!activeTrip && matched) {
          const budget = Number(matched.budgetTotal) || 20000000;
          activeTrip = {
            id: matched.id,
            title: matched.title || 'Hành trình VISTA',
            startDate: matched.startDate || '15/11/2026',
            endDate: matched.endDate || '18/11/2026',
            destinationSummary: matched.destination || 'Việt Nam',
            budgetTotal: budget,
            currency: 'VND',
            status: matched.status || 'ACTIVE',
            ownerId: matched.ownerId || matched.members?.[0]?.userId || myId,
          };
        }

        if (matched && Array.isArray(matched.members) && matched.members.length > 0) {
          const localMembers: TripMember[] = matched.members.map((m: { userId?: string; id?: string; displayName?: string; name?: string; email?: string; role?: string; avatar?: string }, idx: number) => {
            const rawName = m.displayName || m.name || '';
            const cleanName = rawName.replace(/\s*\(Bạn\)/g, '').trim() || (idx === 0 ? myName : `Thành viên ${idx + 1}`);
            const isOwnerMember = idx === 0;
            const isMe = (m.userId && m.userId === myId) || cleanName.toLowerCase() === myName.toLowerCase() || (m.email && m.email.toLowerCase() === myEmail.toLowerCase());
            const memberId = isMe ? myId : (m.userId || m.id || (isOwnerMember ? (matched.ownerId || myId) : `mem-${idx}`));
            return {
              userId: memberId,
              displayName: cleanName,
              email: isMe ? myEmail : (m.email || `${(m.avatar || cleanName).toLowerCase().replace(/\s+/g, '')}@vista.vn`),
              role: (m.role as TripMember['role']) || (isOwnerMember ? 'OWNER' : 'MEMBER'),
              budgetShare: Math.round((activeTrip?.budgetTotal || 20000000) / matched.members.length),
            };
          });

          localMembers.forEach((lm) => {
            if (!activeMembers.some((am) => am.userId === lm.userId)) {
              activeMembers.push(lm);
            }
          });
        }
      } catch {
        // Ignore localStorage parse error
      }

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

      // 4. Load Expenses from Backend API + merge local receipt/note metadata
      const metaMap = getExpenseMetaMap(activeTrip.id);
      let loadedExpenses: Expense[] = [];

      if (backendSynced && isValidUuid(activeTrip.id)) {
        try {
          const backendExpenses = await apiRequest<Expense[]>(
            `/trips/${activeTrip.id}/expenses`
          );
          if (Array.isArray(backendExpenses)) {
            loadedExpenses = backendExpenses.map((exp) => ({
              ...exp,
              amount: Number(exp.amount) || 0,
              splits: Array.isArray(exp.splits)
                ? exp.splits.map((s) => ({
                    ...s,
                    shareAmount: Number(s.shareAmount) || 0,
                  }))
                : [],
              receiptUrl: metaMap[exp.id]?.receiptUrl ?? exp.receiptUrl ?? null,
              note: metaMap[exp.id]?.note ?? exp.note ?? null,
            }));
            localStorage.setItem(
              `vista_expenses_${activeTrip.id}`,
              JSON.stringify(loadedExpenses)
            );
          }
        } catch {
          // Fall back to local cache if backend expenses call fails
        }
      }

      if (loadedExpenses.length === 0) {
        try {
          const storedExpensesStr = localStorage.getItem(`vista_expenses_${activeTrip.id}`);
          if (storedExpensesStr) {
            const parsed = JSON.parse(storedExpensesStr) as Expense[];
            loadedExpenses = parsed.map((exp) => ({
              ...exp,
              receiptUrl: metaMap[exp.id]?.receiptUrl ?? exp.receiptUrl ?? null,
              note: metaMap[exp.id]?.note ?? exp.note ?? null,
            }));
          }
        } catch {
          // Ignore storage error
        }
      }

      setExpenses(loadedExpenses);

      // 5. Compute Summary & also verify against Backend /expenses/summary
      const computed = computeSummary(loadedExpenses, activeTrip.budgetTotal, activeMembers);
      setSummary(computed);
    } catch (err) {
      console.error('Error loading treasury data:', err);
    } finally {
      setLoading(false);
    }
  }, [tripId, computeSummary, router]);

  useEffect(() => {
    void loadTreasuryData();
  }, [loadTreasuryData]);

  // Handle Create Expense (Backend + Supabase Receipt URL + Local Sync)
  const handleCreateExpense = async (payload: CreateExpensePayload) => {
    if (!trip) return;

    const payer = payload.paidBy || currentUserId;
    const participants =
      payload.participantIds && payload.participantIds.length > 0
        ? payload.participantIds
        : members.map((m) => m.userId);

    // 1. Try creating expense in PostgreSQL via Backend API first
    let createdFromBackend: Expense | null = null;
    if (isValidUuid(trip.id) && localStorage.getItem('vista_token')) {
      const validBackendPayer = isValidUuid(payer)
        ? payer
        : isValidUuid(currentUserId)
          ? currentUserId
          : undefined;
      const validBackendParticipants = participants.filter((id) => isValidUuid(id));
      const effectiveBackendParticipants =
        validBackendParticipants.length > 0
          ? validBackendParticipants
          : validBackendPayer
            ? [validBackendPayer]
            : [];

      const canUseExactBackend =
        payload.splitType === 'EXACT' &&
        payload.exactShares &&
        Object.keys(payload.exactShares).every((k) => isValidUuid(k)) &&
        validBackendParticipants.length === participants.length;

      const backendRequestBody = {
        title: payload.title,
        amount: payload.amount,
        currency: 'VND',
        paidBy: validBackendPayer,
        category: payload.category,
        occurredAt: payload.occurredAt || new Date().toISOString(),
        splitType: canUseExactBackend ? 'EXACT' : 'EQUAL',
        participantIds: effectiveBackendParticipants,
        exactShares: canUseExactBackend ? payload.exactShares : undefined,
      };

      try {
        createdFromBackend = await apiRequest<Expense>(`/trips/${trip.id}/expenses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(backendRequestBody),
        });
      } catch (err) {
        console.warn('Backend expense sync warning:', err);
      }
    }

    // 2. Build local splits across all selected trip members
    let splits = createdFromBackend?.splits
      ? createdFromBackend.splits.map((s) => ({
          ...s,
          shareAmount: Number(s.shareAmount) || 0,
        }))
      : [];

    if (splits.length !== participants.length) {
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
    }

    const expenseId = createdFromBackend?.id || `exp-${Date.now()}`;

    if (payload.receiptUrl || payload.note) {
      saveExpenseMeta(trip.id, expenseId, {
        receiptUrl: payload.receiptUrl ?? null,
        note: payload.note ?? null,
      });
    }

    const newExpense: Expense = {
      id: expenseId,
      tripId: trip.id,
      title: payload.title,
      amount: Number(createdFromBackend?.amount ?? payload.amount),
      currency: 'VND',
      paidBy: payer,
      category: payload.category,
      occurredAt:
        createdFromBackend?.occurredAt || payload.occurredAt || new Date().toISOString(),
      status: 'ACTIVE',
      createdAt: createdFromBackend?.createdAt || new Date().toISOString(),
      splits,
      receiptUrl: payload.receiptUrl ?? null,
      note: payload.note ?? null,
    };

    const updatedExpenses = [newExpense, ...expenses];
    setExpenses(updatedExpenses);

    try {
      localStorage.setItem(`vista_expenses_${trip.id}`, JSON.stringify(updatedExpenses));

      const customTripsStr = localStorage.getItem('vista_custom_trips');
      if (customTripsStr) {
        const list = JSON.parse(customTripsStr);
        const idx = list.findIndex((t: { id?: string }) => t.id === trip.id);
        if (idx !== -1) {
          const totalSpent = updatedExpenses.reduce((acc, curr) => acc + curr.amount, 0);
          list[idx].budgetSpent = totalSpent;
          list[idx].progressPercent =
            trip.budgetTotal > 0
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
    setIsDrawerOpen(false);
    showToast(`Đã lưu khoản chi "${payload.title}" thành công!`);
  };

  // Handle Delete Expense
  const handleDeleteExpense = async (expenseId: string) => {
    if (!trip) return;

    if (isValidUuid(trip.id) && isValidUuid(expenseId) && localStorage.getItem('vista_token')) {
      try {
        await apiRequest(`/trips/${trip.id}/expenses/${expenseId}`, {
          method: 'DELETE',
        });
      } catch (e) {
        console.warn('Backend delete expense warning:', e);
      }
    }

    const updatedExpenses = expenses.filter((e) => e.id !== expenseId);
    setExpenses(updatedExpenses);

    try {
      localStorage.setItem(`vista_expenses_${trip.id}`, JSON.stringify(updatedExpenses));

      const customTripsStr = localStorage.getItem('vista_custom_trips');
      if (customTripsStr) {
        const list = JSON.parse(customTripsStr);
        const idx = list.findIndex((t: { id?: string }) => t.id === trip.id);
        if (idx !== -1) {
          const totalSpent = updatedExpenses.reduce((acc, curr) => acc + curr.amount, 0);
          list[idx].budgetSpent = totalSpent;
          list[idx].progressPercent =
            trip.budgetTotal > 0
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

    try {
      const customTripsStr = localStorage.getItem('vista_custom_trips');
      const list = customTripsStr ? JSON.parse(customTripsStr) : [];
      const idx = list.findIndex((t: { id?: string }) => t.id === trip.id);
      if (idx !== -1) {
        list[idx].members = updatedMembers.map((m) => ({
          id: m.userId,
          name: m.displayName,
          avatar: m.displayName.slice(0, 2).toUpperCase(),
        }));
      } else {
        list.push({
          id: trip.id,
          title: trip.title,
          startDate: trip.startDate,
          endDate: trip.endDate,
          destination: trip.destinationSummary,
          budgetTotal: trip.budgetTotal,
          status: trip.status,
          members: updatedMembers.map((m) => ({
            id: m.userId,
            name: m.displayName,
            avatar: m.displayName.slice(0, 2).toUpperCase(),
          })),
        });
      }
      localStorage.setItem('vista_custom_trips', JSON.stringify(list));
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
      {/* ─── MAIN FULL-WIDTH TREASURY WORKSPACE ── */}
      <div className={styles.treasuryLayout}>
        <main className={styles.mainContainer}>
          {loading ? (
            <>
              <SkeletonKpiGrid />
              <SkeletonTableRows count={5} />
            </>
          ) : (
            <>
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
            <ExpenseCategoryDonut expenses={expenses} totalSpent={summary?.totalSpent ?? 0} />

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
            </>
          )}
        </main>

        {/* 6. Centered Add Expense Modal */}
        <AddExpenseDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          members={members}
          currentUserId={currentUserId}
          onSubmit={handleCreateExpense}
        />

        {/* 7. Toast Notification */}
        {toastMessage && (
          <div className={styles.toastNotification} role="status">
            <CheckCircle2 size={17} color="#34d399" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
