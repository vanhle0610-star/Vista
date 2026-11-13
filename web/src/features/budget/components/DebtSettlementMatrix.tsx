'use client';

import React, { useState } from 'react';
import {
  Scale,
  CheckCircle2,
  X,
  UserPlus,
  ArrowRight,
  QrCode,
  Users,
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
  currentUserId = 'u-me',
  tripId = 'VISTA',
  onAddMember,
}: DebtSettlementMatrixProps) {
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);

  const memberMap = new Map<string, TripMember>();
  members.forEach((m) => memberMap.set(m.userId, m));

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.abs(Math.round(val))) + ' đ';
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
  const hasTransfers = summary.suggestedTransfers && summary.suggestedTransfers.length > 0;

  // Avatar colors matching Reference Design
  const avatarColors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899'];

  return (
    <div className={styles.vistaCardSettlement}>
      {/* ─── CARD HEADER ─── */}
      <div className={styles.vistaCardHeader}>
        <div className={styles.vistaCardTitleGroup}>
          <div className={styles.vistaCardIconCircle}>
            <Scale size={15} color="#0284C7" />
          </div>
          <h2 className={styles.vistaCardTitle}>Đối soát công nợ</h2>
        </div>

        {onAddMember && <button
          type="button"
          className={styles.vistaCardLinkAction}
          onClick={() => setShowAddMemberModal(true)}
          title="Thêm thành viên vào sổ quỹ"
        >
          <span>Xem chi tiết</span>
          <ArrowRight size={13} />
        </button>}
      </div>

      {/* ─── SETTLEMENT TABLE ─── */}
      <div className={styles.vistaSettlementTableWrapper}>
        <table className={styles.vistaSettlementTable}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', width: '50%' }}>Thành viên</th>
              <th style={{ textAlign: 'right', width: '25%' }}>Đã thanh toán</th>
              <th style={{ textAlign: 'right', width: '25%' }}>Cần thanh toán</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '16px', color: '#64748B' }}>
                  Chưa có thành viên nào
                </td>
              </tr>
            ) : (
              members.map((member, idx) => {
                const delta = deltas[member.userId] !== undefined ? deltas[member.userId] : 0;
                const isMe = member.userId === currentUserId;
                const paid = delta > 0 ? delta : 0;
                const owed = delta < 0 ? Math.abs(delta) : 0;
                const initial = member.displayName ? member.displayName.charAt(0).toUpperCase() : 'U';
                const avatarBg = avatarColors[idx % avatarColors.length];

                return (
                  <tr key={member.userId}>
                    <td>
                      <div className={styles.vistaMemberCell}>
                        <div
                          className={styles.vistaMemberAvatar}
                          style={{ background: avatarBg }}
                        >
                          {initial}
                        </div>
                        <span className={styles.vistaMemberName}>
                          {member.displayName.includes('(')
                            ? member.displayName
                            : `${member.displayName} ${member.role === 'OWNER' || idx === 0 ? '(Owner)' : '(Member)'}`}
                        </span>
                      </div>
                    </td>

                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#0F172A' }}>
                      {formatVnd(paid)}
                    </td>

                    <td style={{ textAlign: 'right', fontWeight: 600, color: owed > 0 ? '#DC2626' : '#0F172A' }}>
                      {formatVnd(owed)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── BOTTOM SETTLEMENT STATUS STRIP ─── */}
      {!hasTransfers ? (
        <div className={styles.vistaSettledAlertPill}>
          <CheckCircle2 size={15} color="#059669" />
          <span>Tất cả đã được quyết toán!</span>
        </div>
      ) : (
        <div className={styles.vistaPendingTransfersList}>
          {summary.suggestedTransfers!.map((t, idx) => {
            const fromName = getMemberDisplayName(t.fromUserId);
            const toName = getMemberDisplayName(t.toUserId);
            return (
              <div key={idx} className={styles.vistaTransferItem}>
                <span className={styles.vistaTransferNames}>
                  <strong>{fromName}</strong> trả <strong>{toName}</strong>: {formatVnd(t.amount)}
                </span>
                <span className={styles.vistaTransferBadge}>Chưa trả</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── ADD MEMBER MODAL ─── */}
      {showAddMemberModal && onAddMember && (
        <div className={styles.saasModalOverlay} onClick={() => setShowAddMemberModal(false)}>
          <div className={styles.saasModalCard} style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.saasModalHeader}>
              <h3 className={styles.saasModalTitle}>Chi Tiết Công Nợ & Thành Viên</h3>
              <button
                type="button"
                className={styles.saasModalCloseBtn}
                onClick={() => setShowAddMemberModal(false)}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleAddMemberSubmit} style={{ padding: '20px 24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label className={styles.saasFormLabel}>Thêm thành viên mới vào đoàn:</label>
                <input
                  type="text"
                  className={styles.saasInput}
                  placeholder="Nhập tên người bạn đồng hành..."
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className={styles.saasBtnSecondary}
                  onClick={() => setShowAddMemberModal(false)}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className={styles.vistaBtnPrimary}
                  disabled={!newMemberName.trim()}
                >
                  <UserPlus size={13} />
                  <span>Thêm ngay</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
