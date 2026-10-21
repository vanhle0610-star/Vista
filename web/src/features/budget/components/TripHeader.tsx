'use client';

import React from 'react';
import type { TripDetail } from '../types';
import styles from '../treasury.module.css';

interface TripHeaderProps {
  trip: TripDetail;
  memberCount: number;
  onOpenAddExpense: () => void;
}

export function TripHeader({ trip, memberCount, onOpenAddExpense }: TripHeaderProps) {
  const formatDateRange = (start?: string, end?: string) => {
    if (!start || !end) return '24/10/2026 – 27/10/2026';
    const s = new Date(start);
    const e = new Date(end);
    const sStr = `${String(s.getDate()).padStart(2, '0')}/${String(s.getMonth() + 1).padStart(2, '0')}/${s.getFullYear()}`;
    const eStr = `${String(e.getDate()).padStart(2, '0')}/${String(e.getMonth() + 1).padStart(2, '0')}/${e.getFullYear()}`;
    return `${sStr} – ${eStr}`;
  };

  return (
    <header>
      <div className={styles.breadcrumbRow}>
        <span>‹</span>
        <span>Chuyến đi của nhóm</span>
      </div>

      <div className={styles.tripHeaderBox}>
        <div className={styles.tripTitleGroup}>
          <div className={styles.titleWithBadge}>
            <h1 className={styles.tripTitle}>{trip.title}</h1>
            <span style={{ cursor: 'pointer', fontSize: '18px' }} title="Chỉnh sửa">
              ✏️
            </span>
            <div className={styles.statusPill}>
              <span className={styles.statusDot} />
              <span>{trip.status === 'IN_PROGRESS' ? 'ĐANG DIỄN RA' : trip.status}</span>
            </div>
          </div>

          <div className={styles.tripMetaRow}>
            <div className={styles.tripMetaItem}>
              <span>📅</span>
              <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
            </div>
            <span>•</span>
            <div className={styles.tripMetaItem}>
              <span>👥</span>
              <span>{memberCount} thành viên</span>
            </div>
          </div>
        </div>

        <div className={styles.headerActionButtons}>
          <button type="button" className={styles.btnSecondary} onClick={() => alert('Chỉnh sửa thông tin chuyến đi')}>
            <span>✏️</span>
            <span>Chỉnh sửa chuyến đi</span>
          </button>
          <button type="button" className={styles.btnSecondary} onClick={() => window.print()}>
            <span>📥</span>
            <span>Xuất báo cáo</span>
          </button>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href);
                alert('Đã sao chép liên kết chuyến đi!');
              }
            }}
          >
            <span>🔗</span>
            <span>Chia sẻ</span>
          </button>
        </div>
      </div>
    </header>
  );
}
