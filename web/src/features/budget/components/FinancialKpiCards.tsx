'use client';

import React from 'react';
import { Wallet, Receipt, Target, Scale } from 'lucide-react';
import type { TripExpenseSummary } from '../types';
import styles from '../treasury.module.css';

interface FinancialKpiCardsProps {
  summary: TripExpenseSummary;
  memberCount: number;
  currentUserId?: string;
}

export function FinancialKpiCards({
  summary,
  memberCount,
  currentUserId,
}: FinancialKpiCardsProps) {
  const budget = summary.budgetTotal ?? 25000000;
  const spent = summary.totalSpent ?? 0;
  const remaining = summary.remainingBudget ?? (budget - spent);

  const spentPct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const remainingPct = Math.max(0, 100 - spentPct);

  // User's net balance delta from summary.settlementDeltas
  const myDelta =
    currentUserId && summary.settlementDeltas && summary.settlementDeltas[currentUserId] !== undefined
      ? summary.settlementDeltas[currentUserId]
      : 0;

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.abs(Math.round(val))) + ' ₫';
  };

  return (
    <div className={styles.kpiGrid}>
      {/* 1. Ngân Quỹ Còn Lại */}
      <div className={styles.kpiCard}>
        <div className={styles.kpiHeader}>
          <div className={`${styles.kpiIconCircle} ${styles.kpiIconBlue}`}>
            <Wallet size={19} />
          </div>
          <span className={styles.kpiLabel}>Ngân Quỹ Còn Lại</span>
        </div>
        <div className={styles.kpiMetric} style={{ color: remaining >= 0 ? '#0284c7' : '#ef4444' }}>
          {formatVnd(remaining)}
        </div>
        <div className={styles.kpiProgressBarTrack}>
          <div
            className={styles.kpiProgressBarFill}
            style={{ width: `${remainingPct}%`, background: '#0284c7' }}
          />
        </div>
        <div className={styles.kpiSubtext}>Còn {remainingPct}% so với dự toán</div>
      </div>

      {/* 2. Tổng Tiền Đã Chi */}
      <div className={styles.kpiCard}>
        <div className={styles.kpiHeader}>
          <div className={`${styles.kpiIconCircle} ${styles.kpiIconCoral}`}>
            <Receipt size={19} />
          </div>
          <span className={styles.kpiLabel}>Tổng Tiền Đã Chi</span>
        </div>
        <div className={styles.kpiMetric}>{formatVnd(spent)}</div>
        <div className={styles.kpiProgressBarTrack}>
          <div
            className={styles.kpiProgressBarFill}
            style={{ width: `${spentPct}%`, background: spentPct > 90 ? '#ef4444' : '#ea580c' }}
          />
        </div>
        <div className={styles.kpiSubtext}>Đã chi {spentPct}% ngân sách</div>
      </div>

      {/* 3. Dự Toán Ban Đầu */}
      <div className={styles.kpiCard}>
        <div className={styles.kpiHeader}>
          <div className={`${styles.kpiIconCircle} ${styles.kpiIconPurple}`}>
            <Target size={19} />
          </div>
          <span className={styles.kpiLabel}>Dự Toán Ban Đầu</span>
        </div>
        <div className={styles.kpiMetric}>{formatVnd(budget)}</div>
        <div className={styles.kpiProgressBarTrack}>
          <div
            className={styles.kpiProgressBarFill}
            style={{ width: '100%', background: '#94a3b8' }}
          />
        </div>
        <div className={styles.kpiSubtext}>
          Dành cho {memberCount} thành viên ({formatVnd(Math.round(budget / Math.max(1, memberCount)))}/người)
        </div>
      </div>

      {/* 4. Vị Thế Ròng Của Bạn */}
      <div className={styles.kpiCard}>
        <div className={styles.kpiHeader}>
          <div className={`${styles.kpiIconCircle} ${styles.kpiIconGreen}`}>
            <Scale size={19} />
          </div>
          <span className={styles.kpiLabel}>Vị Thế Ròng Của Bạn</span>
        </div>
        <div
          className={styles.kpiMetric}
          style={{ color: myDelta > 0 ? '#0284c7' : myDelta < 0 ? '#ef4444' : '#0f172a' }}
        >
          {myDelta > 0 ? `+${formatVnd(myDelta)}` : myDelta < 0 ? `-${formatVnd(myDelta)}` : '0 ₫'}
        </div>
        <div className={styles.kpiProgressBarTrack}>
          <div
            className={styles.kpiProgressBarFill}
            style={{
              width: myDelta !== 0 ? '100%' : '0%',
              background: myDelta >= 0 ? '#10b981' : '#ef4444',
            }}
          />
        </div>
        <div className={styles.kpiSubtext}>
          {myDelta > 0
            ? 'Bạn được nhóm hoàn lại'
            : myDelta < 0
            ? 'Bạn cần đóng thêm vào quỹ'
            : 'Đã cân bằng chi phí'}
        </div>
      </div>
    </div>
  );
}
