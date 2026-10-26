'use client';

import type { GeolocationStatus } from '../types';
import { MapIcon } from './MapIcon';
import styles from './GPSPermissionBar.module.css';

export function GPSPermissionBar({
  status,
  hasPosition,
  onRequestPermission,
  onDismiss,
  errorMessage,
  automaticEnabled,
}: {
  status: GeolocationStatus;
  hasPosition?: boolean;
  onRequestPermission: () => void;
  onDismiss?: () => void;
  errorMessage?: string | null;
  automaticEnabled?: boolean;
}) {
  const failed = ['denied', 'unavailable', 'timeout', 'unsupported'].includes(
    status,
  );
  const title = failed
    ? status === 'denied'
      ? 'Quyền vị trí đang bị chặn'
      : 'Chưa thể xác định vị trí'
    : hasPosition
      ? 'Đã hiển thị vị trí của bạn trên bản đồ'
      : 'Cho phép VISTA dùng vị trí khi bạn mở bản đồ';
  return (
    <aside
      className={`${styles.bar} ${failed ? styles.warning : ''}`}
      aria-label="Quyền định vị"
    >
      <span className={styles.icon}>
        <MapIcon name="pin" size={27} />
      </span>
      <div className={styles.copy} aria-live="polite">
        <strong>
          {status === 'requesting' ? 'Đang xác định vị trí…' : title}
        </strong>
        <p>
          {failed
            ? errorMessage || 'Bạn vẫn có thể xem danh sách và bản đồ.'
            : 'Hiển thị vị trí hiện tại và tính đường đi. Khi bạn tính tuyến, tọa độ được gửi đến dịch vụ chỉ đường; không tự chia sẻ cho nhóm.'}
        </p>
      </div>
      <div className={styles.actions}>
        <button
          className={styles.primary}
          disabled={status === 'requesting' || status === 'unsupported'}
          onClick={onRequestPermission}
        >
          <MapIcon name="locate" size={18} />
          {hasPosition
            ? 'Cập nhật vị trí'
            : status === 'denied'
              ? 'Thử lại'
              : status === 'requesting'
                ? 'Đang tìm vị trí…'
                : failed
                  ? 'Thử lại định vị'
                  : 'Cho phép định vị'}
        </button>
        {onDismiss && (
          <button className={styles.secondary} onClick={onDismiss}>
            {automaticEnabled ? 'Tắt tự định vị' : failed ? 'Đóng' : 'Để sau'}
          </button>
        )}
      </div>
    </aside>
  );
}
