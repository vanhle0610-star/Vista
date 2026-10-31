'use client';

import React from 'react';
import { Wallet, Users, Scale, ArrowUpRight, ArrowDownLeft, Check } from 'lucide-react';
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
  const perPersonSpent = Math.round(spent / Math.max(1, memberCount));

  // User's net balance delta
  const myDelta =
    currentUserId && summary.settlementDeltas && summary.settlementDeltas[currentUserId] !== undefined
      ? summary.settlementDeltas[currentUserId]
      : 0;

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.abs(Math.round(val))) + ' ₫';
  };

  return (
    <div className={styles.asymmetricKpiContainer}>
      {/* ─── 1. HERO REMAINING BUDGET BAR (60% WIDTH) ─── */}
      <div className={styles.kpiHeroBlock}>
        <div className={styles.kpiHeroHeader}>
          <div className={styles.kpiHeroTitleGroup}>
            <div className={styles.kpiHeroIconCircle}>
              <Wallet size={18} />
            </div>
            <span className={styles.kpiHeroLabel}>Ngân Quỹ Khả Dụng</span>
          </div>
          <span
            className={styles.kpiHeroBadge}
            style={{
              background: remaining >= 0 ? '#ecfdf5' : '#fef2f2',
              color: remaining >= 0 ? '#059669' : '#dc2626',
            }}
          >
            {remainingPct}% dự toán
          </span>
        </div>

        <div
          className={styles.kpiHeroValue}
          style={{ color: remaining >= 0 ? '#0f172a' : '#ef4444' }}
        >
          {formatVnd(remaining)}
        </div>

        {/* High-end Segmented Progress Track */}
        <div className={styles.kpiSegmentedTrack}>
          <div
            className={styles.kpiSegmentSpent}
            style={{ width: `${spentPct}%` }}
          />
          <div
            className={styles.kpiSegmentRemaining}
            style={{ width: `${remainingPct}%` }}
          />
        </div>

        <div className={styles.kpiHeroFooter}>
          <span className={styles.kpiFooterChip}>
            <span className={styles.dotSpent} />
            Đã chi: <strong>{formatVnd(spent)}</strong> ({spentPct}%)
          </span>
          <span className={styles.kpiFooterChip}>
            <span className={styles.dotBudget} />
            Dự toán: <strong>{formatVnd(budget)}</strong>
          </span>
        </div>
      </div>

      {/* ─── 2. DUAL DENSE METRIC CARDS (40% WIDTH) ─── */}
      <div className={styles.kpiSideGrid}>
        {/* Metric 1: Bình quân / người */}
        <div className={styles.kpiSubCard}>
          <div className={styles.kpiSubHeader}>
            <div className={`${styles.kpiSubIcon} ${styles.iconSky}`}>
              <Users size={16} />
            </div>
            <span className={styles.kpiSubLabel}>Bình quân / người</span>
          </div>
          <div className={styles.kpiSubMetric}>{formatVnd(perPersonSpent)}</div>
          <div className={styles.kpiSubFooterText}>
            {memberCount} thành viên trong đoàn
          </div>
        </div>

        {/* Metric 2: Vị thế ròng cá nhân */}
        <div className={styles.kpiSubCard}>
          <div className={styles.kpiSubHeader}>
            <div
              className={`${styles.kpiSubIcon} ${
                myDelta > 0 ? styles.iconEmerald : myDelta < 0 ? styles.iconRose : styles.iconGray
              }`}
            >
              {myDelta > 0 ? (
                <ArrowDownLeft size={16} />
              ) : myDelta < 0 ? (
                <ArrowUpRight size={16} />
              ) : (
                <Scale size={16} />
              )}
            </div>
            <span className={styles.kpiSubLabel}>Vị thế của bạn</span>
          </div>
          <div
            className={styles.kpiSubMetric}
            style={{
              color: myDelta > 0 ? '#059669' : myDelta < 0 ? '#e11d48' : '#0f172a',
            }}
          >
            {myDelta > 0
              ? `+${formatVnd(myDelta)}`
              : myDelta < 0
              ? `-${formatVnd(myDelta)}`
              : '0 ₫'}
          </div>
          <div className={styles.kpiSubFooterText}>
            {myDelta > 0
              ? 'Đoàn hoàn lại'
              : myDelta < 0
              ? 'Cần bù vào quỹ'
              : 'Đã cân bằng'}
          </div>
        </div>
      </div>
    </div>
  );
}
