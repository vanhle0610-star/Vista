'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
  MessageSquareWarning,
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { CrownModeratorIcon } from '@/components/common/LuxeIcons';
import styles from './moderation.module.css';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES: DESTINATION MODERATION (TV1)
// ═══════════════════════════════════════════════════════════════════════════
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
];

const CATEGORY_OPTIONS = [
  'Di tích',
  'Danh lam',
  'Bảo tàng',
  'Tâm linh',
  'Bãi biển',
  'Sinh thái',
  'Ẩm thực',
  'Vui chơi',
];

const DAY_LABELS: Record<string, string> = {
  monday: 'Thứ 2',
  tuesday: 'Thứ 3',
  wednesday: 'Thứ 4',
  thursday: 'Thứ 5',
  friday: 'Thứ 6',
  saturday: 'Thứ 7',
  sunday: 'Chủ nhật',
};

// ═══════════════════════════════════════════════════════════════════════════
// TYPES: COMMUNITY REPORTS MODERATION (TV4)
// ═══════════════════════════════════════════════════════════════════════════
interface ReportItem {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: string;
  targetId: string;
  targetBody: string;
  targetMediaUrls: string[];
  targetAuthorName: string;
  targetVersion: number;
  reason: string;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  handledBy?: string;
  handledAt?: string;
  createdAt: string;
}

interface ConfirmDialogData {
  type: 'HIDE' | 'DISMISS' | 'RESTORE';
  reportId?: string;
  postId?: string;
  authorName?: string;
}

const PRESET_REASONS = {
  HIDE: [
    'Nội dung phản cảm, thù ghét hoặc bạo lực',
    'Thông tin sai lệch hoặc lừa đảo du khách',
    'Spam, quảng cáo không đúng quy định',
    'Vi phạm bản quyền hình ảnh',
  ],
  DISMISS: [
    'Nội dung hợp lệ, không vi phạm tiêu chuẩn cộng đồng',
    'Thông tin chia sẻ trải nghiệm thực tế của người dùng',
    'Báo cáo không có căn cứ rõ ràng',
  ],
  RESTORE: [
    'Đã xác minh bài viết tuân thủ đầy đủ quy chuẩn VISTA',
    'Bài viết bị ẩn nhầm lẫn, nội dung văn minh',
  ],
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('vi-VN');
  } catch {
    return iso;
  }
};

