'use client';

import React, { useState } from 'react';
import {
  ListFilter,
  Plus,
  MoreVertical,
  Trash2,
  Receipt,
  SlidersHorizontal,
} from 'lucide-react';
import type { Expense, TripMember } from '../types';
import styles from '../treasury.module.css';

interface ExpenseLedgerTableProps {
  expenses: Expense[];
  members: TripMember[];
  currentUserId?: string;
  onOpenAddExpense: () => void;
  onDeleteExpense: (expenseId: string) => Promise<void>;
}

const CATEGORY_MAP: Record<
  string,
  { label: string; icon: string; bg: string; color: string; border: string }
> = {
  FOOD: {
    label: 'Ăn uống',
    icon: '🍜',
    bg: '#FFF7ED',
    color: '#EA580C',
    border: '#FFEDD5',
  },
  ACCOMMODATION: {
    label: 'Lưu trú',
    icon: '🏨',
    bg: '#EEF2FF',
    color: '#4F46E5',
    border: '#E0E7FF',
  },
  TRANSPORT: {
    label: 'Di chuyển',
    icon: '🚗',
    bg: '#EFF6FF',
    color: '#2563EB',
    border: '#DBEAFE',
  },
  ACTIVITIES: {
    label: 'Vui chơi',
    icon: '🎟️',
    bg: '#FAF5FF',
    color: '#9333EA',
    border: '#F3E8FF',
  },
  OTHER: {
    label: 'Mua sắm',
    icon: '🛍️',
    bg: '#FFF1F2',
    color: '#E11D48',
    border: '#FFE4E6',
  },
};

const CATEGORY_TABS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'FOOD', label: 'Ăn uống' },
  { key: 'ACCOMMODATION', label: 'Lưu trú' },
  { key: 'TRANSPORT', label: 'Di chuyển' },
  { key: 'ACTIVITIES', label: 'Vui chơi' },
  { key: 'OTHER', label: 'Mua sắm' },
];

