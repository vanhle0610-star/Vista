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
  Share2,
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
    if (!s && !e) return 'Chưa thiết lập ngày';
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
    <header className={styles.headerWrapper}>
      {/* Breadcrumb Navigation */}
      <div className={styles.breadcrumbBar}>
        <Link href={`/trips/${trip.id}`} className={styles.breadcrumbLink}>
          <ArrowLeft size={16} />
          <span>Chi tiết chuyến đi</span>
        </Link>
        <span className={styles.breadcrumbDivider}>/</span>
        <span className={styles.breadcrumbCurrent}>Sổ quỹ & Quản lý Chi tiêu</span>
      </div>

      <div className={styles.tripHeaderBox}>
        <div className={styles.tripTitleGroup}>
          <div className={styles.titleWithBadge}>
            <h1 className={styles.tripTitle}>{trip.title}</h1>
            <div className={styles.statusPill}>
              <span className={styles.statusDot} />
              <span>{getStatusLabel(trip.status)}</span>
            </div>
          </div>

          <div className={styles.tripMetaRow}>
            {trip.destinationSummary && (
              <>
                <div className={styles.tripMetaItem}>
                  <MapPin size={15} color="#0284c7" />
                  <span>{trip.destinationSummary}</span>
                </div>
                <span className={styles.metaDot}>•</span>
              </>
            )}
            <div className={styles.tripMetaItem}>
              <Calendar size={15} color="#0284c7" />
              <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
            </div>
            <span className={styles.metaDot}>•</span>
            <div className={styles.tripMetaItem}>
              <Users size={15} color="#0284c7" />
              <span>{memberCount} thành viên tham gia</span>
            </div>
          </div>
        </div>

        <div className={styles.headerActionButtons}>
          <Link
            href={`/trips/${trip.id}`}
            className={styles.btnSecondary}
            title="Xem lịch trình chi tiết từng ngày"
          >
            <Compass size={16} />
            <span>Lịch trình</span>
          </Link>

          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => window.print()}
            title="Xuất báo cáo thu chi nhóm"
          >
            <FileDown size={16} />
            <span>Xuất báo cáo</span>
          </button>

          <button
            type="button"
            className={styles.btnPrimaryHighlight}
            onClick={onOpenAddExpense}
          >
            <Plus size={18} />
            <span>Ghi nhận chi tiêu</span>
          </button>
        </div>
      </div>
    </header>
  );
}
