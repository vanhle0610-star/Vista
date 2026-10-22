'use client';

import { AdminShell } from '@/components/AdminShell';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';

function checkAdminAuth(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const token = localStorage.getItem('vista_token');
    const userJson = localStorage.getItem('vista_user');
    if (!token || !userJson) return false;
    const user = JSON.parse(userJson);
    return Boolean(user && Array.isArray(user.roles) && user.roles.length > 0);
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
  return false;
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const authorized = useSyncExternalStore(subscribe, checkAdminAuth, getServerSnapshot);

  useEffect(() => {
    if (!authorized) {
      try {
        const userJson = localStorage.getItem('vista_user');
        if (userJson) {
          const user = JSON.parse(userJson);
          if (!user || !user.roles || user.roles.length === 0) {
            localStorage.removeItem('vista_token');
            localStorage.removeItem('vista_user');
          }
        }
      } catch {
        localStorage.removeItem('vista_token');
        localStorage.removeItem('vista_user');
      }
      const returnUrl = encodeURIComponent(pathname);
      router.replace(`/login?returnUrl=${returnUrl}`);
    }
  }, [authorized, pathname, router]);

  if (!authorized) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: '#f8fafc',
          color: '#64748b',
          fontFamily: 'sans-serif',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span
            style={{
              width: '24px',
              height: '24px',
              border: '3px solid #cbd5e1',
              borderTopColor: '#087f5b',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: '0.95rem' }}>Đang kiểm tra quyền truy cập...</span>
        </div>
        <a
          href="/"
          style={{
            fontSize: '0.85rem',
            color: '#087f5b',
            textDecoration: 'underline',
            fontWeight: 600,
          }}
        >
          ← Trở về Cổng du lịch VISTA
        </a>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
