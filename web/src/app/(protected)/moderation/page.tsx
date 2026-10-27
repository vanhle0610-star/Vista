'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  Search,
  MapPin,
  Tag,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Inbox,
  AlertCircle,
  X,
} from 'lucide-react';
import styles from './moderation.module.css';

interface DestinationSummary {
  id: string;
  name: string;
  province: string;
  category: string;
  imageUrl?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  status: string;
}

interface DestinationDetail extends DestinationSummary {
  description?: string;
  openingHours?: Record<string, string>;
  sourceUrl?: string;
  verifiedAt?: string;
}

interface ModerationStats {
  total: number;
  draft: number;
  published: number;
  rejected: number;
}

const PROVINCE_OPTIONS = [
  'Đà Nẵng',
  'Thừa Thiên Huế',
  'Quảng Nam',
  'Hà Nội',
  'TP Hồ Chí Minh',
  'Ninh Bình',
  'Lâm Đồng',
  'Khánh Hòa',
  'Kiên Giang',
  'Lào Cai',
  'Quảng Bình',
  'Hải Phòng',
  'Cần Thơ',
];

const DAY_LABELS: Record<string, string> = {
  mon: 'Thứ Hai',
  tue: 'Thứ Ba',
  wed: 'Thứ Tư',
  thu: 'Thứ Năm',
  fri: 'Thứ Sáu',
  sat: 'Thứ Bảy',
  sun: 'Chủ Nhật',
};

