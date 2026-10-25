'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface HealthData {
  status: string;
  service: string;
  timestamp: string;
}

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/+$/, '');
      const res = await fetch(`${apiBase}/health`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      } else {
        setError(`Backend phản hồi lỗi HTTP ${res.status}`);
      }
    } catch {
      setError('Không thể kết nối tới Backend trên cổng 8080');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const runCheck = async () => {
      await Promise.resolve();
      if (isMounted) {
        await checkHealth();
      }
    };
    runCheck();
    const interval = setInterval(checkHealth, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div className="eyebrow" style={{ color: '#0284c7', fontWeight: 700, letterSpacing: '0.08em' }}>VISTA OPERATIONAL CONSOLE</div>
          <h1 style={{ margin: '8px 0', fontSize: '28px', color: '#0f172a' }}>Tổng quan vận hành hệ thống</h1>
          <p className="muted" style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
            Bảng điều khiển quản trị tập trung dành cho quản trị viên và điều hành viên nền tảng VISTA.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={checkHealth}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#0284c7',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.85rem',
            }}
          >
            🔄 Làm mới
          </button>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              background: '#0284c7',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.85rem',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
            }}
          >
            🏠 Ra Cổng du lịch
          </Link>
        </div>
      </header>

      <section className="grid" style={{ marginBottom: '24px' }}>
        <article className="card" style={{ borderLeft: health?.status === 'UP' ? '4px solid #0284c7' : '4px solid #ef4444' }}>
          <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Trạng thái Backend API</span>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: health?.status === 'UP' ? '#0ea5e9' : '#ef4444',
                display: 'inline-block',
                boxShadow: health?.status === 'UP' ? '0 0 8px #38bdf8' : 'none',
              }}
            />
          </div>
          <div className="metric" style={{ color: health?.status === 'UP' ? '#0284c7' : '#ef4444', fontSize: '24px' }}>
            {loading && !health ? 'Đang kiểm tra...' : health?.status === 'UP' ? 'Đã kết nối (UP)' : 'Chưa kết nối'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '8px' }}>
            {health ? `Dịch vụ: ${health.service}` : error || 'Cổng 8080 / Spring Boot'}
          </div>
        </article>

        <article className="card" style={{ borderLeft: '4px solid #38bdf8' }}>
          <div className="muted">Cơ sở dữ liệu</div>
          <div className="metric" style={{ fontSize: '24px', color: '#0369a1' }}>
            Supabase Cloud
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '8px' }}>
            PostgreSQL 17 • Flyway 30 bảng baseline
          </div>
        </article>

        <article className="card" style={{ borderLeft: '4px solid #6366f1' }}>
          <div className="muted">Hàng đợi kiểm duyệt (FR-ADM-03)</div>
          <div className="metric" style={{ fontSize: '24px', color: '#4338ca' }}>
            0 vi phạm
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '8px' }}>
            Hệ thống AI Moderation đang trực tuyến
          </div>
        </article>

        <article className="card" style={{ borderLeft: '4px solid #0ea5e9' }}>
          <div className="muted">Tài liệu API Swagger</div>
          <div className="metric" style={{ fontSize: '24px', color: '#0284c7' }}>
            OpenAPI 3.1
          </div>
          <div style={{ fontSize: '0.8rem', marginTop: '8px' }}>
            <a
              href="http://localhost:8080/swagger-ui.html"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#0284c7', textDecoration: 'underline', fontWeight: 700 }}
            >
              Mở Swagger UI ↗
            </a>
          </div>
        </article>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', margin: '0 0 12px 0', color: '#0f172a' }}>Phân hệ Quản trị Nền tảng</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link
              href="/destinations"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                color: '#0369a1',
                fontWeight: 600,
              }}
            >
              <span>📍 Quản lý Điểm đến (CMS)</span>
              <span style={{ color: '#0284c7' }}>Chi tiết →</span>
            </Link>
            <Link
              href="/users"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                color: '#0369a1',
                fontWeight: 600,
              }}
            >
              <span>👥 Quản lý Người dùng & Vai trò</span>
              <span style={{ color: '#0284c7' }}>Chi tiết →</span>
            </Link>
            <Link
              href="/moderation"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                color: '#0369a1',
                fontWeight: 600,
              }}
            >
              <span>🛡️ Hàng đợi Kiểm duyệt Bài viết</span>
              <span style={{ color: '#0284c7' }}>Chi tiết →</span>
            </Link>
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.1rem', margin: '0 0 12px 0', color: '#0f172a' }}>Cổng thông tin & Trải nghiệm Du khách</h2>
          <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 14px 0' }}>
            VISTA Web là nền tảng du lịch thông minh toàn diện phục vụ cả du khách (tìm kiếm, lập lịch trình, chia tiền nhóm) và quản trị viên.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link
              href="/"
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                background: '#0b192c',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 700,
              }}
            >
              Xem Cổng du lịch VISTA
            </Link>
            <Link
              href="/trips/00000000-0000-0000-0000-000000000001/treasury"
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                background: '#0284c7',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
              }}
            >
              Xem Thủ quỹ chuyến đi
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
