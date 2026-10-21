'use client';

import React, { useState } from 'react';
import type { CreateExpensePayload, TripMember } from '../types';
import styles from '../treasury.module.css';

interface AddExpenseDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  members: TripMember[];
  currentUserId?: string;
  onSubmit: (payload: CreateExpensePayload) => Promise<void>;
}

const CATEGORIES: Array<{
  id: 'FOOD' | 'TRANSPORT' | 'ACCOMMODATION' | 'ACTIVITIES' | 'OTHER';
  label: string;
  icon: string;
}> = [
  { id: 'FOOD', label: 'Ăn uống', icon: '🍜' },
  { id: 'ACCOMMODATION', label: 'Lưu trú', icon: '🛏️' },
  { id: 'TRANSPORT', label: 'Di chuyển', icon: '🚗' },
  { id: 'ACTIVITIES', label: 'Vé tham quan', icon: '🎟️' },
  { id: 'OTHER', label: 'Mua sắm / Khác', icon: '🛍️' },
];

export function AddExpenseDrawer({
  isOpen,
  onClose,
  members,
  currentUserId,
  onSubmit,
}: AddExpenseDrawerProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'split'>('info');

  // Form Fields
  const [title, setTitle] = useState('');
  const [rawAmount, setRawAmount] = useState('');
  const [category, setCategory] = useState<'FOOD' | 'TRANSPORT' | 'ACCOMMODATION' | 'ACTIVITIES' | 'OTHER'>('FOOD');
  const [paidBy, setPaidBy] = useState<string>(currentUserId || (members[0]?.userId ?? ''));
  const [occurredAtDate, setOccurredAtDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [note, setNote] = useState('');

  // Tab 2: Split state
  const [splitType, setSplitType] = useState<'EQUAL' | 'EXACT'>('EQUAL');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(() =>
    members.map((m) => m.userId)
  );
  const [exactShares, setExactShares] = useState<Record<string, string>>({});

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const numericAmount = parseFloat(rawAmount.replace(/\D/g, '')) || 0;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) {
      setRawAmount('');
      return;
    }
    const formatted = new Intl.NumberFormat('vi-VN').format(parseInt(val, 10));
    setRawAmount(formatted);
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleAllParticipants = () => {
    if (selectedParticipants.length === members.length) {
      setSelectedParticipants([]);
    } else {
      setSelectedParticipants(members.map((m) => m.userId));
    }
  };

  const equalSharePerPerson =
    selectedParticipants.length > 0 && numericAmount > 0
      ? Math.round(numericAmount / selectedParticipants.length)
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập mô tả khoản chi.');
      setActiveTab('info');
      return;
    }
    if (numericAmount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền hợp lệ (> 0 ₫).');
      setActiveTab('info');
      return;
    }
    if (selectedParticipants.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 1 thành viên để phân chia chi phí.');
      setActiveTab('split');
      return;
    }

    const payload: CreateExpensePayload = {
      title: title.trim(),
      amount: numericAmount,
      currency: 'VND',
      paidBy: paidBy || currentUserId,
      category,
      occurredAt: new Date(occurredAtDate).toISOString(),
      splitType,
      participantIds: selectedParticipants,
    };

    if (splitType === 'EXACT') {
      const parsedExact: Record<string, number> = {};
      let totalExact = 0;
      for (const uid of selectedParticipants) {
        const val = parseFloat((exactShares[uid] || '0').replace(/\D/g, '')) || 0;
        parsedExact[uid] = val;
        totalExact += val;
      }
      if (Math.abs(totalExact - numericAmount) > 1) {
        setErrorMsg(
          `Tổng số tiền chia lẻ (${new Intl.NumberFormat('vi-VN').format(totalExact)} ₫) chưa khớp với tổng chi (${new Intl.NumberFormat('vi-VN').format(numericAmount)} ₫).`
        );
        setActiveTab('split');
        return;
      }
      payload.exactShares = parsedExact;
    }

    try {
      setSubmitting(true);
      await onSubmit(payload);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi lưu khoản chi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <div className={styles.drawerPanel} onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className={styles.drawerHeader}>
          <h2 className={styles.drawerTitle}>Ghi Khoản Chi Mới</h2>
          <button type="button" className={styles.drawerCloseBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className={styles.drawerTabs}>
          <button
            type="button"
            className={`${styles.drawerTabBtn} ${activeTab === 'info' ? styles.drawerTabActive : ''}`}
            onClick={() => setActiveTab('info')}
          >
            Thông tin khoản chi
          </button>
          <button
            type="button"
            className={`${styles.drawerTabBtn} ${activeTab === 'split' ? styles.drawerTabActive : ''}`}
            onClick={() => setActiveTab('split')}
          >
            Chia tiền ({selectedParticipants.length})
          </button>
        </div>

        {/* Drawer Body Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className={styles.drawerBody}>
            {errorMsg && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#ef4444',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                ⚠️ {errorMsg}
              </div>
            )}

            {activeTab === 'info' ? (
              <>
                {/* Tiêu đề */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Mô tả khoản chi <span className={styles.formRequired}>*</span>
                  </label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="VD: Ăn tối đặc sản Hội An, Vé cáp treo..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                {/* Số tiền */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Số tiền (VNĐ) <span className={styles.formRequired}>*</span>
                  </label>
                  <div className={styles.moneyInputBox}>
                    <input
                      type="text"
                      className={`${styles.formInput} ${styles.moneyInput}`}
                      placeholder="0"
                      value={rawAmount}
                      onChange={handleAmountChange}
                      required
                    />
                    <span className={styles.currencySuffix}>₫</span>
                  </div>
                </div>

                {/* Danh mục */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Danh mục <span className={styles.formRequired}>*</span>
                  </label>
                  <div className={styles.categoryPillGrid}>
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        className={`${styles.categorySelectPill} ${
                          category === cat.id ? styles.categoryPillSelected : ''
                        }`}
                        onClick={() => setCategory(cat.id)}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ngày chi */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Ngày chi <span className={styles.formRequired}>*</span>
                  </label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={occurredAtDate}
                    onChange={(e) => setOccurredAtDate(e.target.value)}
                    required
                  />
                </div>

                {/* Người chi */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Người chi <span className={styles.formRequired}>*</span>
                  </label>
                  <select
                    className={styles.formSelect}
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                  >
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.userId === currentUserId ? `Bạn (${m.displayName})` : m.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Đính kèm hóa đơn */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Hình ảnh hóa đơn</label>
                  <div className={styles.uploadZone} onClick={() => alert('Đã chọn file hóa đơn')}>
                    <div className={styles.uploadIcon}>🖼️</div>
                    <div className={styles.uploadPrompt}>
                      Kéo thả ảnh vào đây hoặc <span className={styles.uploadLink}>Chọn ảnh từ thiết bị</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                      Hỗ trợ JPG, PNG, HEIC (tối đa 5MB)
                    </div>
                  </div>
                </div>

                {/* Ghi chú */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Ghi chú (tùy chọn)</label>
                  <textarea
                    rows={2}
                    className={styles.formTextarea}
                    placeholder="Thêm ghi chú nếu cần..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Tab 2: Chia tiền */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Chế độ phân chia</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className={`${styles.categorySelectPill} ${
                        splitType === 'EQUAL' ? styles.categoryPillSelected : ''
                      }`}
                      style={{ flex: 1 }}
                      onClick={() => setSplitType('EQUAL')}
                    >
                      Chia đều ({selectedParticipants.length} người)
                    </button>
                    <button
                      type="button"
                      className={`${styles.categorySelectPill} ${
                        splitType === 'EXACT' ? styles.categoryPillSelected : ''
                      }`}
                      style={{ flex: 1 }}
                      onClick={() => setSplitType('EXACT')}
                    >
                      Tùy chỉnh số tiền
                    </button>
                  </div>
                </div>

                {/* Select All */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    Áp dụng cho thành viên:
                  </span>
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0284c7',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    onClick={toggleAllParticipants}
                  >
                    {selectedParticipants.length === members.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                </div>

                {/* Members Checklist */}
                <div className={styles.splitMemberList}>
                  {members.map((m) => {
                    const isChecked = selectedParticipants.includes(m.userId);
                    return (
                      <div key={m.userId} className={styles.splitMemberRow}>
                        <div className={styles.splitMemberLeft}>
                          <input
                            type="checkbox"
                            className={styles.splitMemberCheck}
                            checked={isChecked}
                            onChange={() => toggleParticipant(m.userId)}
                          />
                          <div
                            className={styles.avatarCircle}
                            style={{ width: '28px', height: '28px', fontSize: '11px' }}
                          >
                            {m.displayName.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>
                            {m.userId === currentUserId ? `Bạn (${m.displayName})` : m.displayName}
                          </span>
                        </div>

                        {isChecked && (
                          <div>
                            {splitType === 'EQUAL' ? (
                              <span className={styles.splitShareText}>
                                {new Intl.NumberFormat('vi-VN').format(equalSharePerPerson)} ₫
                              </span>
                            ) : (
                              <input
                                type="text"
                                style={{
                                  width: '110px',
                                  padding: '4px 8px',
                                  fontSize: '13px',
                                  textAlign: 'right',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '6px',
                                }}
                                placeholder="0 ₫"
                                value={exactShares[m.userId] || ''}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  const f = val ? new Intl.NumberFormat('vi-VN').format(parseInt(val, 10)) : '';
                                  setExactShares({ ...exactShares, [m.userId]: f });
                                }}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Drawer Footer Buttons */}
          <div className={styles.drawerFooter}>
            <button type="button" className={styles.btnCancel} onClick={onClose} disabled={submitting}>
              Hủy
            </button>
            {activeTab === 'info' ? (
              <button
                type="button"
                className={styles.btnSubmit}
                onClick={() => setActiveTab('split')}
              >
                Tiếp tục (Chia tiền) →
              </button>
            ) : (
              <button type="submit" className={styles.btnSubmit} disabled={submitting}>
                {submitting ? 'Đang lưu...' : 'Lưu khoản chi'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
