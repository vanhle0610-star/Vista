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

export function DebtSettlementMatrix({
  summary,
  members,
  currentUserId,
  tripId = 'VISTA',
  onAddMember,
}: DebtSettlementMatrixProps) {
  const [selectedTransfer, setSelectedTransfer] = useState<{
    fromName: string;
    toName: string;
    amount: number;
  } | null>(null);

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');

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

  const deltas = summary.settlementDeltas || {};
  const isSolo = members.length <= 1;

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionCardHeader}>
        <div>
          <h2 className={styles.sectionTitle}>
            {isSolo ? 'Quản Lý Thu Chi Nhóm' : 'Đối Soát Nợ Nhóm (Smart Split)'}
          </h2>
          <div className={styles.sectionSubtitle}>
            {isSolo
              ? 'Chuyến đi cá nhân · Bạn đang tự quản lý 100% ngân sách'
              : `Cân đối chi phí tối ưu giữa ${members.length} thành viên tham gia`}
          </div>
        </div>
        <button
          type="button"
          className={styles.btnAddMemberSmall}
          onClick={() => setShowAddMemberModal(true)}
          title="Thêm bạn bè vào chuyến đi để cùng chia chi phí"
        >
          <UserPlus size={14} />
          <span>Thêm bạn đồng hành</span>
        </button>
      </div>

      {isSolo ? (
        <div className={styles.soloContainer}>
          <div className={styles.soloIconBox}>
            <Users size={32} color="#0284c7" />
          </div>
          <h3 className={styles.soloTitle}>Chưa có bạn đồng hành cùng chia tiền</h3>
          <p className={styles.soloDesc}>
            Chuyến đi này hiện chỉ có 1 người (Bạn). Khi bạn thêm bạn bè hoặc người thân vào nhóm, hệ thống VISTA sẽ tự động chia đều hóa đơn, đối soát công nợ và sinh mã VietQR chuyển khoản nhanh!
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
                      onClick={() =>
                        setSelectedTransfer({
                          fromName,
                          toName,
                          amount: t.amount,
                        })
                      }
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

      {/* VietQR Quick Payment Modal */}
      {selectedTransfer && (
        <div
          className={styles.drawerOverlay}
          onClick={() => setSelectedTransfer(null)}
          style={{ alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            className={styles.sectionCard}
            style={{ width: '400px', maxWidth: '92%', textAlign: 'center', padding: '28px', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedTransfer(null)}
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

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
              <QrCode size={22} color="#16a34a" />
              <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#0f172a' }}>
                Thanh Toán VietQR Nhanh
              </h3>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
              Quét mã ngân hàng để hoàn tiền từ <b>{selectedTransfer.fromName}</b> cho <b>{selectedTransfer.toName}</b>
            </p>

            <div
              style={{
                width: '210px',
                height: '210px',
                margin: '0 auto 16px auto',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
              }}
            >
              <img
                src={`https://img.vietqr.io/image/MB-0382404099-compact2.png?amount=${selectedTransfer.amount}&addInfo=${encodeURIComponent('VISTA ' + selectedTransfer.toName.slice(0, 10))}&accountName=${encodeURIComponent(selectedTransfer.toName)}`}
                alt="VietQR code"
                width={185}
                height={185}
                style={{ borderRadius: '8px', objectFit: 'contain' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=185x185&data=https://vietqr.me/transfer?amount=${selectedTransfer.amount}`;
                }}
              />
            </div>

            <div style={{ fontSize: '22px', fontWeight: 800, color: '#16a34a', marginBottom: '8px' }}>
              {formatVnd(selectedTransfer.amount)}
            </div>

            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 20px 0' }}>
              Hỗ trợ 40+ ứng dụng ngân hàng & ví điện tử tại Việt Nam
            </p>

            <button
              type="button"
              className={styles.btnSecondary}
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => setSelectedTransfer(null)}
            >
              Đã hoàn tất thanh toán
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
