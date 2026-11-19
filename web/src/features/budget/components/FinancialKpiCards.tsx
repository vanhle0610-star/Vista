'use client';

import React from 'react';
import {
  CreditCard,
  Calendar,
} from 'lucide-react';
import { VietnamesePagodaIllustration } from './VietnamesePagodaIllustration';
import type { TripExpenseSummary, TripMember } from '../types';
import styles from '../treasury.module.css';

interface FinancialKpiCardsProps {
  summary: TripExpenseSummary;
  memberCount: number;
  currentUserId?: string;
  members?: TripMember[];
  tripTitle?: string;
  tripDates?: string;
}

export function FinancialKpiCards({
  summary,
  memberCount,
  currentUserId = 'u-me',
  members = [],
  tripTitle = 'VISTA',
  tripDates = 'Chưa thiết lập ngày',
}: FinancialKpiCardsProps) {
  const budget = Number(summary.budgetTotal) || 0;
  const spent = Number(summary.totalSpent) || 0;
  const remaining = budget > 0 ? (summary.remainingBudget ?? (budget - spent)) : 0;

  const spentPct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

  // User's net balance delta
  const myDelta =
    currentUserId && summary.settlementDeltas && summary.settlementDeltas[currentUserId] !== undefined
      ? summary.settlementDeltas[currentUserId]
      : 0;

  const isCreditor = myDelta > 1000;
  const isDebtor = myDelta < -1000;

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.abs(Math.round(val))) + ' đ';
  };

  return (
    <div className={styles.vistaCardBudget}>
      {/* ─── CARD HEADER ─── */}
      <div className={styles.vistaCardHeader}>
        <div className={styles.vistaCardTitleGroup}>
          <div className={styles.vistaCardIconCircle}>
            <CreditCard size={15} color="#0284C7" />
          </div>
          <h2 className={styles.vistaCardTitle}>Ngân sách chuyến đi</h2>
        </div>

        <div className={styles.vistaCardDateBadge}>
          <Calendar size={13} color="#64748B" />
          <span>{tripDates}</span>
        </div>
      </div>

      {/* ─── MAIN HERO AMOUNT ─── */}
      <div className={styles.vistaBudgetHeroAmount}>
        {formatVnd(budget)}
      </div>

      {/* ─── THIN PROGRESS BAR ─── */}
      <div className={styles.vistaProgressBarWrapper}>
        <div className={styles.vistaProgressBarTrack}>
          <div
            className={styles.vistaProgressBarFill}
            style={{ width: `${Math.max(0, spentPct)}%` }}
          />
        </div>
        <span className={styles.vistaProgressPctText}>{spentPct}%</span>
      </div>

      {/* ─── 3 STATS COLUMNS ─── */}
      <div className={styles.vistaBudgetStatsRow}>
        <div className={styles.vistaBudgetStatItem}>
          <span className={styles.vistaBudgetStatLabel}>Đã chi</span>
          <strong className={styles.vistaBudgetStatValue}>{formatVnd(spent)}</strong>
        </div>

        <div className={styles.vistaBudgetStatItem}>
          <span className={styles.vistaBudgetStatLabel}>Còn lại</span>
          <strong className={styles.vistaBudgetStatValue} style={{ color: remaining >= 0 ? '#0F172A' : '#DC2626' }}>
            {formatVnd(remaining)}
          </strong>
        </div>

        <div className={styles.vistaBudgetStatItem}>
          <span className={styles.vistaBudgetStatLabel}>Dự toán</span>
          <strong className={styles.vistaBudgetStatValue}>{formatVnd(budget)}</strong>
        </div>
      </div>

      {/* ─── VIETNAMESE PAGODA WATERMARK ─── */}
      <div className={styles.vistaBudgetPagodaWatermark}>
        <VietnamesePagodaIllustration
          width={240}
          height={180}
          color="#0284c7"
          accentColor="#bae6fd"
        />
      </div>

    </div>
  );
}
