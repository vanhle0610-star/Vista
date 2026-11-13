'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  AlertCircle,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  BarChart3,
  Layers,
  Users,
  ShieldCheck,
  ArrowRight,
  Globe,
  ExternalLink,
  Activity,
} from 'lucide-react';

interface HealthData {
  status: string;
  service: string;
  timestamp: string;
}

interface DestinationStats {
  total: number;
  draft: number;
  published: number;
  rejected: number;
  archived?: number;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  newUsersLast30Days: number;
}

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [stats, setStats] = useState<DestinationStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [provinceStats, setProvinceStats] = useState<Record<string, number>>({});
  const [categoryStats, setCategoryStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const getApiBase = () => {
    return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1').replace(/\/+$/, '');
  };

  const getAuthHeaders = (): HeadersInit => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('vista_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  };

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const apiBase = getApiBase();
      const headers = getAuthHeaders();

      const [healthRes, statsRes, provRes, catRes, userStatsRes] = await Promise.allSettled([
        fetch(`${apiBase}/health`, { cache: 'no-store' }),
        fetch(`${apiBase}/admin/destinations/stats`, {
          headers,
          credentials: 'include',
          cache: 'no-store',
        }),
        fetch(`${apiBase}/admin/destinations/stats/by-province`, {
          headers,
          credentials: 'include',
          cache: 'no-store',
        }),
        fetch(`${apiBase}/admin/destinations/stats/by-category`, {
          headers,
          credentials: 'include',
          cache: 'no-store',
        }),
        fetch(`${apiBase}/admin/users/stats`, {
          headers,
          credentials: 'include',
          cache: 'no-store',
        }),
      ]);

      if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
        const hData = await healthRes.value.json();
        setHealth(hData);
      }

      if (statsRes.status === 'fulfilled') {
        if (statsRes.value.ok) {
          const sData = await statsRes.value.json();
          setStats({
            total: Number(sData.total ?? 0),
            draft: Number(sData.draft ?? 0),
            published: Number(sData.published ?? 0),
            rejected: Number(sData.rejected ?? 0),
            archived: Number(sData.archived ?? 0),
          });
        } else if (statsRes.value.status === 401 || statsRes.value.status === 403) {
          setError('Phiên đăng nhập quản trị không hợp lệ hoặc không đủ quyền xem thống kê.');
        } else {
          setError(`Không thể tải thống kê điểm đến (HTTP ${statsRes.value.status})`);
        }
      } else {
        setError('Không thể kết nối tới Backend API để tải thống kê.');
      }

      if (provRes.status === 'fulfilled' && provRes.value.ok) {
        const pData = await provRes.value.json();
        setProvinceStats(pData || {});
      }

      if (catRes.status === 'fulfilled' && catRes.value.ok) {
        const cData = await catRes.value.json();
        setCategoryStats(cData || {});
      }

      if (userStatsRes.status === 'fulfilled' && userStatsRes.value.ok) {
        const uData = await userStatsRes.value.json();
        setUserStats({
          totalUsers: Number(uData.totalUsers ?? 0),
          activeUsers: Number(uData.activeUsers ?? 0),
          lockedUsers: Number(uData.lockedUsers ?? 0),
          newUsersLast30Days: Number(uData.newUsersLast30Days ?? 0),
        });
      }
    } catch {
      setError('Không thể kết nối tới máy chủ Backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  const provinceEntries = Object.entries(provinceStats).slice(0, 8);
  const maxProvinceCount = Math.max(1, ...provinceEntries.map(([, count]) => count));

  const categoryEntries = Object.entries(categoryStats).slice(0, 8);
  const maxCategoryCount = Math.max(1, ...categoryEntries.map(([, count]) => count));

  return (
    <>
      <header
        className="header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div
            className="eyebrow"
            style={{ color: '#2563eb', fontWeight: 700, letterSpacing: '0.08em' }}
          >
            VISTA OPERATIONAL CONSOLE
          </div>
          <h1 style={{ margin: '8px 0', fontSize: '26px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Tổng quan vận hành hệ thống
          </h1>
          <p className="muted" style={{ margin: 0, color: '#64748b', fontSize: '0.92rem' }}>
            Bảng điều khiển quản trị tập trung theo thời gian thực dành cho quản trị viên và điều
            hành viên nền tảng VISTA.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={loadDashboardData}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#334155',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Làm mới số liệu
          </button>
          <Link
            href="/image-manager"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid #bae6fd',
              background: '#f0f9ff',
              color: '#0369a1',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            <Layers size={15} />
            AI Image Manager
          </Link>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              background: '#0f172a',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            <Globe size={15} />
            Ra Cổng du lịch
          </Link>
        </div>
      </header>

      {/* Error Banner with Retry */}
      {error && (
        <div
          style={{
            marginBottom: '20px',
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 600 }}>
            <AlertCircle size={20} color="#dc2626" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadDashboardData}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '8px',
              border: '1px solid #fca5a5',
              background: '#ffffff',
              color: '#dc2626',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Real-time KPI Cards */}
      <section className="grid" style={{ marginBottom: '24px' }}>
        <article className="card">
          <div
            className="muted"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span style={{ fontWeight: 600, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Tổng số điểm đến
            </span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MapPin size={17} />
            </div>
          </div>
          {loading && !stats ? (
            <div
              style={{
                height: '34px',
                width: '90px',
                borderRadius: '8px',
                background: '#e2e8f0',
                marginTop: '8px',
              }}
            />
          ) : (
            <div className="metric" style={{ color: '#0f172a', fontSize: '28px' }}>
              {(stats?.total ?? 0).toLocaleString('vi-VN')}
            </div>
          )}
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px' }}>
            Toàn bộ kho dữ liệu điểm đến trên hệ thống
          </div>
        </article>

        <article className="card">
          <div
            className="muted"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span style={{ fontWeight: 600, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Chờ phê duyệt (DRAFT)
            </span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={17} />
            </div>
          </div>
          {loading && !stats ? (
            <div
              style={{
                height: '34px',
                width: '90px',
                borderRadius: '8px',
                background: '#e2e8f0',
                marginTop: '8px',
              }}
            />
          ) : (
            <div className="metric" style={{ fontSize: '28px', color: '#d97706' }}>
              {(stats?.draft ?? 0).toLocaleString('vi-VN')}
            </div>
          )}
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px' }}>
            Điểm đến đang chờ thẩm định nội dung
          </div>
        </article>

        <article className="card">
          <div
            className="muted"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span style={{ fontWeight: 600, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Đã xuất bản (PUBLISHED)
            </span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={17} />
            </div>
          </div>
          {loading && !stats ? (
            <div
              style={{
                height: '34px',
                width: '90px',
                borderRadius: '8px',
                background: '#e2e8f0',
                marginTop: '8px',
              }}
            />
          ) : (
            <div className="metric" style={{ fontSize: '28px', color: '#059669' }}>
              {(stats?.published ?? 0).toLocaleString('vi-VN')}
            </div>
          )}
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px' }}>
            Hiển thị công khai trên bản đồ & AI Planner
          </div>
        </article>

        <article className="card">
          <div
            className="muted"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span style={{ fontWeight: 600, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Tổng người dùng
            </span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#f1f5f9', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={17} />
            </div>
          </div>
          {loading && !userStats ? (
            <div
              style={{
                height: '34px',
                width: '90px',
                borderRadius: '8px',
                background: '#e2e8f0',
                marginTop: '8px',
              }}
            />
          ) : (
            <div className="metric" style={{ fontSize: '28px', color: '#0f172a' }}>
              {(userStats?.totalUsers ?? 0).toLocaleString('vi-VN')}
            </div>
          )}
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px' }}>
            {userStats
              ? `${userStats.activeUsers} đang hoạt động · ${userStats.lockedUsers} bị khóa`
              : `${(stats?.rejected ?? 0).toLocaleString('vi-VN')} điểm đến bị từ chối`}
          </div>
        </article>
      </section>

      {/* Charts Section */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '20px',
          marginBottom: '24px',
        }}
      >
        <div className="card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <h2
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                margin: 0,
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <BarChart3 size={18} color="#2563eb" />
              Phân bổ điểm đến theo Tỉnh / Thành phố
            </h2>
          </div>

          {loading && provinceEntries.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[1, 2, 3, 4].map((idx) => (
                <div
                  key={idx}
                  style={{ height: '24px', borderRadius: '6px', background: '#f1f5f9' }}
                />
              ))}
            </div>
          ) : provinceEntries.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>
              Biểu đồ sẽ cập nhật sau khi có dữ liệu điểm đến.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {provinceEntries.map(([provName, count]) => {
                const widthPercent = Math.max(6, Math.round((count / maxProvinceCount) * 100));
                return (
                  <div key={provName}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: '#334155',
                        marginBottom: '4px',
                      }}
                    >
                      <span>{provName}</span>
                      <span style={{ color: '#2563eb' }}>{count} địa điểm</span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '8px',
                        borderRadius: '999px',
                        background: '#f1f5f9',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${widthPercent}%`,
                          height: '100%',
                          borderRadius: '999px',
                          background: '#2563eb',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <h2
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                margin: 0,
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Layers size={18} color="#059669" />
              Phân bổ điểm đến theo Danh mục
            </h2>
          </div>

          {loading && categoryEntries.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[1, 2, 3, 4].map((idx) => (
                <div
                  key={idx}
                  style={{ height: '24px', borderRadius: '6px', background: '#f1f5f9' }}
                />
              ))}
            </div>
          ) : categoryEntries.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>
              Biểu đồ sẽ cập nhật sau khi có dữ liệu danh mục.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {categoryEntries.map(([catName, count]) => {
                const widthPercent = Math.max(6, Math.round((count / maxCategoryCount) * 100));
                return (
                  <div key={catName}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: '#334155',
                        marginBottom: '4px',
                      }}
                    >
                      <span>{catName}</span>
                      <span style={{ color: '#059669' }}>{count} địa điểm</span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '8px',
                        borderRadius: '999px',
                        background: '#f1f5f9',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${widthPercent}%`,
                          height: '100%',
                          borderRadius: '999px',
                          background: '#059669',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Navigation & System Status Cards */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
        }}
      >
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 12px 0', color: '#0f172a' }}>
            Phân hệ Quản trị Nền tảng
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link
              href="/destinations"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#0f172a',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={16} style={{ color: '#475569' }} />
                <span>Quản lý Điểm đến (CMS)</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#2563eb', fontSize: '0.82rem' }}>
                <span>Chi tiết</span>
                <ArrowRight size={14} />
              </span>
            </Link>
            <Link
              href="/users"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#0f172a',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} style={{ color: '#475569' }} />
                <span>Quản lý Người dùng & Vai trò</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#2563eb', fontSize: '0.82rem' }}>
                <span>Chi tiết</span>
                <ArrowRight size={14} />
              </span>
            </Link>
            <Link
              href="/moderation"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#0f172a',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={16} style={{ color: '#475569' }} />
                <span>Hàng đợi Kiểm duyệt Điểm đến</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#2563eb', fontSize: '0.82rem' }}>
                <span>Chi tiết</span>
                <ArrowRight size={14} />
              </span>
            </Link>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Activity size={18} color="#059669" />
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>
              Trạng thái Hạ tầng & Cổng Du khách
            </h2>
          </div>
          <p
            style={{
              fontSize: '0.88rem',
              color: '#64748b',
              lineHeight: 1.5,
              margin: '0 0 14px 0',
            }}
          >
            Trạng thái kết nối Backend:{' '}
            <strong style={{ color: health?.status === 'UP' ? '#059669' : '#dc2626' }}>
              {health?.status === 'UP'
                ? `Đã kết nối (${health.service})`
                : 'Đang kiểm tra / Chưa kết nối'}
            </strong>
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                borderRadius: '8px',
                background: '#0f172a',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              <Globe size={15} />
              Xem Cổng du lịch VISTA
            </Link>
            <a
              href="http://localhost:8081/swagger-ui.html"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              Mở Swagger UI
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
