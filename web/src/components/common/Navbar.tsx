'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './Navbar.module.css';

export interface NavbarProps {
  activeModule?: 'explore' | 'map' | 'planner' | 'trips' | 'treasury' | 'community';
  lang?: 'vi' | 'en';
  onLangChange?: (lang: 'vi' | 'en') => void;
}

interface VistaUser {
  id?: string;
  email?: string;
  displayName?: string;
  roles?: string[];
  avatarUrl?: string;
}

export function Navbar({
  activeModule = 'explore',
  lang: propLang,
  onLangChange,
}: NavbarProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<VistaUser | null>(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [treasuryHref, setTreasuryHref] = useState<string>('/trips');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const resolveTreasuryLink = () => {
      try {
        const stored = localStorage.getItem('vista_custom_trips');
        if (stored) {
          const trips = JSON.parse(stored);
          if (Array.isArray(trips) && trips.length > 0 && trips[0]?.id) {
            setTreasuryHref(`/trips/${trips[0].id}/treasury`);
            return;
          }
        }
      } catch {}
      setTreasuryHref('/trips');
    };

    resolveTreasuryLink();
    window.addEventListener('storage', resolveTreasuryLink);

    const loadUser = () => {
      try {
        const token = localStorage.getItem('vista_token');
        const userStr = localStorage.getItem('vista_user');
        if (token && userStr) {
          setCurrentUser(JSON.parse(userStr));
        } else {
          setCurrentUser(null);
        }
      } catch {
        setCurrentUser(null);
      }
    };

    loadUser();

    window.addEventListener('vista-auth-change', loadUser);
    window.addEventListener('storage', loadUser);

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('vista-auth-change', loadUser);
      window.removeEventListener('storage', loadUser);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    try {
      localStorage.removeItem('vista_token');
      localStorage.removeItem('vista_user');
      document.cookie = 'vista_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      window.dispatchEvent(new Event('vista-auth-change'));
      setCurrentUser(null);
      setProfileDropdownOpen(false);
      router.refresh();
    } catch {
      // ignore
    }
  };

  const getUserInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const [internalLang, setInternalLang] = useState<'vi' | 'en'>(() => {
    if (propLang) return propLang;
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('vista_lang');
        if (saved === 'vi' || saved === 'en') return saved;
      } catch {
        // SSR safe
      }
    }
    return 'vi';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentLang = propLang || internalLang;

  const toggleLanguage = () => {
    const nextLang = currentLang === 'vi' ? 'en' : 'vi';
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
      id: 'map',
      labelVi: 'Bản đồ & GPS',
      labelEn: 'Map & GPS',
      href: '/map',
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
      href: treasuryHref,
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

        {/* Main navigation */}
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
                <span>{currentLang === 'vi' ? item.labelVi : item.labelEn}</span>
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
            title={currentLang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
            aria-label="Thay đổi ngôn ngữ"
          >
            <span className={styles.flagEmoji}>
              {currentLang === 'vi' ? '🇻🇳' : '🇬🇧'}
            </span>
            <span>{currentLang === 'vi' ? 'VI' : 'EN'}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* User Profile Dropdown or Login Link */}
          {currentUser ? (
            <div className={styles.profileContainer} ref={dropdownRef}>
              <button
                type="button"
                className={styles.userProfileBtn}
                onClick={() => setProfileDropdownOpen((prev) => !prev)}
                aria-expanded={profileDropdownOpen}
                aria-label="Menu hồ sơ người dùng"
                id="nav-btn-profile"
              >
                <div className={styles.userAvatar}>
                  {currentUser.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt="" className={styles.userAvatarImg} />
                  ) : (
                    getUserInitials(currentUser.displayName || currentUser.email)
                  )}
                </div>
                <span className={styles.userName}>
                  {currentUser.displayName || currentUser.email?.split('@')[0]}
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  style={{
                    transform: profileDropdownOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {profileDropdownOpen && (
                <div className={styles.profileDropdown}>
                  <div className={styles.dropdownHeader}>
                    <div className={styles.dropdownAvatarLarge}>
                      {currentUser.avatarUrl ? (
                        <img src={currentUser.avatarUrl} alt="" className={styles.userAvatarImg} />
                      ) : (
                        getUserInitials(currentUser.displayName || currentUser.email)
                      )}
                    </div>
                    <div className={styles.dropdownUserInfo}>
                      <div className={styles.dropdownDisplayName}>
                        {currentUser.displayName || 'VISTA Traveler'}
                      </div>
                      <div className={styles.dropdownEmail}>{currentUser.email}</div>
                    </div>
                  </div>

                  <div className={styles.dropdownDivider} />

                  <Link
                    href="/profile"
                    className={styles.dropdownItem}
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span>{currentLang === 'vi' ? 'Hồ sơ cá nhân & QR' : 'My Profile & QR'}</span>
                  </Link>

                  <Link
                    href="/trips"
                    className={styles.dropdownItem}
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                    <span>{currentLang === 'vi' ? 'Chuyến đi của tôi' : 'My Trips'}</span>
                  </Link>

                  <Link
                    href="/planner"
                    className={styles.dropdownItem}
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <span>{currentLang === 'vi' ? 'Kế hoạch AI (PRO)' : 'AI Planner'}</span>
                  </Link>

                  {Array.isArray(currentUser.roles) && currentUser.roles.some((r) => r.includes('ADMIN') || r.includes('STAFF')) && (
                    <Link
                      href="/dashboard"
                      className={styles.dropdownItem}
                      onClick={() => setProfileDropdownOpen(false)}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                      </svg>
                      <span>{currentLang === 'vi' ? 'Bảng quản trị Admin' : 'Admin Dashboard'}</span>
                    </Link>
                  )}

                  <div className={styles.dropdownDivider} />

                  <button
                    type="button"
                    className={`${styles.dropdownItem} ${styles.dropdownItemLogout}`}
                    onClick={handleLogout}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>{currentLang === 'vi' ? 'Đăng xuất' : 'Sign out'}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
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
              <span>{currentLang === 'vi' ? 'Đăng nhập' : 'Sign in'}</span>
            </Link>
          )}

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
            <span>{currentLang === 'vi' ? 'Tạo chuyến đi' : 'Plan Trip'}</span>
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
                  <span style={{ flex: 1 }}>{currentLang === 'vi' ? item.labelVi : item.labelEn}</span>
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
              {currentUser ? (
                <Link
                  href="/profile"
                  className={styles.mobileUserCard}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ textDecoration: 'none' }}
                >
                  <div className={styles.userAvatar}>
                    {getUserInitials(currentUser.displayName || currentUser.email)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>
                      {currentUser.displayName || 'VISTA Traveler'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {currentUser.email}
                    </div>
                  </div>
                  <span style={{ fontSize: '11.5px', fontWeight: 650, color: '#0284C7' }}>
                    Hồ sơ →
                  </span>
                </Link>
              ) : (
                <Link href="/login" className={styles.btnLogin} onClick={() => setMobileMenuOpen(false)}>
                  {currentLang === 'vi' ? 'Đăng nhập tài khoản' : 'Sign in'}
                </Link>
              )}
              <Link href="/trips" className={styles.btnCreateTrip} onClick={() => setMobileMenuOpen(false)}>
                {currentLang === 'vi' ? '+ Tạo chuyến đi nhóm mới' : '+ Plan New Trip'}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
