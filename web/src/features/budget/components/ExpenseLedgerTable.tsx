'use client';

import React, { useState } from 'react';
import {
  Utensils,
  Hotel,
  Car,
  Ticket,
  ShoppingBag,
  Search,
  Plus,
  Trash2,
  Receipt,
  ImageIcon,
  X,
  ExternalLink,
  type LucideIcon,
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
  { label: string; icon: LucideIcon; bg: string; color: string; border: string }
> = {
  FOOD: {
    label: 'Ăn uống',
    icon: Utensils,
    bg: '#fff7ed',
    color: '#ea580c',
    border: '#ffedd5',
  },
  ACCOMMODATION: {
    label: 'Lưu trú',
    icon: Hotel,
    bg: '#f0f9ff',
    color: '#0284c7',
    border: '#e0f2fe',
  },
  TRANSPORT: {
    label: 'Di chuyển',
    icon: Car,
    bg: '#ecfeff',
    color: '#0891b2',
    border: '#cffafe',
  },
  ACTIVITIES: {
    label: 'Vé tham quan',
    icon: Ticket,
    bg: '#faf5ff',
    color: '#9333ea',
    border: '#f3e8ff',
  },
  OTHER: {
    label: 'Mua sắm / Khác',
    icon: ShoppingBag,
    bg: '#fff1f2',
    color: '#e11d48',
    border: '#ffe4e6',
  },
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
  const [previewReceipt, setPreviewReceipt] = useState<{
    title: string;
    url: string;
    amount: number;
  } | null>(null);

  const memberMap = new Map<string, TripMember>();
  members.forEach((m) => memberMap.set(m.userId, m));

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + ' ₫';
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '—';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
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
    <div className={styles.sectionCard}>
      <div className={styles.ledgerHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Nhật Ký Hóa Đơn & Chi Tiêu</h2>
          <div className={styles.sectionSubtitle}>
            Danh sách các khoản chi đã ghi nhận ({filteredExpenses.length} bản ghi)
          </div>
        </div>

        <div className={styles.ledgerControls}>
          <div className={styles.searchBox}>
            <Search size={15} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Tìm theo tên khoản chi, người chi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            aria-label="Lọc theo danh mục"
            className={styles.filterSelect}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">Danh mục: Tất cả</option>
            <option value="FOOD">Ăn uống</option>
            <option value="ACCOMMODATION">Lưu trú</option>
            <option value="TRANSPORT">Di chuyển</option>
            <option value="ACTIVITIES">Vé tham quan</option>
            <option value="OTHER">Mua sắm / Khác</option>
          </select>

          <button type="button" className={styles.primaryAddBtn} onClick={onOpenAddExpense}>
            <Plus size={16} />
            <span>Ghi khoản chi mới</span>
          </button>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.ledgerTable}>
          <thead>
            <tr>
              <th>Ngày chi</th>
              <th>Khoản chi</th>
              <th>Danh mục</th>
              <th>Người chi</th>
              <th>Số tiền</th>
              <th>Phân chia</th>
              <th>Hóa đơn</th>
              <th style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length > 0 ? (
              filteredExpenses.map((exp) => {
                const cat = CATEGORY_MAP[exp.category] || CATEGORY_MAP.OTHER;
                const CatIcon = cat.icon;
                const payer = memberMap.get(exp.paidBy);
                const payerName = payer ? payer.displayName : 'Thành viên';
                const payerInitial = payerName.charAt(0).toUpperCase();
                const splitCount = exp.splits && exp.splits.length > 0 ? exp.splits.length : 1;

                return (
                  <tr key={exp.id}>
                    <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>
                      {formatDate(exp.occurredAt)}
                    </td>
                    <td>
                      <div className={styles.descBold}>{exp.title}</div>
                      {exp.note && (
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          {exp.note}
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 9px',
                          borderRadius: '6px',
                          background: cat.bg,
                          color: cat.color,
                          border: `1px solid ${cat.border}`,
                          fontWeight: 600,
                          fontSize: '12px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <CatIcon size={13} strokeWidth={1.85} />
                        <span>{cat.label}</span>
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          className={styles.avatarCircle}
                          style={{ width: '26px', height: '26px', fontSize: '11px' }}
                        >
                          {payerInitial}
                        </div>
                        <span style={{ fontWeight: 500 }}>{payerName}</span>
                      </div>
                    </td>
                    <td className={styles.amountBold}>{formatVnd(exp.amount)}</td>
                    <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{splitCount} người</td>
                    <td>
                      {exp.receiptUrl ? (
                        <button
                          type="button"
                          className={styles.receiptBadgeBtn}
                          onClick={() =>
                            setPreviewReceipt({
                              title: exp.title,
                              url: exp.receiptUrl!,
                              amount: exp.amount,
                            })
                          }
                        >
                          <ImageIcon size={13} />
                          <span>Xem ảnh</span>
                        </button>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => void handleDelete(exp.id, exp.title)}
                        disabled={deletingId === exp.id}
                        title="Hủy khoản chi"
                      >
                        <Trash2 size={13} />
                        <span>{deletingId === exp.id ? 'Đang xóa...' : 'Xóa'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8}>
                  <div className={styles.emptyStateBox}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748b',
                        marginBottom: '4px',
                      }}
                    >
                      <Receipt size={20} strokeWidth={1.85} />
                    </div>
                    <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '14.5px' }}>
                      Chưa có khoản chi tiêu nào
                    </span>
                    <span style={{ fontSize: '13px', maxWidth: '420px' }}>
                      Nhấn nút <strong>&quot;Ghi khoản chi mới&quot;</strong> để ghi nhận hóa đơn và tự động phân bổ ngân sách cho chuyến đi.
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Receipt Lightbox Modal */}
      {previewReceipt && (
        <div
          className={styles.drawerOverlay}
          onClick={() => setPreviewReceipt(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={styles.drawerPanel}
            style={{ maxWidth: '520px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.drawerHeader}>
              <div>
                <h3 className={styles.drawerTitle}>{previewReceipt.title}</h3>
                <p className={styles.drawerSubtitle}>
                  Số tiền: {formatVnd(previewReceipt.amount)}
                </p>
              </div>
              <button
                type="button"
                className={styles.drawerCloseBtn}
                onClick={() => setPreviewReceipt(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className={styles.drawerBody} style={{ alignItems: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewReceipt.url}
                alt={previewReceipt.title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '60vh',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  objectFit: 'contain',
                }}
              />
            </div>
            <div className={styles.drawerFooter}>
              {previewReceipt.url.startsWith('http') && (
                <a
                  href={previewReceipt.url}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.btnCancel}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <ExternalLink size={14} />
                  <span>Mở ảnh gốc</span>
                </a>
              )}
              <button
                type="button"
                className={styles.btnSubmit}
                onClick={() => setPreviewReceipt(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
