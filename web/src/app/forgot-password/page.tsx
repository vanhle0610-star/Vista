'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { VietnamVectorScenery } from '@/components/auth/VietnamVectorScenery';
import { AnimatedAirplane } from '@/components/auth/AnimatedAirplane';
import { AuthCard } from '@/components/auth/AuthCard';
import { LanguageProvider, useLanguage } from '@/i18n/LanguageContext';
import { LanguageSelector } from '@/components/auth/LanguageSelector';
import styles from '../login/login.module.css';

function ForgotPasswordContent() {
  const [isNight, setIsNight] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { t } = useLanguage();

  const drawerRef = useRef<HTMLDivElement>(null);
  const hamburgerBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    closeBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        hamburgerBtnRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen]);

  const navItems = [
    { label: t.navExplore, href: '/#kham-pha' },
    { label: t.navItinerary, href: '/#lich-trinh' },
    { label: t.navCommunity, href: '/#cong-dong' },
    { label: t.navMap, href: '/#ban-do' },
    { label: t.navSaved, href: '/#da-luu' },
  ];

  return (
    <main className={`${styles.loginViewRoot} ${isNight ? styles.nightTheme : styles.dayTheme}`}>
      {/* 1. Vector Scenery */}
      <VietnamVectorScenery isNight={isNight} />

      {/* 2. Interactive Animated Airplane */}
      <AnimatedAirplane isNight={isNight} />

      {/* 3. Top Navigation Bar */}
      <header className={styles.topNavbar}>
        <Link href="/" className={styles.brandGroup}>
          <svg viewBox="0 0 44 32" width="34" height="24" fill="none">
            <path
              d="M 6,24 C 12,6 20,6 26,18 C 30,26 36,26 40,16"
              stroke="#0984e3"
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
          <span className={styles.brandName}>VISTA</span>
        </Link>

        <nav className={styles.navLinks} aria-label="Menu chính">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className={styles.navItem}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className={styles.navControls}>
          <button
            type="button"
            className={styles.themeToggleBtn}
            onClick={() => setIsNight(!isNight)}
            title="Chuyển đổi giao diện Ngày ☀️ / Đêm 🌙"
          >
            <span>{isNight ? t.themeNight : t.themeDay}</span>
          </button>

          <LanguageSelector isNight={isNight} />

          <button
            ref={hamburgerBtnRef}
            type="button"
            className={styles.hamburgerBtn}
            onClick={() => setDrawerOpen(true)}
            aria-expanded={drawerOpen}
            aria-label="Mở menu"
          >
            <span className={styles.hamburgerIcon}>
              <span className={styles.hamburgerLine}></span>
              <span className={styles.hamburgerLine}></span>
              <span className={styles.hamburgerLine}></span>
            </span>
          </button>
        </div>
      </header>

      {/* 4. Main Hero Viewport */}
      <div className={styles.heroViewport}>
        <section className={styles.heroContentRight}>
          <Suspense fallback={<div className="auth-card-wrapper"><div className="auth-glass-panel"><span className="loading-spinner" /></div></div>}>
            <AuthCard isNight={isNight} initialMode="forgot" />
          </Suspense>
        </section>
      </div>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <LanguageProvider>
      <ForgotPasswordContent />
    </LanguageProvider>
  );
}

