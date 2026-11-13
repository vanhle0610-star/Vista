'use client';

import React from 'react';
import {
  Crown,
  Zap,
  UtensilsCrossed,
  Car,
  Bed,
  Ticket,
  ShoppingBag,
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
  expenses,
}: PersonalBalanceHubProps) {
  // If there are no expenses yet, don't show empty wireframe medallions
  if (expenses.length === 0 || summary.totalSpent <= 0) {
    return null;
  }

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.abs(Math.round(val))) + ' ₫';
  };

  // 1. Top Spender
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

  // 2. Fast Settler
  const fastSettler =
    members.find((m) => {
      const delta = summary.settlementDeltas?.[m.userId] ?? 0;
      return delta === 0;
    }) || members[0];

  // 3. Top Category
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

  return (
    <div className={styles.badgesHallOfFame}>
      <div className={styles.badgesHeader}>
        <div className={styles.badgesHeaderLeft}>
          <Sparkles size={15} className={styles.badgesHeaderIcon} />
          <h3 className={styles.badgesTitle}>Vinh Danh Đoàn</h3>
        </div>
      </div>

      <div className={styles.badgesGrid}>
        {/* Medallion 1: Top Spender */}
        <div className={styles.badgeCard}>
          <div className={`${styles.badgeIconCircle} ${styles.badgeGold}`}>
            <Crown size={16} />
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
            <Zap size={16} />
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
            <TopCatIcon size={16} />
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
  );
}
