'use client';

import React, { useState } from 'react';
import {
  Utensils,
  Building2,
  Car,
  Ticket,
  ShoppingBag,
  Trash2,
  Receipt,
  Plus,
} from 'lucide-react';
import type { Expense, TripMember } from '../types';
import styles from '../treasury.module.css';

interface ExpenseLedgerTableProps {
  expenses: Expense[];
  members: TripMember[];
  onOpenAddExpense: () => void;
  onDeleteExpense: (expenseId: string) => Promise<void>;
}

const CATEGORY_MAP: Record<
  string,
  { label: string; icon: React.ComponentType<{ size?: number }>; bg: string; color: string }
> = {
  FOOD: { label: 'Ăn uống', icon: Utensils, bg: '#ffedd5', color: '#ea580c' },
  ACCOMMODATION: { label: 'Lưu trú', icon: Building2, bg: '#e0f2fe', color: '#0284c7' },
  TRANSPORT: { label: 'Di chuyển', icon: Car, bg: '#cffafe', color: '#0891b2' },
  ACTIVITIES: { label: 'Vé tham quan', icon: Ticket, bg: '#f3e8ff', color: '#9333ea' },
  OTHER: { label: 'Mua sắm / Khác', icon: ShoppingBag, bg: '#ffe4e6', color: '#e11d48' },
};

export function ExpenseLedgerTable({
  expenses,
  members,
  onOpenAddExpense,
  onDeleteExpense,
}: ExpenseLedgerTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const memberMap = new Map<string, TripMember>();
  members.forEach((m) => memberMap.set(m.userId, m));

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + ' ₫';
  };

  const parseDateBlock = (isoString?: string) => {
    if (!isoString) return { day: '--', month: '--' };
    const d = new Date(isoString);
    return {
      day: String(d.getDate()).padStart(2, '0'),
      month: `Th${d.getMonth() + 1}`,
    };
  };

  const filteredExpenses = expenses.filter((exp) => {
    if (categoryFilter !== 'ALL' && exp.category !== categoryFilter) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const titleMatch = exp.title.toLowerCase().includes(q);
      const payer = memberMap.get(exp.paidBy);
      const payerMatch = payer ? payer.displayName.toLowerCase().includes(q) : false;
      return titleMatch || payerMatch;
    }
    return true;
  });

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Bạn có chắc chắn muốn hủy khoản chi "${title}"?`)) return;
    try {
      setDeletingId(id);
      await onDeleteExpense(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={styles.sectionCard} style={{ marginTop: '24px' }}>
      <div className={styles.ledgerHeader}>
        <h2 className={styles.sectionTitle}>Nhật Ký Hóa Đơn</h2>

        <div className={styles.ledgerControls}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Tìm kiếm theo mô tả, người chi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            className={styles.filterSelect}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">Tất cả danh mục ▾</option>
            <option value="FOOD">Ăn uống</option>
            <option value="ACCOMMODATION">Lưu trú</option>
            <option value="TRANSPORT">Di chuyển</option>
            <option value="ACTIVITIES">Vé tham quan</option>
            <option value="OTHER">Mua sắm / Khác</option>
          </select>

          <button
            type="button"
            className={styles.primaryAddBtn}
            onClick={onOpenAddExpense}
          >
            <Plus size={15} />
            <span>Ghi Khoản Chi Mới</span>
          </button>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.ledgerTable}>
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Mô tả</th>
              <th>Danh mục</th>
              <th>Người chi</th>
              <th>Số tiền</th>
              <th>Chia đều cho</th>
              <th style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length > 0 ? (
              filteredExpenses.map((exp) => {
                const cat = CATEGORY_MAP[exp.category] || CATEGORY_MAP.OTHER;
                const IconComponent = cat.icon;
                const payer = memberMap.get(exp.paidBy);
                const payerName = payer ? payer.displayName : 'Thành viên';
                const payerInitial = payerName.charAt(0).toUpperCase();
                const splitCount = exp.splits ? exp.splits.length : 1;
                const dateBlock = parseDateBlock(exp.occurredAt);

                return (
                  <tr key={exp.id} className={styles.receiptStubRow}>
                    <td style={{ width: '60px' }}>
                      <div className={styles.calendarDateBlock}>
                        <span className={styles.calendarDay}>{dateBlock.day}</span>
                        <span className={styles.calendarMonth}>{dateBlock.month}</span>
                      </div>
                    </td>
                    <td className={styles.descBold}>{exp.title}</td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: cat.bg,
                          color: cat.color,
                          fontWeight: 700,
                          fontSize: '11.5px',
                        }}
                      >
                        <IconComponent size={12} />
                        <span>{cat.label}</span>
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          className={styles.avatarCircle}
                          style={{ width: '24px', height: '24px', fontSize: '10.5px' }}
                        >
                          {payerInitial}
                        </div>
                        <span style={{ fontWeight: 600, color: '#334155', fontSize: '12.5px' }}>{payerName}</span>
                      </div>
                    </td>
                    <td className={styles.amountBold}>{formatVnd(exp.amount)}</td>
                    <td style={{ color: '#64748b', fontSize: '12.5px' }}>{splitCount} người</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(exp.id, exp.title)}
                        disabled={deletingId === exp.id}
                        title="Hủy khoản chi"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Trash2 size={12} />
                        <span>{deletingId === exp.id ? '...' : 'Xóa'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7}>
                  <div className={styles.emptyStateBox}>
                    <Receipt size={32} color="#94a3b8" />
                    <span style={{ fontWeight: 700, color: '#334155', fontSize: '13.5px' }}>
                      Chưa có khoản chi nào
                    </span>
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      onClick={onOpenAddExpense}
                      style={{ marginTop: '8px' }}
                    >
                      <Plus size={14} /> Ghi khoản chi
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
