'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Plus,
  Compass,
  FileDown,
  Sparkles,
} from 'lucide-react';
import type { TripDetail } from '../types';
import styles from '../treasury.module.css';

interface TripHeaderProps {
  trip: TripDetail;
  memberCount: number;
  onOpenAddExpense: () => void;
}

export function TripHeader({
  trip,
  memberCount,
  onOpenAddExpense,
}: TripHeaderProps) {
  const normalizeDateStr = (dateStr?: string) => {
    if (!dateStr) return '';
    const clean = dateStr.trim();
    if (clean.includes('-')) {
      const parts = clean.split('-');
      if (parts.length === 3) {
        return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
      }
    }
    if (clean.includes('/')) {
      const parts = clean.split('/');
      if (parts.length === 2) {
        return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/2026`;
      }
      if (parts.length === 3) {
        return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
      }
    }
    return clean;
  };

  const formatDateRange = (start?: string, end?: string) => {
    const s = normalizeDateStr(start);
    const e = normalizeDateStr(end);
    if (!s && !e) return 'Lịch trình linh hoạt';
    if (s && e) return `${s} – ${e}`;
    return s || e;
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'IN_PROGRESS':
        return 'Đang diễn ra';
      case 'COMPLETED':
        return 'Hoàn tất';
      default:
        return 'Chuẩn bị';
    }
  };

  return (
    <header className={styles.editorialHeaderWrapper}>
      {/* Ambient backdrop glow */}
      <div className={styles.headerAmbientGlow} />

      {/* Top Navigation Bar */}
      <div className={styles.headerTopBar}>
        <div className={styles.breadcrumbBar}>
          <Link href={`/trips/${trip.id}`} className={styles.breadcrumbLink}>
            <ArrowLeft size={15} />
            <span>Chuyến đi</span>
          </Link>
          <span className={styles.breadcrumbDivider}>/</span>
          <span className={styles.breadcrumbCurrent}>Sổ quỹ</span>
        </div>

        <div className={styles.headerActionButtons}>
          <Link
            href={`/trips/${trip.id}`}
            className={styles.headerSubActionBtn}
            title="Xem lịch trình"
          >
            <Compass size={14} />
            <span>Lịch trình</span>
          </Link>

          <button
            type="button"
            className={styles.headerSubActionBtn}
            onClick={() => window.print()}
            title="Xuất PDF"
          >
            <FileDown size={14} />
            <span>Xuất</span>
          </button>

          <button
            type="button"
            className={styles.headerPrimaryActionBtn}
            onClick={onOpenAddExpense}
          >
            <Plus size={15} />
            <span>+ Ghi chi tiêu</span>
          </button>
        </div>
      </div>

      {/* Main Editorial Hero */}
      <div className={styles.editorialMainRow}>
        <div className={styles.editorialTitleGroup}>
          <div className={styles.editorialTitleRow}>
            <h1 className={styles.editorialTitle}>{trip.title}</h1>
            {/* Passport Stamp Badge [Khung 1] */}
            <div className={styles.passportStampBadge}>
              <span className={styles.stampDot} />
              <span className={styles.stampText}>{getStatusLabel(trip.status)}</span>
            </div>
          </div>

          <div className={styles.editorialMetaRow}>
            {trip.destinationSummary && (
              <div className={styles.editorialMetaItem}>
                <MapPin size={14} className={styles.metaIconSky} />
                <span>{trip.destinationSummary}</span>
              </div>
            )}
            <span className={styles.metaBullet}>•</span>
            <div className={styles.editorialMetaItem}>
              <Calendar size={14} className={styles.metaIconSky} />
              <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
            </div>
            <span className={styles.metaBullet}>•</span>
            <div className={styles.editorialMetaItem}>
              <Users size={14} className={styles.metaIconSky} />
              <span>{memberCount} thành viên</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
