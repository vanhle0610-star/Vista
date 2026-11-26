'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { apiRequest } from '@/lib/api';
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

const HIDDEN_NAVBAR_ROUTES = [
  '/login',
  '/forgot-password',
  '/dashboard',
  '/moderation',
  '/destinations',
  '/users',
];

export interface IncomingInvitation {
  id: string;
  tripId: string;
  tripTitle?: string;
  destinationSummary?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  inviterEmail?: string;
  inviterName?: string;
  inviterAvatar?: string;
  inviteeEmail?: string;
  token?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  expiresAt?: string;
  createdAt?: string;
}

function formatInviteExpiry(expiresAt?: any): string {
  if (!expiresAt || expiresAt === 'Invalid Date') return 'Trong 7 ngày tới';
  if (typeof expiresAt === 'string') {
    if (expiresAt.includes('ngày') || expiresAt.includes('Hôm nay') || expiresAt.includes('/')) {
      return expiresAt;
    }
    const d = new Date(expiresAt);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('vi-VN');
    }
  } else if (typeof expiresAt === 'number') {
    const d = new Date(expiresAt > 1e11 ? expiresAt : expiresAt * 1000);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('vi-VN');
    }
  }
  return 'Trong 7 ngày tới';
}

export function Navbar({
  activeModule: propActiveModule,
  lang: propLang,
  onLangChange,
}: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [currentUser, setCurrentUser] = useState<VistaUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [incomingInvitations, setIncomingInvitations] = useState<IncomingInvitation[]>([]);
  const [activeToast, setActiveToast] = useState<IncomingInvitation | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState<string | null>(null);
  const [treasuryHref, setTreasuryHref] = useState<string>('/trips');
  const [optimisticModule, setOptimisticModule] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const knownTokensRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setOptimisticModule(null);
  }, [pathname]);

  const activeModule = optimisticModule || propActiveModule || (
    pathname?.startsWith('/map') ? 'map' :
    pathname?.startsWith('/planner') ? 'planner' :
    pathname?.includes('/treasury') ? 'treasury' :
    pathname?.startsWith('/trips') ? 'trips' :
    pathname?.startsWith('/community') ? 'community' :
    pathname === '/' ? 'explore' : undefined
  );

  const handleNavClick = (moduleId: string, href: string) => {
    setOptimisticModule(moduleId);
    if (typeof window !== 'undefined') {
      (window as any).__VISTA_TARGET_ROUTE__ = href;
      try {
        sessionStorage.setItem('vista_target_route', href);
      } catch {}
      window.dispatchEvent(new CustomEvent('vista-nav-change', { detail: href }));
    }
  };

  useEffect(() => {
    const resolveTreasuryLink = () => {
      try {
        const lastTripId = localStorage.getItem('vista_last_trip_id');
        if (lastTripId && /^[0-9a-f-]{36}$/i.test(lastTripId)) {
          setTreasuryHref(`/trips/${lastTripId}/treasury`);
          return;
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
          if (!document.cookie.includes('vista_token=')) {
            document.cookie = `vista_token=${token}; path=/; max-age=604800; SameSite=Lax`;
          }
        } else {
          setCurrentUser(null);
        }
      } catch {
        setCurrentUser(null);
      }
    };

    setMounted(true);
    loadUser();

    window.addEventListener('vista-auth-change', loadUser);
    window.addEventListener('storage', loadUser);

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('vista-auth-change', loadUser);
      window.removeEventListener('storage', loadUser);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Poll and listen for incoming invitations for currentUser directly from Spring Boot Database
  useEffect(() => {
    if (!currentUser?.email) {
      setIncomingInvitations([]);
      return;
    }

    const fetchInvites = async () => {
      try {
        const token = localStorage.getItem('vista_token');
        if (!token && !currentUser?.email) {
          setIncomingInvitations([]);
          return;
        }

        const combinedList: IncomingInvitation[] = [];
        const seenKeys = new Set<string>();
        let backendLoaded = false;

        // 1. Lấy từ Spring Boot backend nếu có token
        if (token) {
          try {
            const list = await apiRequest<IncomingInvitation[]>('/invitations/my-pending');
            backendLoaded = true;
            if (Array.isArray(list)) {
              list.forEach((inv) => {
                const key = inv.id || (inv as any).token;
                if (key && !seenKeys.has(key)) {
                  seenKeys.add(key);
                  combinedList.push(inv);
                }
              });
            }
          } catch {
            // im lặng fallback
          }
        }

        // 2. Lấy từ Next.js Store (.invitations_store.json) theo email hiện tại (chỉ dùng cho demo trip hoặc khi backend chưa phản hồi)
        if (currentUser?.email) {
          try {
            const cleanUserEmail = currentUser.email.trim().toLowerCase();
            const localRes = await fetch(`/api/invitations?email=${encodeURIComponent(cleanUserEmail)}`, {
              cache: 'no-store',
            });
            if (localRes.ok) {
              const localList = await localRes.json();
              if (Array.isArray(localList)) {
                localList.forEach((inv: any) => {
                  const isUuidTrip = Boolean(
                    inv.tripId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(inv.tripId))
                  );
                  if (backendLoaded && isUuidTrip) {
                    return;
                  }
                  const key = inv.id || inv.token;
                  if (inv.status === 'PENDING' && key && !seenKeys.has(key)) {
                    seenKeys.add(key);
                    if (inv.token) seenKeys.add(inv.token);
                    combinedList.push({
                      id: inv.id,
                      tripId: inv.tripId,
                      tripTitle: inv.tripTitle || 'Chuyến đi VISTA',
                      destinationSummary: inv.destination,
                      inviterName: inv.inviterName || inv.inviterEmail || 'Trưởng nhóm',
                      inviterEmail: inv.inviterEmail,
                      inviterAvatar: null,
                      status: inv.status,
                      expiresAt: inv.expiresAt,
                      createdAt: inv.createdAt,
                      token: inv.token,
                    } as any);
                  }
                });
              }
            }
          } catch {
            // im lặng fallback
          }
        }

        // Bật Toast thông báo cho lời mời mới tới
        combinedList.forEach((p) => {
          const key = p.id || (p as any).token;
          if (key && !knownTokensRef.current.has(key)) {
            knownTokensRef.current.add(key);
            setActiveToast(p);
            setTimeout(() => {
              setActiveToast((curr) => {
                const currKey = curr?.id || (curr as any)?.token;
                return currKey === key ? null : curr;
              });
            }, 7000);
          }
        });

        setIncomingInvitations(combinedList);
      } catch {
        // silent
      }
    };

    fetchInvites();

    // Chu kỳ polling 60 giây khi tab hiển thị; tạm dừng khi tab ẩn
    const POLL_INTERVAL_MS = 60_000;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (intervalId !== null) return; // đã chạy rồi
      intervalId = setInterval(fetchInvites, POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    // Khởi động polling ngay nếu tab đang hiển thị
    if (!document.hidden) {
      startPolling();
    }

    // Xử lý chuyển tab: dừng khi ẩn, làm mới + tiếp tục khi hiện lại
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchInvites(); // làm mới ngay 1 lần khi quay lại
        startPolling();
      }
    };

    // focus (ví dụ: người dùng click lại cửa sổ từ app khác) → làm mới ngay
    const onFocus = () => {
      if (!document.hidden) {
        fetchInvites();
      }
    };

    const onCustomChange = () => fetchInvites();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('vista-invitations-change', onCustomChange);
    window.addEventListener('storage', onCustomChange);
    window.addEventListener('focus', onFocus);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('vista-invitations-change', onCustomChange);
      window.removeEventListener('storage', onCustomChange);
      window.removeEventListener('focus', onFocus);
    };
  }, [currentUser?.email]);

  const handleAcceptInvite = async (inv: IncomingInvitation) => {
    setIsProcessingAction(inv.id);
    try {
      let accepted = false;
      const isUuidId = /^[0-9a-f-]{36}$/i.test(inv.id);
      const token = (inv as any).token || (!isUuidId ? inv.id : undefined);

      try {
        if (isUuidId) {
          await apiRequest(`/invitations/${inv.id}/accept-by-id`, {
            method: 'POST',
          });
          accepted = true;
        } else if (token) {
          await apiRequest(`/invitations/${encodeURIComponent(token)}/accept`, {
            method: 'POST',
          });
          accepted = true;
        }
      } catch (backendErr) {
        console.warn('Backend accept invite fallback to local store:', backendErr);
      }

      // Đồng bộ trạng thái ACCEPTED lên Next.js store để không hiển thị lại ở chuông
      try {
        const res = await fetch('/api/invitations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: inv.id,
            token: token || inv.id,
            status: 'ACCEPTED',
            acceptedBy: currentUser,
          }),
        });
        if (res.ok) accepted = true;
      } catch {}

      // Đảm bảo đồng bộ thành viên vào trip_members của Spring Boot database
      if (inv.tripId && /^[0-9a-f-]{36}$/i.test(inv.tripId)) {
        try {
          await apiRequest('/invitations/sync-membership', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tripId: inv.tripId }),
          });
        } catch (e) {
          console.warn('Membership sync to backend:', e);
        }
      }

      setIncomingInvitations((prev) =>
        prev.filter((i) => i.id !== inv.id && (i as any).token !== (inv as any).token)
      );
      setNotificationsOpen(false);
      setActiveToast(null);

      if (typeof window !== 'undefined') {
        localStorage.setItem('vista_last_trip_id', inv.tripId);
        window.dispatchEvent(new CustomEvent('vista-trips-change'));
        window.dispatchEvent(new CustomEvent('vista-invitations-change'));
      }

      router.push(`/trips/${inv.tripId}`);
    } catch (err) {
      console.error('Accept invite error:', err);
    } finally {
      setIsProcessingAction(null);
    }
  };

  const handleDeclineInvite = async (inv: IncomingInvitation) => {
    setIsProcessingAction(inv.id);
    try {
      try {
        const isUuidId = /^[0-9a-f-]{36}$/i.test(inv.id);
        if (isUuidId) {
          await apiRequest(`/invitations/${inv.id}/decline-by-id`, {
            method: 'POST',
          });
        } else if ((inv as any).token) {
          await apiRequest(`/invitations/${encodeURIComponent((inv as any).token)}/decline`, {
            method: 'POST',
          });
        }
      } catch {
        // fallback handled below
      }

      try {
        const token = (inv as any).token || inv.id;
        await fetch('/api/invitations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: inv.id,
            token: token,
            status: 'DECLINED',
          }),
        });
      } catch {}

      setIncomingInvitations((prev) =>
        prev.filter((i) => i.id !== inv.id && (i as any).token !== (inv as any).token)
      );
      if (activeToast?.id === inv.id || (activeToast as any)?.token === (inv as any).token) {
        setActiveToast(null);
      }
      window.dispatchEvent(new CustomEvent('vista-invitations-change'));
    } catch (err) {
      console.error('Decline invite error:', err);
    } finally {
      setIsProcessingAction(null);
    }
  };

  const handleLogout = () => {
    try {
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1').replace(/\/+$/, '');
      const refreshToken = localStorage.getItem('vista_refresh_token');
      if (refreshToken) {
        fetch(`${apiBase}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ refreshToken }),
        }).catch(() => {});
      }
      localStorage.removeItem('vista_token');
      localStorage.removeItem('vista_refresh_token');
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

  const [internalLang, setInternalLang] = useState<'vi' | 'en'>(propLang || 'vi');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!propLang) {
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
      href: '/community',
      badge: null,
    },
  ];

  // Hide Navbar completely on auth pages and admin dashboard (after all React hooks have run)
  if (pathname && HIDDEN_NAVBAR_ROUTES.some((route) => pathname.startsWith(route))) {
    return null;
  }

  return (
    <header className={styles.navbarWrapper} suppressHydrationWarning>
      <div className={styles.navbarContainer} suppressHydrationWarning>
        {/* ─── BRAND LOGO ─── */}
        <Link href="/" className={styles.brandLogo} title="VISTA — Nền tảng Du lịch Thông minh Việt Nam">
          <div className={styles.brandIconWrapper} suppressHydrationWarning>
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
            <span className={styles.brandSub} suppressHydrationWarning>
              {internalLang === 'vi' ? 'Du lịch Thông minh' : 'Vietnam Smart Travel'}
            </span>
          </div>
        </Link>

        {/* Main navigation */}
        <nav className={styles.navMenu} aria-label="Menu chức năng chính">
          {navItems.map((item) => {
            const activeId = optimisticModule || activeModule;
            const isActive = activeId === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                prefetch={true}
                onClick={() => handleNavClick(item.id, item.href)}
                className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                id={`nav-${item.id}`}
              >
                <span suppressHydrationWarning>{currentLang === 'vi' ? item.labelVi : item.labelEn}</span>
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
        <div className={styles.navActions} suppressHydrationWarning>
          {/* Language Switcher */}
          <button
            type="button"
            className={styles.langSelector}
            onClick={toggleLanguage}
            title={currentLang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
            aria-label="Thay đổi ngôn ngữ"
            suppressHydrationWarning
          >
            <span className={styles.flagEmoji} suppressHydrationWarning>
              {currentLang === 'vi' ? '🇻🇳' : '🇬🇧'}
            </span>
            <span suppressHydrationWarning>{currentLang === 'vi' ? 'VI' : 'EN'}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Notification Bell (Hiện khi đã đăng nhập) */}
          {currentUser && (
            <div className={styles.notificationContainer} ref={notificationRef}>
              <button
                type="button"
                className={`${styles.notificationBellBtn} ${
                  notificationsOpen ? styles.notificationBellBtnActive : ''
                } ${incomingInvitations.length > 0 ? styles.bellHasUnread : ''}`}
                onClick={() => setNotificationsOpen((prev) => !prev)}
                aria-label={`Thông báo (${incomingInvitations.length} lời mời mới)`}
                title="Thông báo lời mời tham gia nhóm"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {incomingInvitations.length > 0 && (
                  <span className={styles.notificationBadge}>
                    {incomingInvitations.length}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className={styles.notificationDropdown}>
                  <div className={styles.notificationHeader}>
                    <div className={styles.notificationTitleGroup}>
                      <span className={styles.notificationHeaderTitle}>Lời mời chuyến đi</span>
                      {incomingInvitations.length > 0 && (
                        <span className={styles.notificationPill}>{incomingInvitations.length} mới</span>
                      )}
                    </div>
                  </div>

                  <div className={styles.notificationList}>
                    {incomingInvitations.length === 0 ? (
                      <div className={styles.notificationEmpty}>
                        <div className={styles.notificationEmptyIcon}>🏝️</div>
                        <div className={styles.notificationEmptyText}>Không có lời mời nào đang chờ</div>
                        <div className={styles.notificationEmptySub}>Khi bạn bè mời bạn vào chuyến đi, thông báo sẽ xuất hiện tại đây</div>
                      </div>
                    ) : (
                      incomingInvitations.map((inv) => (
                        <div key={inv.id} className={styles.notificationItem}>
                          <div className={styles.notificationItemHeader}>
                            <div className={styles.notificationTripIcon}>✈️</div>
                            <div className={styles.notificationTripInfo}>
                              <div className={styles.notificationTripTitle}>
                                {inv.tripTitle || 'Khám phá chuyến đi Vista'}
                              </div>
                              <div className={styles.notificationInviter}>
                                Người mời: <strong style={{ color: '#0284C7' }}>{inv.inviterName || inv.inviterEmail || 'Trưởng nhóm'}</strong>
                              </div>
                              <div className={styles.notificationMeta}>
                                <span>📍 {inv.destinationSummary || inv.destination || 'Việt Nam'}</span>
                                <span>•</span>
                                <span>
                                  ⏳ {formatInviteExpiry(inv.expiresAt)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className={styles.notificationActions}>
                            <button
                              type="button"
                              className={styles.btnAcceptInvite}
                              disabled={isProcessingAction === inv.id}
                              onClick={() => handleAcceptInvite(inv)}
                            >
                              <span>{isProcessingAction === inv.id ? 'Đang vào nhóm...' : '✓ Chấp nhận'}</span>
                            </button>
                            <button
                              type="button"
                              className={styles.btnDeclineInvite}
                              disabled={isProcessingAction === inv.id}
                              onClick={() => handleDeclineInvite(inv)}
                            >
                              Từ chối
                            </button>
                            <Link
                              href={inv.token ? `/invitations/${inv.token}` : `/trips/${inv.tripId}`}
                              onClick={() => setNotificationsOpen(false)}
                              style={{
                                fontSize: '11.5px',
                                color: '#0284C7',
                                fontWeight: 700,
                                textDecoration: 'none',
                                padding: '6px 8px',
                              }}
                            >
                              Chi tiết ↗
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className={styles.notificationFooter}>
                    Tự động đồng bộ thời gian thực qua hệ thống VISTA
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Profile Dropdown or Login / Register Links */}
          {currentUser ? (
            <div className={styles.profileContainer} ref={dropdownRef} suppressHydrationWarning>
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
            <div className={styles.authButtonsGroup} suppressHydrationWarning>
              <Link href="/login" className={styles.btnLogin} id="nav-btn-login" suppressHydrationWarning>
                <svg
                  width="15"
                  height="15"
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
              <Link href="/register" className={styles.btnRegister} id="nav-btn-register" suppressHydrationWarning>
                <span>{currentLang === 'vi' ? 'Đăng ký' : 'Sign up'}</span>
              </Link>
            </div>
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
              const activeId = optimisticModule || activeModule;
              const isActive = activeId === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  prefetch={true}
                  className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                  onClick={() => {
                    handleNavClick(item.id, item.href);
                    setMobileMenuOpen(false);
                  }}
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
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <Link href="/login" className={styles.btnLogin} onClick={() => setMobileMenuOpen(false)}>
                    {currentLang === 'vi' ? 'Đăng nhập' : 'Sign in'}
                  </Link>
                  <Link href="/register" className={styles.btnRegister} onClick={() => setMobileMenuOpen(false)}>
                    {currentLang === 'vi' ? 'Đăng ký' : 'Sign up'}
                  </Link>
                </div>
              )}
              <Link href="/trips" className={styles.btnCreateTrip} onClick={() => setMobileMenuOpen(false)}>
                {currentLang === 'vi' ? '+ Tạo chuyến đi nhóm mới' : '+ Plan New Trip'}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─── REALTIME FLOATING TOAST KHI CÓ LỜI MỜI MỚI ─── */}
      {activeToast && (
        <div className={styles.realtimeToast}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🎉</span>
              <strong style={{ fontSize: '13.5px', color: '#0F172A' }}>Lời mời chuyến đi mới!</strong>
            </div>
            <button
              type="button"
              onClick={() => setActiveToast(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#94A3B8' }}
              aria-label="Đóng"
            >
              ✕
            </button>
          </div>
          <p style={{ margin: '0 0 12px', fontSize: '12.5px', color: '#475569', lineHeight: '1.45' }}>
            <strong>{activeToast.inviterName || activeToast.inviterEmail || 'Trưởng nhóm'}</strong> vừa mời bạn tham gia <strong>"{activeToast.tripTitle || 'Khám phá chuyến đi'}"</strong> ({activeToast.destinationSummary || activeToast.destination || 'Việt Nam'}).
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className={styles.btnAcceptInvite}
              onClick={() => handleAcceptInvite(activeToast)}
              style={{ padding: '8px 14px' }}
            >
              ✓ Chấp nhận ngay
            </button>
            <button
              type="button"
              className={styles.btnDeclineInvite}
              onClick={() => setActiveToast(null)}
            >
              Để sau
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