export default function ModerationPage() {
  const [items, setItems] = useState<DestinationSummary[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [stats, setStats] = useState<ModerationStats>({ total: 0, draft: 0, published: 0, rejected: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'DRAFT' | 'PUBLISHED' | 'REJECTED' | 'ALL'>('DRAFT');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedProvince, setSelectedProvince] = useState<string>('');

  // Selected Detail Modal
  const [selectedDest, setSelectedDest] = useState<DestinationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const getApiBase = () => {
    return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/+$/, '');
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

  // 1. Fetch Stats
  const fetchStats = async () => {
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/admin/destinations/stats`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // Ignore background stats fetch errors
    }
  };

  // 2. Fetch Moderation Queue
  const fetchQueue = async () => {
    try {
      setLoading(true);
      setError(null);
      const apiBase = getApiBase();
      const params = new URLSearchParams({
        status: statusFilter,
        page: '0',
        size: '50',
      });
      if (searchKeyword.trim()) params.set('keyword', searchKeyword.trim());
      if (selectedProvince) params.set('province', selectedProvince);

      const res = await fetch(`${apiBase}/admin/destinations?${params.toString()}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          throw new Error('Bạn không có quyền truy cập hàng đợi kiểm duyệt (yêu cầu vai trò ADMIN hoặc MODERATOR)');
        }
        throw new Error(`Lỗi tải dữ liệu: HTTP ${res.status}`);
      }

      const data = await res.json();
      setItems(data.items || []);
      setTotalCount(data.total || (data.items ? data.items.length : 0));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể kết nối đến máy chủ';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const apiBase = getApiBase();
        const params = new URLSearchParams({
          status: statusFilter,
          page: '0',
          size: '50',
        });
        if (searchKeyword.trim()) params.set('keyword', searchKeyword.trim());
        if (selectedProvince) params.set('province', selectedProvince);

        const [queueRes, statsRes] = await Promise.allSettled([
          fetch(`${apiBase}/admin/destinations?${params.toString()}`, {
            headers: getAuthHeaders(),
            credentials: 'include',
          }),
          fetch(`${apiBase}/admin/destinations/stats`, {
            headers: getAuthHeaders(),
            credentials: 'include',
          }),
        ]);

        if (ignore) return;

        if (queueRes.status === 'fulfilled') {
          const res = queueRes.value;
          if (!res.ok) {
            if (res.status === 403 || res.status === 401) {
              setError('Bạn không có quyền truy cập hàng đợi kiểm duyệt (yêu cầu vai trò ADMIN hoặc MODERATOR)');
            } else {
              setError(`Lỗi tải dữ liệu: HTTP ${res.status}`);
            }
          } else {
            const data = await res.json();
            setItems(data.items || []);
            setTotalCount(data.total || (data.items ? data.items.length : 0));
          }
        } else {
          setError('Không thể kết nối đến máy chủ');
        }

        if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
          const statsData = await statsRes.value.json();
          setStats(statsData);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Lỗi kết nối';
          setError(msg);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [statusFilter, selectedProvince, searchKeyword]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQueue();
  };

  // 3. View Detail
  const handleOpenDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/admin/destinations/${id}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedDest(data);
      } else {
        showToast('Không thể tải thông tin chi tiết điểm đến', 'error');
      }
    } catch {
      showToast('Lỗi mạng khi tải chi tiết', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  // 4. Approve Action
  const handleApprove = async (id: string, name: string) => {
    try {
      setActionInProgressId(id);
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/admin/destinations/${id}/approve`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ note: `Đã duyệt xuất bản điểm đến ${name}` }),
      });

      if (!res.ok) {
        throw new Error(`Phê duyệt thất bại: HTTP ${res.status}`);
      }

      showToast(`Đã duyệt và xuất bản thành công: "${name}"`, 'success');
      if (selectedDest && selectedDest.id === id) {
        setSelectedDest(null);
      }
      fetchQueue();
      fetchStats();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi phê duyệt';
      showToast(msg, 'error');
    } finally {
      setActionInProgressId(null);
    }
  };

  // 5. Reject Action
  const handleReject = async (id: string, name: string) => {
    try {
      setActionInProgressId(id);
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/admin/destinations/${id}/reject`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ note: `Từ chối nội dung điểm đến ${name}` }),
      });

      if (!res.ok) {
        throw new Error(`Từ chối thất bại: HTTP ${res.status}`);
      }

      showToast(`Đã từ chối kiểm duyệt điểm đến: "${name}"`, 'success');
      if (selectedDest && selectedDest.id === id) {
        setSelectedDest(null);
      }
      fetchQueue();
      fetchStats();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi từ chối';
      showToast(msg, 'error');
    } finally {
      setActionInProgressId(null);
    }
  };

  const formatPrice = (min?: number | null, max?: number | null) => {
    if (min === null || min === undefined || max === null || max === undefined) {
      return 'Chưa rõ giá vé';
    }
    if (min === 0 && max === 0) {
      return 'Miễn phí';
    }
    if (min === max) {
      return `${min.toLocaleString('vi-VN')} đ`;
    }
    return `${min.toLocaleString('vi-VN')} – ${max.toLocaleString('vi-VN')} đ`;
  };

  return (
    <div className={styles.container}>
      {/* 1. Header Section */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <div className={styles.cloudPill}>
            <span className={styles.cloudDot} />
            Hàng đợi kiểm duyệt (FR-ADM-03)
          </div>
          <h1>Kiểm duyệt Điểm đến Du lịch {totalCount > 0 ? `(${totalCount})` : ''}</h1>
          <p className={styles.subtitle}>
            Thẩm định thông tin địa danh, xác minh giờ mở cửa, giá vé và kiểm duyệt chất lượng nội dung trước khi xuất bản rộng rãi cho cộng đồng du lịch.
          </p>
        </div>

        <div className={styles.actionArea}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => {
              fetchQueue();
              fetchStats();
            }}
          >
            <RefreshCw size={16} />
            Làm mới
          </button>
          <Link href="/destinations" className={styles.btnSecondary}>
            Quản lý kho địa điểm →
          </Link>
        </div>
      </div>

      {/* 2. Stats Row */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statIconBox} style={{ background: '#fef3c7', color: '#d97706' }}>
            <Inbox size={24} />
          </div>
          <div>
            <div className={styles.statValue}>{stats.draft}</div>
            <div className={styles.statLabel}>Chờ phê duyệt (DRAFT)</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconBox} style={{ background: '#dcfce7', color: '#16a34a' }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className={styles.statValue}>{stats.published}</div>
            <div className={styles.statLabel}>Đã xuất bản (PUBLISHED)</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconBox} style={{ background: '#fee2e2', color: '#dc2626' }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <div className={styles.statValue}>{stats.rejected}</div>
            <div className={styles.statLabel}>Từ chối duyệt (REJECTED)</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconBox} style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <Tag size={24} />
          </div>
          <div>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Tổng số địa điểm</div>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.tabsRow}>
          <button
            type="button"
            className={`${styles.tabBtn} ${statusFilter === 'DRAFT' ? styles.tabBtnActive : ''}`}
            onClick={() => setStatusFilter('DRAFT')}
          >
            ⏳ Chờ duyệt
            <span className={styles.tabBadge}>{stats.draft}</span>
          </button>

          <button
            type="button"
            className={`${styles.tabBtn} ${statusFilter === 'PUBLISHED' ? styles.tabBtnActive : ''}`}
            onClick={() => setStatusFilter('PUBLISHED')}
          >
            ✅ Đã xuất bản
            <span className={styles.tabBadge}>{stats.published}</span>
          </button>

          <button
            type="button"
            className={`${styles.tabBtn} ${statusFilter === 'REJECTED' ? styles.tabBtnActive : ''}`}
            onClick={() => setStatusFilter('REJECTED')}
          >
            ❌ Đã từ chối
            <span className={styles.tabBadge}>{stats.rejected}</span>
          </button>

          <button
            type="button"
            className={`${styles.tabBtn} ${statusFilter === 'ALL' ? styles.tabBtnActive : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            📂 Tất cả
            <span className={styles.tabBadge}>{stats.total}</span>
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className={styles.searchInputsRow}>
          <div className={styles.searchInputWrapper}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên điểm đến, di tích, bãi biển..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <select
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            className={styles.selectInput}
          >
            <option value="">Tất cả tỉnh thành</option>
            {PROVINCE_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <button type="submit" className={styles.btnSecondary}>
            Lọc kết quả
          </button>
        </form>
      </div>

      {/* 4. Table / Content Area */}
      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.feedbackContainer}>
            <div className={styles.spinner} />
            <p style={{ color: '#64748b', fontWeight: 600 }}>Đang tải danh sách kiểm duyệt...</p>
          </div>
        ) : error ? (
          <div className={styles.feedbackContainer}>
            <AlertCircle size={48} color="#ef4444" />
            <div className={styles.emptyTitle}>Lỗi truy cập hàng đợi</div>
            <p className={styles.emptyDesc}>{error}</p>
            <button type="button" className={styles.btnSecondary} onClick={fetchQueue}>
              Thử lại
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className={styles.feedbackContainer}>
            <span className={styles.emptyEmoji}>🎉</span>
            <div className={styles.emptyTitle}>
              {statusFilter === 'DRAFT'
                ? 'Hàng đợi kiểm duyệt trống'
                : 'Không có điểm đến nào phù hợp'}
            </div>
            <p className={styles.emptyDesc}>
              {statusFilter === 'DRAFT'
                ? 'Tuyệt vời! Tất cả các điểm đến mới đã được xử lý xong.'
                : 'Hãy thử thay đổi từ khóa hoặc bộ lọc tỉnh thành để xem thêm dữ liệu.'}
            </p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.moderationTable}>
              <thead>
                <tr>
                  <th>Điểm đến</th>
                  <th>Tỉnh / Thành</th>
                  <th>Danh mục</th>
                  <th>Giá vé tham khảo</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác kiểm duyệt</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isActioning = actionInProgressId === item.id;
                  const isDraft = item.status === 'DRAFT';
                  const isPublished = item.status === 'PUBLISHED';
                  const isRejected = item.status === 'REJECTED';

                  return (
                    <tr key={item.id}>
                      <td>
                        <div className={styles.destinationCell}>
                          <div className={styles.thumbnailBox}>
                            {item.imageUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className={styles.thumbnailImg}
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  height: '100%',
                                  fontSize: '20px',
                                }}
                              >
                                📍
                              </div>
                            )}
                          </div>
                          <div>
                            <div className={styles.destName}>{item.name}</div>
                            <div className={styles.destMeta}>
                              <MapPin size={13} />
                              {item.province}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{item.province}</span>
                      </td>

                      <td>
                        <span className={styles.categoryTag}>{item.category}</span>
                      </td>

                      <td>
                        <span className={item.priceMin === 0 ? styles.freePrice : styles.priceText}>
                          {formatPrice(item.priceMin, item.priceMax)}
                        </span>
                      </td>

                      <td>
                        {isDraft && (
                          <span className={`${styles.statusBadge} ${styles.statusDraft}`}>
                            ⏳ Chờ duyệt
                          </span>
                        )}
                        {isPublished && (
                          <span className={`${styles.statusBadge} ${styles.statusPublished}`}>
                            <CheckCircle2 size={13} />
                            Đã xuất bản
                          </span>
                        )}
                        {isRejected && (
                          <span className={`${styles.statusBadge} ${styles.statusRejected}`}>
                            <XCircle size={13} />
                            Từ chối
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div className={styles.actionGroup} style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className={styles.btnDetail}
                            onClick={() => handleOpenDetail(item.id)}
                            disabled={detailLoading}
                            title="Xem chi tiết nội dung"
                          >
                            <Eye size={15} />
                            {detailLoading ? 'Đang mở...' : 'Xem'}
                          </button>

                          {item.status !== 'PUBLISHED' && (
                            <button
                              type="button"
                              className={styles.btnApprove}
                              onClick={() => handleApprove(item.id, item.name)}
                              disabled={isActioning}
                              title="Phê duyệt xuất bản ngay"
                            >
                              <CheckCircle2 size={15} />
                              Duyệt
                            </button>
                          )}

                          {item.status !== 'REJECTED' && (
                            <button
                              type="button"
                              className={styles.btnReject}
                              onClick={() => handleReject(item.id, item.name)}
                              disabled={isActioning}
                              title="Từ chối nội dung"
                            >
                              <XCircle size={15} />
                              Từ chối
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Detail Inspection Modal */}
      {selectedDest && (
        <div className={styles.modalOverlay} onClick={() => setSelectedDest(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>Thẩm định nội dung điểm đến</div>
              <button
                type="button"
                className={styles.btnCloseModal}
                onClick={() => setSelectedDest(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {selectedDest.imageUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={selectedDest.imageUrl}
                  alt={selectedDest.name}
                  className={styles.modalHeroImage}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.35rem 0' }}>
                    {selectedDest.name}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#64748b', fontSize: '0.85rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={14} />
                      {selectedDest.province}
                    </span>
                    <span>•</span>
                    <span className={styles.categoryTag}>{selectedDest.category}</span>
                  </div>
                </div>

                <div>
                  {selectedDest.status === 'DRAFT' && (
                    <span className={`${styles.statusBadge} ${styles.statusDraft}`}>⏳ Chờ duyệt</span>
                  )}
                  {selectedDest.status === 'PUBLISHED' && (
                    <span className={`${styles.statusBadge} ${styles.statusPublished}`}>
                      <CheckCircle2 size={13} /> Đã xuất bản
                    </span>
                  )}
                  {selectedDest.status === 'REJECTED' && (
                    <span className={`${styles.statusBadge} ${styles.statusRejected}`}>
                      <XCircle size={13} /> Từ chối
                    </span>
                  )}
                </div>
              </div>

              {/* Info Grid */}
              <div className={styles.infoGrid}>
                <div className={styles.infoBox}>
                  <div className={styles.infoLabel}>Khoảng giá vé:</div>
                  <div className={styles.infoValue}>
                    {formatPrice(selectedDest.priceMin, selectedDest.priceMax)}
                  </div>
                </div>

                <div className={styles.infoBox}>
                  <div className={styles.infoLabel}>Tọa độ GPS:</div>
                  <div className={styles.infoValue}>
                    {selectedDest.latitude && selectedDest.longitude
                      ? `${selectedDest.latitude.toFixed(4)}, ${selectedDest.longitude.toFixed(4)}`
                      : 'Chưa cập nhật'}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <div className={styles.detailSectionTitle}>Giới thiệu chi tiết:</div>
                <div className={styles.detailDescription}>
                  {selectedDest.description || 'Chưa có thông tin mô tả chi tiết cho điểm đến này.'}
                </div>
              </div>

              {/* 7-day Opening Hours */}
              <div>
                <div className={styles.detailSectionTitle}>Lịch mở cửa trong tuần:</div>
                {selectedDest.openingHours && Object.keys(selectedDest.openingHours).length > 0 ? (
                  <div className={styles.hoursGrid}>
                    {Object.entries(DAY_LABELS).map(([key, label]) => {
                      const time = selectedDest.openingHours ? selectedDest.openingHours[key] : null;
                      return (
                        <div key={key} className={styles.hourItem}>
                          <div className={styles.hourDay}>{label}</div>
                          <div className={styles.hourTime}>{time || 'Đóng cửa'}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                    Chưa có cấu hình giờ mở cửa theo tuần.
                  </p>
                )}
              </div>

              {/* External Source Link */}
              {selectedDest.sourceUrl && (
                <div style={{ marginTop: '0.5rem' }}>
                  <a
                    href={selectedDest.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      color: '#0284c7',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      textDecoration: 'underline',
                    }}
                  >
                    <ExternalLink size={14} />
                    Xem nguồn kiểm chứng gốc
                  </a>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setSelectedDest(null)}
              >
                Đóng
              </button>

              {selectedDest.status !== 'REJECTED' && (
                <button
                  type="button"
                  className={styles.btnReject}
                  onClick={() => handleReject(selectedDest.id, selectedDest.name)}
                >
                  <XCircle size={16} />
                  Từ chối duyệt
                </button>
              )}

              {selectedDest.status !== 'PUBLISHED' && (
                <button
                  type="button"
                  className={styles.btnApprove}
                  onClick={() => handleApprove(selectedDest.id, selectedDest.name)}
                >
                  <CheckCircle2 size={16} />
                  Phê duyệt xuất bản
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. Toast Notification */}
      {toast && (
        <div
          className={`${styles.toast} ${
            toast.type === 'success' ? styles.toastSuccess : styles.toastError
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
