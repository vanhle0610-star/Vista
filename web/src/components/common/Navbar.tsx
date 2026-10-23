'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './Navbar.module.css';

export interface NavbarProps {
  activeModule?: 'explore' | 'planner' | 'trips' | 'treasury' | 'community';
  lang?: 'vi' | 'en';
  onLangChange?: (lang: 'vi' | 'en') => void;
}

export function Navbar({
  activeModule = 'explore',
  lang: propLang,
  onLangChange,
}: NavbarProps) {
  const [internalLang, setInternalLang] = useState<'vi' | 'en'>('vi');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync language with localStorage or prop
  useEffect(() => {
    if (propLang) {
      setInternalLang(propLang);
    } else {
      try {
        const saved = localStorage.getItem('vista_lang');
        if (saved === 'vi' || saved === 'en') {
          setInternalLang(saved);
        }
      } catch {
        // SSR safe
      }
    }
  }, [propLang]);

  const toggleLanguage = () => {
    const nextLang = internalLang === 'vi' ? 'en' : 'vi';
    setInternalLang(nextLang);
    try {
      localStorage.setItem('vista_lang', nextLang);
    } catch {
      // ignore
    }
    if (onLangChange) {
      onLangChange(nextLang);
    }
  };

  const navItems = [
    {
      id: 'explore',
      labelVi: 'Khám phá',
      labelEn: 'Explore',
      href: '/',
      badge: null,
    },
    {
      id: 'planner',
      labelVi: 'AI Planner',
      labelEn: 'AI Planner',
      href: '/planner',
      badge: 'PRO',
      badgeType: 'ai',
    },
    {
      id: 'trips',
      labelVi: 'Chuyến đi',
      labelEn: 'Trips',
      href: '/trips',
      badge: 'Nhóm',
      badgeType: 'group',
    },
    {
      id: 'treasury',
      labelVi: 'Thủ quỹ',
      labelEn: 'Treasury',
      href: '/trips/demo-danang-2026/treasury',
      badge: null,
    },
    {
      id: 'community',
      labelVi: 'Cộng đồng',
      labelEn: 'Community',
      href: '/#community',
      badge: null,
    },
  ];

  return (
    <header className={styles.navbarWrapper}>
      <div className={styles.navbarContainer}>
        {/* ─── BRAND LOGO ─── */}
        <Link href="/" className={styles.brandLogo} title="VISTA — Nền tảng Du lịch Thông minh Việt Nam">
          <div className={styles.brandIconWrapper}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polygon
                points="12 3 15 12 21 12 16 16 18 21 12 17 6 21 8 16 3 12 9 12"
                fill="rgba(255,255,255,0.3)"
              />
              <line x1="12" y1="2" x2="12" y2="22" stroke="white" strokeWidth="1.5" />
              <line x1="2" y1="12" x2="22" y2="12" stroke="white" strokeWidth="1.5" />
            </svg>
          </div>
          <div className={styles.brandText}>
            <span className={styles.brandName}>VISTA</span>
            <span className={styles.brandSub}>
              {internalLang === 'vi' ? 'Du lịch Thông minh' : 'Vietnam Smart Travel'}
            </span>
          </div>
        </Link>

        {/* ─── 5 FUNCTIONAL PILLARS MENU ─── */}
        <nav className={styles.navMenu} aria-label="Menu chức năng chính">
          {navItems.map((item) => {
            const isActive = activeModule === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                id={`nav-${item.id}`}
              >
                <span>{internalLang === 'vi' ? item.labelVi : item.labelEn}</span>
                {item.badge && item.badgeType === 'ai' && (
                  <span className={styles.navBadgeAI}>{item.badge}</span>
                )}
                {item.badge && item.badgeType === 'group' && (
                  <span className={styles.navBadgeGroup}>{item.badge}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* ─── RIGHT ACTIONS ─── */}
        <div className={styles.navActions}>
          {/* Language Switcher */}
          <button
            type="button"
            className={styles.langSelector}
            onClick={toggleLanguage}
            title={internalLang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
            aria-label="Thay đổi ngôn ngữ"
          >
            <span className={styles.flagEmoji}>
              {internalLang === 'vi' ? '🇻🇳' : '🇬🇧'}
            </span>
            <span>{internalLang === 'vi' ? 'VI' : 'EN'}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Login Link */}
          <Link href="/login" className={styles.btnLogin} id="nav-btn-login">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>{internalLang === 'vi' ? 'Đăng nhập' : 'Sign in'}</span>
          </Link>

          {/* Primary CTA: Create Trip */}
          <Link href="/trips" className={styles.btnCreateTrip} id="nav-btn-create-trip">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>{internalLang === 'vi' ? 'Tạo chuyến đi' : 'Plan Trip'}</span>
          </Link>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            className={styles.mobileMenuToggle}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Mở danh mục điều hướng"
          >
            {mobileMenuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ─── MOBILE DRAWER OVERLAY ─── */}
      {mobileMenuOpen && (
        <div className={styles.mobileDrawerOverlay} onClick={() => setMobileMenuOpen(false)}>
          <div className={styles.mobileDrawer} onClick={(e) => e.stopPropagation()}>
            {navItems.map((item) => {
              const isActive = activeModule === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span style={{ flex: 1 }}>{internalLang === 'vi' ? item.labelVi : item.labelEn}</span>
                  {item.badge && item.badgeType === 'ai' && (
                    <span className={styles.navBadgeAI}>{item.badge}</span>
                  )}
                  {item.badge && item.badgeType === 'group' && (
                    <span className={styles.navBadgeGroup}>{item.badge}</span>
                  )}
                </Link>
              );
            })}

            <div className={styles.mobileDrawerActions}>
              <Link href="/login" className={styles.btnLogin} onClick={() => setMobileMenuOpen(false)}>
                {internalLang === 'vi' ? 'Đăng nhập tài khoản' : 'Sign in'}
              </Link>
              <Link href="/trips" className={styles.btnCreateTrip} onClick={() => setMobileMenuOpen(false)}>
                {internalLang === 'vi' ? '+ Tạo chuyến đi nhóm mới' : '+ Plan New Trip'}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
