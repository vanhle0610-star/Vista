'use client';

import React, { useEffect, useState, useRef, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus,
  UploadCloud,
  Search,
  MapPin,
  Tag,
  DollarSign,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  RefreshCw,
  ImageIcon,
} from 'lucide-react';
import { getCloudImageUrl, uploadFileToCloud } from '@/utils/cloudImage';
import styles from './destinations.module.css';

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
  'Cảnh quan & Văn hóa',
  'Khu vui chơi & Nghỉ dưỡng',
  'Tâm linh & Sinh thái',
  'Biển & Thiên nhiên',
  'Di tích & Khám phá',
  'Bảo tàng & Lịch sử',
  'Ẩm thực & Mua sắm',
  'Cảnh quan & Check-in',
  'Thư giãn & Nghỉ dưỡng',
  'Thiên nhiên & Phượt',
];

export default function DestinationsAdminPage() {
  const [destinations, setDestinations] = useState<DestinationSummary[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitStep, setSubmitStep] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState<string>('');
  const [formProvince, setFormProvince] = useState<string>('Đà Nẵng');
  const [formCategory, setFormCategory] = useState<string>('Cảnh quan & Văn hóa');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formPriceMin, setFormPriceMin] = useState<string>('0');
  const [formPriceMax, setFormPriceMax] = useState<string>('0');
  const [formOpeningHours, setFormOpeningHours] = useState<string>('07:30 - 17:30');
  const [formLatitude, setFormLatitude] = useState<string>('16.0611');
  const [formLongitude, setFormLongitude] = useState<string>('108.2272');
  const [formSourceUrl, setFormSourceUrl] = useState<string>('');

  // Image Upload State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const getApiBase = () => {
    return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/+$/, '');
  };

  // Fetch Destination Catalog
  const fetchDestinations = async () => {
    try {
      setLoading(true);
      setError(null);
      const apiBase = getApiBase();
      const queryParams = new URLSearchParams({
        page: '0',
        size: '100',
      });
      if (searchKeyword.trim()) queryParams.set('keyword', searchKeyword.trim());
      if (selectedProvince) queryParams.set('province', selectedProvince);
      if (selectedCategory) queryParams.set('category', selectedCategory);

      const res = await fetch(`${apiBase}/destinations?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error(`Lỗi tải danh sách: HTTP ${res.status}`);
      }
      const data: DestinationPageResponse = await res.json();
      setDestinations(data.items || []);
      setTotalCount(data.total || (data.items ? data.items.length : 0));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể kết nối đến máy chủ';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestinations();
  }, [selectedProvince, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDestinations();
  };

  // Handle Image File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processSelectedFile(files[0]);
    }
  };

  const processSelectedFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn một tệp hình ảnh hợp lệ (PNG, JPG, WEBP)!', 'error');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      showToast('Kích thước ảnh tối đa là 15MB', 'error');
      return;
    }
    setImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const removeSelectedImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Form Submission
  const handleSubmitDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Vui lòng nhập tên điểm đến', 'error');
      return;
    }
    if (!formProvince.trim()) {
      showToast('Vui lòng chọn hoặc nhập tỉnh thành', 'error');
      return;
    }

    try {
      setSubmitting(true);
      let cloudImageUrl = '';

      // Bước 1: Tự động tải ảnh lên Cloud Storage nếu người dùng chọn file
      if (imageFile) {
        setSubmitStep('Đang tối ưu & đẩy ảnh lên Cloud Storage (Supabase CDN)...');
        cloudImageUrl = await uploadFileToCloud(imageFile, 'destinations');
      }

      // Bước 2: Lưu điểm đến vào cơ sở dữ liệu qua Spring Boot API
      setSubmitStep('Đang lưu thông tin điểm đến vào hệ thống VISTA...');
      const apiBase = getApiBase();
      const token = localStorage.getItem('vista_token');

      const payload = {
        name: formName.trim(),
        province: formProvince.trim(),
        category: formCategory.trim(),
        description: formDescription.trim(),
        imageUrl: cloudImageUrl || null,
        latitude: formLatitude ? parseFloat(formLatitude) : null,
        longitude: formLongitude ? parseFloat(formLongitude) : null,
        priceMin: formPriceMin ? parseFloat(formPriceMin) : 0,
        priceMax: formPriceMax ? parseFloat(formPriceMax) : 0,
        openingHours: formOpeningHours.trim(),
        sourceUrl: formSourceUrl.trim() || null,
        status: 'PUBLISHED',
      };

      const res = await fetch(`${apiBase}/destinations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `Lỗi HTTP ${res.status}`);
      }

      showToast(`Điểm đến "${formName}" đã được tạo và ảnh lưu trữ trên Cloud thành công!`);

      // Reset Form
      setFormName('');
      setFormDescription('');
      removeSelectedImage();
      setIsModalOpen(false);

      // Re-fetch list
      await fetchDestinations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi tạo điểm đến';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
      setSubmitStep(null);
    }
  };

  const formatVnd = (amount?: number | null) => {
    if (amount === null || amount === undefined || amount === 0) return 'Miễn phí';
    return `${new Intl.NumberFormat('vi-VN').format(amount)} đ`;
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
            Kho dữ liệu điểm đến toàn quốc. Mọi hình ảnh bạn tải lên được lưu trữ trực tiếp trên đám mây, 
            tối ưu băng thông và hiển thị mượt mà trên toàn bộ bản đồ và lịch trình AI.
          </p>
        </div>
        <div className={styles.actionArea}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={fetchDestinations}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={18} />
            Thêm điểm đến mới
          </button>
        </div>
      </div>

      {/* Stats Ribbon */}
      <div className={styles.statsRibbon}>
        <div className={styles.statCard}>
          <div className={styles.statCardTitle}>Tổng số điểm đến</div>
          <div className={styles.statCardVal}>{totalCount || destinations.length}</div>
          <div className={styles.statCardSub}>✓ Đã lập chỉ mục tìm kiếm</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardTitle}>Lưu trữ đám mây</div>
          <div className={styles.statCardVal} style={{ color: '#0284c7' }}>100%</div>
          <div className={styles.statCardSub}>✓ Supabase vista-media</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardTitle}>Tỉnh thành phủ sóng</div>
          <div className={styles.statCardVal}>63</div>
          <div className={styles.statCardSub}>✓ Bắc - Trung - Nam</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardTitle}>Trạng thái hệ thống</div>
          <div className={styles.statCardVal} style={{ color: '#059669' }}>Hoạt động</div>
          <div className={styles.statCardSub}>✓ Sẵn sàng cho AI Planner</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <form onSubmit={handleSearchSubmit} className={styles.filterBar}>
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Tìm kiếm điểm đến theo tên, từ khóa..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
        </div>
        <select
          className={styles.filterSelect}
          value={selectedProvince}
          onChange={(e) => setSelectedProvince(e.target.value)}
        >
          <option value="">Tất cả tỉnh thành</option>
          {PROVINCE_OPTIONS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">Tất cả danh mục</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
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
            <button type="button" className={styles.btnSecondary} onClick={fetchDestinations}>
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
              onClick={() => setIsModalOpen(true)}
            >
              <Plus size={16} /> Thêm điểm đến đầu tiên
            </button>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Điểm đến</th>
                <th>Tỉnh thành</th>
                <th>Danh mục</th>
                <th>Mức giá</th>
                <th>Tọa độ GPS</th>
                <th>Trạng thái</th>
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
                          <div className={styles.destThumb} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                            {dest.priceMax && dest.priceMax !== dest.priceMin && (
                              ` - ${formatVnd(dest.priceMax)}`
                            )}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {dest.latitude && dest.longitude ? (
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontFamily: 'monospace' }}>
                          {dest.latitude.toFixed(3)}, {dest.longitude.toFixed(3)}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={styles.badgeStatus}>
                        <CheckCircle2 size={13} /> {dest.status || 'PUBLISHED'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Destination Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => !submitting && setIsModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                <Sparkles size={20} color="#0284c7" />
                Thêm điểm đến mới (Tự động tải lên Cloud)
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

            <form onSubmit={handleSubmitDestination}>
              <div className={styles.modalBody}>
                {/* Image Upload Dropzone */}
                <div className={styles.formGroup}>
                  <label>
                    Hình ảnh đại diện <span className={styles.required}>*</span>
                  </label>
                  {!imagePreview ? (
                    <div
                      className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className={styles.fileInputHidden}
                        onChange={handleFileChange}
                      />
                      <div className={styles.dropzoneIcon}>
                        <UploadCloud size={24} />
                      </div>
                      <p className={styles.dropzoneTitle}>
                        Kéo thả ảnh vào đây, hoặc <span style={{ textDecoration: 'underline' }}>bấm để chọn từ máy</span>
                      </p>
                      <p className={styles.dropzoneSub}>
                        Hỗ trợ PNG, JPG, WEBP lên đến 15MB. Ảnh sẽ được tự động đồng bộ lên Supabase Cloud CDN.
                      </p>
                    </div>
                  ) : (
                    <div className={styles.previewCard}>
                      <img src={imagePreview} alt="Preview" className={styles.previewThumb} />
                      <div className={styles.previewInfo}>
                        <div className={styles.previewName}>{imageFile?.name || 'Tệp ảnh đã chọn'}</div>
                        <div className={styles.previewMeta}>
                          Kích thước: {((imageFile?.size || 0) / 1024 / 1024).toFixed(2)} MB • Sẵn sàng đẩy lên Cloud
                        </div>
                        <div className={styles.cloudUploadBadge}>
                          <Sparkles size={12} /> Tự động đẩy lên bucket: vista-media/destinations
                        </div>
                      </div>
                      <button
                        type="button"
                        className={styles.btnRemoveImage}
                        onClick={removeSelectedImage}
                        disabled={submitting}
                      >
                        Đổi ảnh khác
                      </button>
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
                        <option key={c} value={c}>{c}</option>
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
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      {submitStep || 'Đang xử lý...'}
                    </>
                  ) : (
                    <>
                      <UploadCloud size={18} />
                      Đăng tải lên Cloud & Lưu điểm đến
                    </>
                  )}
                </button>
              </div>
            </form>
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
