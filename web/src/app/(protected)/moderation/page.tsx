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
  Clock,
  Layers,
  X,
  MessageSquareWarning,
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { PaginationBar } from '@/components/PaginationBar';
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
  imageUrls?: string[];
  description?: string;
  openingHours?: Record<string, string>;
  sourceUrl?: string;
  verifiedAt?: string;
  rejectionReason?: string | null;
}

interface ModerationStats {
  total: number;
  draft: number;
  published: number;
  rejected: number;
  archived?: number;
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

interface RejectReasonModalProps {
  destinationName: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

function RejectReasonModal({ destinationName, onClose, onConfirm }: RejectReasonModalProps) {
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const trimmedLen = reason.trim().length;
  const isValid = trimmedLen >= 10 && trimmedLen <= 500;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (trimmedLen < 10) {
      setValidationError('Lý do từ chối phải có tối thiểu 10 ký tự.');
      return;
    }
    if (trimmedLen > 500) {
      setValidationError('Lý do từ chối không được vượt quá 500 ký tự.');
      return;
    }
    setValidationError(null);
    try {
      setSubmitting(true);
      await onConfirm(reason.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={() => !submitting && onClose()}>
      <div
        className={styles.modalContent}
        style={{ maxWidth: '520px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle} style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <XCircle size={20} color="#dc2626" />
            Từ chối phê duyệt điểm đến
          </div>
          <button
            type="button"
            className={styles.btnCloseModal}
            onClick={() => !submitting && onClose()}
            disabled={submitting}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <p style={{ margin: 0, fontSize: '0.92rem', color: '#334155', lineHeight: 1.5 }}>
              Vui lòng nhập lý do từ chối kiểm duyệt cho địa điểm{' '}
              <strong style={{ color: '#0f172a' }}>{destinationName}</strong>:
            </p>

            <div>
              <textarea
                rows={4}
                required
                minLength={10}
                maxLength={500}
                placeholder="Ví dụ: Hình ảnh minh họa chưa rõ nét, thiếu thông tin mô tả chi tiết và tọa độ GPS chưa chính xác..."
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '0.75rem 0.9rem',
                  borderRadius: '10px',
                  border: validationError ? '1px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  color: '#0f172a',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '0.35rem',
                  fontSize: '0.78rem',
                  color: trimmedLen > 0 && trimmedLen < 10 ? '#dc2626' : '#64748b',
                }}
              >
                <span>Bắt buộc từ 10 đến 500 ký tự</span>
                <span>{trimmedLen} / 500 ký tự</span>
              </div>
              {validationError && (
                <p style={{ color: '#dc2626', fontSize: '0.82rem', fontWeight: 600, margin: '0.4rem 0 0 0' }}>
                  {validationError}
                </p>
              )}
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={onClose}
              disabled={submitting}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting || !isValid}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: isValid ? '#dc2626' : '#fca5a5',
                color: '#ffffff',
                border: 'none',
                padding: '0.6rem 1.15rem',
                borderRadius: '10px',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: submitting || !isValid ? 'not-allowed' : 'pointer',
              }}
            >
              <XCircle size={16} />
              {submitting ? 'Đang gửi...' : 'Xác nhận từ chối'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
  // STATE: DESTINATIONS (TV1)
  // ─────────────────────────────────────────────────────────────────────────
  const [items, setItems] = useState<DestinationSummary[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(20);
  const [stats, setStats] = useState<ModerationStats>({
    total: 0,
    draft: 0,
    published: 0,
    rejected: 0,
  });
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

  // Reject Reason Modal Target (P1-4)
  const [rejectTarget, setRejectTarget] = useState<{ id: string; name: string } | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / size));

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

  // 1. Fetch Stats
  const fetchStats = useCallback(async () => {
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
  }, []);

  // 2. Fetch Moderation Queue
  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const apiBase = getApiBase();
      const params = new URLSearchParams({
        status: statusFilter,
        page: String(page),
        size: String(size),
      });
      if (searchKeyword.trim()) {
        params.set('keyword', searchKeyword.trim());
        params.set('q', searchKeyword.trim());
      }
      if (selectedProvince) params.set('province', selectedProvince);

