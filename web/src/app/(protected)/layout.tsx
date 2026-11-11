'use client';

import { AdminShell } from '@/components/AdminShell';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';

function checkAdminAuth(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    let token = localStorage.getItem('vista_token');
    const userJson = localStorage.getItem('vista_user');

    // Clean up any legacy fake mock tokens from previous dev sessions
    if (token === 'dev-admin-session-active') {
      localStorage.removeItem('vista_token');
      token = null;
    }

    if (!token || !userJson) {
      return false;
    }

    // Must be a valid JWT (3 parts)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return false;
    }

    // Check expiration if possible (payload base64)
    try {
      const payload = JSON.parse(atob(tokenParts[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem('vista_token');
        return false;
      }
    } catch {
      // If parsing payload fails, proceed to role check
    }

    const user = JSON.parse(userJson);
    const roles: string[] = Array.isArray(user?.roles) ? user.roles : [];
    const email: string = user?.email || '';

    const isAdminOrMod =
      roles.some(
        (r) =>
          typeof r === 'string' &&
          (r.toUpperCase().includes('ADMIN') || r.toUpperCase().includes('MODERATOR'))
      ) || email.toLowerCase().includes('admin');

    return isAdminOrMod;
  } catch {
    return false;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('vista-auth-change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('vista-auth-change', callback);
  };
}

function getServerSnapshot(): boolean {
  return true;
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const authorized = useSyncExternalStore(subscribe, checkAdminAuth, getServerSnapshot);

  useEffect(() => {
    // Sync cookie with token in case cookie was cleared
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('vista_token');
      if (token && token.split('.').length === 3 && !document.cookie.includes('vista_token=')) {
        document.cookie = `vista_token=${token}; path=/; SameSite=Lax`;
      }
    }
  }, []);

  if (!authorized) {
    const returnUrl = encodeURIComponent(pathname || '/destinations');
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)',
          color: '#1e293b',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: '2rem',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            maxWidth: '460px',
            width: '100%',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            padding: '2.5rem 2rem',
            textAlign: 'center',
            border: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              background: '#ecfdf5',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              color: '#059669',
              fontSize: '2rem',
            }}
          >
            🛡️
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#0f172a' }}>
            Yêu cầu đăng nhập Quản trị viên
          </h2>
          <p style={{ fontSize: '0.95rem', color: '#64748b', lineHeight: 1.6, margin: '0 0 1.75rem' }}>
            Khu vực quản trị CMS chỉ dành cho tài khoản có quyền Quản trị viên (Admin) hoặc Kiểm duyệt viên (Moderator). Vui lòng đăng nhập để tiếp tục.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link
              href={`/login?returnUrl=${returnUrl}`}
              style={{
                display: 'inline-block',
                background: '#059669',
                color: '#ffffff',
                padding: '0.875rem 1.5rem',
                borderRadius: '10px',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'background 0.2s',
              }}
            >
              Đăng nhập tài khoản Quản trị
            </Link>
            <Link
              href="/"
              style={{
                display: 'inline-block',
                color: '#64748b',
                padding: '0.75rem 1rem',
                fontSize: '0.9rem',
                textDecoration: 'none',
              }}
            >
              ← Trở về Cổng du lịch VISTA
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
