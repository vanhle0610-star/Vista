'use client';

import React, { useState } from 'react';
import {
  ArrowRight,
  QrCode,
  CheckCircle2,
  X,
  Users,
  UserPlus,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import type { TripExpenseSummary, TripMember } from '../types';
import styles from '../treasury.module.css';

interface DebtSettlementMatrixProps {
  summary: TripExpenseSummary;
  members: TripMember[];
  currentUserId?: string;
  tripId?: string;
  onAddMember?: (name: string) => void;
}

interface PaymentRequestPayload {
  id: string;
  tripId: string;
  payerName: string;
  recipientName: string;
  recipientAccountName: string;
  bankCode: string;
  maskedAccountNumber: string;
  amount: number;
  currency: string;
  memo: string;
  qrImageUrl: string;
  status: string;
}

export function DebtSettlementMatrix({
  summary,
  members,
  currentUserId,
  tripId = 'VISTA',
  onAddMember,
}: DebtSettlementMatrixProps) {
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');

  // Payment Request Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequestPayload | null>(null);
  const [imageError, setImageError] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [markPaidSuccess, setMarkPaidSuccess] = useState(false);

  const memberMap = new Map<string, TripMember>();
  members.forEach((m) => memberMap.set(m.userId, m));

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.abs(Math.round(val))) + ' ₫';
  };

  const getMemberDisplayName = (userId: string) => {
    const mem = memberMap.get(userId);
    if (!mem) return 'Thành viên';
    if (userId === currentUserId) return `${mem.displayName} (Bạn)`;
    return mem.displayName;
  };

  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    if (onAddMember) {
      onAddMember(newMemberName.trim());
    }
    setNewMemberName('');
    setShowAddMemberModal(false);
  };

  const handleOpenVietQR = async (fromUserId: string, toUserId: string) => {
    setIsPaymentModalOpen(true);
    setIsLoadingQr(true);
    setQrError(null);
    setPaymentRequest(null);
    setImageError(false);
    setMarkPaidSuccess(false);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('vista_token') : '';
      const res = await fetch(`/api/v1/trips/${tripId}/settlements/payment-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          toUserId,
          idempotencyKey: crypto.randomUUID(),
          memo: 'THANHTOAN',
        }),
      });

      if (!res.ok) {
        let errMsg = 'Người nhận chưa thiết lập tài khoản nhận tiền đã xác minh.';
        try {
          const errBody = await res.json();
          if (errBody && (errBody.message || errBody.title)) {
            errMsg = errBody.message || errBody.title;
          }
        } catch {}
        throw new Error(errMsg);
      }

      const data: PaymentRequestPayload = await res.json();
      setPaymentRequest(data);
    } catch (err: unknown) {
      setQrError((err as Error).message || 'Không thể tạo yêu cầu thanh toán VietQR.');
    } finally {
      setIsLoadingQr(false);
    }
  };

  const copyToClipboard = (label: string, text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleMarkPaid = async () => {
    if (!paymentRequest) return;
    setIsMarkingPaid(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('vista_token') : '';
      const res = await fetch(
        `/api/v1/trips/${tripId}/settlements/payment-requests/${paymentRequest.id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            status: 'PAYER_MARKED_SENT',
            note: 'Người trả đã bấm xác nhận chuyển khoản',
          }),
        }
      );
      if (res.ok) {
        setMarkPaidSuccess(true);
        setTimeout(() => {
          setIsPaymentModalOpen(false);
        }, 1500);
      }
    } catch {
      // ignore
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const deltas = summary.settlementDeltas || {};
  const hasMembers = members.length > 0;

  return (
    <div className={styles.sectionCard}>
      {/* Card Header */}
      <div className={styles.cardHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Cán Cân Quyết Toán Chi Phí</h2>
          <p className={styles.sectionSubtitle}>
            Theo dõi ai đã trả trước và ai cần hoàn tiền dựa trên nguyên lý Zero-Sum (TV4)
          </p>
        </div>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={() => setShowAddMemberModal(true)}
        >
          <UserPlus size={16} />
          <span>Thêm thành viên</span>
        </button>
      </div>

      {!hasMembers ? (
        <div className={styles.emptyStateContainer}>
          <Users size={36} color="#94a3b8" style={{ marginBottom: '8px' }} />
          <p style={{ margin: 0, fontWeight: 700, color: '#475569' }}>
            Chưa có thành viên nào trong chuyến đi
          </p>
          <p style={{ margin: '4px 0 16px 0', fontSize: '13px', color: '#94a3b8' }}>
            Hãy thêm người đồng hành để bắt đầu ghi nhận và chia sẻ chi phí tự động
          </p>
          <button
            type="button"
            className={styles.btnPrimaryActionSmall}
            onClick={() => setShowAddMemberModal(true)}
          >
            <UserPlus size={15} />
            <span>Thêm bạn đồng hành ngay</span>
          </button>
        </div>
      ) : (
        <>
          {/* Member Balances */}
          <div className={styles.settlementList}>
            {members.map((member) => {
              const delta = deltas[member.userId] !== undefined ? deltas[member.userId] : 0;
              const isMe = member.userId === currentUserId;
              const initial = member.displayName ? member.displayName.charAt(0).toUpperCase() : 'U';

              return (
                <div key={member.userId} className={styles.memberBalanceRow}>
                  <div className={styles.memberInfo}>
                    <div
                      className={styles.avatarCircle}
                      style={{ background: isMe ? '#0284c7' : '#0d9488' }}
                    >
                      {initial}
                    </div>
                    <span className={styles.memberName}>
                      {isMe ? `${member.displayName} (Bạn)` : member.displayName}
                    </span>
                  </div>

                  <div className={styles.balanceRight}>
                    <span
                      className={`${styles.balanceAmount} ${
                        delta > 0
                          ? styles.balancePositive
                          : delta < 0
                          ? styles.balanceNegative
                          : ''
                      }`}
                    >
                      {delta > 0 ? `+${formatVnd(delta)}` : delta < 0 ? `-${formatVnd(delta)}` : '0 ₫'}
                    </span>
                    <span
                      className={`${styles.balancePill} ${
                        delta > 0 ? styles.pillRefund : delta < 0 ? styles.pillPay : ''
                      }`}
                      style={{
                        background: delta === 0 ? '#f1f5f9' : undefined,
                        color: delta === 0 ? '#64748b' : undefined,
                      }}
                    >
                      {delta > 0 ? 'Được hoàn lại' : delta < 0 ? 'Cần trả thêm' : 'Đã cân bằng'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Suggested Minimum Transfers */}
          {summary.suggestedTransfers && summary.suggestedTransfers.length > 0 ? (
            <div className={styles.transferList}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>
                Phương Án Chuyển Khoản Trả Nợ Tối Ưu:
              </div>
              {summary.suggestedTransfers.map((t, idx) => {
                const fromName = getMemberDisplayName(t.fromUserId);
                const toName = getMemberDisplayName(t.toUserId);

                return (
                  <div key={idx} className={styles.transferRow}>
                    <div className={styles.transferText}>
                      <span className={styles.transferHighlight}>{fromName}</span>
                      <ArrowRight size={13} style={{ display: 'inline', margin: '0 6px' }} />
                      <span className={styles.transferHighlight}>{toName}</span>: {formatVnd(t.amount)}
                    </div>
                    <button
                      type="button"
                      className={styles.vietQrBtn}
                      onClick={() => handleOpenVietQR(t.fromUserId, t.toUserId)}
                    >
                      <QrCode size={13} />
                      <span>VietQR</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '12px', fontSize: '12.5px', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#f0fdf4', borderRadius: '10px' }}>
              <ShieldCheck size={16} />
              <span>Toàn bộ chi phí trong đoàn hiện đã được cân bằng hoàn hảo!</span>
            </div>
          )}
        </>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div
          className={styles.drawerOverlay}
          onClick={() => setShowAddMemberModal(false)}
          style={{ alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            className={styles.sectionCard}
            style={{ width: '380px', maxWidth: '92%', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                Thêm bạn đồng hành vào chuyến đi
              </h3>
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddMemberSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Họ và tên thành viên:
                </label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Ví dụ: Trần Nam, Minh Thư..."
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setShowAddMemberModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className={styles.btnPrimaryHighlight}>
                  Thêm thành viên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Production-Safe VietQR Quick Payment Modal */}
      {isPaymentModalOpen && (
        <div
          className={styles.drawerOverlay}
          onClick={() => setIsPaymentModalOpen(false)}
          style={{ alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            className={styles.sectionCard}
            style={{ width: '420px', maxWidth: '94%', textAlign: 'center', padding: '24px', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
              <QrCode size={22} color="#16a34a" />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Thanh Toán VietQR Quyết Toán
              </h3>
            </div>

            {isLoadingQr ? (
              <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <Loader2 size={32} color="#0284c7" className="animate-spin" />
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  Đang khởi tạo yêu cầu thanh toán bảo mật từ máy chủ...
                </p>
              </div>
            ) : qrError ? (
              <div style={{ padding: '24px 12px', textAlign: 'center' }}>
                <AlertTriangle size={36} color="#eab308" style={{ margin: '0 auto 12px auto' }} />
                <h4 style={{ margin: '0 0 8px 0', color: '#854d0e', fontSize: '15px', fontWeight: 700 }}>
                  Người nhận chưa thiết lập tài khoản nhận tiền
                </h4>
                <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: '0 0 20px 0' }}>
                  {qrError}
                </p>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => setIsPaymentModalOpen(false)}
                >
                  Đóng
                </button>
              </div>
            ) : paymentRequest ? (
              <div>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 12px 0' }}>
                  Chuyển tiền từ <b>{paymentRequest.payerName}</b> tới <b>{paymentRequest.recipientName}</b>
                </p>

                {/* Warning reminder */}
                <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', padding: '8px 12px', fontSize: '11.5px', color: '#92400e', textAlign: 'left', marginBottom: '14px' }}>
                  ⚠️ Vui lòng đối chiếu kỹ tên chủ tài khoản và số tiền trên app ngân hàng trước khi xác nhận chuyển khoản.
                </div>

                {/* QR Code Container */}
                <div
                  style={{
                    width: '200px',
                    height: '200px',
                    margin: '0 auto 14px auto',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                  }}
                >
                  {!imageError ? (
                    <img
                      src={paymentRequest.qrImageUrl}
                      alt="VietQR code"
                      width={184}
                      height={184}
                      style={{ borderRadius: '8px', objectFit: 'contain' }}
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div style={{ padding: '12px', fontSize: '11.5px', color: '#dc2626', lineHeight: 1.4 }}>
                      Không thể tải ảnh mã QR.<br />Vui lòng chuyển khoản thủ công bằng thông tin bên dưới:
                    </div>
                  )}
                </div>

                {/* Amount display */}
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a', marginBottom: '12px' }}>
                  {formatVnd(paymentRequest.amount)}
                </div>

                {/* Bank Details Table with Copy */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', textAlign: 'left', fontSize: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#64748b' }}>Ngân hàng:</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{paymentRequest.bankCode}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#64748b' }}>Chủ tài khoản:</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{paymentRequest.recipientAccountName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#64748b' }}>Số tài khoản:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{paymentRequest.maskedAccountNumber}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('Số tài khoản', paymentRequest.maskedAccountNumber)}
                        style={{ background: '#e0f2fe', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '10.5px', color: '#0284c7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                      >
                        {copiedField === 'Số tài khoản' ? <Check size={11} /> : <Copy size={11} />}
                        <span>Sao chép</span>
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                    <span style={{ color: '#64748b' }}>Nội dung:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{paymentRequest.memo}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('Nội dung', paymentRequest.memo)}
                        style={{ background: '#e0f2fe', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '10.5px', color: '#0284c7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                      >
                        {copiedField === 'Nội dung' ? <Check size={11} /> : <Copy size={11} />}
                        <span>Sao chép</span>
                      </button>
                    </div>
                  </div>
                </div>

                {markPaidSuccess ? (
                  <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <CheckCircle2 size={16} />
                    <span>Đã ghi nhận chuyển khoản thành công!</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.btnPrimaryHighlight}
                    style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                    onClick={handleMarkPaid}
                    disabled={isMarkingPaid}
                  >
                    {isMarkingPaid ? 'Đang cập nhật...' : 'Tôi đã chuyển khoản xong'}
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
