'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Inbox,
  Layers,
  MapPin,
  PlusCircle,
  RefreshCw,
  Search,
  Send,
  X,
  XCircle,
} from 'lucide-react';
import {
  approveAdminDestinationRequest,
  DestinationRequestItem,
  DestinationRequestStats,
  fetchAdminDestinationRequestDetail,
  fetchAdminDestinationRequests,
  fetchAdminDestinationRequestStats,
  rejectAdminDestinationRequest,
} from '@/services/destinationRequestApi';
import { PaginationBar } from '@/components/PaginationBar';
import styles from './moderation.module.css';

interface DestinationRequestsTabProps {
  onPendingCountChange?: (count: number) => void;
}

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('vi-VN');
  } catch {
    return iso;
  }
};

const formatPrice = (min?: number | null, max?: number | null) => {
  if (min == null && max == null) return '—';
  if ((min ?? 0) === 0 && (max ?? 0) === 0) return 'Miễn phí';
  if (min === max) return `${(min ?? 0).toLocaleString('vi-VN')} đ`;
  return `${(min ?? 0).toLocaleString('vi-VN')} – ${(max ?? 0).toLocaleString('vi-VN')} đ`;
};

export function DestinationRequestsTab({ onPendingCountChange }: DestinationRequestsTabProps) {
  const [items, setItems] = useState<DestinationRequestItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [stats, setStats] = useState<DestinationRequestStats>({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });

  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CREATE' | 'UPDATE'>('ALL');
  const [keyword, setKeyword] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedReq, setSelectedReq] = useState<DestinationRequestItem | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  // Editable overrides for CREATE
  const [editName, setEditName] = useState('');
  const [editProvince, setEditProvince] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');
  const [editPriceMin, setEditPriceMin] = useState('');
  const [editPriceMax, setEditPriceMax] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSourceUrl, setEditSourceUrl] = useState('');

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<{ id: string; title: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadStats = useCallback(async () => {
    try {
      const s = await fetchAdminDestinationRequestStats();
      setStats(s);
      onPendingCountChange?.(s.pending);
    } catch {
      // ignore background error
    }
  }, [onPendingCountChange]);

  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAdminDestinationRequests({
        status: statusFilter,
        requestType: typeFilter,
        keyword,
        page,
        size,
      });
      setItems(data.items || []);
      setTotalCount(data.total ?? 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách yêu cầu');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, keyword, page, size]);

  useEffect(() => {
    const id = queueMicrotask(() => {
      void loadQueue();
      void loadStats();
    });
    void id;
  }, [loadQueue, loadStats]);

  const handleOpenDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      const detail = await fetchAdminDestinationRequestDetail(id);
      setSelectedReq(detail);
      setEditName(detail.name ?? '');
      setEditProvince(detail.provinceName ?? '');
      setEditCategory(detail.categoryName ?? '');
      setEditLat(detail.latitude != null ? String(detail.latitude) : '');
      setEditLng(detail.longitude != null ? String(detail.longitude) : '');
      setEditPriceMin(detail.priceMin != null ? String(detail.priceMin) : '');
      setEditPriceMax(detail.priceMax != null ? String(detail.priceMax) : '');
      setEditDesc(detail.description ?? '');
      setEditSourceUrl(detail.sourceUrl ?? '');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Không thể tải chi tiết yêu cầu', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedReq) return;
    try {
      setActionBusy(true);
      const overrides =
        selectedReq.requestType === 'CREATE'
          ? {
              name: editName.trim() || undefined,
              provinceName: editProvince.trim() || undefined,
              categoryName: editCategory.trim() || undefined,
              latitude: editLat.trim() ? Number(editLat) : undefined,
              longitude: editLng.trim() ? Number(editLng) : undefined,
              priceMin: editPriceMin.trim() ? Number(editPriceMin) : undefined,
              priceMax: editPriceMax.trim() ? Number(editPriceMax) : undefined,
              description: editDesc.trim() || undefined,
              sourceUrl: editSourceUrl.trim() || undefined,
            }
          : undefined;

      await approveAdminDestinationRequest(selectedReq.id, overrides);
      showToast(
        selectedReq.requestType === 'CREATE'
          ? `Đã duyệt & thêm địa điểm "${editName || selectedReq.name}" vào hệ thống!`
          : `Đã duyệt & cập nhật địa điểm "${selectedReq.targetDestinationName || selectedReq.name}"!`,
        'success',
      );
      setSelectedReq(null);
      void loadQueue();
      void loadStats();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Phê duyệt thất bại', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget) return;
    const trimmed = rejectReason.trim();
    if (trimmed.length < 10 || trimmed.length > 500) {
      setRejectError('Lý do từ chối phải có độ dài từ 10 đến 500 ký tự.');
      return;
    }
    try {
      setActionBusy(true);
      await rejectAdminDestinationRequest(rejectTarget.id, trimmed);
      showToast(`Đã từ chối yêu cầu "${rejectTarget.title}"`, 'success');
      setRejectTarget(null);
      setRejectReason('');
      setRejectError(null);
      if (selectedReq?.id === rejectTarget.id) {
        setSelectedReq(null);
      }
      void loadQueue();
      void loadStats();
    } catch (err: unknown) {
      setRejectError(err instanceof Error ? err.message : 'Từ chối thất bại');
    } finally {
      setActionBusy(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / size));

  const diffRows =
    selectedReq?.requestType === 'UPDATE'
      ? [
          {
            label: 'Tên địa điểm',
            current: selectedReq.currentDestination?.name ?? '—',
            proposed: selectedReq.name,
          },
          {
            label: 'Tỉnh / Thành',
            current: selectedReq.currentDestination?.province ?? '—',
            proposed: selectedReq.provinceName,
          },
          {
            label: 'Danh mục',
            current: selectedReq.currentDestination?.category ?? '—',
            proposed: selectedReq.categoryName,
          },
          {
            label: 'Tọa độ GPS',
            current:
              selectedReq.currentDestination?.latitude != null &&
              selectedReq.currentDestination?.longitude != null
                ? `${selectedReq.currentDestination.latitude}, ${selectedReq.currentDestination.longitude}`
                : '—',
            proposed:
              selectedReq.latitude != null && selectedReq.longitude != null
                ? `${selectedReq.latitude}, ${selectedReq.longitude}`
                : null,
          },
          {
            label: 'Giá vé',
            current: formatPrice(
              selectedReq.currentDestination?.priceMin,
              selectedReq.currentDestination?.priceMax,
            ),
            proposed:
              selectedReq.priceMin != null || selectedReq.priceMax != null
                ? formatPrice(selectedReq.priceMin, selectedReq.priceMax)
                : null,
          },
          {
            label: 'Mô tả',
            current: selectedReq.currentDestination?.description ?? '—',
            proposed: selectedReq.description,
          },
          {
            label: 'Nguồn tham khảo',
            current: selectedReq.currentDestination?.sourceUrl ?? '—',
            proposed: selectedReq.sourceUrl,
          },
        ]
      : [];

  return (
    <>
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <div className={styles.cloudPill}>
            <span className={styles.cloudDot} />
            Đóng góp từ cộng đồng
          </div>
          <h1>Yêu cầu thêm & cập nhật địa điểm {totalCount > 0 ? `(${totalCount})` : ''}</h1>
          <p className={styles.subtitle}>
            Kiểm duyệt đề xuất địa điểm còn thiếu và yêu cầu chỉnh sửa thông tin từ người dùng trước
            khi áp dụng vào dữ liệu công khai.
          </p>
        </div>

        <div className={styles.actionArea}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => {
              void loadQueue();
              void loadStats();
            }}
          >
            <RefreshCw size={16} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statIconBox} style={{ background: '#fef3c7', color: '#d97706' }}>
            <Clock size={24} />
          </div>
          <div>
            <div className={styles.statValue}>{stats.pending}</div>
            <div className={styles.statLabel}>Chờ duyệt (PENDING)</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIconBox} style={{ background: '#dcfce7', color: '#16a34a' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className={styles.statValue}>{stats.approved}</div>
            <div className={styles.statLabel}>Đã áp dụng (APPROVED)</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIconBox} style={{ background: '#fee2e2', color: '#dc2626' }}>
            <XCircle size={24} />
          </div>
          <div>
            <div className={styles.statValue}>{stats.rejected}</div>
            <div className={styles.statLabel}>Đã từ chối (REJECTED)</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIconBox} style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <Send size={24} />
          </div>
          <div>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Tổng yêu cầu</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.tabsRow}>
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((st) => {
            const labelMap = {
              PENDING: 'Chờ duyệt',
              APPROVED: 'Đã duyệt',
              REJECTED: 'Đã từ chối',
              ALL: 'Tất cả',
            };
            const countMap = {
              PENDING: stats.pending,
              APPROVED: stats.approved,
              REJECTED: stats.rejected,
              ALL: stats.total,
            };
            return (
              <button
                key={st}
                type="button"
                className={`${styles.tabBtn} ${statusFilter === st ? styles.tabBtnActive : ''}`}
                onClick={() => {
                  setStatusFilter(st);
                  setPage(0);
                }}
              >
                {st === 'PENDING' && <Clock size={15} />}
                {st === 'APPROVED' && <CheckCircle2 size={15} />}
                {st === 'REJECTED' && <XCircle size={15} />}
                {st === 'ALL' && <Layers size={15} />}
                {labelMap[st]}
                <span className={styles.tabBadge}>{countMap[st]}</span>
              </button>
            );
          })}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(0);
            void loadQueue();
          }}
          className={styles.searchInputsRow}
        >
          <div className={styles.searchInputWrapper}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Tìm theo tên địa điểm, tỉnh thành hoặc ghi chú..."
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(0);
              }}
              className={styles.searchInput}
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as 'ALL' | 'CREATE' | 'UPDATE');
              setPage(0);
            }}
            className={styles.selectInput}
          >
            <option value="ALL">Tất cả loại yêu cầu</option>
            <option value="CREATE">Thêm mới địa điểm</option>
            <option value="UPDATE">Cập nhật địa điểm</option>
          </select>
          <button type="submit" className={styles.btnSecondary}>
            Lọc
          </button>
        </form>
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.feedbackContainer}>
            <div className={styles.spinner} />
            <p style={{ color: '#64748b', fontWeight: 600 }}>Đang tải yêu cầu...</p>
          </div>
        ) : error ? (
          <div className={styles.feedbackContainer}>
            <AlertCircle size={48} color="#ef4444" />
            <div className={styles.emptyTitle}>Không thể tải dữ liệu</div>
            <p className={styles.emptyDesc}>{error}</p>
            <button type="button" className={styles.btnSecondary} onClick={loadQueue}>
              Thử lại
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className={styles.feedbackContainer}>
            <Inbox size={40} color="#64748b" />
            <div className={styles.emptyTitle}>Không có yêu cầu nào</div>
            <p className={styles.emptyDesc}>
              Chưa có yêu cầu đóng góp địa điểm nào khớp với bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.moderationTable}>
                <thead>
                  <tr>
                    <th>Loại</th>
                    <th>Địa điểm đề xuất</th>
                    <th>Người gửi & Thời gian</th>
                    <th>Ghi chú</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const displayTitle =
                      item.name || item.targetDestinationName || 'Địa điểm chưa đặt tên';
                    return (
                      <tr key={item.id}>
                        <td>
                          {item.requestType === 'CREATE' ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                background: '#e0f2fe',
                                color: '#0369a1',
                                padding: '4px 10px',
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            >
                              <PlusCircle size={13} />
                              Thêm mới
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                background: '#fef3c7',
                                color: '#b45309',
                                padding: '4px 10px',
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            >
                              ✏️ Cập nhật
                            </span>
                          )}
                        </td>
                        <td>
                          <div className={styles.destName}>{displayTitle}</div>
                          <div className={styles.destMeta}>
                            <MapPin size={13} />
                            {item.provinceName || '—'}{' '}
                            {item.categoryName ? `· ${item.categoryName}` : ''}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13.5 }}>
                            {item.submittedByName || item.submittedBy.slice(0, 8)}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>
                            {formatDate(item.createdAt)}
                          </div>
                        </td>
                        <td style={{ maxWidth: 240 }}>
                          <span style={{ fontSize: 13, color: '#334155' }}>
                            {item.note || '—'}
                          </span>
                        </td>
                        <td>
                          {item.status === 'PENDING' && (
                            <span className={`${styles.statusBadge} ${styles.statusDraft}`}>
                              <Clock size={13} /> Chờ duyệt
                            </span>
                          )}
                          {item.status === 'APPROVED' && (
                            <span className={`${styles.statusBadge} ${styles.statusPublished}`}>
                              <CheckCircle2 size={13} /> Đã duyệt
                            </span>
                          )}
                          {item.status === 'REJECTED' && (
                            <span className={`${styles.statusBadge} ${styles.statusRejected}`}>
                              <XCircle size={13} /> Từ chối
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className={styles.actionGroup} style={{ justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className={styles.btnDetail}
                              onClick={() => void handleOpenDetail(item.id)}
                              disabled={detailLoading}
                            >
                              <Eye size={15} />
                              Xem & Duyệt
                            </button>
                            {item.status === 'PENDING' && (
                              <button
                                type="button"
                                className={styles.btnReject}
                                onClick={() => {
                                  setRejectTarget({ id: item.id, title: displayTitle });
                                  setRejectReason('');
                                  setRejectError(null);
                                }}
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
              onPageChange={setPage}
              onSizeChange={(s) => {
                setSize(s);
                setPage(0);
              }}
            />
          </>
        )}
      </div>

      {/* Review Modal */}
      {selectedReq && (
        <div className={styles.modalOverlay} onClick={() => !actionBusy && setSelectedReq(null)}>
          <div
            className={styles.modalContent}
            style={{ maxWidth: 760 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                {selectedReq.requestType === 'CREATE'
                  ? 'Thẩm định đề xuất địa điểm mới'
                  : 'Đối chiếu yêu cầu cập nhật địa điểm'}
              </div>
              <button
                type="button"
                className={styles.btnCloseModal}
                onClick={() => !actionBusy && setSelectedReq(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '10px 14px',
                  fontSize: 13.5,
                  color: '#334155',
                }}
              >
                <div>
                  <strong>Người gửi:</strong> {selectedReq.submittedByName || selectedReq.submittedBy}{' '}
                  · <strong>Thời gian:</strong> {formatDate(selectedReq.createdAt)}
                </div>
                {selectedReq.note && (
                  <div style={{ marginTop: 4 }}>
                    <strong>Ghi chú:</strong> {selectedReq.note}
                  </div>
                )}
                {selectedReq.rejectionReason && (
                  <div style={{ marginTop: 4, color: '#b91c1c' }}>
                    <strong>Lý do từ chối:</strong> {selectedReq.rejectionReason}
                  </div>
                )}
              </div>

              {selectedReq.requestType === 'CREATE' ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <label style={labelStyle}>
                      Tên địa điểm
                      <input
                        style={inputStyle}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        disabled={selectedReq.status !== 'PENDING'}
                      />
                    </label>
                    <label style={labelStyle}>
                      Tỉnh / Thành
                      <input
                        style={inputStyle}
                        value={editProvince}
                        onChange={(e) => setEditProvince(e.target.value)}
                        disabled={selectedReq.status !== 'PENDING'}
                      />
                    </label>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <label style={labelStyle}>
                      Danh mục
                      <input
                        style={inputStyle}
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        disabled={selectedReq.status !== 'PENDING'}
                      />
                    </label>
                    <label style={labelStyle}>
                      Vĩ độ
                      <input
                        style={inputStyle}
                        type="number"
                        step="any"
                        value={editLat}
                        onChange={(e) => setEditLat(e.target.value)}
                        disabled={selectedReq.status !== 'PENDING'}
                      />
                    </label>
                    <label style={labelStyle}>
                      Kinh độ
                      <input
                        style={inputStyle}
                        type="number"
                        step="any"
                        value={editLng}
                        onChange={(e) => setEditLng(e.target.value)}
                        disabled={selectedReq.status !== 'PENDING'}
                      />
                    </label>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <label style={labelStyle}>
                      Giá vé tối thiểu
                      <input
                        style={inputStyle}
                        type="number"
                        value={editPriceMin}
                        onChange={(e) => setEditPriceMin(e.target.value)}
                        disabled={selectedReq.status !== 'PENDING'}
                      />
                    </label>
                    <label style={labelStyle}>
                      Giá vé tối đa
                      <input
                        style={inputStyle}
                        type="number"
                        value={editPriceMax}
                        onChange={(e) => setEditPriceMax(e.target.value)}
                        disabled={selectedReq.status !== 'PENDING'}
                      />
                    </label>
                    <label style={labelStyle}>
                      Nguồn tham khảo
                      <input
                        style={inputStyle}
                        value={editSourceUrl}
                        onChange={(e) => setEditSourceUrl(e.target.value)}
                        disabled={selectedReq.status !== 'PENDING'}
                      />
                    </label>
                  </div>
                  <label style={labelStyle}>
                    Mô tả
                    <textarea
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical' }}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      disabled={selectedReq.status !== 'PENDING'}
                    />
                  </label>
                  {selectedReq.imageUrls && selectedReq.imageUrls.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
                        Hình ảnh đề xuất:
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {selectedReq.imageUrls.map((url, idx) => (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            key={idx}
                            src={url}
                            alt={`Preview ${idx}`}
                            style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8 }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>
                    So sánh Hiện tại vs Đề xuất cập nhật (Diff)
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px', borderBottom: '1px solid #cbd5e1' }}>Trường</th>
                        <th style={{ padding: '8px 10px', borderBottom: '1px solid #cbd5e1' }}>Hiện tại</th>
                        <th style={{ padding: '8px 10px', borderBottom: '1px solid #cbd5e1' }}>Đề xuất mới</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diffRows.map((row) => {
                        const changed =
                          row.proposed != null &&
                          String(row.proposed).trim() !== '' &&
                          String(row.proposed).trim() !== String(row.current).trim();
                        return (
                          <tr
                            key={row.label}
                            style={{
                              background: changed ? '#fefce8' : 'transparent',
                              borderBottom: '1px solid #e2e8f0',
                            }}
                          >
                            <td style={{ padding: '8px 10px', fontWeight: 600 }}>{row.label}</td>
                            <td style={{ padding: '8px 10px', color: '#475569' }}>{row.current}</td>
                            <td
                              style={{
                                padding: '8px 10px',
                                fontWeight: changed ? 700 : 400,
                                color: changed ? '#b45309' : '#94a3b8',
                              }}
                            >
                              {row.proposed != null && String(row.proposed).trim() !== ''
                                ? row.proposed
                                : '(Giữ nguyên)'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setSelectedReq(null)}
                disabled={actionBusy}
              >
                Đóng
              </button>
              {selectedReq.status === 'PENDING' && (
                <>
                  <button
                    type="button"
                    className={styles.btnReject}
                    disabled={actionBusy}
                    onClick={() => {
                      setRejectTarget({
                        id: selectedReq.id,
                        title:
                          selectedReq.name ||
                          selectedReq.targetDestinationName ||
                          'Yêu cầu địa điểm',
                      });
                      setRejectReason('');
                      setRejectError(null);
                    }}
                  >
                    <XCircle size={16} />
                    Từ chối
                  </button>
                  <button
                    type="button"
                    className={styles.btnApprove}
                    disabled={actionBusy}
                    onClick={() => void handleApprove()}
                  >
                    <CheckCircle2 size={16} />
                    {actionBusy
                      ? 'Đang xử lý...'
                      : selectedReq.requestType === 'CREATE'
                        ? 'Duyệt & Thêm vào hệ thống'
                        : 'Duyệt & Cập nhật'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectTarget && (
        <div className={styles.modalOverlay} onClick={() => !actionBusy && setRejectTarget(null)}>
          <div
            className={styles.modalContent}
            style={{ maxWidth: 520 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle} style={{ color: '#dc2626', display: 'flex', gap: 8 }}>
                <XCircle size={20} color="#dc2626" />
                Từ chối yêu cầu từ người dùng
              </div>
              <button
                type="button"
                className={styles.btnCloseModal}
                onClick={() => !actionBusy && setRejectTarget(null)}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleConfirmReject}>
              <div className={styles.modalBody}>
                <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
                  Nhập lý do từ chối cho <strong>{rejectTarget.title}</strong> (10–500 ký tự):
                </p>
                <textarea
                  rows={4}
                  required
                  minLength={10}
                  maxLength={500}
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    if (rejectError) setRejectError(null);
                  }}
                  placeholder="Ví dụ: Tọa độ GPS không khớp với địa chỉ hoặc thiếu nguồn xác thực..."
                  style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
                />
                {rejectError && (
                  <p style={{ color: '#dc2626', fontSize: 13, fontWeight: 600, margin: 0 }}>
                    {rejectError}
                  </p>
                )}
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setRejectTarget(null)}
                  disabled={actionBusy}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className={styles.btnReject}
                  disabled={actionBusy || rejectReason.trim().length < 10}
                >
                  <XCircle size={16} />
                  {actionBusy ? 'Đang gửi...' : 'Xác nhận từ chối'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`${styles.toast} ${
            toast.type === 'success' ? styles.toastSuccess : styles.toastError
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'grid',
  gap: 4,
  fontSize: 12.5,
  fontWeight: 700,
  color: '#334155',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  fontSize: 13.5,
  color: '#0f172a',
  boxSizing: 'border-box',
};