export function ExpenseLedgerTable({
  expenses,
  members,
  currentUserId,
  onOpenAddExpense,
  onDeleteExpense,
}: ExpenseLedgerTableProps) {
  const [activeTab, setActiveTab] = useState('ALL');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const memberMap = new Map<string, TripMember>();
  members.forEach((m) => memberMap.set(m.userId, m));

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + ' đ';
  };

  const parseDate = (isoStr?: string) => {
    if (!isoStr) {
      const now = new Date();
      return {
        day: String(now.getDate()).padStart(2, '0'),
        month: `Th${now.getMonth() + 1}`,
        time: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
    }
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) {
      return { day: '--', month: '--', time: '' };
    }
    return {
      day: String(d.getDate()).padStart(2, '0'),
      month: `Th${d.getMonth() + 1}`,
      time: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  // Real expenses only - absolutely NO fake demo data
  const filteredExpenses = expenses.filter((exp) => {
    if (activeTab === 'ALL') return true;
    return exp.category === activeTab;
  });

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa "${title}"?`)) {
      await onDeleteExpense(id);
      setActiveMenuId(null);
    }
  };

  return (
    <div className={styles.vistaCardLedger}>
      {/* ─── CARD HEADER ─── */}
      <div className={styles.vistaCardHeader}>
        <div className={styles.vistaCardTitleGroup}>
          <div className={styles.vistaCardIconCircle}>
            <ListFilter size={15} color="#0284C7" />
          </div>
          <h2 className={styles.vistaCardTitle}>Nhật ký chi tiêu</h2>
          {expenses.length > 0 && (
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
              ({expenses.length})
            </span>
          )}
        </div>

        <div className={styles.vistaLedgerHeaderActions}>
          <button
            type="button"
            className={styles.vistaBtnPrimary}
            onClick={onOpenAddExpense}
          >
            <Plus size={14} />
            <span>Ghi chi tiêu</span>
          </button>
          <button
            type="button"
            className={styles.vistaBtnFilterIcon}
            title="Bộ lọc nâng cao"
          >
            <SlidersHorizontal size={14} color="#475569" />
          </button>
        </div>
      </div>

      {/* ─── CATEGORY FILTER PILLS ─── */}
      <div className={styles.vistaCategoryFilterRow}>
        {CATEGORY_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count =
            tab.key === 'ALL'
              ? expenses.length
              : expenses.filter((e) => e.category === tab.key).length;

          return (
            <button
              key={tab.key}
              type="button"
              className={`${styles.vistaCategoryFilterPill} ${
                isActive ? styles.vistaCategoryFilterPillActive : ''
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span>{tab.label}</span>
              {count > 0 && <span style={{ opacity: 0.8, fontSize: '11px', marginLeft: '4px' }}>({count})</span>}
            </button>
          );
        })}
      </div>

      {/* ─── EXPENSE DATA TABLE ─── */}
      <div className={styles.vistaExpenseTableWrapper}>
        <table className={styles.vistaExpenseTable}>
          <thead>
            <tr>
              <th style={{ width: '10%' }}>Ngày</th>
              <th style={{ width: '40%' }}>Mô tả</th>
              <th style={{ width: '16%' }}>Danh mục</th>
              <th style={{ width: '16%' }}>Người chi</th>
              <th style={{ width: '13%', textAlign: 'right' }}>Số tiền</th>
              <th style={{ width: '5%', textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className={styles.vistaEmptyLedger}>
                    <div className={styles.vistaEmptyIconCircle}>
                      <Receipt size={24} color="#94A3B8" />
                    </div>
                    <p className={styles.vistaEmptyTitle}>
                      {expenses.length === 0
                        ? 'Chưa có khoản chi tiêu nào'
                        : 'Không có chi tiêu nào trong danh mục này'}
                    </p>
                    <span className={styles.vistaEmptySub}>
                      {expenses.length === 0
                        ? 'Nhấn nút "+ Ghi chi tiêu" ở trên để ghi nhận hóa đơn thực tế của chuyến đi.'
                        : 'Chọn danh mục khác hoặc ghi nhận khoản chi mới.'}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredExpenses.map((exp) => {
                const catMeta = CATEGORY_MAP[exp.category] || CATEGORY_MAP.OTHER;
                const dateInfo = parseDate(exp.occurredAt);
                const payer = memberMap.get(exp.paidBy);
                const payerName = payer?.displayName || 'Thành viên';
                const initial = payerName ? payerName.charAt(0).toUpperCase() : 'U';

                return (
                  <tr key={exp.id} className={styles.vistaExpenseRow}>
                    {/* Date Column */}
                    <td>
                      <div className={styles.vistaDateBlock}>
                        <span className={styles.vistaDateDay}>{dateInfo.day}</span>
                        <span className={styles.vistaDateMonth}>{dateInfo.month}</span>
                      </div>
                    </td>

                    {/* Description Column */}
                    <td>
                      <div className={styles.vistaDescCell}>
                        <div className={styles.vistaDescText}>
                          <strong className={styles.vistaDescTitle}>{exp.title}</strong>
                          <span className={styles.vistaDescSub}>
                            {dateInfo.time ? `Ghi lúc ${dateInfo.time}` : ''}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Category Pill */}
                    <td>
                      <span
                        className={styles.vistaCategoryPill}
                        style={{
                          background: catMeta.bg,
                          color: catMeta.color,
                          border: `1px solid ${catMeta.border}`,
                        }}
                      >
                        <span>{catMeta.icon}</span>
                        <span>{catMeta.label}</span>
                      </span>
                    </td>

                    {/* Payer */}
                    <td>
                      <div className={styles.vistaPayerCell}>
                        <div
                          className={styles.vistaPayerAvatar}
                          style={{
                            background:
                              payer?.role === 'OWNER' ? '#10B981' : '#3B82F6',
                          }}
                        >
                          {initial}
                        </div>
                        <span className={styles.vistaPayerName}>{payerName}</span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td style={{ textAlign: 'right' }}>
                      <strong className={styles.vistaAmountText}>
                        {formatVnd(exp.amount)}
                      </strong>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'center', position: 'relative' }}>
                      <button
                        type="button"
                        className={styles.vistaBtnActionMenu}
                        onClick={() =>
                          setActiveMenuId(activeMenuId === exp.id ? null : exp.id)
                        }
                        title="Thao tác"
                      >
                        <MoreVertical size={14} color="#64748B" />
                      </button>

                      {activeMenuId === exp.id && (
                        <div className={styles.vistaActionMenuDropdown}>
                          <button
                            type="button"
                            className={styles.vistaActionMenuItemDelete}
                            onClick={() => handleDelete(exp.id, exp.title)}
                          >
                            <Trash2 size={13} />
                            <span>Xóa khoản chi</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
