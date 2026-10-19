'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { VietnamVectorScenery } from '@/components/auth/VietnamVectorScenery';
import { AnimatedAirplane } from '@/components/auth/AnimatedAirplane';
import { AuthCard } from '@/components/auth/AuthCard';
import { LanguageProvider, useLanguage } from '@/i18n/LanguageContext';
import { LanguageSelector } from '@/components/auth/LanguageSelector';
import styles from './login.module.css';

function LoginPageContent() {
  const [isNight, setIsNight] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { t } = useLanguage();

  const drawerRef = useRef<HTMLDivElement>(null);
  const hamburgerBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Close drawer on Escape & Focus Trap
  useEffect(() => {
    if (!drawerOpen) return;

    // Focus close button initially
    closeBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        hamburgerBtnRef.current?.focus();
      } else if (e.key === 'Tab' && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen]);

  const navItems = [
    { label: t.navExplore, href: '#kham-pha' },
    { label: t.navItinerary, href: '#lich-trinh' },
    { label: t.navCommunity, href: '#cong-dong' },
    { label: t.navMap, href: '#ban-do' },
    { label: t.navSaved, href: '#da-luu' },
  ];

  return (
    <main className={`${styles.loginViewRoot} ${isNight ? styles.nightTheme : styles.dayTheme}`}>
      {/* 1. Pure Code-Rendered Vector Scenery (Multi-Layer SVG Art with Mouse Parallax) */}
      <VietnamVectorScenery isNight={isNight} />

      {/* 2. Interactive Animated Airplane traversing the sky */}
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

        {/* Desktop Navigation Links */}
        <nav className={styles.navLinks} aria-label="Menu chính">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className={styles.navItem}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className={styles.navControls}>
          {/* Day / Night Mode Switcher */}
          <button
            type="button"
            className={styles.themeToggleBtn}
            onClick={() => setIsNight(!isNight)}
            title="Nhấn để chuyển đổi giữa Nắng Vàng ☀️ và Hội An Đêm Trăng 🌙"
          >
            <span>{isNight ? t.themeNight : t.themeDay}</span>
          </button>

          {/* Interactive Multi-Language & Country Selector */}
          <LanguageSelector isNight={isNight} />

          {/* Mobile Hamburger Button (< 768px) */}
          <button
            ref={hamburgerBtnRef}
            type="button"
            className={styles.hamburgerBtn}
            onClick={() => setDrawerOpen(true)}
            aria-expanded={drawerOpen}
            aria-controls="mobile-nav-drawer"
            aria-label="Mở menu điều hướng"
          >
            <span className={styles.hamburgerIcon}>
              <span className={styles.hamburgerLine}></span>
              <span className={styles.hamburgerLine}></span>
              <span className={styles.hamburgerLine}></span>
            </span>
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div
          className={styles.drawerOverlay}
          onClick={() => {
            setDrawerOpen(false);
            hamburgerBtnRef.current?.focus();
          }}
          aria-hidden="true"
        />
      )}

      {/* Mobile Slide-in Drawer Menu (< 768px) */}
      <aside
        id="mobile-nav-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu điều hướng di động"
        className={`${styles.mobileDrawer} ${drawerOpen ? styles.drawerOpen : ''}`}
      >
        <div className={styles.drawerHeader}>
          <div className={styles.drawerBrandGroup}>
            <svg viewBox="0 0 44 32" width="28" height="20" fill="none">
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
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className={styles.drawerCloseBtn}
            onClick={() => {
              setDrawerOpen(false);
              hamburgerBtnRef.current?.focus();
            }}
            aria-label="Đóng menu điều hướng"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className={styles.drawerNavList} aria-label="Menu điều hướng di động">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={styles.drawerNavItem}
              onClick={() => {
                setDrawerOpen(false);
                hamburgerBtnRef.current?.focus();
              }}
            >
              <span>{item.label}</span>
              <span className={styles.drawerNavArrow}>›</span>
            </a>
          ))}
        </nav>

        <div className={styles.drawerFooter}>
          <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'center' }}>
            <LanguageSelector isNight={isNight} align="left" />
          </div>
          <button
            type="button"
            className={styles.drawerThemeToggleBtn}
            onClick={() => setIsNight(!isNight)}
          >
            <span>{isNight ? t.themeNight : t.themeDay}</span>
          </button>
        </div>
      </aside>

      {/* 4. Main Hero Viewport (Strict 100vh Single Screen) */}
      <div className={styles.heroViewport}>
        {/* Right Side: Glassmorphism Login Card */}
        <section className={styles.heroContentRight}>
          <Suspense fallback={<div className="auth-card-wrapper"><div className="auth-glass-panel"><span className="loading-spinner" /></div></div>}>
            <AuthCard isNight={isNight} />
          </Suspense>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <LanguageProvider>
      <LoginPageContent />
    </LanguageProvider>
  );
}
