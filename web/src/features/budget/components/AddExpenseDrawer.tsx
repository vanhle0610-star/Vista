'use client';

import React, { useState } from 'react';
import {
  Utensils,
  Building2,
  Car,
  Ticket,
  ShoppingBag,
  ScanLine,
  Users,
  User,
  Sparkles,
  X,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
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
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  bg: string;
}> = [
  { id: 'FOOD', label: 'Ăn uống', icon: Utensils, color: '#ea580c', bg: '#ffedd5' },
  { id: 'ACCOMMODATION', label: 'Lưu trú', icon: Building2, color: '#0284c7', bg: '#e0f2fe' },
  { id: 'TRANSPORT', label: 'Di chuyển', icon: Car, color: '#0891b2', bg: '#cffafe' },
  { id: 'ACTIVITIES', label: 'Vé vui chơi', icon: Ticket, color: '#9333ea', bg: '#f3e8ff' },
  { id: 'OTHER', label: 'Mua sắm', icon: ShoppingBag, color: '#e11d48', bg: '#ffe4e6' },
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

  // Split state
  const [splitType, setSplitType] = useState<'EQUAL' | 'EXACT'>('EQUAL');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(() =>
    members.map((m) => m.userId)
  );
  const [weights, setWeights] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    members.forEach((m) => {
      init[m.userId] = 1;
    });
    return init;
  });
  const [exactShares, setExactShares] = useState<Record<string, string>>({});

  // OCR state
  const [isOcrScanning, setIsOcrScanning] = useState(false);
  const [ocrSuccessMsg, setOcrSuccessMsg] = useState<string | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const numericAmount = parseFloat(rawAmount.replace(/\D/g, '')) || 0;

  // Add quick denomination
  const handleAddDenomination = (addValue: number) => {
    const current = parseFloat(rawAmount.replace(/\D/g, '')) || 0;
    const next = current + addValue;
    setRawAmount(new Intl.NumberFormat('vi-VN').format(next));
  };

  const handleClearAmount = () => {
    setRawAmount('');
  };

  // Simulate AI OCR
  const handleTriggerOcr = (fileName = 'HoaDon_BeMan.jpg') => {
    setIsOcrScanning(true);
    setOcrSuccessMsg(null);
    setErrorMsg(null);

    setTimeout(() => {
      setIsOcrScanning(false);
      setTitle('Hải sản Bé Mặn');
      const formatted = new Intl.NumberFormat('vi-VN').format(1200000);
      setRawAmount(formatted);
      setCategory('FOOD');
      setNote(`Quét từ: ${fileName}`);
      setOcrSuccessMsg('Đã nhận diện: 1.200.000 ₫ (Hải sản Bé Mặn)');
    }, 700);
  };

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

  const setMemberWeight = (userId: string, weight: number) => {
    setWeights((prev) => ({ ...prev, [userId]: weight }));
  };

  const totalActiveWeight = selectedParticipants.reduce(
    (sum, uid) => sum + (weights[uid] || 1),
    0
  );

  const getMemberCalculatedShare = (userId: string) => {
    if (numericAmount <= 0 || totalActiveWeight <= 0) return 0;
    const w = weights[userId] || 1;
    return Math.round((numericAmount * w) / totalActiveWeight);
  };

  const equalSharePerPerson =
    selectedParticipants.length > 0 && numericAmount > 0
      ? Math.round(numericAmount / selectedParticipants.length)
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tên khoản chi.');
      setActiveTab('info');
      return;
    }
    if (numericAmount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền.');
      setActiveTab('info');
      return;
    }
    if (selectedParticipants.length === 0) {
      setErrorMsg('Chọn ít nhất 1 người chia tiền.');
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

    const hasNonUniformWeights = selectedParticipants.some((uid) => (weights[uid] || 1) !== 1);

    if (splitType === 'EXACT' || hasNonUniformWeights) {
      const parsedExact: Record<string, number> = {};
      let totalExact = 0;
      if (splitType === 'EXACT') {
        for (const uid of selectedParticipants) {
          const val = parseFloat((exactShares[uid] || '0').replace(/\D/g, '')) || 0;
          parsedExact[uid] = val;
          totalExact += val;
        }
        if (Math.abs(totalExact - numericAmount) > 1) {
          setErrorMsg(
            `Tổng tiền lẻ (${new Intl.NumberFormat('vi-VN').format(totalExact)} ₫) chưa khớp tổng chi (${new Intl.NumberFormat('vi-VN').format(numericAmount)} ₫).`
          );
          setActiveTab('split');
          return;
        }
      } else {
        // Compute exact weighted shares
        for (const uid of selectedParticipants) {
          parsedExact[uid] = getMemberCalculatedShare(uid);
        }
      }
      payload.splitType = 'EXACT';
      payload.exactShares = parsedExact;
    }

    try {
      setSubmitting(true);
      await onSubmit(payload);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi lưu khoản chi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <div className={styles.drawerPanel} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.drawerHeader}>
          <h2 className={styles.drawerTitle}>Ghi Khoản Chi</h2>
          <button type="button" className={styles.drawerCloseBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className={styles.drawerTabs}>
          <button
            type="button"
            className={`${styles.drawerTabBtn} ${activeTab === 'info' ? styles.drawerTabActive : ''}`}
            onClick={() => setActiveTab('info')}
          >
            Thông tin
          </button>
          <button
            type="button"
            className={`${styles.drawerTabBtn} ${activeTab === 'split' ? styles.drawerTabActive : ''}`}
            onClick={() => setActiveTab('split')}
          >
            Chia tiền ({selectedParticipants.length})
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className={styles.drawerBody}>
            {errorMsg && (
              <div className={styles.errorAlertPill}>
                {errorMsg}
              </div>
            )}

            {activeTab === 'info' ? (
              <>
                {/* ─── GIANT AMOUNT HERO INPUT ─── */}
                <div className={styles.giantAmountHeroBox}>
                  <div className={styles.giantAmountRow}>
                    <input
                      type="text"
                      className={styles.giantAmountInput}
                      placeholder="0"
                      value={rawAmount}
                      onChange={handleAmountChange}
                      autoFocus
                    />
                    <span className={styles.giantCurrencySuffix}>₫</span>
                  </div>

                  {/* Quick Denomination Chips */}
                  <div className={styles.quickChipsBar}>
                    <button
                      type="button"
                      className={styles.quickChip}
                      onClick={() => handleAddDenomination(50000)}
                    >
                      +50k
                    </button>
                    <button
                      type="button"
                      className={styles.quickChip}
                      onClick={() => handleAddDenomination(100000)}
                    >
                      +100k
                    </button>
                    <button
                      type="button"
                      className={styles.quickChip}
                      onClick={() => handleAddDenomination(200000)}
                    >
                      +200k
                    </button>
                    <button
                      type="button"
                      className={styles.quickChip}
                      onClick={() => handleAddDenomination(500000)}
                    >
                      +500k
                    </button>
                    <button
                      type="button"
                      className={styles.quickChip}
                      onClick={() => handleAddDenomination(1000000)}
                    >
                      +1Tr
                    </button>
                    {rawAmount && (
                      <button
                        type="button"
                        className={`${styles.quickChip} ${styles.quickChipClear}`}
                        onClick={handleClearAmount}
                        title="Xóa số tiền"
                      >
                        <RotateCcw size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Compact AI OCR Scanner Bar */}
                <div className={styles.compactOcrBar}>
                  <div className={styles.ocrBarLeft}>
                    <ScanLine size={15} color="#0284c7" />
                    <span className={styles.ocrBarLabel}>Quét hóa đơn AI</span>
                  </div>
                  <div className={styles.ocrBarActions}>
                    <button
                      type="button"
                      className={styles.btnTryOcrDemo}
                      onClick={() => handleTriggerOcr()}
                      disabled={isOcrScanning}
                    >
                      <Sparkles size={13} />
                      {isOcrScanning ? 'Đang đọc...' : 'Quét bill mẫu'}
                    </button>
                    <label htmlFor="billFileInputCompact" className={styles.btnUploadCompact}>
                      Tải ảnh
                    </label>
                    <input
                      type="file"
                      id="billFileInputCompact"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleTriggerOcr(file.name);
                      }}
                    />
                  </div>
                </div>

                {ocrSuccessMsg && (
                  <div className={styles.ocrSuccessBanner}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={15} color="#16a34a" />
                      <span>{ocrSuccessMsg}</span>
                    </div>
                  </div>
                )}

                {/* Tiêu đề */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Tên khoản chi</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="VD: Ăn trưa hải sản, Vé cáp treo..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                {/* Danh mục */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Danh mục</label>
                  <div className={styles.categoryPillGrid}>
                    {CATEGORIES.map((cat) => {
                      const IconComponent = cat.icon;
                      const isSelected = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          className={`${styles.categorySelectPill} ${
                            isSelected ? styles.categoryPillSelected : ''
                          }`}
                          onClick={() => setCategory(cat.id)}
                        >
                          <IconComponent size={14} />
                          <span>{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Người chi & Ngày chi (2 cột gọn gàng) */}
                <div className={styles.formTwoCols}>
                  <div className={styles.formGroup} style={{ flex: 1 }}>
                    <label className={styles.formLabel}>Người trả</label>
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

                  <div className={styles.formGroup} style={{ flex: 1 }}>
                    <label className={styles.formLabel}>Ngày</label>
                    <input
                      type="date"
                      className={styles.formInput}
                      value={occurredAtDate}
                      onChange={(e) => setOccurredAtDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Ghi chú */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Ghi chú</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="Tùy chọn..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                {/* ─── TAB 2: CHIA TIỀN MA TRẬN ─── */}
                <div className={styles.formGroup}>
                  <div className={styles.splitModeSwitcher}>
                    <button
                      type="button"
                      className={`${styles.splitModeBtn} ${
                        splitType === 'EQUAL' ? styles.splitModeBtnActive : ''
                      }`}
                      onClick={() => setSplitType('EQUAL')}
                    >
                      Chia đều
                    </button>
                    <button
                      type="button"
                      className={`${styles.splitModeBtn} ${
                        splitType === 'EXACT' ? styles.splitModeBtnActive : ''
                      }`}
                      onClick={() => setSplitType('EXACT')}
                    >
                      Tùy chỉnh số tiền
                    </button>
                  </div>
                </div>

                {/* Preset Chips */}
                <div className={styles.splitPresetRow}>
                  <button
                    type="button"
                    className={`${styles.splitPresetBtn} ${
                      selectedParticipants.length === members.length ? styles.splitPresetActive : ''
                    }`}
                    onClick={() => setSelectedParticipants(members.map((m) => m.userId))}
                  >
                    <Users size={12} /> Cả đoàn ({members.length})
                  </button>
                  <button
                    type="button"
                    className={`${styles.splitPresetBtn} ${
                      selectedParticipants.length === 1 && selectedParticipants.includes(currentUserId || '')
                        ? styles.splitPresetActive
                        : ''
                    }`}
                    onClick={() => setSelectedParticipants(currentUserId ? [currentUserId] : [members[0]?.userId])}
                  >
                    <User size={12} /> Chỉ mình tôi
                  </button>
                  <button
                    type="button"
                    className={styles.splitPresetBtn}
                    onClick={toggleAllParticipants}
                  >
                    {selectedParticipants.length === members.length ? 'Bỏ chọn' : 'Tất cả'}
                  </button>
                </div>

                {/* Members Checklist */}
                <div className={styles.splitMemberList}>
                  {members.map((m) => {
                    const isChecked = selectedParticipants.includes(m.userId);
                    return (
                      <div
                        key={m.userId}
                        className={`${styles.splitMemberRow} ${
                          !isChecked ? styles.splitMemberRowExcluded : ''
                        }`}
                      >
                        <div className={styles.splitMemberLeft}>
                          <input
                            type="checkbox"
                            className={styles.splitMemberCheck}
                            checked={isChecked}
                            onChange={() => toggleParticipant(m.userId)}
                          />
                          <div className={styles.avatarCircle}>
                            {m.displayName.charAt(0).toUpperCase()}
                          </div>
                          <span className={styles.splitMemberName}>
                            {m.userId === currentUserId ? `Bạn (${m.displayName})` : m.displayName}
                          </span>
                        </div>

                        <div>
                          {isChecked ? (
                            splitType === 'EQUAL' ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {/* Weight selector [Khung 9] */}
                                <div className={styles.weightSelector}>
                                  {[0.5, 1, 1.5, 2].map((w) => (
                                    <button
                                      key={w}
                                      type="button"
                                      className={`${styles.weightChip} ${
                                        (weights[m.userId] || 1) === w ? styles.weightChipActive : ''
                                      }`}
                                      onClick={() => setMemberWeight(m.userId, w)}
                                      title={`Trọng số ${w}x`}
                                    >
                                      {w}x
                                    </button>
                                  ))}
                                </div>
                                <span className={styles.splitShareText}>
                                  {new Intl.NumberFormat('vi-VN').format(getMemberCalculatedShare(m.userId))} ₫
                                </span>
                              </div>
                            ) : (
                              <input
                                type="text"
                                className={styles.exactShareInput}
                                placeholder="0 ₫"
                                value={exactShares[m.userId] || ''}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  const f = val ? new Intl.NumberFormat('vi-VN').format(parseInt(val, 10)) : '';
                                  setExactShares({ ...exactShares, [m.userId]: f });
                                }}
                              />
                            )
                          ) : (
                            <span className={styles.splitExcludedBadge}>0 ₫</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Live Split Summary */}
                <div className={styles.splitSummaryCard}>
                  <div className={styles.splitSummaryItem}>
                    <span>Tổng chi</span>
                    <strong>{new Intl.NumberFormat('vi-VN').format(numericAmount)} ₫</strong>
                  </div>
                  <div className={styles.splitSummaryItem}>
                    <span>Người chia</span>
                    <strong>{selectedParticipants.length} / {members.length}</strong>
                  </div>
                  <div className={styles.splitSummaryItem}>
                    <span>Bình quân</span>
                    <strong style={{ color: '#0284c7' }}>
                      {new Intl.NumberFormat('vi-VN').format(equalSharePerPerson)} ₫
                    </strong>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Drawer Footer */}
          <div className={styles.drawerFooter}>
            <button type="button" className={styles.btnCancel} onClick={onClose} disabled={submitting}>
              Đóng
            </button>
            {activeTab === 'info' ? (
              <button
                type="button"
                className={styles.btnSubmit}
                onClick={() => setActiveTab('split')}
              >
                Chia tiền ({selectedParticipants.length}) →
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
