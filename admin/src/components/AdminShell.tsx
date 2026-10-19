'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

const links = [
  ['/dashboard', 'Tổng quan'],
  ['/destinations', 'Điểm đến'],
  ['/users', 'Người dùng'],
  ['/moderation', 'Kiểm duyệt'],
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/+$/, '');
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
        <div className="brand">VISTA Admin</div>
        <nav className="nav">
          {links.map(([href, label]) => (
            <Link key={href} href={href}>
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