export default function ModerationPage() {
  // Top-level hub active tab: 'DESTINATIONS' | 'REPORTS'
  const [hubTab, setHubTab] = useState<'DESTINATIONS' | 'REPORTS'>('DESTINATIONS');

  // ─────────────────────────────────────────────────────────────────────────
  // STATE: DESTINATIONS
  // ─────────────────────────────────────────────────────────────────────────
  const [destinations, setDestinations] = useState<DestinationSummary[]>([]);
  const [stats, setStats] = useState<ModerationStats>({ total: 0, draft: 0, published: 0, rejected: 0 });
  const [loadingDest, setLoadingDest] = useState(true);
  const [errorDest, setErrorDest] = useState<string | null>(null);

  const [selectedStatus, setSelectedStatus] = useState<string>('DRAFT');
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  const [selectedDest, setSelectedDest] = useState<DestinationDetail | null>(null);
  const [isActioning, setIsActioning] = useState(false);
  const [destToast, setDestToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showDestToast = (message: string, type: 'success' | 'error' = 'success') => {
    setDestToast({ message, type });
    setTimeout(() => setDestToast(null), 3500);
  };

  const fetchDestinations = useCallback(async () => {
    setLoadingDest(true);
    setErrorDest(null);
    try {
      const params = new URLSearchParams();
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedProvince) params.append('province', selectedProvince);
      if (selectedCategory) params.append('category', selectedCategory);
      if (searchKeyword.trim()) params.append('keyword', searchKeyword.trim());

      const data = await apiRequest<DestinationSummary[]>(
        `/admin/destinations/moderation-queue?${params.toString()}`
      );
      setDestinations(data || []);

      if (!selectedProvince && !selectedCategory && !searchKeyword.trim()) {
        const dCount = (data || []).filter((d) => d.status === 'DRAFT').length;
        const pCount = (data || []).filter((d) => d.status === 'PUBLISHED').length;
        const rCount = (data || []).filter((d) => d.status === 'REJECTED').length;
        setStats({
          total: (data || []).length,
          draft: dCount,
          published: pCount,
          rejected: rCount,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách kiểm duyệt';
      setErrorDest(msg);
    } finally {
      setLoadingDest(false);
    }
  }, [selectedStatus, selectedProvince, selectedCategory, searchKeyword]);

  useEffect(() => {
    if (hubTab === 'DESTINATIONS') {
      void fetchDestinations();
    }
  }, [hubTab, fetchDestinations]);

  const handleApprove = async (id: string, name: string) => {
    if (!confirm(`Xác nhận phê duyệt và xuất bản địa điểm "${name}"?`)) return;
    setIsActioning(true);
    try {
      await apiRequest(`/admin/destinations/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PUBLISHED' }),
      });
      showDestToast(`Đã xuất bản địa điểm "${name}" thành công!`);
      if (selectedDest?.id === id) {
        setSelectedDest((prev) => (prev ? { ...prev, status: 'PUBLISHED' } : null));
      }
      void fetchDestinations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi phê duyệt';
      showDestToast(msg, 'error');
    } finally {
      setIsActioning(false);
    }
  };

  const handleReject = async (id: string, name: string) => {
    const reason = prompt(`Lý do từ chối điểm đến "${name}":`, 'Thông tin chưa đầy đủ hoặc không chính xác');
    if (reason === null) return;
    setIsActioning(true);
    try {
      await apiRequest(`/admin/destinations/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED', reason }),
      });
      showDestToast(`Đã từ chối địa điểm "${name}".`, 'error');
      if (selectedDest?.id === id) {
        setSelectedDest((prev) => (prev ? { ...prev, status: 'REJECTED' } : null));
      }
      void fetchDestinations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi từ chối';
      showDestToast(msg, 'error');
    } finally {
      setIsActioning(false);
    }
  };

  const handleViewDetail = async (id: string) => {
    try {
      const detail = await apiRequest<DestinationDetail>(`/admin/destinations/${id}`);
      setSelectedDest(detail);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không tải được chi tiết điểm đến';
      showDestToast(msg, 'error');
    }
  };

  const formatPrice = (min?: number | null, max?: number | null) => {
    if (min == null && max == null) return 'Chưa cập nhật';
    if (min === 0 && max === 0) return 'Miễn phí';
    if (min === max) return `${min?.toLocaleString('vi-VN')} đ`;
    return `${min?.toLocaleString('vi-VN')} – ${max?.toLocaleString('vi-VN')} đ`;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // STATE: COMMUNITY REPORTS
  // ─────────────────────────────────────────────────────────────────────────
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [statusTab, setStatusTab] = useState<'OPEN' | 'RESOLVED' | 'DISMISSED'>('OPEN');
  const [loadingReports, setLoadingReports] = useState(true);
  const [errorReports, setErrorReports] = useState('');
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [reportToast, setReportToast] = useState<string | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogData | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customNote, setCustomNote] = useState<string>('');

  const notifyReport = (msg: string) => {
    setReportToast(msg);
    setTimeout(() => setReportToast(null), 3500);
  };

  const loadReports = useCallback(async (status: string) => {
    setLoadingReports(true);
    setErrorReports('');
    try {
      const data = await apiRequest<ReportItem[]>(`/admin/reports?status=${status}&page=0&size=50`);
      setReports(data || []);
    } catch (err) {
      setErrorReports(err instanceof Error ? err.message : 'Không tải được danh sách báo cáo.');
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    if (hubTab === 'REPORTS') {
      void loadReports(statusTab);
    }
  }, [hubTab, statusTab, loadReports]);

  const openConfirmDialog = (
    type: 'HIDE' | 'DISMISS' | 'RESTORE',
    reportId?: string,
    postId?: string,
    authorName?: string
  ) => {
    const defaultReason = PRESET_REASONS[type][0];
    setSelectedReason(defaultReason);
    setCustomNote('');
    setConfirmDialog({ type, reportId, postId, authorName });
  };

  const executeConfirmedAction = async () => {
    if (!confirmDialog) return;

    const note = (customNote.trim() || selectedReason).trim();
    if (!note) {
      notifyReport('⚠️ Vui lòng chọn hoặc nhập lý do kiểm duyệt.');
      return;
    }

    const { type, reportId, postId } = confirmDialog;

    if (type === 'HIDE' || type === 'DISMISS') {
      if (!reportId) return;
      setActionBusyId(reportId);
      setConfirmDialog(null);
      try {
        await apiRequest<ReportItem>(`/admin/reports/${reportId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: type, note }),
        });
        notifyReport(
          type === 'HIDE'
            ? '🚫 Đã ẩn bài viết vi phạm khỏi cộng đồng.'
            : '✅ Đã bác bỏ báo cáo (Nội dung hợp lệ).'
        );
        void loadReports(statusTab);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (
          msg.includes('409') ||
          msg.includes('trước đó') ||
          msg.includes('ALREADY_HANDLED') ||
          msg.includes('conflict')
        ) {
          notifyReport('⚠️ Xung đột: Báo cáo này đã được kiểm duyệt viên khác xử lý trước đó.');
        } else {
          notifyReport(`⚠️ Lỗi: ${msg || 'Không thể thực hiện kiểm duyệt'}`);
        }
        void loadReports(statusTab);
      } finally {
        setActionBusyId(null);
      }
    } else if (type === 'RESTORE') {
      if (!postId) return;
      setActionBusyId(postId);
      setConfirmDialog(null);
      try {
        await apiRequest(`/admin/posts/${postId}/restore`, { method: 'POST' });
        notifyReport('🔄 Đã khôi phục bài viết trở lại công khai.');
        void loadReports(statusTab);
      } catch (err) {
        notifyReport(`⚠️ Lỗi: ${err instanceof Error ? err.message : 'Không thể khôi phục'}`);
      } finally {
        setActionBusyId(null);
      }
    }
  };

  return (
    <div className={styles.container}>
      {/* ════════ TOP-LEVEL MODERATION HUB NAVIGATION ════════ */}
      <nav className={styles.hubNav} aria-label="Moderation Views">
        <button
          type="button"
          className={`${styles.hubTabBtn} ${hubTab === 'DESTINATIONS' ? styles.hubTabBtnActive : ''}`}
          onClick={() => setHubTab('DESTINATIONS')}
        >
          <MapPin size={18} />
          Kiểm duyệt Điểm đến Du lịch (TV1)
        </button>
        <button
          type="button"
          className={`${styles.hubTabBtn} ${hubTab === 'REPORTS' ? styles.hubTabBtnActive : ''}`}
          onClick={() => setHubTab('REPORTS')}
        >
          <MessageSquareWarning size={18} />
          Báo cáo Bài viết Cộng đồng (TV4)
        </button>
      </nav>

      {/* ════════ VIEW 1: DESTINATIONS MODERATION ════════ */}
      {hubTab === 'DESTINATIONS' && (
        <>
          {/* Header */}
          <div className={styles.headerRow}>
            <div className={styles.titleArea}>
              <div className={styles.cloudPill}>
                <span className={styles.cloudDot} />
                Hàng đợi kiểm duyệt (FR-ADM-03)
              </div>
              <h1>Kiểm duyệt Điểm đến Du lịch {destinations.length > 0 ? `(${destinations.length})` : ''}</h1>
              <p className={styles.subtitle}>
                Thẩm định thông tin địa danh, xác minh giờ mở cửa, giá vé và kiểm duyệt chất lượng nội dung trước khi xuất bản rộng rãi cho cộng đồng du lịch.
              </p>
            </div>

            <div className={styles.actionArea}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => void fetchDestinations()}
                disabled={loadingDest}
              >
                <RefreshCw size={16} className={loadingDest ? styles.spin : ''} />
                Làm mới danh sách
              </button>
              <Link href="/destinations" className={styles.btnPrimary}>
                Xem kho điểm đến
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          <div className={styles.statsContainer}>
            <div
              className={`${styles.statBox} ${selectedStatus === '' ? styles.statBoxActive : ''}`}
              onClick={() => setSelectedStatus('')}
            >
              <div className={styles.statLabel}>Tất cả điểm đến</div>
              <div className={styles.statNumber}>{stats.total}</div>
            </div>

            <div
              className={`${styles.statBox} ${selectedStatus === 'DRAFT' ? styles.statBoxActive : ''}`}
              onClick={() => setSelectedStatus('DRAFT')}
            >
              <div className={styles.statLabel}>
                <span className={`${styles.statusDot} ${styles.statusDotDraft}`} />
                Chờ duyệt (Draft)
              </div>
              <div className={`${styles.statNumber} ${styles.statNumberDraft}`}>{stats.draft}</div>
            </div>

            <div
              className={`${styles.statBox} ${selectedStatus === 'PUBLISHED' ? styles.statBoxActive : ''}`}
              onClick={() => setSelectedStatus('PUBLISHED')}
            >
              <div className={styles.statLabel}>
                <span className={`${styles.statusDot} ${styles.statusDotPublished}`} />
                Đã xuất bản
              </div>
              <div className={`${styles.statNumber} ${styles.statNumberPublished}`}>{stats.published}</div>
            </div>

            <div
              className={`${styles.statBox} ${selectedStatus === 'REJECTED' ? styles.statBoxActive : ''}`}
              onClick={() => setSelectedStatus('REJECTED')}
            >
              <div className={styles.statLabel}>
                <span className={`${styles.statusDot} ${styles.statusDotRejected}`} />
                Đã từ chối
              </div>
              <div className={`${styles.statNumber} ${styles.statNumberRejected}`}>{stats.rejected}</div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className={styles.filtersCard}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Tìm tên địa danh, danh lam, khu di tích..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
            </div>

            <div className={styles.filterGroup}>
              <select
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="">Tất cả tỉnh / thành</option>
                {PROVINCE_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="">Tất cả danh mục</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {(searchKeyword || selectedProvince || selectedCategory) && (
                <button
                  type="button"
                  className={styles.btnClearFilter}
                  onClick={() => {
                    setSearchKeyword('');
                    setSelectedProvince('');
                    setSelectedCategory('');
                  }}
                >
                  Xóa lọc
                </button>
              )}
            </div>
          </div>

          {/* Table Content */}
          <div className={styles.tableCard}>
            {loadingDest ? (
              <div className={styles.loadingContainer}>
                <div className={styles.spinner} />
                <p>Đang tải danh sách điểm đến...</p>
              </div>
            ) : errorDest ? (
              <div className={styles.errorContainer}>
                <AlertCircle size={32} />
                <p>{errorDest}</p>
                <button type="button" onClick={() => void fetchDestinations()}>
                  Thử lại
                </button>
              </div>
            ) : destinations.length === 0 ? (
              <div className={styles.emptyContainer}>
                <Inbox size={48} className={styles.emptyIcon} />
                <h3>Không tìm thấy điểm đến nào</h3>
                <p>Không có địa danh nào phù hợp với bộ lọc hiện tại.</p>
              </div>
            ) : (
              <div className={styles.tableResponsive}>
                <table className={styles.destTable}>
                  <thead>
                    <tr>
                      <th>Điểm đến</th>
                      <th>Tỉnh / Thành</th>
                      <th>Danh mục</th>
                      <th>Khoảng giá</th>
                      <th>Tọa độ GPS</th>
                      <th>Trạng thái</th>
                      <th style={{ textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {destinations.map((item) => (
                      <tr key={item.id} className={styles.tableRow}>
                        <td>
                          <div className={styles.destMeta}>
                            {item.imageUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className={styles.thumbImage}
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className={styles.thumbFallback}>
                                <MapPin size={18} />
                              </div>
                            )}
                            <div>
                              <div className={styles.destName}>{item.name}</div>
                              <div className={styles.destId}>ID: {item.id.slice(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={styles.provinceTag}>
                            <MapPin size={12} />
                            {item.province}
                          </span>
                        </td>
                        <td>
                          <span className={styles.categoryTag}>
                            <Tag size={12} />
                            {item.category}
                          </span>
                        </td>
                        <td className={styles.priceCol}>{formatPrice(item.priceMin, item.priceMax)}</td>
                        <td className={styles.gpsCol}>
                          {item.latitude && item.longitude ? (
                            <span>
                              {item.latitude.toFixed(2)}, {item.longitude.toFixed(2)}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>Chưa có</span>
                          )}
                        </td>
                        <td>
                          {item.status === 'DRAFT' && (
                            <span className={`${styles.statusBadge} ${styles.statusDraft}`}>⏳ Chờ duyệt</span>
                          )}
                          {item.status === 'PUBLISHED' && (
                            <span className={`${styles.statusBadge} ${styles.statusPublished}`}>
                              <CheckCircle2 size={13} /> Đã xuất bản
                            </span>
                          )}
                          {item.status === 'REJECTED' && (
                            <span className={`${styles.statusBadge} ${styles.statusRejected}`}>
                              <XCircle size={13} /> Từ chối
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className={styles.actionButtons}>
                            <button
                              type="button"
                              className={styles.btnActionView}
                              onClick={() => void handleViewDetail(item.id)}
                              title="Thẩm định chi tiết"
                            >
                              <Eye size={15} />
                              Xem
                            </button>

                            {item.status !== 'PUBLISHED' && (
                              <button
                                type="button"
                                className={styles.btnActionApprove}
                                onClick={() => handleApprove(item.id, item.name)}
                                disabled={isActioning}
                                title="Phê duyệt xuất bản"
                              >
                                <CheckCircle2 size={15} />
                                Duyệt
                              </button>
                            )}

                            {item.status !== 'REJECTED' && (
                              <button
                                type="button"
                                className={styles.btnActionReject}
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal Inspection */}
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

                  <div>
                    <div className={styles.detailSectionTitle}>Giới thiệu chi tiết:</div>
                    <div className={styles.detailDescription}>
                      {selectedDest.description || 'Chưa có thông tin mô tả chi tiết cho điểm đến này.'}
                    </div>
                  </div>

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

          {destToast && (
            <div
              className={`${styles.toast} ${
                destToast.type === 'success' ? styles.toastSuccess : styles.toastError
              }`}
            >
              {destToast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{destToast.message}</span>
            </div>
          )}
        </>
      )}

      {/* ════════ VIEW 2: COMMUNITY REPORTS MODERATION ════════ */}
      {hubTab === 'REPORTS' && (
        <div className={styles.reportHubContainer}>
          <header className={styles.reportHeader}>
            <div className={styles.titleArea}>
              <h2>
                <CrownModeratorIcon size={28} /> Kiểm Duyệt Báo Cáo Cộng Đồng
              </h2>
              <p>
                Rà soát các bài đăng và nội dung cộng đồng bị người dùng báo cáo vi phạm tiêu chuẩn văn minh VISTA (FR-MOD-04).
              </p>
            </div>

            <button
              type="button"
              className={styles.tabBtn}
              style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38BDF8', borderColor: 'rgba(56, 189, 248, 0.3)' }}
              disabled={loadingReports}
              onClick={() => void loadReports(statusTab)}
            >
              🔄 Làm mới hàng đợi
            </button>
          </header>

          <section className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Báo cáo đang chờ xử lý</div>
              <div className={`${styles.statValue} ${styles.statValueDanger}`}>
                {statusTab === 'OPEN' ? reports.length : '—'}
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statLabel}>Tiêu chuẩn áp dụng</div>
              <div className={styles.statValue}>FR-MOD-04</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statLabel}>Chế độ kiểm duyệt</div>
              <div className={`${styles.statValue} ${styles.statValueSuccess}`}>Quy tắc & Nhân sự</div>
            </div>
          </section>

          <div className={styles.tabsBar}>
            <button
              type="button"
              className={`${styles.tabBtn} ${statusTab === 'OPEN' ? styles.tabBtnActive : ''}`}
              onClick={() => setStatusTab('OPEN')}
            >
              Chờ xử lý ({statusTab === 'OPEN' ? reports.length : 'OPEN'})
            </button>

            <button
              type="button"
              className={`${styles.tabBtn} ${statusTab === 'RESOLVED' ? styles.tabBtnActive : ''}`}
              onClick={() => setStatusTab('RESOLVED')}
            >
              Đã ẩn bài viết (RESOLVED)
            </button>

            <button
              type="button"
              className={`${styles.tabBtn} ${statusTab === 'DISMISSED' ? styles.tabBtnActive : ''}`}
              onClick={() => setStatusTab('DISMISSED')}
            >
              Báo cáo bị bác bỏ (DISMISSED)
            </button>
          </div>

          {loadingReports && (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner} />
              <p>Đang tải danh sách báo cáo...</p>
            </div>
          )}

          {errorReports && (
            <div className={styles.errorContainer}>
              <AlertCircle size={32} />
              <p>{errorReports}</p>
              <button type="button" onClick={() => void loadReports(statusTab)}>
                Thử lại
              </button>
            </div>
          )}

          {!loadingReports && !errorReports && reports.length === 0 && (
            <div className={styles.emptyState}>
              <ShieldCheck size={48} color="#38BDF8" style={{ margin: '0 auto 12px' }} />
              <h3>Không có báo cáo nào ở trạng thái này</h3>
              <p>Hàng đợi kiểm duyệt cộng đồng hiện đang sạch sẽ.</p>
            </div>
          )}

          {!loadingReports && !errorReports && reports.length > 0 && (
            <div className={styles.reportsList}>
              {reports.map((r) => {
                const isBusy = actionBusyId === r.id || actionBusyId === r.targetId;

                return (
                  <article key={r.id} className={styles.inspectionCard}>
                    <div className={styles.postPane}>
                      <div className={styles.postAuthorHeader}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: '#0284c7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 12,
                          }}
                        >
                          {(r.targetAuthorName || 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{r.targetAuthorName}</div>
                          <div style={{ fontSize: 11, color: '#64748B' }}>Bài viết cộng đồng</div>
                        </div>
                        <span className={styles.authorBadge}>Tác giả</span>
                      </div>

                      <div className={styles.postContent}>{r.targetBody || '(Bài viết không có nội dung văn bản)'}</div>

                      {r.targetMediaUrls && r.targetMediaUrls.length > 0 && (
                        <div className={styles.mediaThumbRow}>
                          {r.targetMediaUrls.map((url, idx) => (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              key={idx}
                              src={url}
                              alt="Đính kèm bài viết"
                              className={styles.mediaThumb}
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className={styles.reportPane}>
                      <div>
                        <div className={styles.reportMetaGroup}>
                          <div className={styles.reportLabel}>Lý do người dùng báo cáo:</div>
                          <div className={styles.reportReasonBox}>⚠️ {r.reason}</div>
                        </div>

                        <div className={styles.reportMetaGroup} style={{ fontSize: 12, color: '#94A3B8' }}>
                          <div>
                            <strong>Người báo cáo:</strong> {r.reporterName}
                          </div>
                          <div>
                            <strong>Thời gian gửi:</strong> {formatDate(r.createdAt)}
                          </div>
                          {r.handledBy && (
                            <div style={{ marginTop: 4, color: '#38BDF8' }}>
                              <strong>Xử lý bởi:</strong> {r.handledBy} lúc {r.handledAt ? formatDate(r.handledAt) : ''}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={styles.actionButtonGroup}>
                        {r.status === 'OPEN' && (
                          <>
                            <button
                              type="button"
                              className={styles.hideBtn}
                              disabled={isBusy}
                              onClick={() => openConfirmDialog('HIDE', r.id, undefined, r.targetAuthorName)}
                            >
                              {isBusy ? 'Đang xử lý…' : '🚫 Ẩn Nội Dung Vi Phạm'}
                            </button>

                            <button
                              type="button"
                              className={styles.dismissBtn}
                              disabled={isBusy}
                              onClick={() => openConfirmDialog('DISMISS', r.id, undefined, r.targetAuthorName)}
                            >
                              {isBusy ? 'Đang xử lý…' : '✅ Bác Bỏ Báo Cáo'}
                            </button>
                          </>
                        )}

                        {r.status === 'RESOLVED' && (
                          <button
                            type="button"
                            className={styles.restoreBtn}
                            disabled={isBusy}
                            onClick={() => openConfirmDialog('RESTORE', undefined, r.targetId, r.targetAuthorName)}
                          >
                            {isBusy ? 'Đang khôi phục…' : '🔄 Khôi Phục Bài Viết'}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {confirmDialog && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-dialog-title"
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2000,
                padding: 16,
              }}
              onClick={() => setConfirmDialog(null)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setConfirmDialog(null);
              }}
            >
              <div
                style={{
                  background: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: 16,
                  width: '100%',
                  maxWidth: 480,
                  padding: 24,
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
                  color: '#F8FAFC',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 id="confirm-dialog-title" style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', color: '#FFFFFF' }}>
                  {confirmDialog.type === 'HIDE' && '🚫 Xác nhận ẩn bài viết'}
                  {confirmDialog.type === 'DISMISS' && '✅ Xác nhận bác bỏ báo cáo'}
                  {confirmDialog.type === 'RESTORE' && '🔄 Xác nhận khôi phục bài viết'}
                </h2>
                <p style={{ fontSize: 13, color: '#94A3B8', margin: '0 0 16px', lineHeight: 1.5 }}>
                  {confirmDialog.type === 'HIDE' &&
                    'Bài viết sẽ bị ẩn ngay lập tức khỏi cộng đồng và ghi nhận lý do kiểm duyệt.'}
                  {confirmDialog.type === 'DISMISS' &&
                    'Báo cáo sẽ được đóng với trạng thái nội dung hợp lệ và không vi phạm quy chuẩn.'}
                  {confirmDialog.type === 'RESTORE' &&
                    'Bài viết sẽ được đưa trở lại trạng thái công khai cho mọi người cùng xem.'}
                </p>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#CBD5E1', marginBottom: 8 }}>
                    Chọn lý do kiểm duyệt:
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {PRESET_REASONS[confirmDialog.type].map((reason) => (
                      <label
                        key={reason}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 13,
                          color: '#E2E8F0',
                          background: '#0F172A',
                          padding: '8px 12px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          border: selectedReason === reason ? '1px solid #38BDF8' : '1px solid #334155',
                        }}
                      >
                        <input
                          type="radio"
                          name="presetReason"
                          value={reason}
                          checked={selectedReason === reason}
                          onChange={() => setSelectedReason(reason)}
                        />
                        <span>{reason}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label
                    htmlFor="moderation-custom-note"
                    style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#CBD5E1', marginBottom: 6 }}
                  >
                    Ghi chú bổ sung (tùy chọn hoặc lý do riêng):
                  </label>
                  <textarea
                    id="moderation-custom-note"
                    rows={3}
                    placeholder="Nhập ghi chú giải thích quyết định kiểm duyệt..."
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#0F172A',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      padding: '8px 12px',
                      color: '#FFFFFF',
                      fontSize: 13,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setConfirmDialog(null)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      background: '#334155',
                      color: '#CBD5E1',
                      border: 'none',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => void executeConfirmedAction()}
                    style={{
                      padding: '8px 18px',
                      borderRadius: 8,
                      background:
                        confirmDialog.type === 'HIDE'
                          ? '#E11D48'
                          : confirmDialog.type === 'RESTORE'
                            ? '#38BDF8'
                            : '#10B981',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {confirmDialog.type === 'HIDE' && 'Xác nhận ẩn'}
                    {confirmDialog.type === 'DISMISS' && 'Xác nhận bác bỏ'}
                    {confirmDialog.type === 'RESTORE' && 'Xác nhận khôi phục'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {reportToast && (
            <div
              style={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid #38BDF8',
                color: '#FFFFFF',
                padding: '12px 20px',
                borderRadius: 999,
                backdropFilter: 'blur(16px)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                zIndex: 1000,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {reportToast}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
