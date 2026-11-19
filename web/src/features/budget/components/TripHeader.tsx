'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Users,
  Plus,
  FileDown,
  Share2,
  Check,
  Compass,
} from 'lucide-react';
import type { TripDetail, Expense, TripMember } from '../types';
import styles from '../treasury.module.css';

interface TripHeaderProps {
  trip: TripDetail;
  memberCount: number;
  expenses?: Expense[];
  members?: TripMember[];
  onOpenAddExpense: () => void;
}

export function TripHeader({
  trip,
  memberCount,
  expenses = [],
  members = [],
  onOpenAddExpense,
}: TripHeaderProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  const handleShareLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleExportCsv = () => {
    if (typeof window !== 'undefined') {
      const headers = 'Ngày,Mô tả,Danh mục,Người chi,Số tiền (VND)\n';
      const rows =
        expenses.length > 0
          ? expenses
              .map((e) => {
                const d = e.occurredAt
                  ? new Date(e.occurredAt).toLocaleDateString('vi-VN')
                  : '';
                const payer =
                  members.find((m) => m.userId === e.paidBy)?.displayName || e.paidBy;
                return `"${d}","${e.title}","${e.category}","${payer}",${e.amount}`;
              })
              .join('\n')
          : 'Chưa có khoản chi tiêu nào ghi nhận trong chuyến đi này\n';

      const csvContent =
        'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(headers + rows);
      const link = document.createElement('a');
      link.setAttribute('href', csvContent);
      link.setAttribute('download', `so-quy-${trip.id}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

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
        return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}`;
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

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Chuyến đi đã hoàn tất';
      case 'ACTIVE':
      case 'IN_PROGRESS':
        return 'Chuyến đi đang diễn ra';
      default:
        return 'Chuyến đi sắp tới';
    }
  };

  const getBannerTitle = () => {
    if (trip.destinationSummary && trip.destinationSummary.trim().length > 0) {
      return trip.destinationSummary;
    }
    return trip.title;
  };

  const bannerTitle = getBannerTitle();
  const bannerSubtitle = trip.description || '';

  return (
    <div className={styles.vistaBannerCard}>
      {/* Background panoramic image of trip */}
      {trip.coverImageUrl && (
        <img src={trip.coverImageUrl} alt={bannerTitle} className={styles.vistaBannerImage} />
      )}
      <div className={styles.vistaBannerOverlay} />

      {/* Foreground Content */}
      <div className={styles.vistaBannerContent}>
        <div className={styles.vistaBannerLeft}>
          <div className={styles.vistaTagUpcoming}>
            <span>✈</span>
            <span>{getStatusText(trip.status)}</span>
          </div>

          <h1 className={styles.vistaBannerTitle}>{bannerTitle}</h1>

          <div className={styles.vistaBannerMeta}>
            <div className={styles.vistaMetaItem}>
              <Calendar size={13} color="#475569" />
              <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
            </div>
            <span className={styles.vistaMetaDot}>•</span>
            <div className={styles.vistaMetaItem}>
              <Users size={13} color="#475569" />
              <span>{memberCount} thành viên</span>
            </div>
          </div>

          {bannerSubtitle && <div className={styles.vistaTaglineWrapper}>
            <p className={styles.vistaBannerScript}>{bannerSubtitle}</p>
            <svg
              className={styles.vistaBrushStroke}
              width="135"
              height="8"
              viewBox="0 0 135 8"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2 5C32 2 85 2 133 4.5"
                stroke="#F59E0B"
                strokeWidth="2.8"
                strokeLinecap="round"
                opacity="0.95"
              />
            </svg>
          </div>}
        </div>

        {/* Right-aligned action buttons */}
        <div className={styles.vistaBannerRight}>
          <Link
            href={`/trips/${trip.id}`}
            className={styles.vistaBtnSecondary}
            title="Xem lịch trình chi tiết"
          >
            <Compass size={13} />
            <span>Lịch trình</span>
          </Link>

          <button
            type="button"
            className={styles.vistaBtnSecondary}
            onClick={handleShareLink}
            title="Sao chép liên kết chia sẻ"
          >
            {copiedLink ? <Check size={13} color="#059669" /> : <Share2 size={13} />}
            <span>{copiedLink ? 'Đã sao chép!' : 'Chia sẻ'}</span>
          </button>

          <button
            type="button"
            className={styles.vistaBtnSecondary}
            onClick={handleExportCsv}
            title="Xuất bảng đối soát CSV"
          >
            <FileDown size={13} />
            <span>Xuất báo cáo</span>
          </button>

          <button
            type="button"
            className={styles.vistaBtnPrimary}
            onClick={onOpenAddExpense}
            title="Thêm khoản chi tiêu mới"
          >
            <Plus size={14} />
            <span>Chi tiêu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
