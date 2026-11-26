'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  Globe,
  LayoutDashboard,
  MapPin,
  Image,
  Users,
  ShieldCheck,
  Wallet,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Compass,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  isPortalLink?: boolean;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Cổng du lịch VISTA', icon: Globe, isPortalLink: true },
  { href: '/dashboard', label: 'Tổng quan hệ thống', icon: LayoutDashboard },
  { href: '/destinations', label: 'Quản lý điểm đến', icon: MapPin },
  { href: '/image-manager', label: 'Quản lý hình ảnh AI', icon: Image },
  { href: '/users', label: 'Quản lý người dùng', icon: Users },
  { href: '/moderation', label: 'Hàng đợi kiểm duyệt', icon: ShieldCheck },
  {
    href: '/trips/00000000-0000-0000-0000-000000000001/treasury',
    label: 'Thủ quỹ chuyến đi',
    icon: Wallet,
  },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      const apiBase = typeof window !== 'undefined'
        ? '/api/v1'
        : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/+$/, '');
      await fetch(`${apiBase}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('vista_token');
      localStorage.removeItem('vista_user');
      document.cookie = 'vista_token=; path=/; max-age=0; SameSite=Lax';
      router.replace('/login');
    }
  };

  return (
    <div className={`shell ${collapsed ? 'shellCollapsed' : ''}`}>
      <aside
        className="sidebar"
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: collapsed ? '20px 12px' : '24px 18px',
          transition: 'all 0.2s ease',
        }}
      >
        <div
          className="brand"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            gap: '8px',
            marginBottom: '22px',
            paddingBottom: '16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '9px',
                  background: 'rgba(56, 189, 248, 0.14)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38bdf8',
                  flexShrink: 0,
                }}
              >
                <Compass size={18} strokeWidth={2} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <span
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    letterSpacing: '-0.02em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  VISTA Quản trị
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    color: '#94a3b8',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Admin Console
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            title={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: '#94a3b8',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              padding: 0,
            }}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        <nav className="nav">
          {navItems.map(({ href, label, icon: Icon, isPortalLink }) => {
            const isActive =
              !isPortalLink && (pathname === href || (href !== '/' && pathname?.startsWith(`${href}/`)));

            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  gap: '10px',
                  fontSize: '0.875rem',
                  fontWeight: isActive || isPortalLink ? 600 : 500,
                  color: isActive ? '#ffffff' : isPortalLink ? '#cbd5e1' : '#94a3b8',
                  background: isActive ? 'rgba(255, 255, 255, 0.09)' : 'transparent',
                  borderLeft: isActive && !collapsed ? '3px solid #38bdf8' : '3px solid transparent',
                  borderBottom: isPortalLink ? '1px solid rgba(255, 255, 255, 0.08)' : undefined,
                  borderRadius: isPortalLink ? '8px 8px 0 0' : '8px',
                  padding: collapsed ? '10px' : '10px 12px',
                  paddingBottom: isPortalLink ? '14px' : '10px',
                  marginBottom: isPortalLink ? '6px' : undefined,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                <Icon
                  size={17}
                  strokeWidth={1.85}
                  style={{
                    color: isActive ? '#38bdf8' : '#94a3b8',
                    flexShrink: 0,
                  }}
                />
                {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
          <button
            type="button"
            onClick={handleLogout}
            title={collapsed ? 'Đăng xuất' : undefined}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: collapsed ? '0.6rem' : '0.6rem 1rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: '#cbd5e1',
              fontWeight: 500,
              cursor: 'pointer',
              fontSize: '0.85rem',
              transition: 'all 0.15s ease',
            }}
          >
            <LogOut size={15} strokeWidth={1.85} />
            {!collapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
