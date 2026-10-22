'use client';

import React from 'react';
import type { Coordinates, SyncDevice } from '../types';

interface TwoDeviceSyncCardProps {
  userCoords: Coordinates | null;
  partnerDevice: SyncDevice;
  isOptInShared: boolean;
  intervalSeconds: number;
  countdown: number;
  syncCount: number;
  isSyncing: boolean;
  onToggleOptIn: () => void;
  onChangeInterval: (seconds: number) => void;
  onTriggerSync: () => void;
}

export function TwoDeviceSyncCard({
  userCoords,
  partnerDevice,
  isOptInShared,
  intervalSeconds,
  countdown,
  syncCount,
  isSyncing,
  onToggleOptIn,
  onChangeInterval,
  onTriggerSync,
}: TwoDeviceSyncCardProps) {
  return (
    <div className="card vista-sync-card">
      <div className="sync-header-group">
        <div className="sync-icon-pill">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 2.1l4 4-4 4" />
            <path d="M3 12.6v-2.3a4.7 4.7 0 0 1 4.7-4.7H21" />
            <path d="M7 21.9l-4-4 4-4" />
            <path d="M21 11.4v2.3a4.7 4.7 0 0 1-4.7 4.7H3" />
          </svg>
        </div>
        <div className="sync-title-box">
          <h3 className="sync-title">Thử nghiệm Cập nhật Vị trí Hai Thiết bị (10–15s)</h3>
          <p className="sync-subtitle">
            Mô phỏng chu kỳ chia sẻ tọa độ nhóm có đồng thuận (Opt-in) cho thành viên đi chung lộ trình.
          </p>
        </div>
      </div>

      {/* Ranh giới kỹ thuật & Cảnh báo Mock */}
      <div className="sync-disclaimer-box">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>
          <strong>Ghi chú kỹ thuật:</strong> Đang dùng <em>Transport Mock</em> cục bộ trong phiên dev. Frontend <strong>không truy vấn trực tiếp bảng Supabase</strong> để đi vòng backend, <strong>không chứa service-role key</strong>. Chưa kiểm chứng trên 2 thiết bị thật (sẽ đo kiểm độ trễ & hao pin khi TV2 hoàn thiện API location_shares).
        </span>
      </div>

      {/* Điều khiển Chia sẻ & Chu kỳ */}
      <div className="sync-controls-row">
        {/* Nút Toggle Đồng thuận (Opt-in) */}
        <div className="opt-in-wrapper">
          <label className="opt-in-toggle-label">
            <input
              type="checkbox"
              checked={isOptInShared}
              onChange={onToggleOptIn}
              className="opt-in-checkbox"
            />
            <span className="toggle-slider round" />
            <span className="opt-in-text">
              {isOptInShared ? 'Đang chia sẻ vị trí (Opt-in BẬT)' : 'Đồng ý chia sẻ vị trí (Opt-in)'}
            </span>
          </label>
        </div>

        {/* Lựa chọn chu kỳ 10s - 15s */}
        <div className="interval-selector">
          <span className="interval-label">Chu kỳ Polling:</span>
          <div className="interval-btns">
            {[10, 12, 15].map((sec) => (
              <button
                key={sec}
                type="button"
                className={`interval-btn ${intervalSeconds === sec ? 'active' : ''}`}
                onClick={() => onChangeInterval(sec)}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Trạng thái đếm ngược & Tiến độ */}
      {isOptInShared ? (
        <div className="sync-active-status-bar">
          <div className="countdown-pill">
            <span className="countdown-dot pulse" />
            <span>Đồng bộ tiếp theo sau: <strong>{countdown}s</strong></span>
          </div>
          <div className="sync-meta-info">
            <span>Tổng số nhịp đã gửi: <strong>#{syncCount}</strong></span>
            {isSyncing && <span className="syncing-indicator">Đang truyền gói tin...</span>}
          </div>
          <button
            type="button"
            onClick={onTriggerSync}
            className="btn-trigger-sync"
            disabled={isSyncing}
          >
            Gửi nhịp ngay ⚡
          </button>
        </div>
      ) : (
        <div className="sync-inactive-status-bar">
          <span>⚪ Chế độ chia sẻ đang tắt. Nhấn nút gạt phía trên để bắt đầu thử nghiệm đồng bộ 2 thiết bị.</span>
        </div>
      )}

      {/* Bảng so sánh 2 thiết bị */}
      <div className="devices-grid">
        {/* Thiết bị A */}
        <div className="device-card me">
          <div className="device-header">
            <div className="device-avatar me-bg">A</div>
            <div>
              <h4 className="device-name">Thiết bị A (Bản thân bạn)</h4>
              <span className="device-role">Trình duyệt hiện tại</span>
            </div>
          </div>
          <div className="device-body">
            <div className="device-stat">
              <span>Tọa độ:</span>
              <strong>
                {userCoords
                  ? `${userCoords.latitude.toFixed(5)}, ${userCoords.longitude.toFixed(5)}`
                  : 'Chưa cấp quyền GPS'}
              </strong>
            </div>
            <div className="device-stat">
              <span>Trạng thái:</span>
              <span className={isOptInShared ? 'text-green' : 'text-gray'}>
                {isOptInShared ? 'Đang phát sóng' : 'Tạm dừng phát'}
              </span>
            </div>
          </div>
        </div>

        {/* Thiết bị B */}
        <div className="device-card partner">
          <div className="device-header">
            <div className="device-avatar partner-bg">B</div>
            <div>
              <h4 className="device-name">{partnerDevice.deviceName}</h4>
              <span className="device-role">Mô phỏng Bạn đồng hành</span>
            </div>
          </div>
          <div className="device-body">
            <div className="device-stat">
              <span>Tọa độ:</span>
              <strong>
                {partnerDevice.latitude.toFixed(5)}, {partnerDevice.longitude.toFixed(5)}
              </strong>
            </div>
            <div className="device-stat">
              <span>Cập nhật lần cuối:</span>
              <span suppressHydrationWarning>{new Date(partnerDevice.lastUpdatedAt).toLocaleTimeString('vi-VN')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
