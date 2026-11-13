'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ScanSearch,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ImageOff,
  Clock,
  RefreshCw,
  RotateCcw,
  Eye,
  Check,
  SkipForward,
  ExternalLink,
  MapPin,
  Tag,
  LayoutGrid,
  Table as TableIcon,
  History,
  Pause,
  Play,
  Upload,
  ShieldCheck,
  Database,
  Layers,
  X,
} from 'lucide-react';
import { PaginationBar } from '@/components/PaginationBar';
import { getCloudImageUrl } from '@/utils/cloudImage';
import { clearViewedDestinationsCache } from '@/features/map-location/data/viewedDestinations';
import styles from './image-manager.module.css';

interface ImageCandidate {
  imageUrl: string;
  thumbnailUrl: string;
  title: string;
  sourceName: string;
  sourcePageUrl: string;
  license: string;
  confidence: number;
  matchReason: string;
  width?: number;
  height?: number;
}

interface DestinationImageAuditItem {
  destinationId: string;
  name: string;
  province: string;
  category: string;
  description?: string;
  latitude?: number | null;
  longitude?: number | null;
  destinationStatus: string;
  currentImageUrl?: string | null;
  duplicateCount: number;
  auditStatus: string;
  issueReason: string;
  candidates: ImageCandidate[];
  selectedCandidateUrl?: string | null;
  selectedCandidateSource?: string | null;
  selectedCandidatePageUrl?: string | null;
  selectedCandidateLicense?: string | null;
  selectedCandidateConfidence?: number | null;
  previousImageUrl?: string | null;
  lastUpdatedBy?: string | null;
  lastUpdatedAt?: string | null;
  lastUpdateSource?: string | null;
}

interface AiImageStats {
  totalDestinations: number;
  validImages: number;
  missingImages: number;
  suspiciousImages: number;
  brokenImages: number;
  pendingApproval: number;
  updatedImages: number;
  uncheckedImages: number;
  noMatchFound: number;
  configuredProviders?: Record<string, boolean>;
}

interface ImageUpdateHistoryItem {
  id: string;
  destinationId: string;
  destinationName: string;
  province: string;
  action: string;
  previousImageUrl?: string | null;
  newImageUrl?: string | null;
  sourceName: string;
  confidence: number;
  performedBy: string;
  performedAt: string;
}

interface BatchJobState {
  type: 'SCAN' | 'FIND_IMAGES' | 'UPDATE_APPROVED';
  label: string;
  running: boolean;
  paused: boolean;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  remainingQueue: string[];
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
  'Quảng Ninh',
  'Quảng Bình',
  'Bình Định',
  'Bà Rịa - Vũng Tàu',
  'Cần Thơ',
];

