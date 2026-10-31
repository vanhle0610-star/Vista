'use client';

import React, { useState } from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Crown,
  Zap,
  UtensilsCrossed,
  Car,
  Bed,
  Ticket,
  ShoppingBag,
  QrCode,
  X,
  Sparkles,
} from 'lucide-react';
import type { TripExpenseSummary, TripMember, Expense } from '../types';
import styles from '../treasury.module.css';

interface PersonalBalanceHubProps {
  summary: TripExpenseSummary;
  members: TripMember[];
  currentUserId: string;
  expenses: Expense[];
  tripTitle?: string;
}

export function PersonalBalanceHub({
  summary,
  members,
  currentUserId,
  expenses,
  tripTitle = 'VISTA',
}: PersonalBalanceHubProps) {
  const [showQrModal, setShowQrModal] = useState(false);
  const [modalMode, setModalMode] = useState<'RECEIVE' | 'PAY'>('RECEIVE');

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.abs(Math.round(val))) + ' ₫';
  };

  // 1. My Personal Balance
  const myDelta = summary.settlementDeltas?.[currentUserId] ?? 0;
  const isCreditor = myDelta > 1000;
  const isDebtor = myDelta < -1000;
  const isBalanced = !isCreditor && !isDebtor;

  const currentMember = members.find((m) => m.userId === currentUserId);
  const myName = currentMember?.displayName || 'Bạn';

  // Find recipient if debtor
  const myDebtTransfer = isDebtor
    ? summary.suggestedTransfers?.find((t) => t.fromUserId === currentUserId)
    : null;
  const debtRecipient = myDebtTransfer
    ? members.find((m) => m.userId === myDebtTransfer.toUserId)
    : null;

  // Count how many people owe me if creditor
  const debtorCount = isCreditor
    ? (summary.suggestedTransfers?.filter((t) => t.toUserId === currentUserId).length || 1)
    : 0;

  // 2. Leaderboard Medallions
  const spendingByUser: Record<string, number> = {};
  expenses.forEach((e) => {
    spendingByUser[e.paidBy] = (spendingByUser[e.paidBy] || 0) + (Number(e.amount) || 0);
  });

  let topSpenderId = '';
  let topAmount = 0;
  Object.entries(spendingByUser).forEach(([uid, amt]) => {
    if (amt > topAmount) {
      topAmount = amt;
      topSpenderId = uid;
    }
  });

  const topSpender = members.find((m) => m.userId === topSpenderId);
  const topSpenderPct =
    summary.totalSpent > 0 ? Math.round((topAmount / summary.totalSpent) * 100) : 0;

  // Fast Settler
  const fastSettler =
    members.find((m) => {
      const delta = summary.settlementDeltas?.[m.userId] ?? 0;
      return delta === 0 && expenses.length > 0;
    }) || members[0];

  // Top Category
  const spendingByCategory: Record<string, number> = {};
  expenses.forEach((e) => {
    spendingByCategory[e.category] =
      (spendingByCategory[e.category] || 0) + (Number(e.amount) || 0);
  });

  let topCategory = 'FOOD';
  let topCatAmount = 0;
  Object.entries(spendingByCategory).forEach(([cat, amt]) => {
    if (amt > topCatAmount) {
      topCatAmount = amt;
      topCategory = cat;
    }
  });

  const categoryLabels: Record<string, { label: string; icon: any }> = {
    FOOD: { label: 'Ẩm thực', icon: UtensilsCrossed },
    TRANSPORT: { label: 'Di chuyển', icon: Car },
    ACCOMMODATION: { label: 'Lưu trú', icon: Bed },
    ACTIVITIES: { label: 'Vé vui chơi', icon: Ticket },
    OTHER: { label: 'Mua sắm', icon: ShoppingBag },
  };

  const currentCatInfo = categoryLabels[topCategory] || categoryLabels['FOOD'];
  const TopCatIcon = currentCatInfo.icon;

  // VietQR parameters
  const qrBankCode = 'MB';
  const qrAccountNo = '0987654321';
  const qrAccountName = isCreditor
    ? myName.toUpperCase()
    : (debtRecipient?.displayName || 'THU QUY').toUpperCase();
  const qrTransferAmount = isCreditor ? Math.round(myDelta) : Math.round(Math.abs(myDelta));
  const qrMemo = `${tripTitle.slice(0, 12)} ${myName}`.replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const vietQrUrl = `https://img.vietqr.io/image/${qrBankCode}-${qrAccountNo}-compact2.png?amount=${qrTransferAmount}&addInfo=${encodeURIComponent(qrMemo)}&accountName=${encodeURIComponent(qrAccountName)}`;

  const handleOpenQr = (mode: 'RECEIVE' | 'PAY') => {
    setModalMode(mode);
    setShowQrModal(true);
  };

  return (
    <div className={styles.hubContainer}>
      {/* ─── 1. METALLIC PERSONAL BALANCE CARD ─── */}
      <div
        className={`${styles.myBalanceHeroCard} ${
          isCreditor
            ? styles.heroCardCreditor
            : isDebtor
            ? styles.heroCardDebtor
            : styles.heroCardBalanced
        }`}
      >
        <div className={styles.heroCardHeader}>
          <div className={styles.heroCardBadge}>
            {isCreditor ? (
              <span className={styles.badgeCreditor}>
                <ArrowDownLeft size={13} /> ĐƯỢC HOÀN
              </span>
            ) : isDebtor ? (
              <span className={styles.badgeDebtor}>
                <ArrowUpRight size={13} /> CẦN TRẢ
              </span>
            ) : (
              <span className={styles.badgeBalanced}>
                <CheckCircle2 size={13} /> CÂN BẰNG
              </span>
            )}
          </div>
          <span className={styles.heroCardUserTag}>Ví của {myName}</span>
        </div>

        <div className={styles.heroCardAmountRow}>
          <span className={styles.heroCardCurrencySymbol}>
            {isCreditor ? '+' : isDebtor ? '-' : ''}
          </span>
          <span className={styles.heroCardAmount}>{formatVnd(Math.abs(myDelta))}</span>
        </div>

        <div className={styles.heroCardMetaRow}>
          <span className={styles.heroCardMetaText}>
            {isCreditor
              ? `${debtorCount} người cần trả bạn`
              : isDebtor
              ? `Chuyển cho: ${debtRecipient?.displayName || 'Trưởng đoàn'}`
              : 'Không có khoản nợ tồn đọng'}
          </span>

          <div className={styles.heroCardActions}>
            {isCreditor && (
              <button
                type="button"
                className={styles.btnHeroActionPrimary}
                onClick={() => handleOpenQr('RECEIVE')}
              >
                <QrCode size={14} /> Nhận VietQR
              </button>
            )}

            {isDebtor && (
              <button
                type="button"
                className={styles.btnHeroActionWarning}
                onClick={() => handleOpenQr('PAY')}
              >
                <QrCode size={14} /> Trả VietQR
              </button>
            )}

            {isBalanced && (
              <span className={styles.balancedNotice}>
                <CheckCircle2 size={14} /> Tất toán
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── 2. GROUP FINANCIAL MEDALLIONS ─── */}
      <div className={styles.badgesHallOfFame}>
        <div className={styles.badgesHeader}>
          <div className={styles.badgesHeaderLeft}>
            <Sparkles size={16} className={styles.badgesHeaderIcon} />
            <h3 className={styles.badgesTitle}>Vinh Danh Đoàn</h3>
          </div>
        </div>

        <div className={styles.badgesGrid}>
          {/* Medallion 1: Top Spender */}
          <div className={styles.badgeCard}>
            <div className={`${styles.badgeIconCircle} ${styles.badgeGold}`}>
              <Crown size={18} />
            </div>
            <div className={styles.badgeContent}>
              <div className={styles.badgeLabel}>Chiến thần chi</div>
              <div className={styles.badgeSpenderName}>
                {topSpender ? topSpender.displayName : '—'}
              </div>
              <div className={styles.badgeMetric}>
                <strong>{formatVnd(topAmount)}</strong> ({topSpenderPct}%)
              </div>
            </div>
          </div>

          {/* Medallion 2: Fast Settler */}
          <div className={styles.badgeCard}>
            <div className={`${styles.badgeIconCircle} ${styles.badgeGreen}`}>
              <Zap size={18} />
            </div>
            <div className={styles.badgeContent}>
              <div className={styles.badgeLabel}>Tất toán nhanh</div>
              <div className={styles.badgeSpenderName}>
                {fastSettler ? fastSettler.displayName : 'Cả đoàn'}
              </div>
              <div className={styles.badgeMetric}>
                <strong>0 ₫</strong> nợ tồn
              </div>
            </div>
          </div>

          {/* Medallion 3: Top Category */}
          <div className={styles.badgeCard}>
            <div className={`${styles.badgeIconCircle} ${styles.badgeOrange}`}>
              <TopCatIcon size={18} />
            </div>
            <div className={styles.badgeContent}>
              <div className={styles.badgeLabel}>Chi nhiều nhất</div>
              <div className={styles.badgeSpenderName}>{currentCatInfo.label}</div>
              <div className={styles.badgeMetric}>
                <strong>{formatVnd(topCatAmount)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. CLEAN VIETQR MODAL ─── */}
      {showQrModal && (
        <div className={styles.drawerOverlay} onClick={() => setShowQrModal(false)}>
          <div className={styles.qrPopupContainer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.qrPopupHeader}>
              <div className={styles.qrPopupTitleBox}>
                <QrCode size={18} color="#0284c7" />
                <h3 className={styles.qrPopupTitle}>
                  {modalMode === 'RECEIVE' ? 'Mã VietQR Nhận Tiền' : 'Quét VietQR Trả Nợ'}
                </h3>
              </div>
              <button
                type="button"
                className={styles.drawerCloseBtn}
                onClick={() => setShowQrModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.qrPopupBody}>
              <div className={styles.qrImageFrame}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={vietQrUrl}
                  alt="VietQR"
                  className={styles.qrImage}
                />
              </div>

              <div className={styles.qrDetailsCard}>
                <div className={styles.qrDetailRow}>
                  <span>Tài khoản</span>
                  <strong>{qrAccountName}</strong>
                </div>
                <div className={styles.qrDetailRow}>
                  <span>Số tiền</span>
                  <strong style={{ color: '#0284c7', fontSize: '15px' }}>
                    {formatVnd(qrTransferAmount)}
                  </strong>
                </div>
                <div className={styles.qrDetailRow}>
                  <span>Nội dung</span>
                  <code className={styles.qrMemoCode}>{qrMemo}</code>
                </div>
              </div>

              <button
                type="button"
                className={styles.btnConfirmQr}
                onClick={() => setShowQrModal(false)}
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
