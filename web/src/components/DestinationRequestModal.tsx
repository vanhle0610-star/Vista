'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { submitDestinationRequest } from '@/services/destinationRequestApi';

interface InitialDestinationData {
  id: string;
  name: string;
  province?: string;
  category?: string;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  priceMin?: number | null;
  priceMax?: number | null;
  sourceUrl?: string | null;
  imageUrl?: string | null;
}

interface DestinationRequestModalProps {
  mode: 'CREATE' | 'UPDATE';
  initialDestination?: InitialDestinationData | null;
  defaultProvince?: string;
  defaultCoords?: { latitude: number; longitude: number } | null;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export function DestinationRequestModal({
  mode,
  initialDestination,
  defaultProvince = 'Đà Nẵng',
  defaultCoords,
  onClose,
  onSuccess,
}: DestinationRequestModalProps) {
  const [name, setName] = useState(initialDestination?.name ?? '');
  const [provinceName, setProvinceName] = useState(
    initialDestination?.province ?? defaultProvince,
  );
  const [categoryName, setCategoryName] = useState(
    initialDestination?.category ?? 'Cảnh quan',
  );
  const [description, setDescription] = useState(initialDestination?.description ?? '');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(
    initialDestination?.latitude != null
      ? String(initialDestination.latitude)
      : defaultCoords
        ? String(defaultCoords.latitude)
        : '16.054400',
  );
  const [longitude, setLongitude] = useState(
    initialDestination?.longitude != null
      ? String(initialDestination.longitude)
      : defaultCoords
        ? String(defaultCoords.longitude)
        : '108.202200',
  );
  const [priceMin, setPriceMin] = useState(
    initialDestination?.priceMin != null ? String(initialDestination.priceMin) : '',
  );
  const [priceMax, setPriceMax] = useState(
    initialDestination?.priceMax != null ? String(initialDestination.priceMax) : '',
  );
  const [imageUrl, setImageUrl] = useState(initialDestination?.imageUrl ?? '');
  const [sourceUrl, setSourceUrl] = useState(initialDestination?.sourceUrl ?? '');
  const [note, setNote] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needAuth, setNeedAuth] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('vista_token') || localStorage.getItem('vista_access_token')
        : null;
    if (!token) {
      setNeedAuth(true);
      setError('Vui lòng đăng nhập để gửi đề xuất cho quản trị viên.');
      return;
    }

    const latNum = latitude.trim() ? Number(latitude) : null;
    const lngNum = longitude.trim() ? Number(longitude) : null;
    const minNum = priceMin.trim() ? Number(priceMin) : null;
    const maxNum = priceMax.trim() ? Number(priceMax) : null;

    if (mode === 'CREATE') {
      if (!name.trim() || !provinceName.trim()) {
        setError('Vui lòng nhập đầy đủ tên địa điểm và tỉnh/thành.');
        return;
      }
      if (latNum == null || Number.isNaN(latNum) || lngNum == null || Number.isNaN(lngNum)) {
        setError('Tọa độ GPS không hợp lệ.');
        return;
      }
    }

    if (latNum != null && (latNum < -90 || latNum > 90)) {
      setError('Vĩ độ phải nằm trong khoảng [-90, 90].');
      return;
    }
    if (lngNum != null && (lngNum < -180 || lngNum > 180)) {
      setError('Kinh độ phải nằm trong khoảng [-180, 180].');
      return;
    }
    if (minNum != null && minNum < 0) {
      setError('Giá vé tối thiểu không được âm.');
      return;
    }
    if (minNum != null && maxNum != null && maxNum < minNum) {
      setError('Giá vé tối đa phải lớn hơn hoặc bằng giá vé tối thiểu.');
      return;
    }

