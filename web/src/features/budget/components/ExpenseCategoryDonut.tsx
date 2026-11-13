'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';
import { VietnamesePagodaIllustration } from './VietnamesePagodaIllustration';
import type { Expense } from '../types';
import styles from '../treasury.module.css';

interface ExpenseCategoryDonutProps {
  expenses: Expense[];
  totalSpent: number;
  remainingBudget?: number;
}

export function ExpenseCategoryDonut({
  expenses,
  totalSpent,
  remainingBudget = 0,
}: ExpenseCategoryDonutProps) {
  const categoryTotals: Record<string, number> = {
    FOOD: 0,
    ACCOMMODATION: 0,
    TRANSPORT: 0,
    ACTIVITIES: 0,
    OTHER: 0,
  };

  expenses.forEach((exp) => {
    const cat = exp.category || 'OTHER';
    if (categoryTotals[cat] !== undefined) {
      categoryTotals[cat] += Number(exp.amount) || 0;
    } else {
      categoryTotals.OTHER += Number(exp.amount) || 0;
    }
  });

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + ' đ';
  };

  const radius = 46;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  // Colors matching Reference Design exactly
  const categoryItems = [
    { key: 'FOOD', label: 'Ăn uống', color: '#1E3A8A', amount: categoryTotals.FOOD },
    { key: 'TRANSPORT', label: 'Di chuyển', color: '#38BDF8', amount: categoryTotals.TRANSPORT },
    {
      key: 'OTHER',
      label: 'Khác',
      color: '#FB923C',
      amount:
        categoryTotals.OTHER +
        categoryTotals.ACCOMMODATION +
        categoryTotals.ACTIVITIES,
    },
  ];

  // If totalSpent is 0, percentage is strictly 0
  const hasSpent = totalSpent > 0;
  let offset = 0;
  const activeSegments = hasSpent
    ? categoryItems
        .filter((item) => item.amount > 0)
        .map((item) => {
          const pct = item.amount / totalSpent;
          const strokeDasharray = `${pct * circumference} ${circumference}`;
          const strokeDashoffset = -offset;
          offset += pct * circumference;
          return { ...item, pct, strokeDasharray, strokeDashoffset };
        })
    : [];

  return (
    <div className={styles.vistaCardDonut}>
      {/* ─── CARD HEADER ─── */}
      <div className={styles.vistaCardHeader}>
        <div className={styles.vistaCardTitleGroup}>
          <div className={styles.vistaCardIconCircle}>
            <BarChart3 size={15} color="#0284C7" />
          </div>
          <h2 className={styles.vistaCardTitle}>Tổng quan chuyến đi</h2>
        </div>
      </div>

      {/* ─── CHART + BREAKDOWN ROW ─── */}
      <div className={styles.vistaDonutRow}>
        {/* Left: Donut SVG with Center Text */}
        <div className={styles.vistaDonutChartWrapper}>
          <svg width="128" height="128" viewBox="0 0 128 128" className={styles.vistaDonutSvg}>
            {/* Base neutral track */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="transparent"
              stroke="#F1F5F9"
              strokeWidth={strokeWidth}
            />
            {/* Active Segments - only renders if real spending exists */}
            {activeSegments.map((seg) => (
              <circle
                key={seg.key}
                cx="64"
                cy="64"
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 64 64)"
              />
            ))}
          </svg>

          <div className={styles.vistaDonutCenterText}>
            <strong className={styles.vistaDonutCenterAmount}>{formatVnd(totalSpent)}</strong>
            <span className={styles.vistaDonutCenterLabel}>Đã chi</span>
          </div>
        </div>

        {/* Right: Category Legend */}
        <div className={styles.vistaDonutLegendList}>
          {categoryItems
            .filter((item) => (hasSpent ? item.amount > 0 : ['FOOD', 'TRANSPORT', 'OTHER'].includes(item.key)))
            .map((item) => (
              <div key={item.key} className={styles.vistaLegendItem}>
                <div className={styles.vistaLegendDotLabel}>
                  <span className={styles.vistaLegendDot} style={{ background: item.color }} />
                  <span className={styles.vistaLegendLabel}>{item.label}</span>
                </div>
                <strong className={styles.vistaLegendAmount}>{formatVnd(item.amount)}</strong>
              </div>
            ))}
        </div>
      </div>

      {/* ─── REMAINING BUDGET FOOTER ─── */}
      <div className={styles.vistaDonutFooter}>
        <span className={styles.vistaRemainingLabel}>Ngân sách còn lại</span>
        <strong className={styles.vistaRemainingAmount}>{formatVnd(remainingBudget)}</strong>
      </div>

      {/* ─── CORNER WATERMARK ─── */}
      <div className={styles.vistaDonutCornerWatermark}>
        <VietnamesePagodaIllustration
          width={180}
          height={140}
          color="#0284c7"
          accentColor="#bae6fd"
        />
      </div>
    </div>
  );
}
