'use client';

import React from 'react';
import type { GeolocationState } from '../types';

interface PermissionCardProps {
  geoState: GeolocationState;
  onRequestPosition: () => void;
  onToggleWatch: () => void;
  onDismiss: () => void;
}

export function PermissionCard({
  geoState,
  onRequestPosition,
  onToggleWatch,
  onDismiss,
}: PermissionCardProps) {
  const { status, coords, errorMessage, isWatching, isPageHidden, lastUpdated } = geoState;

  const renderStatusBadge = () => {
    switch (status) {
      case 'granted':
        return <span className="status-badge success">✓ Đã cấp quyền (Granted)</span>;
      case 'denied':
        return <span className="status-badge error">✕ Bị từ chối (Denied)</span>;
      case 'requesting':
        return <span className="status-badge warning">⏳ Đang lấy GPS...</span>;
      case 'unavailable':
        return <span className="status-badge error">⚠ Tín hiệu GPS không khả dụng</span>;
      case 'timeout':
        return <span className="status-badge warning">⏱ Hết thời gian chờ (Timeout)</span>;
      case 'unsupported':
        return <span className="status-badge error">✕ Trình duyệt không hỗ trợ</span>;
      default:
        return <span className="status-badge neutral">○ Chưa yêu cầu quyền</span>;
    }
  };

  return (
    <div className="card vista-permission-card">
      {/* Icon Vị trí nét mảnh */}
      <div className="permission-icon-box">
        <svg
          width="42"
          height="42"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="location-pin-svg"
        >
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </div>

      <div className="permission-title-group">
        <h2 className="permission-title">Cho phép truy cập vị trí?</h2>
        <div className="permission-badge-row">{renderStatusBadge()}</div>
      </div>

      <div className="permission-explain-box">
        <p className="explain-text">
          Vị trí của bạn được sử dụng để <strong>xác định bạn trên bản đồ khi đang mở trang</strong> và hỗ trợ hiển thị khoảng cách tới các điểm du lịch xung quanh.
        </p>
        <div className="privacy-notice-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          </svg>
          <span>Cam kết bảo mật: <strong>Không tự ý chia sẻ vị trí</strong> cho nhóm hay bất kỳ ai khi chưa có sự đồng ý của bạn.</span>
        </div>
      </div>

      {/* Thông báo lỗi & Hướng dẫn xử lý */}
      {errorMessage && (
        <div className="error-alert-box">
          <div className="error-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <strong>Thông báo từ hệ thống GPS:</strong>
          </div>
          <p className="error-text">{errorMessage}</p>
          {status === 'denied' && (
            <div className="unblock-guide">
              <span className="unblock-guide-title">Cách gỡ chặn quyền trên trình duyệt:</span>
              <ol className="unblock-steps">
                <li>Nhấn vào biểu tượng <strong>ổ khóa (Tune/Lock)</strong> bên trái thanh địa chỉ URL.</li>
                <li>Tìm mục <strong>Vị trí (Location)</strong> và chuyển sang <strong>Cho phép (Allow)</strong>.</li>
                <li>Tải lại trang (F5) để áp dụng quyền mới.</li>
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Cảnh báo Page Visibility nếu tab đang ẩn */}
      {isPageHidden && (
        <div className="visibility-warning-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
          <span>Tab đang ở chế độ nền: Watcher tạm dừng để tiết kiệm pin.</span>
        </div>
      )}

      {/* Tọa độ hiện tại nếu đã cấp quyền */}
      {coords && (
        <div className="coords-detail-card">
          <div className="coords-header">
            <span className="coords-label">Tọa độ GPS thiết bị</span>
            <span className="coords-time" suppressHydrationWarning>
              {lastUpdated ? new Date(lastUpdated).toLocaleTimeString('vi-VN') : 'Vừa xong'}
            </span>
          </div>
          <div className="coords-grid">
            <div className="coord-item">
              <span className="coord-sub">Vĩ độ (Lat)</span>
              <span className="coord-val">{coords.latitude.toFixed(6)}°</span>
            </div>
            <div className="coord-item">
              <span className="coord-sub">Kinh độ (Lng)</span>
              <span className="coord-val">{coords.longitude.toFixed(6)}°</span>
            </div>
            <div className="coord-item">
              <span className="coord-sub">Độ chính xác</span>
              <span className="coord-val">±{coords.accuracy} mét</span>
            </div>
            <div className="coord-item">
              <span className="coord-sub">Chế độ</span>
              <span className="coord-val">{isWatching ? '📡 Theo dõi liên tục' : '📍 Lấy 1 lần'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Nút hành động */}
      <div className="permission-actions-group">
        <button
          type="button"
          onClick={onRequestPosition}
          className="btn-pill-primary"
          disabled={status === 'requesting'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
          <span>{status === 'granted' ? 'Cập nhật lại vị trí' : 'Cho phép định vị'}</span>
        </button>

        {status === 'granted' ? (
          <button
            type="button"
            onClick={onToggleWatch}
            className={`btn-pill-secondary ${isWatching ? 'active-watching' : ''}`}
          >
            {isWatching ? '⏹ Dừng theo dõi liên tục' : '📡 Bật theo dõi liên tục (Watch)'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onDismiss}
            className="btn-pill-secondary"
          >
            Để sau
          </button>
        )}
      </div>
    </div>
  );
}
