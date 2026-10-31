'use client';

import React, { useState } from 'react';
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
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  const CATEGORY_CONFIG: Record<string, CategoryMeta> = {
    FOOD: { label: 'Ăn uống', icon: <Utensils size={13} />, color: '#ea580c', bg: '#ffedd5' },
    ACCOMMODATION: { label: 'Lưu trú', icon: <Hotel size={13} />, color: '#0284c7', bg: '#e0f2fe' },
    TRANSPORT: { label: 'Di chuyển', icon: <Car size={13} />, color: '#0891b2', bg: '#cffafe' },
    ACTIVITIES: { label: 'Vé vui chơi', icon: <Ticket size={13} />, color: '#9333ea', bg: '#f3e8ff' },
    OTHER: { label: 'Mua sắm', icon: <ShoppingBag size={13} />, color: '#e11d48', bg: '#ffe4e6' },
  };

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

  const radius = 62;
  const strokeWidth = 18;
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
        pct: (pct * 100).toFixed(0),
        config: CATEGORY_CONFIG[catKey] || CATEGORY_CONFIG.OTHER,
        strokeDasharray,
        strokeDashoffset,
        isSelected: selectedCat === catKey,
      };
    });

  const activeAmount = selectedCat ? categoryTotals[selectedCat] || 0 : totalSpent;
  const activeLabel = selectedCat
    ? CATEGORY_CONFIG[selectedCat]?.label || 'Chi tiêu'
    : 'Tổng chi';

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionCardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PieChart size={16} color="#0284c7" />
          <h2 className={styles.sectionTitle}>Phân Bổ Chi Tiêu</h2>
        </div>
        {selectedCat && (
          <button
            type="button"
            className={styles.resetFilterBtn}
            onClick={() => setSelectedCat(null)}
          >
            Xem tất cả
          </button>
        )}
      </div>

      <div className={styles.donutContainerCentered}>
        {/* Dual-ring Glass Rim Visual [Khung 5] */}
        <div className={styles.donutVisualBoxGlass}>
          <svg width="154" height="154" viewBox="0 0 160 160" className={styles.donutSvg}>
            {/* Outer glass ring */}
            <circle
              cx="80"
              cy="80"
              r="74"
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth="1.5"
            />
            {/* Base track */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke="#f8fafc"
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
                strokeWidth={seg.isSelected ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="round"
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  opacity: selectedCat && !seg.isSelected ? 0.35 : 1,
                }}
                onClick={() => setSelectedCat(selectedCat === seg.key ? null : seg.key)}
              />
            ))}
          </svg>

          {/* Upright Center Total */}
          <div className={styles.donutCenterText}>
            <span className={styles.donutCenterAmount}>{formatVnd(activeAmount)}</span>
            <span className={styles.donutCenterLabel}>{activeLabel}</span>
          </div>
        </div>

        {/* Interactive Category Chips Grid */}
        <div className={styles.donutCategoryChipsGrid}>
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
            const amount = categoryTotals[key] || 0;
            const pct = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;
            const isSelected = selectedCat === key;

            return (
              <button
                key={key}
                type="button"
                className={`${styles.donutChipRow} ${isSelected ? styles.donutChipSelected : ''}`}
                onClick={() => setSelectedCat(isSelected ? null : key)}
              >
                <div className={styles.donutChipLeft}>
                  <span
                    className={styles.donutChipDot}
                    style={{ background: config.color }}
                  />
                  <span className={styles.donutChipName}>{config.label}</span>
                </div>
                <div className={styles.donutChipRight}>
                  <strong>{formatVnd(amount)}</strong>
                  <span className={styles.donutChipPct}>{pct}%</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
