'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  UploadCloud,
  Search,
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  ImageIcon,
  ShieldCheck,
  Pencil,
  Trash2,
  Archive,
  XCircle,
  Clock,
} from 'lucide-react';
import { getCloudImageUrl, uploadFileToCloud } from '@/utils/cloudImage';
import { PaginationBar } from '@/components/PaginationBar';
import styles from './destinations.module.css';

export type AdminStatusFilter = 'ALL' | 'DRAFT' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';

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
  description?: string | null;
  openingHours?: Record<string, unknown> | null;
  sourceUrl?: string | null;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
}

interface DestinationPageResponse {
  items: DestinationSummary[];
  page: number;
  size: number;
  total: number;
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
  'Hà Giang',
  'Bình Thuận',
  'Bà Rịa - Vũng Tàu',
  'Cần Thơ',
];

const CATEGORY_OPTIONS = [
  'Cảnh quan & Thiên nhiên',
  'Cảnh quan & Lịch sử',
  'Cảnh quan & Check-in',
  'Cảnh quan & Văn hóa',
  'Cảnh quan & Hải đăng',
  'Cảnh quan',
  'Sinh thái & Vui chơi',
  'Sinh thái & Thiên nhiên',
  'Sinh thái & Đất ngập nước',
  'Sinh thái & Hang động',
  'Sinh thái và nghỉ dưỡng',
  'Rừng & Sinh thái',
  'Vườn quốc gia và bảo tồn',
  'Giải trí và công viên',
  'Vui chơi & Trải nghiệm',
  'Khu vui chơi & Nghỉ dưỡng',
  'Check-in & Leo núi',
  'Tâm linh & Nghệ thuật',
  'Tâm linh & Cảnh quan',
  'Tâm linh & Lịch sử',
  'Tâm linh & Sinh thái',
  'Tôn giáo và tâm linh',
  'Di tích & Check-in',
  'Di tích & Khảo cổ',
  'Di tích & Khám phá',
  'Di tích',
  'Bảo tàng & Lịch sử',
  'Bảo tàng',
  'Ẩm thực & Mua sắm',
  'Thư giãn & Nghỉ dưỡng',
  'Thiên nhiên & Phượt',
  'Biển & Thiên nhiên',
  'Biển và đảo',
  'Làng nghề',
  'Làng bản và văn hóa',
  'Công trình và kiến trúc',
  'Đô thị và phố cổ',
  'Chợ',
  'Sông và hồ',
  'Núi và cao nguyên',
  'Thác nước',
];

const getCandidateApiBases = (): string[] => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '');
  const candidates: string[] = [];
  if (envUrl) candidates.push(envUrl);
  candidates.push('http://localhost:8081/api/v1');
  candidates.push('http://localhost:8080/api/v1');
  candidates.push('/api/v1');
  return [...new Set(candidates)];
};

let cachedWorkingApiBase: string | null = null;

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('vista_token');
}

function getAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    ...(extra || {}),
  };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function requestWithFallback(
  pathAndQuery: string,
  options?: RequestInit
): Promise<{ res: Response; workingBase: string }> {
  const cleanPath = pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`;
  const candidates = cachedWorkingApiBase
    ? [cachedWorkingApiBase, ...getCandidateApiBases().filter((c) => c !== cachedWorkingApiBase)]
    : getCandidateApiBases();

  let lastError: unknown = null;
  for (const base of candidates) {
    try {
      const url = `${base}${cleanPath}`;
      const res = await fetch(url, options);
      cachedWorkingApiBase = base;
      return { res, workingBase: base };
    } catch (err: unknown) {
      lastError = err;
      continue;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Không thể kết nối đến máy chủ Backend');
}

function formatOpeningHoursToText(openingHours?: Record<string, unknown> | null): string {
  if (!openingHours || Object.keys(openingHours).length === 0) {
    return '07:30 - 17:30';
  }
  if (typeof openingHours.all === 'string' && openingHours.all.trim()) {
    return openingHours.all;
  }
  if (typeof openingHours.mon === 'string' && openingHours.mon.trim() && openingHours.mon !== '-') {
    return openingHours.mon;
  }
  return JSON.stringify(openingHours);
}

export default function DestinationsAdminPage() {
  const [destinations, setDestinations] = useState<DestinationSummary[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(20);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters (P0-1)
  const [statusFilter, setStatusFilter] = useState<AdminStatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [provinceFilter, setProvinceFilter] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Create / Edit Modal & Form State (P1-2)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitStep, setSubmitStep] = useState<string | null>(null);
  const [formValidationError, setFormValidationError] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState<string>('');
  const [formProvince, setFormProvince] = useState<string>('Đà Nẵng');
  const [formCategory, setFormCategory] = useState<string>('Cảnh quan & Thiên nhiên');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formPriceMin, setFormPriceMin] = useState<string>('0');
  const [formPriceMax, setFormPriceMax] = useState<string>('0');
  const [formOpeningHours, setFormOpeningHours] = useState<string>('07:30 - 17:30');
  const [formLatitude, setFormLatitude] = useState<string>('16.0611');
  const [formLongitude, setFormLongitude] = useState<string>('108.2272');
  const [formSourceUrl, setFormSourceUrl] = useState<string>('');
  const [formStatus, setFormStatus] = useState<string>('PUBLISHED');

  // Multi-image Gallery State (P2-3)
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete Confirm Modal State (P1-3)
  const [deleteTarget, setDeleteTarget] = useState<DestinationSummary | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const totalPages = Math.max(1, Math.ceil(total / size));

  // Lock background body scroll when any modal is open
  useEffect(() => {
    if (isModalOpen || deleteTarget) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen, deleteTarget]);

  // Fetch Destination Catalog from Admin API (P0-1)
  const fetchDestinations = useCallback(
    async (opts?: {
      q?: string;
      province?: string;
      category?: string;
      status?: AdminStatusFilter;
      page?: number;
      size?: number;
      signal?: AbortSignal;
    }) => {
      try {
        setLoading(true);
        setError(null);

        const qVal = opts?.q !== undefined ? opts.q : searchQuery;
        const provVal = opts?.province !== undefined ? opts.province : provinceFilter;
        const catVal = opts?.category !== undefined ? opts.category : selectedCategory;
        const statusVal = opts?.status !== undefined ? opts.status : statusFilter;
        const pageVal = opts?.page !== undefined ? opts.page : page;
        const sizeVal = opts?.size !== undefined ? opts.size : size;

        const queryParams = new URLSearchParams({
          status: statusVal,
          page: String(pageVal),
          size: String(sizeVal),
        });
        if (qVal.trim()) {
          queryParams.set('q', qVal.trim());
          queryParams.set('keyword', qVal.trim());
        }
        if (provVal) queryParams.set('province', provVal);
        if (catVal) queryParams.set('category', catVal);

        const { res } = await requestWithFallback(`/admin/destinations?${queryParams.toString()}`, {
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          signal: opts?.signal,
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new Error(
              'Bạn cần đăng nhập tài khoản Quản trị viên (ADMIN/MODERATOR) để xem danh sách quản trị.'
            );
          }
          throw new Error(`Lỗi tải danh sách: HTTP ${res.status}`);
        }

        const data: DestinationPageResponse = await res.json();
        setDestinations(data.items || []);
        setTotal(data.total !== undefined ? data.total : data.items ? data.items.length : 0);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        const rawMsg = err instanceof Error ? err.message : '';
        let msg = 'Không thể kết nối đến máy chủ Backend';
        if (
          rawMsg.includes('Failed to fetch') ||
          rawMsg.includes('NetworkError') ||
          rawMsg.includes('cổng 8081')
        ) {
          msg =
            'Không thể kết nối tới máy chủ Backend (cổng 8081/8080). Vui lòng đảm bảo Spring Boot Backend đang hoạt động.';
        } else if (rawMsg) {
          msg = rawMsg;
        }
        setError(msg);
        setDestinations([]);
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, provinceFilter, selectedCategory, statusFilter, page, size]
  );

  // Fetch when page, size, statusFilter, provinceFilter, selectedCategory change
  useEffect(() => {
    const controller = new AbortController();
    fetchDestinations({ signal: controller.signal });
    return () => {
      controller.abort();
    };
  }, [page, size, statusFilter, provinceFilter, selectedCategory, fetchDestinations]);

  const isFirstMount = useRef(true);

  // Debounced search on typing
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setPage(0);
      fetchDestinations({ q: searchQuery, page: 0, signal: controller.signal });
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchDestinations({ q: searchQuery, page: 0 });
  };

  // Reset form helper
  const resetForm = () => {
    setEditingId(null);
    setFormValidationError(null);
    setFormName('');
    setFormProvince('Đà Nẵng');
    setFormCategory('Cảnh quan & Thiên nhiên');
    setFormDescription('');
    setFormPriceMin('0');
    setFormPriceMax('0');
    setFormOpeningHours('07:30 - 17:30');
    setFormLatitude('16.0611');
    setFormLongitude('108.2272');
    setFormSourceUrl('');
    setFormStatus('PUBLISHED');
    setExistingImageUrls([]);
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setImageFiles([]);
    setImagePreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Open Edit Modal and load detail from GET /admin/destinations/{id} (P1-2)
  const handleOpenEditModal = async (item: DestinationSummary) => {
    resetForm();
    setEditingId(item.id);
    setFormName(item.name || '');
    setFormProvince(item.province || 'Đà Nẵng');
    setFormCategory(item.category || 'Cảnh quan & Thiên nhiên');
    setFormPriceMin(item.priceMin != null ? String(item.priceMin) : '0');
    setFormPriceMax(item.priceMax != null ? String(item.priceMax) : '0');
    setFormLatitude(item.latitude != null ? String(item.latitude) : '');
    setFormLongitude(item.longitude != null ? String(item.longitude) : '');
    setFormStatus(item.status || 'PUBLISHED');
    if (item.imageUrl) {
      setExistingImageUrls([item.imageUrl]);
    }
    setIsModalOpen(true);

    try {
      setLoadingDetail(true);
      const { res } = await requestWithFallback(`/admin/destinations/${item.id}`, {
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      });
      if (res.ok) {
        const detail: DestinationDetail = await res.json();
        setFormName(detail.name || item.name);
        setFormProvince(detail.province || item.province || 'Đà Nẵng');
        setFormCategory(detail.category || item.category || 'Cảnh quan & Thiên nhiên');
        setFormDescription(detail.description || '');
        setFormPriceMin(detail.priceMin != null ? String(detail.priceMin) : '0');
        setFormPriceMax(detail.priceMax != null ? String(detail.priceMax) : '0');
        setFormLatitude(detail.latitude != null ? String(detail.latitude) : '');
        setFormLongitude(detail.longitude != null ? String(detail.longitude) : '');
        setFormOpeningHours(formatOpeningHoursToText(detail.openingHours));
        setFormSourceUrl(detail.sourceUrl || '');
        setFormStatus(detail.status || item.status || 'PUBLISHED');

        if (Array.isArray(detail.imageUrls) && detail.imageUrls.length > 0) {
          setExistingImageUrls(detail.imageUrls);
        } else if (detail.imageUrl) {
          setExistingImageUrls([detail.imageUrl]);
        } else {
          setExistingImageUrls([]);
        }
      }
    } catch {
      showToast('Không thể tải đầy đủ chi tiết địa điểm, hiển thị thông tin tóm tắt.', 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Handle Multi-Image Selection (P2-3)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processSelectedFiles(Array.from(files));
    }
  };

  const processSelectedFiles = (files: File[]) => {
    const validFiles: File[] = [];
    const newUrls: string[] = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        showToast(`Tệp "${file.name}" không phải hình ảnh hợp lệ (PNG, JPG, WEBP)!`, 'error');
        continue;
      }
      if (file.size > 15 * 1024 * 1024) {
        showToast(`Ảnh "${file.name}" vượt quá giới hạn 15MB`, 'error');
        continue;
      }
      validFiles.push(file);
      newUrls.push(URL.createObjectURL(file));
    }

    if (validFiles.length > 0) {
      setImageFiles((prev) => [...prev, ...validFiles]);
      setImagePreviews((prev) => [...prev, ...newUrls]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeExistingImageAt = (index: number) => {
    setExistingImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewImageAt = (index: number) => {
    setImagePreviews((prev) => {
      if (prev[index]) URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Create or Update (P1-2 & P2-3)
  const handleSubmitDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormValidationError(null);

    if (!formName.trim()) {
      setFormValidationError('Vui lòng nhập tên điểm đến');
      showToast('Vui lòng nhập tên điểm đến', 'error');
      return;
    }
    if (!formProvince.trim()) {
      setFormValidationError('Vui lòng chọn hoặc nhập tỉnh thành');
      showToast('Vui lòng chọn hoặc nhập tỉnh thành', 'error');
      return;
    }

    const minVal = formPriceMin ? parseFloat(formPriceMin) : 0;
    const maxVal = formPriceMax ? parseFloat(formPriceMax) : 0;
    if (maxVal < minVal) {
      const msg = 'Giá vé tối đa phải lớn hơn hoặc bằng giá vé tối thiểu';
      setFormValidationError(msg);
      showToast(msg, 'error');
      return;
    }

    const token = getAuthToken();
    if (!token || token.split('.').length !== 3) {
      showToast(
        'Phiên làm việc không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập tài khoản Quản trị viên.',
        'error'
      );
      return;
    }

    try {
      setSubmitting(true);
      const uploadedCloudUrls: string[] = [];

      if (imageFiles.length > 0) {
        setSubmitStep(
          `Đang tải ${imageFiles.length} ảnh lên Cloud Storage (Supabase CDN)...`
        );
        for (const file of imageFiles) {
          try {
            const url = await uploadFileToCloud(file, 'destinations');
            uploadedCloudUrls.push(url);
          } catch (uploadErr: unknown) {
            const rawErr = uploadErr instanceof Error ? uploadErr.message : '';
            let userMsg =
              'Tải ảnh lên Cloud Storage thất bại. Vui lòng thử lại hoặc kiểm tra mạng.';
            if (rawErr.includes('415') || rawErr.includes('mime type')) {
              userMsg = 'Định dạng tệp ảnh không được hỗ trợ. Vui lòng chọn ảnh PNG, JPG hoặc WEBP.';
            } else if (
              rawErr.includes('403') ||
              rawErr.includes('row-level security') ||
              rawErr.includes('RLS')
            ) {
              userMsg =
                'Không có quyền ghi vào Cloud Storage (bucket vista-media). Vui lòng kiểm tra quyền truy cập.';
            }
            throw new Error(userMsg);
          }
        }
      }

      const finalImageUrls = [...existingImageUrls, ...uploadedCloudUrls];
      const primaryImageUrl = finalImageUrls.length > 0 ? finalImageUrls[0] : null;

      setSubmitStep(
        editingId
          ? 'Đang cập nhật thông tin điểm đến...'
          : 'Đang lưu điểm đến mới vào hệ thống VISTA...'
      );

      const payload = {
        name: formName.trim(),
        province: formProvince.trim(),
        category: formCategory.trim(),
        description: formDescription.trim(),
        imageUrl: primaryImageUrl,
        imageUrls: finalImageUrls,
        latitude: formLatitude ? parseFloat(formLatitude) : null,
        longitude: formLongitude ? parseFloat(formLongitude) : null,
        priceMin: minVal,
        priceMax: maxVal,
        openingHours: formOpeningHours.trim(),
        sourceUrl: formSourceUrl.trim() || null,
        status: formStatus || 'PUBLISHED',
      };

      const endpoint = editingId ? `/admin/destinations/${editingId}` : '/destinations';
      const method = editingId ? 'PUT' : 'POST';

      const { res } = await requestWithFallback(endpoint, {
        method,
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.');
        }
        if (res.status === 403) {
          throw new Error('Tài khoản của bạn không có quyền Quản trị viên để thực hiện thao tác này.');
        }

        const errorData = await res.json().catch(() => null);
        if (errorData?.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
          const fieldMsgs = errorData.errors
            .map((errItem: { field?: string; message?: string }) =>
              errItem.field ? `${errItem.field}: ${errItem.message}` : errItem.message
            )
            .join('; ');
          setFormValidationError(fieldMsgs);
          throw new Error(fieldMsgs);
        }
        const detailMsg =
          errorData?.detail || errorData?.message || `Lỗi lưu điểm đến (Mã HTTP ${res.status})`;
        setFormValidationError(detailMsg);
        throw new Error(detailMsg);
      }

      showToast(
        editingId
          ? `Đã cập nhật điểm đến "${formName}" thành công!`
          : `Điểm đến "${formName}" đã được tạo thành công!`
      );

      resetForm();
      setIsModalOpen(false);
      await fetchDestinations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu điểm đến';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
      setSubmitStep(null);
    }
  };

  // Confirm Delete Action (P1-3)
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const { res } = await requestWithFallback(`/destinations/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      });

      if (res.status === 204 || res.status === 200) {
        showToast(`Đã xóa địa điểm "${deleteTarget.name}" thành công!`, 'success');
        setDeleteTarget(null);
        await fetchDestinations();
        return;
      }

      if (res.status === 409) {
        showToast(
          'Địa điểm đang được tham chiếu, đã chuyển sang trạng thái Lưu trữ (Archived)',
          'success'
        );
        setDeleteTarget(null);
        await fetchDestinations();
        return;
      }

      const errorData = await res.json().catch(() => null);
      const msg =
        errorData?.detail ||
        errorData?.message ||
        'Không thể xóa địa điểm. Vui lòng thử lại sau.';
      showToast(msg, 'error');
    } catch {
      showToast('Có lỗi máy chủ xảy ra khi xóa địa điểm.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const formatVnd = (amount?: number | null) => {
    if (amount === null || amount === undefined || amount === 0) return 'Miễn phí';
    return `${new Intl.NumberFormat('vi-VN').format(amount)} đ`;
  };

  const renderStatusBadge = (status: string) => {
    const normalized = (status || 'PUBLISHED').toUpperCase();
    if (normalized === 'PUBLISHED') {
      return (
        <span
          className={styles.badgeStatus}
          style={{
            backgroundColor: '#ecfdf5',
            color: '#059669',
            borderColor: '#a7f3d0',
          }}
        >
          <CheckCircle2 size={13} /> PUBLISHED
        </span>
      );
    }
    if (normalized === 'REJECTED') {
      return (
        <span
          className={styles.badgeStatus}
          style={{
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            borderColor: '#fecaca',
          }}
        >
          <XCircle size={13} /> REJECTED
        </span>
      );
    }
    if (normalized === 'ARCHIVED') {
      return (
        <span
          className={styles.badgeStatus}
          style={{
            backgroundColor: '#f1f5f9',
            color: '#475569',
            borderColor: '#cbd5e1',
          }}
        >
          <Archive size={13} /> ARCHIVED
        </span>
      );
    }
    return (
      <span
        className={styles.badgeStatus}
        style={{
          backgroundColor: '#fffbeb',
          color: '#d97706',
          borderColor: '#fde68a',
        }}
      >
        <Clock size={13} /> {normalized}
      </span>
    );
  };

  return (
    <div className={styles.container}>
      {/* Header Row */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <div className={styles.cloudPill}>
            <span className={styles.cloudDot} />
            Cloud Storage Active: Supabase CDN
          </div>
          <h1>Quản lý Điểm đến Du lịch (CMS)</h1>
          <p className={styles.subtitle}>
            Kho dữ liệu điểm đến toàn quốc dành cho Quản trị viên. Quản lý toàn bộ địa điểm ở mọi
            trạng thái (Bản nháp, Đã xuất bản, Từ chối, Lưu trữ) và đồng bộ hình ảnh lên đám mây.
          </p>
        </div>
        <div className={styles.actionArea}>
          <Link
            href="/image-manager"
            className={styles.btnSecondary}
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Sparkles size={16} color="#0284c7" />
            AI Image Manager
          </Link>
          <Link
            href="/moderation"
            className={styles.btnSecondary}
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <ShieldCheck size={16} color="#0284c7" />
            Kiểm duyệt điểm đến
          </Link>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => fetchDestinations()}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </button>
          <button
            id="btn-add-destination"
            type="button"
            className={styles.btnPrimary}
            onClick={handleOpenCreateModal}
          >
            <Plus size={18} />
            Thêm điểm đến mới
          </button>
        </div>
      </div>

      {/* Stats Ribbon */}
      <div className={styles.statsRibbon}>
        <div className={styles.statCard}>
          <div className={styles.statCardTitle}>Tổng số theo bộ lọc</div>
          <div className={styles.statCardVal}>{total}</div>
          <div className={styles.statCardSub}>✓ Truy vấn trực tiếp Admin API</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardTitle}>Lưu trữ đám mây</div>
          <div className={styles.statCardVal} style={{ color: '#0284c7' }}>
            100%
          </div>
          <div className={styles.statCardSub}>✓ Supabase vista-media</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardTitle}>Tỉnh thành phủ sóng</div>
          <div className={styles.statCardVal}>63</div>
          <div className={styles.statCardSub}>✓ Bắc - Trung - Nam</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardTitle}>Trạng thái đang lọc</div>
          <div className={styles.statCardVal} style={{ color: '#059669' }}>
            {statusFilter === 'ALL' ? 'Tất cả' : statusFilter}
          </div>
          <div className={styles.statCardSub}>✓ Hỗ trợ Soft Delete (Archived)</div>
        </div>
      </div>

      {/* Filter and Search Bar (P0-1) */}
      <form onSubmit={handleSearchSubmit} className={styles.filterBar}>
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Tìm kiếm điểm đến theo tên, từ khóa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          aria-label="Lọc theo tỉnh thành"
          className={styles.filterSelect}
          value={provinceFilter}
          onChange={(e) => {
            setProvinceFilter(e.target.value);
            setPage(0);
          }}
        >
          <option value="">Tất cả tỉnh thành</option>
          {PROVINCE_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          aria-label="Lọc theo danh mục"
          className={styles.filterSelect}
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setPage(0);
          }}
        >
          <option value="">Tất cả danh mục</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          aria-label="Lọc theo trạng thái"
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as AdminStatusFilter);
            setPage(0);
          }}
        >
          <option value="ALL">Tất cả trạng thái (ALL)</option>
          <option value="DRAFT">Chờ duyệt (DRAFT)</option>
          <option value="PUBLISHED">Đã xuất bản (PUBLISHED)</option>
          <option value="REJECTED">Đã từ chối (REJECTED)</option>
          <option value="ARCHIVED">Lưu trữ (ARCHIVED)</option>
        </select>

        <button type="submit" className={styles.btnSecondary}>
          Lọc kết quả
        </button>
      </form>

      {/* Destinations Table */}
      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.emptyState}>
            <RefreshCw size={32} className="animate-spin" style={{ color: '#0284c7' }} />
            <p>Đang tải danh sách điểm đến từ cơ sở dữ liệu...</p>
          </div>
        ) : error ? (
          <div className={styles.emptyState}>
            <AlertCircle size={36} style={{ color: '#ef4444' }} />
            <p style={{ color: '#ef4444', fontWeight: 600 }}>{error}</p>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => fetchDestinations()}
            >
              Thử lại
            </button>
          </div>
        ) : destinations.length === 0 ? (
          <div className={styles.emptyState}>
            <MapPin size={40} style={{ color: '#94a3b8' }} />
            <p style={{ fontWeight: 600 }}>Không tìm thấy điểm đến nào phù hợp</p>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={handleOpenCreateModal}
            >
              <Plus size={16} /> Thêm điểm đến đầu tiên
            </button>
          </div>
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Điểm đến</th>
                  <th>Tỉnh thành</th>
                  <th>Danh mục</th>
                  <th>Mức giá</th>
                  <th>Tọa độ GPS</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {destinations.map((dest) => {
                  const cloudSrc = getCloudImageUrl(dest.imageUrl);
                  return (
                    <tr key={dest.id}>
                      <td>
                        <div className={styles.destCell}>
                          {cloudSrc ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={cloudSrc}
                              alt={dest.name}
                              className={styles.destThumb}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=120&auto=format&fit=crop&q=80';
                              }}
                            />
                          ) : (
                            <div
                              className={styles.destThumb}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <ImageIcon size={20} color="#94a3b8" />
                            </div>
                          )}
                          <div>
                            <div className={styles.destName}>{dest.name}</div>
                            <div className={styles.destSlug}>ID: {dest.id.substring(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={styles.badgeProvince}>
                          <MapPin size={14} /> {dest.province || 'Việt Nam'}
                        </span>
                      </td>
                      <td>
                        <span className={styles.badgeCategory}>
                          {dest.category || 'Cảnh quan'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.priceTag}>
                          {dest.priceMin === 0 && dest.priceMax === 0 ? (
                            <span className={styles.priceFree}>Miễn phí</span>
                          ) : (
                            <span>
                              {formatVnd(dest.priceMin)}
                              {dest.priceMax &&
                                dest.priceMax !== dest.priceMin &&
                                ` - ${formatVnd(dest.priceMax)}`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {dest.latitude && dest.longitude ? (
                          <span
                            style={{
                              fontSize: '0.8rem',
                              color: '#64748b',
                              fontFamily: 'monospace',
                            }}
                          >
                            {dest.latitude.toFixed(3)}, {dest.longitude.toFixed(3)}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                      <td>{renderStatusBadge(dest.status)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            justifyContent: 'flex-end',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(dest)}
                            title={`Chỉnh sửa ${dest.name}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.4rem 0.7rem',
                              borderRadius: '8px',
                              border: '1px solid #bae6fd',
                              background: '#f0f9ff',
                              color: '#0369a1',
                              fontWeight: 600,
                              fontSize: '0.82rem',
                              cursor: 'pointer',
                            }}
                          >
                            <Pencil size={14} />
                            Sửa
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(dest)}
                            title={`Xóa ${dest.name}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.4rem 0.7rem',
                              borderRadius: '8px',
                              border: '1px solid #fecaca',
                              background: '#fef2f2',
                              color: '#dc2626',
                              fontWeight: 600,
                              fontSize: '0.82rem',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={14} />
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <PaginationBar
              page={page}
              totalPages={totalPages}
              size={size}
              total={total}
              onPageChange={(newPage) => setPage(newPage)}
              onSizeChange={(newSize) => {
                setSize(newSize);
                setPage(0);
              }}
            />
          </>
        )}
      </div>

      {/* Add / Edit Destination Modal (P1-2 & P2-3) */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => !submitting && setIsModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                <Sparkles size={20} color="#0284c7" />
                {editingId
                  ? 'Chỉnh sửa điểm đến du lịch'
                  : 'Thêm điểm đến mới (Tự động tải lên Cloud)'}
              </h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => !submitting && setIsModalOpen(false)}
                disabled={submitting}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitDestination} className={styles.modalForm}>
              <div className={styles.modalBody}>
                {loadingDetail && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: '#f0f9ff',
                      color: '#0369a1',
                      fontSize: '0.88rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <RefreshCw size={16} className="animate-spin" />
                    Đang tải dữ liệu chi tiết điểm đến...
                  </div>
                )}

                {formValidationError && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#dc2626',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>{formValidationError}</span>
                  </div>
                )}

                {/* Multi-Image Gallery Upload Dropzone (P2-3) */}
                <div className={styles.formGroup}>
                  <label>
                    Thư viện hình ảnh điểm đến (Ảnh đầu tiên là ảnh đại diện){' '}
                    <span className={styles.required}>*</span>
                  </label>
                  <div
                    className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      id="destination-image-input"
                      type="file"
                      accept="image/*"
                      multiple
                      className={styles.fileInputHidden}
                      onChange={handleFileChange}
                    />
                    <div className={styles.dropzoneIcon}>
                      <UploadCloud size={24} />
                    </div>
                    <p className={styles.dropzoneTitle}>
                      Kéo thả một hoặc nhiều ảnh vào đây, hoặc{' '}
                      <span style={{ textDecoration: 'underline' }}>bấm để chọn từ máy</span>
                    </p>
                    <p className={styles.dropzoneSub}>
                      Hỗ trợ PNG, JPG, WEBP lên đến 15MB/ảnh. Tự động đồng bộ lên Supabase Cloud
                      CDN.
                    </p>
                  </div>

                  {/* Preview Grid for Existing + Newly Selected Images */}
                  {(existingImageUrls.length > 0 || imagePreviews.length > 0) && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                        gap: '0.75rem',
                        marginTop: '0.75rem',
                      }}
                    >
                      {existingImageUrls.map((url, idx) => {
                        const cloudUrl = getCloudImageUrl(url) || url;
                        const isPrimary = idx === 0;
                        return (
                          <div
                            key={`existing-${idx}-${url}`}
                            style={{
                              position: 'relative',
                              borderRadius: '10px',
                              overflow: 'hidden',
                              border: isPrimary ? '2px solid #0284c7' : '1px solid #cbd5e1',
                              background: '#f8fafc',
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={cloudUrl}
                              alt={`Ảnh ${idx + 1}`}
                              style={{ width: '100%', height: '95px', objectFit: 'cover' }}
                            />
                            {isPrimary && (
                              <span
                                style={{
                                  position: 'absolute',
                                  top: '6px',
                                  left: '6px',
                                  background: '#0284c7',
                                  color: '#fff',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                }}
                              >
                                Đại diện
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => removeExistingImageAt(idx)}
                              disabled={submitting}
                              title="Xóa ảnh này"
                              style={{
                                position: 'absolute',
                                top: '6px',
                                right: '6px',
                                background: 'rgba(15, 23, 42, 0.75)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        );
                      })}

                      {imagePreviews.map((previewUrl, idx) => {
                        const isPrimary = existingImageUrls.length === 0 && idx === 0;
                        return (
                          <div
                            key={`new-${idx}-${previewUrl}`}
                            style={{
                              position: 'relative',
                              borderRadius: '10px',
                              overflow: 'hidden',
                              border: isPrimary ? '2px solid #0284c7' : '1px solid #93c5fd',
                              background: '#f0f9ff',
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={previewUrl}
                              alt={`Ảnh mới ${idx + 1}`}
                              style={{ width: '100%', height: '95px', objectFit: 'cover' }}
                            />
                            <span
                              style={{
                                position: 'absolute',
                                top: '6px',
                                left: '6px',
                                background: isPrimary ? '#0284c7' : '#059669',
                                color: '#fff',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '6px',
                              }}
                            >
                              {isPrimary ? 'Đại diện (Mới)' : 'Ảnh mới'}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeNewImageAt(idx)}
                              disabled={submitting}
                              title="Xóa ảnh này"
                              style={{
                                position: 'absolute',
                                top: '6px',
                                right: '6px',
                                background: 'rgba(15, 23, 42, 0.75)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className={styles.formGrid}>
                  {/* Name */}
                  <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label>
                      Tên điểm đến <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="Ví dụ: Cầu Vàng Bà Nà Hills, Phố cổ Hội An..."
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                    />
                  </div>

                  {/* Province */}
                  <div className={styles.formGroup}>
                    <label>
                      Tỉnh / Thành phố <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      list="provinces-list"
                      className={styles.formInput}
                      placeholder="Chọn hoặc nhập tỉnh thành..."
                      value={formProvince}
                      onChange={(e) => setFormProvince(e.target.value)}
                      required
                    />
                    <datalist id="provinces-list">
                      {PROVINCE_OPTIONS.map((p) => (
                        <option key={p} value={p} />
                      ))}
                    </datalist>
                  </div>

                  {/* Category */}
                  <div className={styles.formGroup}>
                    <label>Danh mục</label>
                    <select
                      className={styles.formSelect}
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                    >
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Price Min & Max */}
                  <div className={styles.formGroup}>
                    <label>Giá vé tối thiểu (VND)</label>
                    <input
                      type="number"
                      className={styles.formInput}
                      placeholder="0"
                      min="0"
                      step="1000"
                      value={formPriceMin}
                      onChange={(e) => setFormPriceMin(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Giá vé tối đa (VND)</label>
                    <input
                      type="number"
                      className={styles.formInput}
                      placeholder="0"
                      min="0"
                      step="1000"
                      value={formPriceMax}
                      onChange={(e) => setFormPriceMax(e.target.value)}
                    />
                  </div>

                  {/* Coordinates Lat / Lng */}
                  <div className={styles.formGroup}>
                    <label>Vĩ độ (Latitude)</label>
                    <input
                      type="number"
                      step="0.000001"
                      className={styles.formInput}
                      placeholder="16.061100"
                      value={formLatitude}
                      onChange={(e) => setFormLatitude(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Kinh độ (Longitude)</label>
                    <input
                      type="number"
                      step="0.000001"
                      className={styles.formInput}
                      placeholder="108.227200"
                      value={formLongitude}
                      onChange={(e) => setFormLongitude(e.target.value)}
                    />
                  </div>

                  {/* Opening hours */}
                  <div className={styles.formGroup}>
                    <label>Giờ mở cửa</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="07:30 - 17:30 hoặc 24/7"
                      value={formOpeningHours}
                      onChange={(e) => setFormOpeningHours(e.target.value)}
                    />
                  </div>

                  {/* Source Website URL */}
                  <div className={styles.formGroup}>
                    <label>Website tham khảo</label>
                    <input
                      type="url"
                      className={styles.formInput}
                      placeholder="https://..."
                      value={formSourceUrl}
                      onChange={(e) => setFormSourceUrl(e.target.value)}
                    />
                  </div>

                  {/* Description */}
                  <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label>Mô tả chi tiết điểm đến</label>
                    <textarea
                      className={styles.formTextarea}
                      rows={3}
                      placeholder="Giới thiệu điểm nổi bật, lịch sử văn hóa hoặc trải nghiệm đặc sắc..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Hủy bỏ
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={submitting}>
                  {submitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      {submitStep || 'Đang xử lý...'}
                    </>
                  ) : (
                    <>
                      <UploadCloud size={18} />
                      {editingId ? 'Lưu cập nhật điểm đến' : 'Thêm địa điểm (Đăng tải lên Cloud)'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog (P1-3) */}
      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={() => !deleting && setDeleteTarget(null)}>
          <div
            className={styles.modalContent}
            style={{ maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 style={{ color: '#dc2626' }}>
                <AlertCircle size={20} color="#dc2626" />
                Xác nhận xóa điểm đến
              </h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => !deleting && setDeleteTarget(null)}
                disabled={deleting}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ margin: 0, fontSize: '0.95rem', color: '#334155', lineHeight: 1.6 }}>
                Bạn có chắc muốn xóa địa điểm <strong>{deleteTarget.name}</strong>? Hành động này
                không thể hoàn tác.
              </p>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5 }}>
                Lưu ý: Nếu địa điểm đang được tham chiếu trong lịch trình, đánh giá, bài viết hoặc
                đề xuất, hệ thống sẽ tự động chuyển địa điểm sang trạng thái{' '}
                <strong>Lưu trữ (Archived)</strong> để bảo toàn dữ liệu.
              </p>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: '#dc2626',
                  color: '#ffffff',
                  padding: '0.7rem 1.25rem',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  border: 'none',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                }}
              >
                {deleting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Xác nhận xóa
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`${styles.toast} ${
            toast.type === 'error' ? styles.toastError : styles.toastSuccess
          }`}
        >
          {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