      const res = await fetch(`${apiBase}/admin/destinations?${params.toString()}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          throw new Error(
            'Bạn không có quyền truy cập hàng đợi kiểm duyệt (yêu cầu vai trò ADMIN hoặc MODERATOR)'
          );
        }
        throw new Error(`Lỗi tải dữ liệu: HTTP ${res.status}`);
      }

      const data = await res.json();
      setItems(data.items || []);
      setTotalCount(data.total !== undefined ? data.total : data.items ? data.items.length : 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể kết nối đến máy chủ';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, size, searchKeyword, selectedProvince]);

  useEffect(() => {
    if (hubTab === 'DESTINATIONS') {
      fetchQueue();
      fetchStats();
    }
  }, [hubTab, fetchQueue, fetchStats]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
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

  // 5. Reject Action with Reason (P1-4)
  const handleConfirmRejectWithReason = async (reason: string) => {
    if (!rejectTarget) return;
    const { id, name } = rejectTarget;
    try {
      setActionInProgressId(id);
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/admin/destinations/${id}/reject`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ note: reason }),
      });

      if (!res.ok) {
        throw new Error(`Từ chối thất bại: HTTP ${res.status}`);
      }

      const updatedDetail: DestinationDetail = await res.json().catch(() => null);

      showToast(`Đã từ chối kiểm duyệt điểm đến: "${name}"`, 'success');
      setRejectTarget(null);
      if (selectedDest && selectedDest.id === id) {
        if (updatedDetail) {
          setSelectedDest(updatedDetail);
        } else {
          setSelectedDest(null);
        }
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

  // ─────────────────────────────────────────────────────────────────────────
  // STATE: COMMUNITY REPORTS (TV4)
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

      {/* ════════ VIEW 1: DESTINATIONS MODERATION (TV1) ════════ */}
      {hubTab === 'DESTINATIONS' && (
        <>
          {/* 1. Header Section */}
          <div className={styles.headerRow}>
            <div className={styles.titleArea}>
              <div className={styles.cloudPill}>
                <span className={styles.cloudDot} />
                Hàng đợi kiểm duyệt (FR-ADM-03)
              </div>
              <h1>Kiểm duyệt Điểm đến Du lịch {totalCount > 0 ? `(${totalCount})` : ''}</h1>
              <p className={styles.subtitle}>
                Thẩm định thông tin địa danh, xác minh giờ mở cửa, giá vé và kiểm duyệt chất lượng nội
                dung trước khi xuất bản rộng rãi cho cộng đồng du lịch.
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
                onClick={() => {
                  setStatusFilter('DRAFT');
                  setPage(0);
                }}
              >
                <Clock size={15} />
                Chờ duyệt
                <span className={styles.tabBadge}>{stats.draft}</span>
              </button>

              <button
                type="button"
                className={`${styles.tabBtn} ${
                  statusFilter === 'PUBLISHED' ? styles.tabBtnActive : ''
                }`}
                onClick={() => {
                  setStatusFilter('PUBLISHED');
                  setPage(0);
                }}
              >
                <CheckCircle2 size={15} />
                Đã xuất bản
                <span className={styles.tabBadge}>{stats.published}</span>
              </button>

              <button
                type="button"
                className={`${styles.tabBtn} ${statusFilter === 'REJECTED' ? styles.tabBtnActive : ''}`}
                onClick={() => {
                  setStatusFilter('REJECTED');
                  setPage(0);
                }}
              >
                <XCircle size={15} />
                Đã từ chối
                <span className={styles.tabBadge}>{stats.rejected}</span>
              </button>

              <button
                type="button"
                className={`${styles.tabBtn} ${statusFilter === 'ALL' ? styles.tabBtnActive : ''}`}
                onClick={() => {
                  setStatusFilter('ALL');
                  setPage(0);
                }}
              >
                <Layers size={15} />
                Tất cả
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
                  onChange={(e) => {
                    setSearchKeyword(e.target.value);
                    setPage(0);
                  }}
                  className={styles.searchInput}
                />
              </div>

              <select
                value={selectedProvince}
                onChange={(e) => {
                  setSelectedProvince(e.target.value);
                  setPage(0);
                }}
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
                <Inbox size={40} color="#64748b" strokeWidth={1.75} />
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
              <>
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
                                        color: '#94a3b8',
                                      }}
                                    >
                                      <MapPin size={20} strokeWidth={1.75} />
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
                              <span
                                className={item.priceMin === 0 ? styles.freePrice : styles.priceText}
                              >
                                {formatPrice(item.priceMin, item.priceMax)}
                              </span>
                            </td>

                            <td>
                              {isDraft && (
                                <span className={`${styles.statusBadge} ${styles.statusDraft}`}>
                                  <Clock size={13} />
                                  Chờ duyệt
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
                              {!isDraft && !isPublished && !isRejected && (
                                <span className={styles.statusBadge}>{item.status}</span>
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
                                    onClick={() => setRejectTarget({ id: item.id, name: item.name })}
                                    disabled={isActioning}
                                    title="Từ chối nội dung kèm lý do"
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

                <PaginationBar
                  page={page}
                  totalPages={totalPages}
                  size={size}
                  total={totalCount}
                  onPageChange={(newPage) => setPage(newPage)}
                  onSizeChange={(newSize) => {
                    setSize(newSize);
                    setPage(0);
                  }}
                />
              </>
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

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div>
                      <h2
                        style={{
                          fontSize: '1.4rem',
                          fontWeight: 800,
                          color: '#0f172a',
                          margin: '0 0 0.35rem 0',
                        }}
                      >
                        {selectedDest.name}
                      </h2>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          color: '#64748b',
                          fontSize: '0.85rem',
                        }}
                      >
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
                        <span className={`${styles.statusBadge} ${styles.statusDraft}`}>
                          <Clock size={13} /> Chờ duyệt
                        </span>
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

                  {/* Display Rejection Reason if present (P1-4) */}
                  {selectedDest.rejectionReason && (
                    <div
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: '12px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#991b1b',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          marginBottom: '0.25rem',
                        }}
                      >
                        Lý do từ chối kiểm duyệt:
                      </div>
                      <div style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
                        {selectedDest.rejectionReason}
                      </div>
                    </div>
                  )}

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
                      onClick={() =>
                        setRejectTarget({ id: selectedDest.id, name: selectedDest.name })
                      }
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

          {/* 6. Reject Reason Modal (P1-4) */}
          {rejectTarget && (
            <RejectReasonModal
              destinationName={rejectTarget.name}
              onClose={() => setRejectTarget(null)}
              onConfirm={handleConfirmRejectWithReason}
            />
          )}

          {/* 7. Toast Notification */}
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
        </>
      )}

      {/* ════════ VIEW 2: COMMUNITY REPORTS MODERATION (TV4) ════════ */}
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
