'use client';

import React from 'react';
import Link from 'next/link';
import styles from '../treasury.module.css';

interface TripSidebarProps {
  tripId: string;
}

export function TripSidebar({ tripId }: TripSidebarProps) {
  const navItems = [
    { label: 'Tổng quan', icon: '🏠', href: `/trips/${tripId}` },
    { label: 'Ngân sách', icon: '🕒', href: `/trips/${tripId}/treasury`, active: true },
    { label: 'Nhật ký chi tiêu', icon: '📝', href: `#ledger` },
    { label: 'Đối soát nợ nhóm', icon: '👥', href: `#settlement` },
    { label: 'Lịch trình', icon: '📅', href: `#itinerary` },
    { label: 'Địa điểm', icon: '📍', href: `#destinations` },
    { label: 'Thành viên', icon: '👤', href: `#members` },
    { label: 'Cài đặt', icon: '⚙️', href: `#settings` },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brandArea}>
        <div className={styles.brandLogoRow}>
          <svg viewBox="0 0 44 32" width="30" height="22" fill="none">
            <path
              d="M 6,24 C 12,6 20,6 26,18 C 30,26 36,26 40,16"
              stroke="#0284c7"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M 2,16 C 8,28 16,28 22,14"
              stroke="#00cec9"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.85"
            />
          </svg>
          <span className={styles.brandTitle}>VISTA</span>
        </div>
        <span className={styles.brandSlogan}>Cùng nhau đi xa hơn</span>
      </div>

      <nav className={styles.navMenu}>
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`${styles.navItem} ${item.active ? styles.navItemActive : ''}`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className={styles.sidebarFooterArt}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🏮</span>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
            Hội An & Đà Nẵng 2026
          </span>
        </div>
        <span style={{ fontSize: '16px' }}>🌴</span>
      </div>
    </aside>
  );
}
