'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Utensils,
  Hotel,
  Car,
  Ticket,
  ShoppingBag,
  UploadCloud,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { uploadFileToCloud } from '@/utils/cloudImage';
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
  id: 'FOOD' | 'ACCOMMODATION' | 'TRANSPORT' | 'ACTIVITIES' | 'OTHER';
  label: string;
  icon: LucideIcon;
}> = [
  { id: 'FOOD', label: 'Ăn uống', icon: Utensils },
  { id: 'ACCOMMODATION', label: 'Lưu trú', icon: Hotel },
  { id: 'TRANSPORT', label: 'Di chuyển', icon: Car },
  { id: 'ACTIVITIES', label: 'Vé tham quan', icon: Ticket },
  { id: 'OTHER', label: 'Mua sắm / Khác', icon: ShoppingBag },
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Không thể đọc file ảnh'));
    reader.readAsDataURL(file);
  });
}

export function AddExpenseDrawer({
  isOpen,
  onClose,
  members,
  currentUserId,
  onSubmit,
}: AddExpenseDrawerProps) {
  // Core Form Fields
  const [title, setTitle] = useState('');
  const [rawAmount, setRawAmount] = useState('');
  const [category, setCategory] = useState<
    'FOOD' | 'ACCOMMODATION' | 'TRANSPORT' | 'ACTIVITIES' | 'OTHER'
  >('FOOD');
  const [paidBy, setPaidBy] = useState<string>(currentUserId || (members[0]?.userId ?? ''));
  const [occurredAtDate, setOccurredAtDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [note, setNote] = useState('');

  // Receipt Upload State
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Split Configuration State
  const [splitType, setSplitType] = useState<'EQUAL' | 'EXACT'>('EQUAL');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(() =>
    members.map((m) => m.userId)
  );
  const [exactShares, setExactShares] = useState<Record<string, string>>({});

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Keep default payer and participants in sync when modal opens or members change
  useEffect(() => {
    if (isOpen) {
      setPaidBy((prev) => {
        if (prev && members.some((m) => m.userId === prev)) return prev;
        return currentUserId || (members[0]?.userId ?? '');
      });
      setSelectedParticipants((prev) => {
        const valid = prev.filter((id) => members.some((m) => m.userId === id));
        return valid.length > 0 ? valid : members.map((m) => m.userId);
      });
      setErrorMsg(null);
    }
  }, [isOpen, members, currentUserId]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const numericAmount = parseFloat(rawAmount.replace(/\D/g, '')) || 0;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) {
      setRawAmount('');
      return;
    }
    const parsed = parseInt(val, 10);
    if (Number.isNaN(parsed)) {
      setRawAmount('');
      return;
    }
    setRawAmount(new Intl.NumberFormat('vi-VN').format(parsed));
  };

  const handleSelectReceiptFile = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chọn định dạng tệp hình ảnh hợp lệ (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Kích thước ảnh hóa đơn không được vượt quá 10MB.');
      return;
    }
    setErrorMsg(null);
    setReceiptFile(file);
    try {
      const dataUrl = await fileToDataUrl(file);
      setReceiptPreview(dataUrl);
    } catch {
      setReceiptPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      void handleSelectReceiptFile(droppedFile);
    }
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

  const resetFormState = () => {
    setTitle('');
    setRawAmount('');
    setCategory('FOOD');
    setNote('');
    setReceiptFile(null);
    setReceiptPreview(null);
    setSplitType('EQUAL');
    setExactShares({});
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tên khoản chi.');
      return;
    }
    if (numericAmount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền hợp lệ lớn hơn 0 ₫.');
      return;
    }
    if (!occurredAtDate) {
      setErrorMsg('Vui lòng chọn ngày chi.');
      return;
    }
    if (selectedParticipants.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 1 thành viên tham gia chia chi phí.');
      return;
    }

    let parsedExact: Record<string, number> | undefined;
    if (splitType === 'EXACT') {
      parsedExact = {};
      let totalExact = 0;
      for (const uid of selectedParticipants) {
        const val = parseFloat((exactShares[uid] || '0').replace(/\D/g, '')) || 0;
        parsedExact[uid] = val;
        totalExact += val;
      }
      if (Math.abs(totalExact - numericAmount) > 1) {
        setErrorMsg(
          `Tổng số tiền chia lẻ (${new Intl.NumberFormat('vi-VN').format(totalExact)} ₫) chưa khớp với tổng số tiền khoản chi (${new Intl.NumberFormat('vi-VN').format(numericAmount)} ₫).`
        );
        return;
      }
    }

    try {
      setSubmitting(true);

      let uploadedReceiptUrl: string | null = receiptPreview;
      if (receiptFile) {
        setSubmitStep('Đang tải ảnh hóa đơn lên Cloud...');
        try {
          uploadedReceiptUrl = await uploadFileToCloud(receiptFile, 'trips');
        } catch {
          // Keep base64 dataUrl preview if cloud storage bucket is unreachable in local dev
          uploadedReceiptUrl = receiptPreview;
        }
      }

      setSubmitStep('Đang lưu khoản chi...');
      const payload: CreateExpensePayload = {
        title: title.trim(),
        amount: numericAmount,
        currency: 'VND',
        paidBy: paidBy || currentUserId || members[0]?.userId,
        category,
        occurredAt: new Date(`${occurredAtDate}T12:00:00`).toISOString(),
        splitType,
        participantIds: selectedParticipants,
        exactShares: parsedExact,
        receiptUrl: uploadedReceiptUrl,
        note: note.trim() || null,
      };

      await onSubmit(payload);
      resetFormState();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể lưu khoản chi. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
      setSubmitStep(null);
    }
  };

  return (
    <div
      className={styles.drawerOverlay}
      onClick={() => !submitting && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-modal-title"
    >
      <div className={styles.drawerPanel} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={styles.drawerHeader}>
          <div className={styles.drawerTitleGroup}>
            <h2 id="expense-modal-title" className={styles.drawerTitle}>
              Ghi nhận khoản chi tiêu mới
            </h2>
            <p className={styles.drawerSubtitle}>
              Nhập thông tin chi phí, phân bổ thành viên và đính kèm ảnh hóa đơn thanh toán
            </p>
          </div>
          <button
            type="button"
            className={styles.drawerCloseBtn}
            onClick={() => !submitting && onClose()}
            disabled={submitting}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
        >
          <div className={styles.drawerBody}>
            {errorMsg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 2-Column Grid for Primary Fields */}
            <div className={styles.formGridTwoCol}>
              {/* 1. Tên khoản chi */}
              <div className={styles.formGroup}>
                <label htmlFor="expense-title-input" className={styles.formLabel}>
                  <span>Tên khoản chi</span>
                  <span className={styles.formRequired}>*</span>
                </label>
                <input
                  id="expense-title-input"
                  type="text"
                  className={styles.formInput}
                  placeholder="VD: Ăn tối hải sản, Vé cáp treo Bà Nà..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              {/* 2. Số tiền (VNĐ) */}
              <div className={styles.formGroup}>
                <label htmlFor="expense-amount-input" className={styles.formLabel}>
                  <span>Số tiền (VNĐ)</span>
                  <span className={styles.formRequired}>*</span>
                </label>
                <div className={styles.moneyInputBox}>
                  <input
                    id="expense-amount-input"
                    type="text"
                    inputMode="numeric"
                    className={`${styles.formInput} ${styles.moneyInput}`}
                    placeholder="Ví dụ: 1.500.000"
                    value={rawAmount}
                    onChange={handleAmountChange}
                    disabled={submitting}
                    required
                  />
                  <span className={styles.currencySuffix}>VNĐ</span>
                </div>
              </div>

              {/* 3. Danh mục (Full Width) */}
              <div className={`${styles.formGroup} ${styles.fullSpan}`}>
                <label className={styles.formLabel}>
                  <span>Danh mục chi tiêu</span>
                  <span className={styles.formRequired}>*</span>
                </label>
                <div className={styles.categoryPillGrid}>
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const active = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        disabled={submitting}
                        className={`${styles.categorySelectPill} ${
                          active ? styles.categoryPillSelected : ''
                        }`}
                        onClick={() => setCategory(cat.id)}
                      >
                        <Icon size={15} strokeWidth={1.85} />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Ngày chi */}
              <div className={styles.formGroup}>
                <label htmlFor="expense-date-input" className={styles.formLabel}>
                  <span>Ngày chi</span>
                  <span className={styles.formRequired}>*</span>
                </label>
                <input
                  id="expense-date-input"
                  type="date"
                  className={styles.formInput}
                  value={occurredAtDate}
                  onChange={(e) => setOccurredAtDate(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              {/* 5. Người chi */}
              <div className={styles.formGroup}>
                <label htmlFor="expense-payer-select" className={styles.formLabel}>
                  <span>Người chi trả</span>
                  <span className={styles.formRequired}>*</span>
                </label>
                <select
                  id="expense-payer-select"
                  className={styles.formSelect}
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  disabled={submitting}
                >
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.userId === currentUserId ? `${m.displayName} (Bạn)` : m.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Phân chia chi phí giữa các thành viên */}
            <div className={styles.splitSectionBox}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={15} color="#0284c7" />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                    Phân bổ cho thành viên ({selectedParticipants.length}/{members.length})
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setSplitType('EQUAL')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: '1px solid',
                      borderColor: splitType === 'EQUAL' ? '#0f172a' : '#cbd5e1',
                      background: splitType === 'EQUAL' ? '#0f172a' : '#ffffff',
                      color: splitType === 'EQUAL' ? '#ffffff' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    Chia đều
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setSplitType('EXACT')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: '1px solid',
                      borderColor: splitType === 'EXACT' ? '#0f172a' : '#cbd5e1',
                      background: splitType === 'EXACT' ? '#0f172a' : '#ffffff',
                      color: splitType === 'EXACT' ? '#ffffff' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    Tùy chỉnh số tiền
                  </button>
                  {members.length > 1 && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={toggleAllParticipants}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0284c7',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginLeft: '4px',
                      }}
                    >
                      {selectedParticipants.length === members.length ? 'Bỏ chọn' : 'Chọn tất cả'}
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.splitMemberList}>
                {members.map((m) => {
                  const isChecked = selectedParticipants.includes(m.userId);
                  return (
                    <div key={m.userId} className={styles.splitMemberRow}>
                      <label className={styles.splitMemberLeft} style={{ cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          className={styles.splitMemberCheck}
                          checked={isChecked}
                          disabled={submitting}
                          onChange={() => toggleParticipant(m.userId)}
                        />
                        <div
                          className={styles.avatarCircle}
                          style={{ width: '26px', height: '26px', fontSize: '11px' }}
                        >
                          {m.displayName ? m.displayName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                          {m.userId === currentUserId ? `${m.displayName} (Bạn)` : m.displayName}
                        </span>
                      </label>

                      {isChecked && (
                        <div>
                          {splitType === 'EQUAL' ? (
                            <span className={styles.splitShareText}>
                              {new Intl.NumberFormat('vi-VN').format(equalSharePerPerson)} ₫
                            </span>
                          ) : (
                            <input
                              type="text"
                              inputMode="numeric"
                              disabled={submitting}
                              style={{
                                width: '120px',
                                padding: '5px 8px',
                                fontSize: '13px',
                                fontWeight: 600,
                                textAlign: 'right',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                              }}
                              placeholder="0 ₫"
                              value={exactShares[m.userId] || ''}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                const f = val
                                  ? new Intl.NumberFormat('vi-VN').format(parseInt(val, 10))
                                  : '';
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
            </div>

            {/* 6. Hình ảnh hóa đơn (Upload ảnh) */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <span>Hình ảnh hóa đơn (Tùy chọn)</span>
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleSelectReceiptFile(file);
                }}
              />

              {receiptPreview ? (
                <div className={styles.uploadPreviewCard}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={receiptPreview}
                      alt="Xem trước hóa đơn"
                      className={styles.uploadPreviewThumb}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#0f172a',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {receiptFile?.name || 'Ảnh hóa đơn đính kèm'}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11.5px',
                          color: '#16a34a',
                          marginTop: '2px',
                          fontWeight: 500,
                        }}
                      >
                        <CheckCircle2 size={13} />
                        <span>
                          Sẵn sàng tải lên Cloud
                          {receiptFile
                            ? ` (${(receiptFile.size / 1024).toFixed(0)} KB)`
                            : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => fileInputRef.current?.click()}
                      className={styles.btnCancel}
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                    >
                      Đổi ảnh
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleRemoveReceipt}
                      className={styles.deleteBtn}
                      title="Xóa ảnh hóa đơn"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`${styles.uploadZone} ${isDragging ? styles.uploadZoneActive : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className={styles.uploadIcon}>
                    <UploadCloud size={20} strokeWidth={1.85} />
                  </div>
                  <div className={styles.uploadPrompt}>
                    Kéo thả ảnh hóa đơn vào đây hoặc{' '}
                    <span className={styles.uploadLink}>chọn tệp từ thiết bị</span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                    Hỗ trợ JPG, PNG, WEBP (tối đa 10MB) • Tự động đồng bộ Supabase Storage
                  </div>
                </div>
              )}
            </div>

            {/* Ghi chú bổ sung */}
            <div className={styles.formGroup}>
              <label htmlFor="expense-note-input" className={styles.formLabel}>
                <span>Ghi chú (Tùy chọn)</span>
              </label>
              <textarea
                id="expense-note-input"
                rows={2}
                className={styles.formTextarea}
                placeholder="Ghi chú chi tiết về hóa đơn, địa điểm thanh toán..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className={styles.drawerFooter}>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={onClose}
              disabled={submitting}
            >
              Hủy
            </button>
            <button type="submit" className={styles.btnSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>{submitStep || 'Đang lưu...'}</span>
                </>
              ) : (
                <span>Lưu khoản chi</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
