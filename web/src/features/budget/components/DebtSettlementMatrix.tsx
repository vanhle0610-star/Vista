'use client';

import React, { useState } from 'react';
import type { TripExpenseSummary, TripMember } from '../types';
import styles from '../treasury.module.css';

interface DebtSettlementMatrixProps {
  summary: TripExpenseSummary;
  members: TripMember[];
  currentUserId?: string;
}

export function DebtSettlementMatrix({
  summary,
  members,
  currentUserId,
}: DebtSettlementMatrixProps) {
  const [selectedTransfer, setSelectedTransfer] = useState<{
    fromName: string;
    toName: string;
    amount: number;
  } | null>(null);

  const memberMap = new Map<string, TripMember>();
  members.forEach((m) => memberMap.set(m.userId, m));

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.abs(Math.round(val))) + ' ₫';
  };

  const getMemberDisplayName = (userId: string) => {
    const mem = memberMap.get(userId);
    if (!mem) return 'Thành viên';
    if (userId === currentUserId) return `Bạn (${mem.displayName})`;
    return mem.displayName;
  };

  const deltas = summary.settlementDeltas || {};

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionCardHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Đối Soát Nợ Nhóm</h2>
          <div className={styles.sectionSubtitle}>
            Cân đối thu chi tối ưu giữa {members.length} thành viên
          </div>
        </div>
        <button
          type="button"
          className={styles.btnSecondary}
          style={{ fontSize: '12px', padding: '4px 10px' }}
          onClick={() => alert('Chi tiết đối soát nợ toàn đoàn')}
        >
          Xem chi tiết
        </button>
      </div>

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
                  style={{ background: isMe ? '#0284c7' : '#64748b' }}
                >
                  {initial}
                </div>
                <span className={styles.memberName}>
                  {isMe ? `Bạn (${member.displayName})` : member.displayName}
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

      {/* Suggested Min-Cash-Flow Transfers */}
      {summary.suggestedTransfers && summary.suggestedTransfers.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
            ⚡ Gợi ý chuyển khoản tối ưu (Min Cash Flow):
          </div>
          {summary.suggestedTransfers.map((t, idx) => {
            const fromName = getMemberDisplayName(t.fromUserId);
            const toName = getMemberDisplayName(t.toUserId);
            return (
              <div key={idx} className={styles.transferCard}>
                <div className={styles.transferText}>
                  <span className={styles.transferHighlight}>{fromName}</span> chuyển cho{' '}
                  <span className={styles.transferHighlight}>{toName}</span>: {formatVnd(t.amount)}
                </div>
                <button
                  type="button"
                  className={styles.vietQrBtn}
                  onClick={() =>
                    setSelectedTransfer({
                      fromName,
                      toName,
                      amount: t.amount,
                    })
                  }
                >
                  <span>QR</span>
                  <span>VietQR</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* VietQR Modal */}
      {selectedTransfer && (
        <div
          className={styles.drawerOverlay}
          onClick={() => setSelectedTransfer(null)}
          style={{ alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            className={styles.sectionCard}
            style={{ width: '380px', maxWidth: '90%', textAlign: 'center', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              Thanh Toán VietQR Nhanh
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
              Quét mã để chuyển tiền từ <b>{selectedTransfer.fromName}</b> đến{' '}
              <b>{selectedTransfer.toName}</b>
            </p>

            <div
              style={{
                width: '200px',
                height: '200px',
                margin: '0 auto 16px auto',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              }}
            >
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://vietqr.me/transfer?amount=${selectedTransfer.amount}`}
                alt="VietQR code"
                width={170}
                height={170}
                style={{ borderRadius: '8px' }}
              />
            </div>

            <div style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a', marginBottom: '16px' }}>
              {formatVnd(selectedTransfer.amount)}
            </div>

            <button
              type="button"
              className={styles.btnSecondary}
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => setSelectedTransfer(null)}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