    try {
      setSubmitting(true);
      await submitDestinationRequest({
        requestType: mode,
        targetDestinationId: mode === 'UPDATE' ? initialDestination?.id ?? null : null,
        name: name.trim() || null,
        provinceName: provinceName.trim() || null,
        categoryName: categoryName.trim() || null,
        description: description.trim() || null,
        address: address.trim() || null,
        latitude: latNum,
        longitude: lngNum,
        priceMin: minNum,
        priceMax: maxNum,
        imageUrls: imageUrl.trim() ? [imageUrl.trim()] : null,
        sourceUrl: sourceUrl.trim() || null,
        note: note.trim() || null,
      });
      onSuccess?.(
        mode === 'CREATE'
          ? 'Đã gửi đề xuất thêm địa điểm! Quản trị viên sẽ kiểm duyệt sớm.'
          : 'Đã gửi yêu cầu cập nhật thông tin địa điểm!',
      );
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể gửi yêu cầu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={() => !submitting && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#ffffff',
          borderRadius: 18,
          padding: 24,
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.28)',
          color: '#0f172a',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>
            {mode === 'CREATE' ? 'Đề xuất thêm địa điểm còn thiếu' : 'Đề xuất cập nhật thông tin'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              background: '#f1f5f9',
              color: '#334155',
              border: 'none',
              borderRadius: 999,
              width: 32,
              height: 32,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ margin: '0 0 14px 0', fontSize: 13.5, color: '#475569' }}>
          {mode === 'CREATE'
            ? 'Đóng góp địa điểm mới chưa có trên bản đồ VISTA. Yêu cầu sẽ được kiểm duyệt trước khi hiển thị công khai.'
            : `Đề xuất chỉnh sửa thông tin cho "${initialDestination?.name}". Dữ liệu gốc sẽ không thay đổi cho đến khi Admin phê duyệt.`}
        </p>

        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '10px 12px',
              borderRadius: 10,
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            {error}{' '}
            {needAuth && (
              <Link href="/login" style={{ color: '#0284c7', fontWeight: 700, textDecoration: 'underline' }}>
                Đăng nhập ngay →
              </Link>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={{ display: 'grid', gap: 4, fontSize: 13, fontWeight: 600 }}>
              Tên địa điểm {mode === 'CREATE' && '*'}
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={mode === 'CREATE'}
                placeholder="VD: Bãi Rạn Nam Ô"
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 13, fontWeight: 600 }}>
              Tỉnh / Thành {mode === 'CREATE' && '*'}
              <input
                type="text"
                value={provinceName}
                onChange={(e) => setProvinceName(e.target.value)}
                required={mode === 'CREATE'}
                placeholder="VD: Đà Nẵng"
                style={inputStyle}
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={{ display: 'grid', gap: 4, fontSize: 13, fontWeight: 600 }}>
              Danh mục
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Cảnh quan, Ẩm thực, Di tích..."
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 13, fontWeight: 600 }}>
              Địa chỉ
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Số nhà, đường, quận/huyện..."
                style={inputStyle}
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={{ display: 'grid', gap: 4, fontSize: 13, fontWeight: 600 }}>
              Vĩ độ (Latitude) {mode === 'CREATE' && '*'}
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                required={mode === 'CREATE'}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 13, fontWeight: 600 }}>
              Kinh độ (Longitude) {mode === 'CREATE' && '*'}
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                required={mode === 'CREATE'}
                style={inputStyle}
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={{ display: 'grid', gap: 4, fontSize: 13, fontWeight: 600 }}>
              Giá vé tối thiểu (VNĐ)
              <input
                type="number"
                min={0}
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder="0"
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 13, fontWeight: 600 }}>
              Giá vé tối đa (VNĐ)
              <input
                type="number"
                min={0}
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="0"
                style={inputStyle}
              />
            </label>
          </div>

          <label style={{ display: 'grid', gap: 4, fontSize: 13, fontWeight: 600 }}>
            Mô tả địa điểm
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả ngắn gọn điểm nổi bật, thời điểm đẹp nhất..."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={{ display: 'grid', gap: 4, fontSize: 13, fontWeight: 600 }}>
              Link ảnh minh họa
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 13, fontWeight: 600 }}>
              Nguồn tham khảo
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
                style={inputStyle}
              />
            </label>
          </div>

          <label style={{ display: 'grid', gap: 4, fontSize: 13, fontWeight: 600 }}>
            Ghi chú / Lý do gửi yêu cầu
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                mode === 'CREATE'
                  ? 'Ví dụ: Địa điểm check-in mới nổi ở Sơn Trà...'
                  : 'Ví dụ: Giá vé vừa tăng lên 60.000đ từ tháng này...'
              }
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                background: '#f1f5f9',
                color: '#334155',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '10px 18px',
                borderRadius: 10,
                background: '#087fbe',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Đang gửi...' : 'Gửi đề xuất'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  fontSize: 13.5,
  color: '#0f172a',
  boxSizing: 'border-box',
};
