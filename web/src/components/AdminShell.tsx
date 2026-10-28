'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

const links = [
  ['/', '🏠 Cổng du lịch VISTA'],
  ['/dashboard', '📊 Tổng quan hệ thống'],
  ['/destinations', '📍 Quản lý điểm đến'],
  ['/users', '👥 Quản lý người dùng'],
  ['/moderation', '🛡️ Hàng đợi kiểm duyệt'],
  ['/trips/00000000-0000-0000-0000-000000000001/treasury', '💰 Thủ quỹ chuyến đi (Demo)'],
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1').replace(/\/+$/, '');
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
    <div className="shell">
      <aside className="sidebar">
        <div className="brand" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '24px' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>VISTA Quản trị</span>
          <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin Console</span>
        </div>
        <nav className="nav">
          {links.map(([href, label]) => (
            <Link 
              key={href} 
              href={href}
              style={href === '/' ? { borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '12px', marginBottom: '6px', color: '#38bdf8', fontWeight: 700 } : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', padding: '1rem' }}>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#ef4444',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Đăng xuất
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