export default function AiImageManagerPage() {
  const [items, setItems] = useState<DestinationImageAuditItem[]>([]);
  const [stats, setStats] = useState<AiImageStats>({
    totalDestinations: 0,
    validImages: 0,
    missingImages: 0,
    suspiciousImages: 0,
    brokenImages: 0,
    pendingApproval: 0,
    updatedImages: 0,
    uncheckedImages: 0,
    noMatchFound: 0,
  });
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(20);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & View Mode
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [provinceFilter, setProvinceFilter] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [viewMode, setViewMode] = useState<'TABLE' | 'GALLERY' | 'HISTORY'>('TABLE');
  const [verifyHttpOnScan, setVerifyHttpOnScan] = useState<boolean>(false);

  // Multi-selection for batch actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Per-row busy states
  const [busyRowIds, setBusyRowIds] = useState<Set<string>>(new Set());

  // Batch Job State (Scan All / Find Images / Update All Approved) with Pause/Resume
  const [batchJob, setBatchJob] = useState<BatchJobState | null>(null);
  const pauseSignalRef = useRef<boolean>(false);

  // Side-by-Side Comparison & Custom Search Modal
  const [previewItem, setPreviewItem] = useState<DestinationImageAuditItem | null>(null);
  const [customSearchQuery, setCustomSearchQuery] = useState<string>('');
  const [customImageUrl, setCustomImageUrl] = useState<string>('');
  const [modalBusy, setModalBusy] = useState<boolean>(false);
  const [uploadingToSupabase, setUploadingToSupabase] = useState<boolean>(false);

  // Audit History list
  const [historyItems, setHistoryItems] = useState<ImageUpdateHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

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

  const parseApiErrorMessage = async (res: Response, fallbackPrefix: string): Promise<string> => {
    let detailMsg = '';
    try {
      const errBody = await res.json();
      detailMsg = errBody?.detail || errBody?.message || errBody?.title || '';
      if (errBody?.code && !detailMsg.includes(errBody.code)) {
        detailMsg = detailMsg ? `[${errBody.code}] ${detailMsg}` : `[${errBody.code}]`;
      }
      if (errBody?.exceptionType && !detailMsg.includes(errBody.exceptionType)) {
        detailMsg = detailMsg ? `${detailMsg} (${errBody.exceptionType})` : errBody.exceptionType;
      }
    } catch {
      // Response body not JSON
    }
    return `${fallbackPrefix} (HTTP ${res.status}${detailMsg ? ` — ${detailMsg}` : ''})`;
  };

  const fetchPageData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const apiBase = getApiBase();
      const params = new URLSearchParams({
        status: statusFilter,
        page: String(page),
        size: String(size),
        limit: String(size),
      });
      if (keyword.trim()) params.set('keyword', keyword.trim());
      if (provinceFilter) params.set('province', provinceFilter);

      const res = await fetch(`${apiBase}/admin/destination-images?${params.toString()}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
        cache: 'no-store',
      });

      if (!res.ok) {
        const errMsg = await parseApiErrorMessage(res, 'Không thể tải dữ liệu AI Image Manager');
        throw new Error(errMsg);
      }

      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total ?? 0);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ Backend';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, size, keyword, provinceFilter]);

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/admin/destination-images/history?limit=100`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryItems(data || []);
      }
    } catch {
      // Ignore history fetch error
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPageData();
  }, [fetchPageData]);

  useEffect(() => {
    if (viewMode === 'HISTORY') {
      void fetchHistory();
    }
  }, [viewMode, fetchHistory]);

  const markRowBusy = (id: string, busy: boolean) => {
    setBusyRowIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const updateItemInState = (updated: DestinationImageAuditItem) => {
    setItems((prev) =>
      prev.map((it) => (it.destinationId === updated.destinationId ? updated : it))
    );
    if (previewItem && previewItem.destinationId === updated.destinationId) {
      setPreviewItem(updated);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SINGLE ITEM ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  const handleSearchSingle = async (id: string, customQuery?: string) => {
    markRowBusy(id, true);
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/admin/destination-images/${id}/search`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(customQuery ? { query: customQuery } : {}),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated: DestinationImageAuditItem = await res.json();
      updateItemInState(updated);
      if (updated.candidates && updated.candidates.length > 0) {
        showToast(
          `Đã tìm thấy ${updated.candidates.length} ảnh đề xuất cho "${updated.name}"`,
          'success'
        );
      } else {
        showToast(`Chưa tìm thấy ảnh có độ tin cậy cao cho "${updated.name}"`, 'error');
      }
      void fetchPageData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi khi tìm kiếm ảnh', 'error');
    } finally {
      markRowBusy(id, false);
    }
  };

  const handleSelectCandidate = async (
    item: DestinationImageAuditItem,
    candidate: ImageCandidate,
    approvedReady = true
  ) => {
    markRowBusy(item.destinationId, true);
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/admin/destination-images/${item.destinationId}/select`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          candidateUrl: candidate.imageUrl,
          sourceName: candidate.sourceName,
          sourcePageUrl: candidate.sourcePageUrl,
          license: candidate.license,
          confidence: candidate.confidence,
          approvedReady,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated: DestinationImageAuditItem = await res.json();
      updateItemInState(updated);
    } catch {
      showToast('Không thể chọn ảnh đề xuất', 'error');
    } finally {
      markRowBusy(item.destinationId, false);
    }
  };

  const handleApplySingle = async (
    item: DestinationImageAuditItem,
    overrideUrl?: string,
    overrideSource?: string,
    overrideConfidence?: number
  ) => {
    markRowBusy(item.destinationId, true);
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/admin/destination-images/${item.destinationId}/apply`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          imageUrl: overrideUrl || item.selectedCandidateUrl,
          sourceName: overrideSource || item.selectedCandidateSource,
          sourcePageUrl: item.selectedCandidatePageUrl,
          license: item.selectedCandidateLicense,
          confidence: overrideConfidence ?? item.selectedCandidateConfidence ?? 88,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.detail || `Cập nhật thất bại (HTTP ${res.status})`);
      }
      const updated: DestinationImageAuditItem = await res.json();
      updateItemInState(updated);
      clearViewedDestinationsCache(item.destinationId);
      showToast(`Đã cập nhật ảnh mới cho "${item.name}" thành công`, 'success');
      void fetchPageData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi khi cập nhật ảnh', 'error');
    } finally {
      markRowBusy(item.destinationId, false);
    }
  };

  const handleRollbackSingle = async (destinationId: string, name: string) => {
    markRowBusy(destinationId, true);
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/admin/destination-images/${destinationId}/rollback`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.detail || `Rollback thất bại (HTTP ${res.status})`);
      }
      const updated: DestinationImageAuditItem = await res.json();
      updateItemInState(updated);
      clearViewedDestinationsCache(destinationId);
      showToast(`Đã khôi phục (Rollback) ảnh cũ cho "${name}"`, 'success');
      void fetchPageData();
      if (viewMode === 'HISTORY') void fetchHistory();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Không thể khôi phục ảnh cũ', 'error');
    } finally {
      markRowBusy(destinationId, false);
    }
  };

  const handleSkipSingle = async (destinationId: string, name: string) => {
    markRowBusy(destinationId, true);
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/admin/destination-images/${destinationId}/skip`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated: DestinationImageAuditItem = await res.json();
      updateItemInState(updated);
      showToast(`Đã bỏ qua địa điểm "${name}"`, 'success');
      void fetchPageData();
    } catch {
      showToast('Không thể bỏ qua địa điểm', 'error');
    } finally {
      markRowBusy(destinationId, false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // BATCH OPERATIONS WITH CONCURRENCY CONTROL, PAUSE & RESUME
  // ─────────────────────────────────────────────────────────────────────────

  const executeBatchQueue = async (
    type: BatchJobState['type'],
    label: string,
    queue: string[],
    initialProcessed = 0,
    initialSucceeded = 0,
    initialFailed = 0,
    totalCount = queue.length
  ) => {
    if (queue.length === 0) {
      showToast('Không có địa điểm nào cần xử lý trong hàng đợi.', 'error');
      return;
    }

    pauseSignalRef.current = false;
    const apiBase = getApiBase();
    const chunkSize = type === 'SCAN' ? 40 : type === 'FIND_IMAGES' ? 6 : 20;

    let processed = initialProcessed;
    let succeeded = initialSucceeded;
    let failed = initialFailed;
    let remaining = [...queue];

    setBatchJob({
      type,
      label,
      running: true,
      paused: false,
      total: totalCount,
      processed,
      succeeded,
      failed,
      remainingQueue: remaining,
    });

    while (remaining.length > 0) {
      if (pauseSignalRef.current) {
        setBatchJob((prev) =>
          prev
            ? {
                ...prev,
                running: false,
                paused: true,
                remainingQueue: remaining,
              }
            : null
        );
        showToast('Đã tạm dừng tiến trình. Bạn có thể nhấn Tiếp tục bất cứ lúc nào.', 'success');
        void fetchPageData();
        return;
      }

      const chunk = remaining.slice(0, chunkSize);
      remaining = remaining.slice(chunkSize);

      try {
        if (type === 'SCAN') {
          const res = await fetch(`${apiBase}/admin/destination-images/scan`, {
            method: 'POST',
            headers: getAuthHeaders(),
            credentials: 'include',
            body: JSON.stringify({
              destinationIds: chunk,
              verifyHttp: verifyHttpOnScan,
            }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const scanned: DestinationImageAuditItem[] = await res.json();
          const validCnt = scanned.filter(
            (s) => s.auditStatus === 'VALID_IMAGE' || s.auditStatus === 'UPDATED'
          ).length;
          const issueCnt = scanned.length - validCnt;
          processed += chunk.length;
          succeeded += validCnt;
          failed += issueCnt;
          if (scanned.length > 0) {
            const byId = new Map(scanned.map((s) => [s.destinationId, s]));
            setItems((prev) => prev.map((it) => byId.get(it.destinationId) || it));
          }
        } else if (type === 'FIND_IMAGES') {
          const res = await fetch(`${apiBase}/admin/destination-images/search-batch`, {
            method: 'POST',
            headers: getAuthHeaders(),
            credentials: 'include',
            body: JSON.stringify({ destinationIds: chunk }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const results: DestinationImageAuditItem[] = await res.json();
          const matched = results.filter(
            (r) =>
              r.auditStatus === 'UPDATED' ||
              r.auditStatus === 'PENDING_APPROVAL' ||
              r.auditStatus === 'APPROVED_READY' ||
              (r.candidates && r.candidates.length > 0)
          ).length;
          processed += chunk.length;
          succeeded += matched;
          failed += Math.max(0, chunk.length - matched);
          if (results.length > 0) {
            const byId = new Map(results.map((r) => [r.destinationId, r]));
            setItems((prev) => prev.map((it) => byId.get(it.destinationId) || it));
            clearViewedDestinationsCache();
          }
        } else if (type === 'UPDATE_APPROVED') {
          const res = await fetch(`${apiBase}/admin/destination-images/apply-batch`, {
            method: 'POST',
            headers: getAuthHeaders(),
            credentials: 'include',
            body: JSON.stringify({ destinationIds: chunk }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const updated: DestinationImageAuditItem[] = await res.json();
          processed += chunk.length;
          succeeded += updated.length;
          failed += Math.max(0, chunk.length - updated.length);
          if (updated.length > 0) {
            const byId = new Map(updated.map((u) => [u.destinationId, u]));
            setItems((prev) => prev.map((it) => byId.get(it.destinationId) || it));
          }
          clearViewedDestinationsCache();
        }

        // Live refresh stats counters after each chunk
        fetch(`${apiBase}/admin/destination-images/stats`, {
          headers: getAuthHeaders(),
          credentials: 'include',
          cache: 'no-store',
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((liveStats) => {
            if (liveStats) setStats(liveStats);
          })
          .catch(() => {});
      } catch {
        processed += chunk.length;
        failed += chunk.length;
      }

      setBatchJob({
        type,
        label,
        running: remaining.length > 0,
        paused: false,
        total: totalCount,
        processed,
        succeeded,
        failed,
        remainingQueue: remaining,
      });
    }

    await fetchPageData();
    showToast(`Hoàn tất ${label}: Đã xử lý ${processed}/${totalCount} địa điểm.`, 'success');
  };

  const handleStartScanAll = async () => {
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/admin/destination-images/target-ids?mode=ALL`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Không lấy được danh sách ID địa điểm');
      const allIds: string[] = await res.json();
      await executeBatchQueue('SCAN', 'Quét toàn bộ cơ sở dữ liệu (Scan All)', allIds);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi khởi chạy Scan All', 'error');
    }
  };

  const handleStartFindImages = async () => {
    try {
      let targetIds: string[] = [];
      if (selectedIds.size > 0) {
        targetIds = Array.from(selectedIds);
      } else {
        const apiBase = getApiBase();
        const params = new URLSearchParams({ mode: 'NEEDS_ATTENTION' });
        if (provinceFilter) params.set('province', provinceFilter);
        if (keyword.trim()) params.set('keyword', keyword.trim());
        const res = await fetch(
          `${apiBase}/admin/destination-images/target-ids?${params.toString()}`,
          {
            headers: getAuthHeaders(),
            credentials: 'include',
          }
        );
        if (!res.ok) throw new Error('Không lấy được danh sách địa điểm cần tìm ảnh');
        targetIds = await res.json();
      }
      await executeBatchQueue(
        'FIND_IMAGES',
        'Tự động tìm kiếm ảnh đề xuất (Find Images)',
        targetIds
      );
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi khởi chạy tìm ảnh', 'error');
    }
  };

  const handleApproveSelected = async () => {
    const targets = items.filter(
      (it) =>
        selectedIds.has(it.destinationId) &&
        (it.selectedCandidateUrl || (it.candidates && it.candidates.length > 0))
    );
    if (targets.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 địa điểm đã có ảnh đề xuất để duyệt.', 'error');
      return;
    }

    let count = 0;
    for (const item of targets) {
      const candidate =
        item.candidates.find((c) => c.imageUrl === item.selectedCandidateUrl) ||
        item.candidates[0];
      if (candidate) {
        await handleSelectCandidate(item, candidate, true);
        count++;
      }
    }
    setSelectedIds(new Set());
    await fetchPageData();
    showToast(`Đã đánh dấu duyệt ${count} địa điểm. Nhấn "Update All Approved" để áp dụng.`, 'success');
  };

  const handleStartUpdateAllApproved = async () => {
    try {
      let targetIds: string[] = [];
      if (selectedIds.size > 0) {
        targetIds = Array.from(selectedIds);
      } else {
        const apiBase = getApiBase();
        const res = await fetch(
          `${apiBase}/admin/destination-images/target-ids?mode=PENDING_APPROVAL`,
          {
            headers: getAuthHeaders(),
            credentials: 'include',
          }
        );
        if (!res.ok) throw new Error('Không lấy được danh sách chờ cập nhật');
        targetIds = await res.json();
      }
      await executeBatchQueue(
        'UPDATE_APPROVED',
        'Cập nhật hàng loạt ảnh đã duyệt (Update All Approved)',
        targetIds
      );
      setSelectedIds(new Set());
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi cập nhật hàng loạt', 'error');
    }
  };

  const handleResumeBatch = () => {
    if (!batchJob || batchJob.remainingQueue.length === 0) return;
    void executeBatchQueue(
      batchJob.type,
      batchJob.label,
      batchJob.remainingQueue,
      batchJob.processed,
      batchJob.succeeded,
      batchJob.failed,
      batchJob.total
    );
  };

  // Upload custom file directly to Supabase Storage (vista-media/destinations)
  const handleUploadCustomFileToSupabase = async (
    e: React.ChangeEvent<HTMLInputElement>,
    item: DestinationImageAuditItem
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cyqvqehhjpvwovdzscxm.supabase.co';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

    if (!supabaseKey) {
      showToast('Chưa cấu hình NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY để tải file trực tiếp.', 'error');
      return;
    }

    try {
      setUploadingToSupabase(true);
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const safePath = `destinations/ai_verified_${item.destinationId}_${Date.now()}.${ext}`;
      const uploadEndpoint = `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/vista-media/${safePath}`;

      const res = await fetch(uploadEndpoint, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': file.type || 'image/jpeg',
          'x-upsert': 'true',
        },
        body: file,
      });

      if (!res.ok) {
        throw new Error(`Tải lên Supabase Storage thất bại (HTTP ${res.status})`);
      }

      const publicUrl = `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/vista-media/${safePath}`;
      setCustomImageUrl(publicUrl);
      showToast('Đã tải ảnh lên Supabase Storage thành công! Nhấn "Áp dụng ảnh này" để lưu.', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi tải ảnh lên Supabase Storage', 'error');
    } finally {
      setUploadingToSupabase(false);
    }
  };

  const toggleSelectAllOnPage = () => {
    if (items.length === 0) return;
    const allPageIds = items.map((i) => i.destinationId);
    const allSelected = allPageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        allPageIds.forEach((id) => next.delete(id));
      } else {
        allPageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'VALID_IMAGE':
        return (
          <span className={`${styles.statusBadge} ${styles.statusValid}`}>
            <CheckCircle2 size={13} /> Ảnh hợp lệ
          </span>
        );
      case 'MISSING_IMAGE':
        return (
          <span className={`${styles.statusBadge} ${styles.statusMissing}`}>
            <ImageOff size={13} /> Thiếu ảnh
          </span>
        );
      case 'BROKEN_IMAGE':
        return (
          <span className={`${styles.statusBadge} ${styles.statusBroken}`}>
            <XCircle size={13} /> Ảnh lỗi
          </span>
        );
      case 'SUSPICIOUS_IMAGE':
        return (
          <span className={`${styles.statusBadge} ${styles.statusSuspicious}`}>
            <AlertTriangle size={13} /> Nghi ngờ sai ảnh
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className={`${styles.statusBadge} ${styles.statusPending}`}>
            <Clock size={13} /> Chờ duyệt
          </span>
        );
      case 'APPROVED_READY':
        return (
          <span className={`${styles.statusBadge} ${styles.statusApproved}`}>
            <Check size={13} /> Đã duyệt chờ lưu
          </span>
        );
      case 'UPDATED':
        return (
          <span className={`${styles.statusBadge} ${styles.statusUpdated}`}>
            <ShieldCheck size={13} /> Đã cập nhật
          </span>
        );
      case 'NO_MATCH_FOUND':
        return (
          <span className={`${styles.statusBadge} ${styles.statusNoMatch}`}>
            <Search size={13} /> Không tìm thấy ảnh
          </span>
        );
      case 'SKIPPED':
        return (
          <span className={`${styles.statusBadge} ${styles.statusSkipped}`}>
            <SkipForward size={13} /> Đã bỏ qua
          </span>
        );
      default:
        return (
          <span className={`${styles.statusBadge} ${styles.statusMissing}`}>
            <Clock size={13} /> Chưa kiểm tra
          </span>
        );
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / size));
  const needsAttentionTotal =
    stats.missingImages + stats.suspiciousImages + stats.brokenImages;
  const dataReady = !loading && !error && stats.totalDestinations > 0;

  return (
    <div className={styles.container}>
      {/* 1. HEADER SECTION */}
      <header className={styles.headerCard}>
        <div className={styles.headerLeft}>
          <div className={styles.techBadge}>
            <Sparkles size={14} />
            AI IMAGE MANAGER – QUẢN LÝ HÌNH ẢNH AI
          </div>
          <h1 className={styles.title}>
            Tự động Kiểm tra, Đối chiếu & Cập nhật Hình ảnh Địa điểm
          </h1>
          <p className={styles.subtitle}>
            Quét toàn bộ {stats.totalDestinations > 0 ? stats.totalDestinations : 'các'} địa điểm du lịch, phát hiện ảnh thiếu, ảnh lỗi hoặc
            ảnh mặc định bị trùng lặp hàng loạt; tự động tìm kiếm ảnh thực tế từ Wikipedia, Wikimedia Commons
            và Geosearch GPS kèm cơ chế duyệt an toàn và khôi phục (Rollback).
          </p>

          <div className={styles.providerBar}>
            <span className={`${styles.providerChip} ${styles.providerChipActive}`}>
              <CheckCircle2 size={12} /> Wikipedia Tiếng Việt API
            </span>
            <span className={`${styles.providerChip} ${styles.providerChipActive}`}>
              <CheckCircle2 size={12} /> Wikimedia Commons Licensed API
            </span>
            <span className={`${styles.providerChip} ${styles.providerChipActive}`}>
              <CheckCircle2 size={12} /> GPS Geosearch (Tọa độ thực)
            </span>
            <span
              className={`${styles.providerChip} ${
                stats.configuredProviders?.googleCustomSearch ? styles.providerChipActive : ''
              }`}
            >
              <Database size={12} />
              Google CSE:{' '}
              {stats.configuredProviders?.googleCustomSearch ? 'Đã kết nối' : 'Tùy chọn (.env)'}
            </span>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => void fetchPageData()}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? styles.spin : ''} />
            Làm mới
          </button>
          <Link href="/destinations" className={styles.btnSecondary}>
            <MapPin size={15} />
            Kho điểm đến
          </Link>
        </div>
      </header>

      {/* 2. 7 KPI STATISTICS CARDS */}
      <section className={styles.statsGrid} aria-label="Thống kê hình ảnh địa điểm">
        <button
          type="button"
          className={`${styles.statCard} ${statusFilter === 'ALL' ? styles.statCardActive : ''}`}
          onClick={() => {
            setStatusFilter('ALL');
            setPage(0);
          }}
        >
          <div className={styles.statTop}>
            <span className={styles.statLabel}>Tổng số địa điểm</span>
            <span className={styles.statIconWrap} style={{ background: '#f1f5f9', color: '#334155' }}>
              <Layers size={16} />
            </span>
          </div>
          <div className={styles.statValue}>{stats.totalDestinations}</div>
        </button>

        <button
          type="button"
          className={`${styles.statCard} ${
            statusFilter === 'VALID_IMAGE' ? styles.statCardActive : ''
          }`}
          onClick={() => {
            setStatusFilter('VALID_IMAGE');
            setPage(0);
          }}
        >
          <div className={styles.statTop}>
            <span className={styles.statLabel}>Đã có ảnh hợp lệ</span>
            <span className={styles.statIconWrap} style={{ background: '#dcfce7', color: '#15803d' }}>
              <CheckCircle2 size={16} />
            </span>
          </div>
          <div className={styles.statValue} style={{ color: '#15803d' }}>
            {stats.validImages}
          </div>
        </button>

        <button
          type="button"
          className={`${styles.statCard} ${
            statusFilter === 'MISSING_IMAGE' ? styles.statCardActive : ''
          }`}
          onClick={() => {
            setStatusFilter('MISSING_IMAGE');
            setPage(0);
          }}
        >
          <div className={styles.statTop}>
            <span className={styles.statLabel}>Chưa có ảnh</span>
            <span className={styles.statIconWrap} style={{ background: '#f1f5f9', color: '#475569' }}>
              <ImageOff size={16} />
            </span>
          </div>
          <div className={styles.statValue} style={{ color: '#475569' }}>
            {stats.missingImages}
          </div>
        </button>

        <button
          type="button"
          className={`${styles.statCard} ${
            statusFilter === 'SUSPICIOUS_IMAGE' ? styles.statCardActive : ''
          }`}
          onClick={() => {
            setStatusFilter('SUSPICIOUS_IMAGE');
            setPage(0);
          }}
        >
          <div className={styles.statTop}>
            <span className={styles.statLabel}>Ảnh nghi ngờ sai</span>
            <span className={styles.statIconWrap} style={{ background: '#fef3c7', color: '#b45309' }}>
              <AlertTriangle size={16} />
            </span>
          </div>
          <div className={styles.statValue} style={{ color: '#b45309' }}>
            {stats.suspiciousImages}
          </div>
        </button>

        <button
          type="button"
          className={`${styles.statCard} ${
            statusFilter === 'BROKEN_IMAGE' ? styles.statCardActive : ''
          }`}
          onClick={() => {
            setStatusFilter('BROKEN_IMAGE');
            setPage(0);
          }}
        >
          <div className={styles.statTop}>
            <span className={styles.statLabel}>Ảnh bị lỗi</span>
            <span className={styles.statIconWrap} style={{ background: '#fee2e2', color: '#b91c1c' }}>
              <XCircle size={16} />
            </span>
          </div>
          <div className={styles.statValue} style={{ color: '#b91c1c' }}>
            {stats.brokenImages}
          </div>
        </button>

        <button
          type="button"
          className={`${styles.statCard} ${
            statusFilter === 'PENDING_APPROVAL' ? styles.statCardActive : ''
          }`}
          onClick={() => {
            setStatusFilter('PENDING_APPROVAL');
            setPage(0);
          }}
        >
          <div className={styles.statTop}>
            <span className={styles.statLabel}>Chờ Admin duyệt</span>
            <span className={styles.statIconWrap} style={{ background: '#e0f2fe', color: '#0369a1' }}>
              <Clock size={16} />
            </span>
          </div>
          <div className={styles.statValue} style={{ color: '#0369a1' }}>
            {stats.pendingApproval}
          </div>
        </button>

        <button
          type="button"
          className={`${styles.statCard} ${
            statusFilter === 'UPDATED' ? styles.statCardActive : ''
          }`}
          onClick={() => {
            setStatusFilter('UPDATED');
            setPage(0);
          }}
        >
          <div className={styles.statTop}>
            <span className={styles.statLabel}>Đã cập nhật ảnh</span>
            <span className={styles.statIconWrap} style={{ background: '#d1fae5', color: '#047857' }}>
              <ShieldCheck size={16} />
            </span>
          </div>
          <div className={styles.statValue} style={{ color: '#047857' }}>
            {stats.updatedImages}
          </div>
        </button>
      </section>

      {/* 3. BATCH CONTROL TOOLBAR & PROGRESS BAR */}
      <section className={styles.batchPanel}>
        <div className={styles.batchRow}>
          <div className={styles.batchGroup}>
            <button
              type="button"
              className={styles.btnSecondary}
              disabled={!dataReady || Boolean(batchJob?.running)}
              onClick={() => void handleStartScanAll()}
              title={
                dataReady
                  ? `Rà soát toàn bộ ${stats.totalDestinations} địa điểm trong cơ sở dữ liệu`
                  : 'Đang chờ tải dữ liệu địa điểm từ máy chủ'
              }
            >
              <ScanSearch size={16} />
              Scan All ({stats.totalDestinations})
            </button>

            <button
              type="button"
              className={styles.btnPrimary}
              disabled={!dataReady || Boolean(batchJob?.running) || (selectedIds.size === 0 && needsAttentionTotal === 0)}
              onClick={() => void handleStartFindImages()}
              title="Tự động tìm ảnh đề xuất cho các địa điểm thiếu/lỗi/nghi ngờ sai"
            >
              <Sparkles size={16} />
              Find Images ({selectedIds.size > 0 ? `${selectedIds.size} đã chọn` : `${needsAttentionTotal} cần xử lý`})
            </button>

            <button
              type="button"
              className={styles.btnSecondary}
              disabled={!dataReady || Boolean(batchJob?.running) || selectedIds.size === 0}
              onClick={() => void handleApproveSelected()}
            >
              <Check size={16} />
              Approve Selected ({selectedIds.size})
            </button>

            <button
              type="button"
              className={styles.btnSuccess}
              disabled={
                !dataReady ||
                Boolean(batchJob?.running) ||
                (stats.pendingApproval === 0 && selectedIds.size === 0)
              }
              onClick={() => void handleStartUpdateAllApproved()}
            >
              <CheckCircle2 size={16} />
              Update All Approved ({stats.pendingApproval})
            </button>
          </div>

          <div className={styles.batchGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={verifyHttpOnScan}
                onChange={(e) => setVerifyHttpOnScan(e.target.checked)}
              />
              Kiểm tra phản hồi HTTP thực tế khi Scan
            </label>
          </div>
        </div>

        {/* Batch Progress Bar with Pause / Resume */}
        {batchJob && (
          <div className={styles.progressBox}>
            <div className={styles.progressHeader}>
              <div className={styles.progressTitle}>
                <RefreshCw size={15} className={batchJob.running ? styles.spin : ''} />
                <span>{batchJob.label}</span>
              </div>

              <div className={styles.progressMetrics}>
                <span>
                  Đã xử lý: <strong>{batchJob.processed}</strong> / {batchJob.total}
                </span>
                <span style={{ color: '#15803d' }}>
                  Thành công / Khớp ảnh: <strong>{batchJob.succeeded}</strong>
                </span>
                <span style={{ color: '#b45309' }}>
                  Cần kiểm tra / Chưa khớp: <strong>{batchJob.failed}</strong>
                </span>
                <span>
                  Còn lại: <strong>{batchJob.remainingQueue.length}</strong>
                </span>

                {batchJob.running && (
                  <button
                    type="button"
                    className={styles.btnWarning}
                    onClick={() => {
                      pauseSignalRef.current = true;
                    }}
                  >
                    <Pause size={13} /> Tạm dừng
                  </button>
                )}

                {batchJob.paused && batchJob.remainingQueue.length > 0 && (
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={handleResumeBatch}
                  >
                    <Play size={13} /> Tiếp tục ({batchJob.remainingQueue.length} còn lại)
                  </button>
                )}

                {!batchJob.running && (
                  <button
                    type="button"
                    className={styles.btnSmall}
                    onClick={() => setBatchJob(null)}
                  >
                    Đóng
                  </button>
                )}
              </div>
            </div>

            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${
                    batchJob.total > 0
                      ? Math.min(100, Math.round((batchJob.processed / batchJob.total) * 100))
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        )}
      </section>

      {/* 4. FILTER & VIEW MODE BAR */}
      <section className={styles.filterCard}>
        <div className={styles.filterLeft}>
          <div className={styles.searchWrap}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Tìm theo tên địa điểm, tỉnh thành, nguyên nhân lỗi..."
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(0);
              }}
            />
          </div>

          <select
            className={styles.selectInput}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="ALL">Tất cả trạng thái ({stats.totalDestinations})</option>
            <option value="NEEDS_ATTENTION">Cần xử lý ảnh ({needsAttentionTotal})</option>
            <option value="SUSPICIOUS_IMAGE">Nghi ngờ sai / Trùng lặp ({stats.suspiciousImages})</option>
            <option value="MISSING_IMAGE">Thiếu ảnh ({stats.missingImages})</option>
            <option value="BROKEN_IMAGE">Ảnh bị lỗi ({stats.brokenImages})</option>
            <option value="PENDING_APPROVAL">Chờ Admin duyệt ({stats.pendingApproval})</option>
            <option value="UPDATED">Đã cập nhật ({stats.updatedImages})</option>
            <option value="VALID_IMAGE">Ảnh hợp lệ ({stats.validImages})</option>
            <option value="NO_MATCH_FOUND">Không tìm thấy ảnh ({stats.noMatchFound})</option>
            <option value="SKIPPED">Đã bỏ qua</option>
          </select>

          <select
            className={styles.selectInput}
            value={provinceFilter}
            onChange={(e) => {
              setProvinceFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Tất cả Tỉnh / Thành phố</option>
            {PROVINCE_OPTIONS.map((prov) => (
              <option key={prov} value={prov}>
                {prov}
              </option>
            ))}
          </select>

          {(keyword || provinceFilter || statusFilter !== 'ALL') && (
            <button
              type="button"
              className={styles.btnSmall}
              onClick={() => {
                setKeyword('');
                setProvinceFilter('');
                setStatusFilter('ALL');
                setPage(0);
              }}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        <div className={styles.viewSwitcher}>
          <button
            type="button"
            className={`${styles.viewBtn} ${viewMode === 'TABLE' ? styles.viewBtnActive : ''}`}
            onClick={() => setViewMode('TABLE')}
          >
            <TableIcon size={14} /> Bảng đối chiếu
          </button>
          <button
            type="button"
            className={`${styles.viewBtn} ${viewMode === 'GALLERY' ? styles.viewBtnActive : ''}`}
            onClick={() => setViewMode('GALLERY')}
          >
            <LayoutGrid size={14} /> Gallery Preview
          </button>
          <button
            type="button"
            className={`${styles.viewBtn} ${viewMode === 'HISTORY' ? styles.viewBtnActive : ''}`}
            onClick={() => setViewMode('HISTORY')}
          >
            <History size={14} /> Nhật ký & Rollback
          </button>
        </div>
      </section>

      {/* 5. MAIN CONTENT AREA */}
      <section className={styles.contentCard}>
        {viewMode === 'HISTORY' ? (
          <div className={styles.tableWrapper}>
            {historyLoading ? (
              <div className={styles.stateBox}>
                <RefreshCw size={28} className={styles.spin} />
                <p>Đang tải nhật ký cập nhật và khôi phục hình ảnh...</p>
              </div>
            ) : historyItems.length === 0 ? (
              <div className={styles.stateBox}>
                <History size={36} />
                <strong>Chưa có lịch sử cập nhật hình ảnh nào</strong>
                <p>Các thao tác duyệt cập nhật hoặc khôi phục (Rollback) sẽ được lưu trữ chi tiết tại đây.</p>
              </div>
            ) : (
              <table className={styles.auditTable}>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Địa điểm</th>
                    <th>Thao tác</th>
                    <th>Ảnh trước</th>
                    <th>Ảnh sau cập nhật</th>
                    <th>Nguồn & Độ tin cậy</th>
                    <th>Người thực hiện</th>
                    <th style={{ textAlign: 'right' }}>Khôi phục</th>
                  </tr>
                </thead>
                <tbody>
                  {historyItems.map((h) => (
                    <tr key={h.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.78rem', color: '#64748b' }}>
                        {new Date(h.performedAt).toLocaleString('vi-VN')}
                      </td>
                      <td>
                        <div className={styles.destName}>{h.destinationName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{h.province}</div>
                      </td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            h.action === 'ROLLBACK' ? styles.statusSuspicious : styles.statusUpdated
                          }`}
                        >
                          {h.action === 'ROLLBACK' ? 'Hoàn tác (Rollback)' : 'Cập nhật mới'}
                        </span>
                      </td>
                      <td>
                        {h.previousImageUrl ? (
                          <div className={styles.thumbFrame} style={{ width: 96, height: 62 }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={getCloudImageUrl(h.previousImageUrl)}
                              alt="Ảnh cũ"
                              className={styles.thumbImg}
                            />
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>Trống</span>
                        )}
                      </td>
                      <td>
                        {h.newImageUrl ? (
                          <div className={styles.thumbFrame} style={{ width: 96, height: 62 }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={getCloudImageUrl(h.newImageUrl)}
                              alt="Ảnh mới"
                              className={styles.thumbImg}
                            />
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>Trống</span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{h.sourceName}</div>
                        <div style={{ fontSize: '0.74rem', color: '#15803d', fontWeight: 700 }}>
                          Độ tin cậy: {h.confidence}%
                        </div>
                      </td>
                      <td style={{ fontSize: '0.8rem', fontWeight: 600 }}>{h.performedBy}</td>
                      <td style={{ textAlign: 'right' }}>
                        {h.previousImageUrl && (
                          <button
                            type="button"
                            className={`${styles.btnSmall} ${styles.btnSmallRollback}`}
                            onClick={() =>
                              void handleRollbackSingle(h.destinationId, h.destinationName)
                            }
                          >
                            <RotateCcw size={13} /> Rollback
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : loading ? (
          <div className={styles.stateBox}>
            <RefreshCw size={28} className={styles.spin} />
            <p>Đang tải và phân tích dữ liệu hình ảnh của các địa điểm...</p>
          </div>
        ) : error ? (
          <div className={styles.stateBox}>
            <AlertTriangle size={36} color="#dc2626" />
            <strong style={{ color: '#0f172a' }}>Không thể tải dữ liệu AI Image Manager</strong>
            <p>{error}</p>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => void fetchPageData()}
            >
              Thử lại
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className={styles.stateBox}>
            <CheckCircle2 size={36} color="#16a34a" />
            <strong style={{ color: '#0f172a' }}>Không có địa điểm nào trong bộ lọc này</strong>
            <p>Hãy thử chọn trạng thái khác hoặc xóa từ khóa tìm kiếm.</p>
          </div>
        ) : viewMode === 'GALLERY' ? (
          <>
            <div className={styles.galleryGrid}>
              {items.map((item) => {
                const isBusy = busyRowIds.has(item.destinationId);
                const activeCandidate =
                  item.candidates?.find((c) => c.imageUrl === item.selectedCandidateUrl) ||
                  item.candidates?.[0];

                return (
                  <article key={item.destinationId} className={styles.galleryCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div>
                        <div className={styles.destName}>{item.name}</div>
                        <div className={styles.destMetaRow}>
                          <span>{item.province}</span>
                          <span>•</span>
                          <span>{item.category}</span>
                        </div>
                      </div>
                      {renderStatusBadge(item.auditStatus)}
                    </div>

                    <div className={styles.galleryCompare}>
                      <div className={styles.galleryBox}>
                        <span className={styles.galleryBoxLabel}>
                          Ảnh hiện tại {item.duplicateCount > 1 ? `(Trùng ${item.duplicateCount})` : ''}
                        </span>
                        <div className={styles.galleryImgWrap}>
                          {item.currentImageUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={getCloudImageUrl(item.currentImageUrl)}
                              alt={item.name}
                              className={styles.thumbImg}
                            />
                          ) : (
                            <div className={styles.thumbEmpty}>
                              <ImageOff size={18} />
                              <span>Chưa có ảnh</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={styles.galleryBox}>
                        <span className={styles.galleryBoxLabel} style={{ color: '#0284c7' }}>
                          Ảnh đề xuất AI{' '}
                          {activeCandidate ? `(${activeCandidate.confidence}%)` : ''}
                        </span>
                        <div className={styles.galleryImgWrap}>
                          {activeCandidate ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={activeCandidate.thumbnailUrl}
                              alt={activeCandidate.title}
                              className={styles.thumbImg}
                            />
                          ) : (
                            <div className={styles.thumbEmpty}>
                              <Sparkles size={18} />
                              <span>Chưa tìm kiếm</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={styles.issueText}>{item.issueReason}</div>

                    <div className={styles.actionInline} style={{ marginTop: 'auto' }}>
                      <button
                        type="button"
                        className={styles.btnSmall}
                        onClick={() => {
                          setPreviewItem(item);
                          setCustomSearchQuery(`${item.name} ${item.province}`);
                          setCustomImageUrl('');
                        }}
                      >
                        <Eye size={13} /> So sánh
                      </button>
                      <button
                        type="button"
                        className={styles.btnSmall}
                        disabled={isBusy}
                        onClick={() => void handleSearchSingle(item.destinationId)}
                      >
                        <Search size={13} /> {isBusy ? 'Đang tìm...' : 'Tìm ảnh'}
                      </button>
                      {activeCandidate && (
                        <button
                          type="button"
                          className={`${styles.btnSmall} ${styles.btnSmallSuccess}`}
                          disabled={isBusy}
                          onClick={() =>
                            void handleApplySingle(
                              item,
                              activeCandidate.imageUrl,
                              activeCandidate.sourceName,
                              activeCandidate.confidence
                            )
                          }
                        >
                          <Check size={13} /> Duyệt & Lưu
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <PaginationBar
              page={page}
              totalPages={totalPages}
              size={size}
              total={total}
              unitLabel="địa điểm"
              disabled={loading || Boolean(batchJob?.running)}
              onPageChange={(p) => setPage(p)}
              onSizeChange={(s) => {
                setSize(s);
                setPage(0);
              }}
            />
          </>
        ) : (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.auditTable}>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        checked={
                          items.length > 0 &&
                          items.every((i) => selectedIds.has(i.destinationId))
                        }
                        onChange={toggleSelectAllOnPage}
                        aria-label="Chọn tất cả trên trang"
                      />
                    </th>
                    <th>Ảnh hiện tại</th>
                    <th>Thông tin Địa điểm & Chẩn đoán</th>
                    <th>Ảnh đề xuất từ AI (Tối đa 3 phương án)</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const isBusy = busyRowIds.has(item.destinationId);
                    const isSelected = selectedIds.has(item.destinationId);

                    return (
                      <tr key={item.destinationId}>
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(item.destinationId)}
                            aria-label={`Chọn ${item.name}`}
                          />
                        </td>

                        {/* Current Image */}
                        <td>
                          <div className={styles.currentImgBox}>
                            <div className={styles.thumbFrame}>
                              {item.currentImageUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={getCloudImageUrl(item.currentImageUrl)}
                                  alt={item.name}
                                  className={styles.thumbImg}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.opacity = '0.25';
                                  }}
                                />
                              ) : (
                                <div className={styles.thumbEmpty}>
                                  <ImageOff size={20} />
                                  <span>Chưa có ảnh</span>
                                </div>
                              )}
                              {item.duplicateCount > 1 && (
                                <span className={styles.dupBadge}>
                                  Trùng lặp {item.duplicateCount} nơi
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Destination Info & Diagnosis */}
                        <td>
                          <div className={styles.destInfo}>
                            <Link
                              href={`/destination/${item.destinationId}`}
                              target="_blank"
                              className={styles.destName}
                              style={{ textDecoration: 'none' }}
                            >
                              {item.name} ↗
                            </Link>
                            <div className={styles.destMetaRow}>
                              <span className={styles.metaPill}>
                                <MapPin size={11} /> {item.province}
                              </span>
                              <span className={styles.metaPill}>
                                <Tag size={11} /> {item.category}
                              </span>
                              {item.latitude && item.longitude && (
                                <span style={{ fontSize: '0.7rem' }}>
                                  GPS: {item.latitude.toFixed(3)}, {item.longitude.toFixed(3)}
                                </span>
                              )}
                            </div>
                            <div className={styles.issueText}>{item.issueReason}</div>
                            {item.lastUpdatedAt && (
                              <div
                                style={{
                                  fontSize: '0.71rem',
                                  color: '#15803d',
                                  fontWeight: 600,
                                }}
                              >
                                Đã cập nhật bởi {item.lastUpdatedBy || 'Admin'} (
                                {item.lastUpdateSource})
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Suggested Candidates (Up to 3) */}
                        <td>
                          {item.candidates && item.candidates.length > 0 ? (
                            <div className={styles.candidatesRow}>
                              {item.candidates.map((cand, idx) => {
                                const isChosen =
                                  item.selectedCandidateUrl === cand.imageUrl ||
                                  (!item.selectedCandidateUrl && idx === 0);
                                return (
                                  <div
                                    key={cand.imageUrl}
                                    className={`${styles.candidateCard} ${
                                      isChosen ? styles.candidateCardSelected : ''
                                    }`}
                                    onClick={() =>
                                      void handleSelectCandidate(item, cand, false)
                                    }
                                    title={`${cand.title}\n${cand.matchReason}\nGiấy phép: ${cand.license}`}
                                  >
                                    <div className={styles.candidateThumbWrap}>
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={cand.thumbnailUrl}
                                        alt={cand.title}
                                        className={styles.thumbImg}
                                      />
                                      <span
                                        className={`${styles.candidateConfidence} ${
                                          cand.confidence >= 80
                                            ? styles.confHigh
                                            : styles.confMed
                                        }`}
                                      >
                                        {cand.confidence}%
                                      </span>
                                    </div>
                                    <div className={styles.candidateTitle}>{cand.title}</div>
                                    <div className={styles.candidateSource}>
                                      <span>{cand.sourceName}</span>
                                      {cand.sourcePageUrl && (
                                        <a
                                          href={cand.sourcePageUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          title="Xem trang nguồn gốc"
                                        >
                                          <ExternalLink size={11} />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className={styles.noCandidatesBox}>
                              <Sparkles size={15} color="#0284c7" />
                              <span>
                                Nhấn <strong>Tìm ảnh</strong> để hệ thống quét Wikipedia &
                                Wikimedia Commons theo tên và tọa độ GPS.
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td>{renderStatusBadge(item.auditStatus)}</td>

                        {/* Actions */}
                        <td>
                          <div className={styles.rowActions}>
                            <div className={styles.actionInline}>
                              <button
                                type="button"
                                className={`${styles.btnSmall} ${styles.btnSmallPrimary}`}
                                disabled={isBusy}
                                onClick={() => void handleSearchSingle(item.destinationId)}
                                title="Tìm hoặc tìm lại ảnh đề xuất"
                              >
                                <Search size={13} />
                                {isBusy ? 'Đang xử lý...' : 'Tìm ảnh'}
                              </button>

                              <button
                                type="button"
                                className={styles.btnSmall}
                                onClick={() => {
                                  setPreviewItem(item);
                                  setCustomSearchQuery(`${item.name} ${item.province}`);
                                  setCustomImageUrl('');
                                }}
                                title="Mở cửa sổ đối chiếu ảnh lớn và tùy chỉnh"
                              >
                                <Eye size={13} />
                                Xem trước
                              </button>
                            </div>

                            <div className={styles.actionInline}>
                              {(item.selectedCandidateUrl ||
                                (item.candidates && item.candidates.length > 0)) && (
                                <button
                                  type="button"
                                  className={`${styles.btnSmall} ${styles.btnSmallSuccess}`}
                                  disabled={isBusy}
                                  onClick={() => void handleApplySingle(item)}
                                  title="Duyệt và cập nhật ảnh đang chọn vào hệ thống"
                                >
                                  <Check size={13} />
                                  Duyệt & Lưu
                                </button>
                              )}

                              {item.previousImageUrl && (
                                <button
                                  type="button"
                                  className={`${styles.btnSmall} ${styles.btnSmallRollback}`}
                                  disabled={isBusy}
                                  onClick={() =>
                                    void handleRollbackSingle(item.destinationId, item.name)
                                  }
                                  title="Khôi phục lại ảnh cũ trước khi cập nhật"
                                >
                                  <RotateCcw size={13} />
                                  Rollback
                                </button>
                              )}

                              {item.auditStatus !== 'SKIPPED' &&
                                item.auditStatus !== 'UPDATED' && (
                                  <button
                                    type="button"
                                    className={styles.btnSmall}
                                    disabled={isBusy}
                                    onClick={() =>
                                      void handleSkipSingle(item.destinationId, item.name)
                                    }
                                    title="Bỏ qua địa điểm này"
                                  >
                                    <SkipForward size={13} />
                                    Bỏ qua
                                  </button>
                                )}
                            </div>
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
              total={total}
              unitLabel="địa điểm"
              disabled={loading || Boolean(batchJob?.running)}
              onPageChange={(p) => setPage(p)}
              onSizeChange={(s) => {
                setSize(s);
                setPage(0);
              }}
            />
          </>
        )}
      </section>

      {/* 6. SIDE-BY-SIDE COMPARISON & CUSTOM SEARCH MODAL */}
      {previewItem && (
        <div className={styles.modalOverlay} onClick={() => !modalBusy && setPreviewItem(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <Sparkles size={18} color="#0284c7" />
                Đối chiếu & Xác minh Hình ảnh: {previewItem.name} ({previewItem.province})
              </div>
              <button
                type="button"
                className={styles.btnSmall}
                onClick={() => setPreviewItem(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Side-by-Side Comparison */}
              <div className={styles.compareSplit}>
                <div className={styles.comparePane}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <strong style={{ fontSize: '0.84rem', color: '#334155' }}>
                      Ảnh hiện tại trong Database
                    </strong>
                    {renderStatusBadge(previewItem.auditStatus)}
                  </div>
                  {previewItem.currentImageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={getCloudImageUrl(previewItem.currentImageUrl)}
                      alt={previewItem.name}
                      className={styles.compareImgLarge}
                    />
                  ) : (
                    <div
                      className={styles.compareImgLarge}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748b',
                      }}
                    >
                      Chưa có ảnh đại diện
                    </div>
                  )}
                  <div style={{ fontSize: '0.76rem', color: '#475569' }}>
                    <strong>Chẩn đoán:</strong> {previewItem.issueReason}
                  </div>
                </div>

                <div className={styles.comparePane} style={{ borderColor: '#bae6fd', background: '#f0f9ff' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <strong style={{ fontSize: '0.84rem', color: '#0369a1' }}>
                      Ảnh mới đang chọn để thay thế
                    </strong>
                    {previewItem.selectedCandidateConfidence && (
                      <span
                        className={`${styles.statusBadge} ${styles.statusValid}`}
                      >
                        Độ tin cậy: {previewItem.selectedCandidateConfidence}%
                      </span>
                    )}
                  </div>
                  {customImageUrl || previewItem.selectedCandidateUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={getCloudImageUrl(
                        customImageUrl || previewItem.selectedCandidateUrl || ''
                      )}
                      alt="Ảnh thay thế"
                      className={styles.compareImgLarge}
                    />
                  ) : (
                    <div
                      className={styles.compareImgLarge}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748b',
                      }}
                    >
                      Chưa chọn ảnh thay thế
                    </div>
                  )}
                  <div style={{ fontSize: '0.76rem', color: '#0369a1' }}>
                    <strong>Nguồn xác thực:</strong>{' '}
                    {customImageUrl
                      ? 'URL / Supabase Storage do Admin cung cấp'
                      : previewItem.selectedCandidateSource || 'Chưa chọn'}
                  </div>
                </div>
              </div>

              {/* Custom Search Query Box */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.6rem',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  background: '#f8fafc',
                  padding: '0.8rem',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                  Tìm kiếm lại với từ khóa tùy chỉnh:
                </div>
                <input
                  type="text"
                  className={styles.searchInput}
                  style={{ flex: 1, minWidth: 220 }}
                  value={customSearchQuery}
                  onChange={(e) => setCustomSearchQuery(e.target.value)}
                  placeholder="Nhập tên địa danh tiếng Việt hoặc tiếng Anh..."
                />
                <button
                  type="button"
                  className={styles.btnPrimary}
                  disabled={modalBusy}
                  onClick={async () => {
                    setModalBusy(true);
                    await handleSearchSingle(previewItem.destinationId, customSearchQuery);
                    setModalBusy(false);
                  }}
                >
                  <Search size={14} /> Tìm lại ngay
                </button>
              </div>

              {/* 3 Candidates Selection */}
              {previewItem.candidates && previewItem.candidates.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      marginBottom: '0.55rem',
                      color: '#0f172a',
                    }}
                  >
                    Danh sách ảnh đề xuất (Nhấn vào ảnh để chọn):
                  </div>
                  <div className={styles.modalCandidatesGrid}>
                    {previewItem.candidates.map((cand) => {
                      const selected =
                        !customImageUrl && previewItem.selectedCandidateUrl === cand.imageUrl;
                      return (
                        <div
                          key={cand.imageUrl}
                          className={`${styles.candidateCard} ${
                            selected ? styles.candidateCardSelected : ''
                          }`}
                          style={{ width: '100%', padding: '0.65rem' }}
                          onClick={() => {
                            setCustomImageUrl('');
                            void handleSelectCandidate(previewItem, cand, false);
                          }}
                        >
                          <div className={styles.candidateThumbWrap} style={{ height: 130 }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={cand.thumbnailUrl}
                              alt={cand.title}
                              className={styles.thumbImg}
                            />
                            <span className={`${styles.candidateConfidence} ${styles.confHigh}`}>
                              {cand.confidence}%
                            </span>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0f172a' }}>
                            {cand.title}
                          </div>
                          <div style={{ fontSize: '0.73rem', color: '#475569' }}>
                            {cand.matchReason}
                          </div>
                          <div className={styles.candidateSource}>
                            <span>
                              {cand.sourceName} ({cand.license})
                            </span>
                            {cand.sourcePageUrl && (
                              <a
                                href={cand.sourcePageUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Nguồn ↗
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Direct Verified URL or Supabase Upload */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.65rem',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  paddingTop: '0.4rem',
                  borderTop: '1px solid #f1f5f9',
                }}
              >
                <input
                  type="url"
                  className={styles.searchInput}
                  style={{ flex: 1 }}
                  placeholder="Hoặc dán trực tiếp URL ảnh chính thức đã xác minh..."
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                />
                <label className={styles.btnSecondary} style={{ cursor: 'pointer' }}>
                  <Upload size={14} />
                  {uploadingToSupabase ? 'Đang tải lên Supabase...' : 'Tải ảnh lên Supabase Storage'}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={uploadingToSupabase}
                    onChange={(e) => void handleUploadCustomFileToSupabase(e, previewItem)}
                  />
                </label>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <div>
                {previewItem.previousImageUrl && (
                  <button
                    type="button"
                    className={`${styles.btnSmall} ${styles.btnSmallRollback}`}
                    onClick={() =>
                      void handleRollbackSingle(previewItem.destinationId, previewItem.name)
                    }
                  >
                    <RotateCcw size={14} /> Khôi phục về ảnh cũ (Rollback)
                  </button>
                )}
              </div>

              <div className={styles.batchGroup}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setPreviewItem(null)}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  className={styles.btnSuccess}
                  disabled={!customImageUrl && !previewItem.selectedCandidateUrl}
                  onClick={async () => {
                    await handleApplySingle(
                      previewItem,
                      customImageUrl || previewItem.selectedCandidateUrl || undefined,
                      customImageUrl
                        ? 'Supabase / Admin Verified URL'
                        : previewItem.selectedCandidateSource || undefined,
                      customImageUrl ? 95 : previewItem.selectedCandidateConfidence || 88
                    );
                    setPreviewItem(null);
                  }}
                >
                  <CheckCircle2 size={15} /> Duyệt & Cập nhật ảnh này
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div
          className={`${styles.toast} ${
            toast.type === 'success' ? styles.toastSuccess : styles.toastError
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

