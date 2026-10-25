'use client';

import React from 'react';
import { Utensils, Hotel, Car, Ticket, ShoppingBag, PieChart } from 'lucide-react';
import type { Expense } from '../types';
import styles from '../treasury.module.css';

interface ExpenseCategoryDonutProps {
  expenses: Expense[];
  totalSpent: number;
}

interface CategoryMeta {
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

export function ExpenseCategoryDonut({ expenses, totalSpent }: ExpenseCategoryDonutProps) {
  const CATEGORY_CONFIG: Record<string, CategoryMeta> = {
    FOOD: { label: 'Ăn uống', icon: <Utensils size={14} />, color: '#f97316', bg: '#ffedd5' },
    ACCOMMODATION: { label: 'Lưu trú', icon: <Hotel size={14} />, color: '#0284c7', bg: '#e0f2fe' },
    TRANSPORT: { label: 'Di chuyển', icon: <Car size={14} />, color: '#06b6d4', bg: '#cffafe' },
    ACTIVITIES: { label: 'Vé tham quan', icon: <Ticket size={14} />, color: '#a855f7', bg: '#f3e8ff' },
    OTHER: { label: 'Mua sắm / Khác', icon: <ShoppingBag size={14} />, color: '#f43f5e', bg: '#ffe4e6' },
  };

  // Aggregate totals by category
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
  const radius = 62;
  const strokeWidth = 20;
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
        <div className={styles.cardHeaderBadge}>
          <PieChart size={15} color="#0284c7" />
          <span>Theo danh mục</span>
        </div>
      </div>

      <div className={styles.donutContainer}>
        {/* SVG Donut Visual */}
        <div className={styles.donutVisualBox}>
          <svg width="160" height="160" viewBox="0 0 160 160" className={styles.donutSvg}>
            {/* Background Track */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
            />
            {/* Active Segments */}
            {segments.map((seg) => (
              <circle
                key={seg.key}
                cx="80"
                cy="80"
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

          {/* Centered Total Amount (Strictly upright, never sideways) */}
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
                  <span className={styles.legendLabelText}>{config.label}</span>
                </div>
                <div className={styles.legendRight}>
                  <span className={styles.legendAmount}>{formatVnd(amount)}</span>
                  <span className={styles.legendPercent}>({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
