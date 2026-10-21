'use client';

import React from 'react';
import type { Expense } from '../types';
import styles from '../treasury.module.css';

interface ExpenseCategoryDonutProps {
  expenses: Expense[];
  totalSpent: number;
}

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: string; color: string; bg: string }
> = {
  FOOD: { label: 'Ăn uống', icon: '🍜', color: '#f97316', bg: '#ffedd5' },
  ACCOMMODATION: { label: 'Lưu trú', icon: '🛏️', color: '#0284c7', bg: '#e0f2fe' },
  TRANSPORT: { label: 'Di chuyển', icon: '🚗', color: '#06b6d4', bg: '#cffafe' },
  ACTIVITIES: { label: 'Vé tham quan', icon: '🎟️', color: '#a855f7', bg: '#f3e8ff' },
  OTHER: { label: 'Mua sắm / Khác', icon: '🛍️', color: '#f43f5e', bg: '#ffe4e6' },
};

export function ExpenseCategoryDonut({ expenses, totalSpent }: ExpenseCategoryDonutProps) {
  // Aggregate real totals by category
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
      categoryTotals['OTHER'] += Number(exp.amount) || 0;
    }
  });

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + ' ₫';
  };

  // Build SVG Donut Segments
  const radius = 65;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;
  const segments = Object.entries(categoryTotals)
    .filter(([_, amount]) => amount > 0)
    .map(([catKey, amount]) => {
      const pct = totalSpent > 0 ? amount / totalSpent : 0;
      const strokeDasharray = `${pct * circumference} ${circumference}`;
      const strokeDashoffset = -cumulativeOffset;
      cumulativeOffset += pct * circumference;

      return {
        key: catKey,
        amount,
        pct: (pct * 100).toFixed(1),
        config: CATEGORY_CONFIG[catKey] || CATEGORY_CONFIG.OTHER,
        strokeDasharray,
        strokeDashoffset,
      };
    });

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionCardHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Phân Bổ Chi Tiêu</h2>
          <div className={styles.sectionSubtitle}>
            Tổng chi: {formatVnd(totalSpent)}
          </div>
        </div>
        <select className={styles.filterSelect} style={{ fontSize: '12px', padding: '4px 8px' }}>
          <option>Theo danh mục ▾</option>
        </select>
      </div>

      <div className={styles.donutContainer}>
        {/* SVG Donut Visual */}
        <div className={styles.donutVisualBox}>
          <svg width="170" height="170" viewBox="0 0 170 170" style={{ transform: 'rotate(-90deg)' }}>
            {/* Background Track */}
            <circle
              cx="85"
              cy="85"
              r={radius}
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
            />
            {/* Active Segments */}
            {segments.map((seg) => (
              <circle
                key={seg.key}
                cx="85"
                cy="85"
                r={radius}
                fill="transparent"
                stroke={seg.config.color}
                strokeWidth={strokeWidth}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="butt"
              />
            ))}
          </svg>

          <div className={styles.donutCenterText}>
            <span className={styles.donutCenterAmount}>{formatVnd(totalSpent)}</span>
            <span className={styles.donutCenterLabel}>Tổng chi</span>
          </div>
        </div>

        {/* Legend Breakdown */}
        <div className={styles.legendList}>
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
            const amount = categoryTotals[key] || 0;
            const pct = totalSpent > 0 ? ((amount / totalSpent) * 100).toFixed(1) : '0.0';
            return (
              <div key={key} className={styles.legendRow}>
                <div className={styles.legendLeft}>
                  <div
                    className={styles.categoryIconPill}
                    style={{ background: config.bg, color: config.color }}
                  >
                    {config.icon}
                  </div>
                  <span>{config.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className={styles.legendAmount}>{formatVnd(amount)}</span>
                  <span className={styles.legendPercent}>{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
