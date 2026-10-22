'use client';

import React from 'react';
import type { EventLogItem } from '../types';

interface TestingHarnessCardProps {
  logs: EventLogItem[];
  onClearLogs: () => void;
  onSimulatePermission: (type: 'granted' | 'denied' | 'unavailable' | 'timeout') => void;
  onSimulateVisibility: (hidden: boolean) => void;
  isPageHidden: boolean;
}

export function TestingHarnessCard({
  logs,
  onClearLogs,
  onSimulatePermission,
  onSimulateVisibility,
  isPageHidden,
}: TestingHarnessCardProps) {
  return (
    <div className="card vista-harness-card">
      <div className="harness-header-group">
        <div className="harness-icon-pill">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        </div>
        <div>
          <h3 className="harness-title">Bộ Công cụ Kiểm thử Nội bộ (TV5 Test Harness)</h3>
          <p className="harness-subtitle">
            Mô phỏng các tình huống biên ngoại lệ của phần cứng GPS và kiểm tra phản ứng vòng đời của trang web.
          </p>
        </div>
      </div>

      {/* Nhóm nút mô phỏng quyền */}
      <div className="harness-section">
        <span className="harness-section-label">1. Mô phỏng tình huống quyền Geolocation:</span>
        <div className="harness-btns-grid">
          <button
            type="button"
            className="sim-btn sim-granted"
            onClick={() => onSimulatePermission('granted')}
          >
            <span>✓ Giả lập Cấp quyền (Granted)</span>
          </button>
          <button
            type="button"
            className="sim-btn sim-denied"
            onClick={() => onSimulatePermission('denied')}
          >
            <span>✕ Giả lập Từ chối (Denied)</span>
          </button>
          <button
            type="button"
            className="sim-btn sim-unavailable"
            onClick={() => onSimulatePermission('unavailable')}
          >
            <span>⚠ Giả lập Mất GPS (Unavailable)</span>
          </button>
          <button
            type="button"
            className="sim-btn sim-timeout"
            onClick={() => onSimulatePermission('timeout')}
          >
            <span>⏱ Giả lập Timeout (Hết giờ)</span>
          </button>
        </div>
      </div>

      {/* Nhóm nút mô phỏng Page Visibility */}
      <div className="harness-section">
        <span className="harness-section-label">2. Kiểm tra Vòng đời Trang (Page Visibility API):</span>
        <div className="harness-visibility-row">
          <button
            type="button"
            className={`sim-btn ${isPageHidden ? 'active-vis' : ''}`}
            onClick={() => onSimulateVisibility(true)}
          >
            <span>Mô phỏng Ẩn tab (Page Hidden)</span>
          </button>
          <button
            type="button"
            className={`sim-btn ${!isPageHidden ? 'active-vis' : ''}`}
            onClick={() => onSimulateVisibility(false)}
          >
            <span>Mô phỏng Hiện tab (Page Visible)</span>
          </button>
          <span className="visibility-note">
            (Thử chuyển tab trên trình duyệt của bạn để kiểm tra phản ứng thực tế)
          </span>
        </div>
      </div>

      {/* Nhật ký sự kiện trong phiên */}
      <div className="harness-section">
        <div className="log-header-row">
          <span className="harness-section-label">
            3. Nhật ký sự kiện phiên làm việc ({logs.length} sự kiện):
          </span>
          <button
            type="button"
            onClick={onClearLogs}
            className="btn-clear-log"
            disabled={logs.length === 0}
          >
            Xóa nhật ký
          </button>
        </div>

        <div className="event-log-container">
          {logs.length === 0 ? (
            <div className="empty-log-state">
              <span>Chưa có sự kiện nào. Hãy nhấn các nút thao tác phía trên để bắt đầu ghi log.</span>
            </div>
          ) : (
            <ul className="log-list">
              {logs.map((item) => (
                <li key={item.id} className={`log-item log-type-${item.type}`}>
                  <div className="log-item-top">
                    <span className="log-time">{item.timestamp}</span>
                    <span className={`log-badge ${item.isSimulation ? 'badge-sim' : 'badge-real'}`}>
                      {item.isSimulation ? 'MÔ PHỎNG' : 'THỰC TẾ'}
                    </span>
                    <span className="log-category">[{item.type.toUpperCase()}]</span>
                    <strong className="log-title">{item.title}</strong>
                  </div>
                  {item.details && <p className="log-details">{item.details}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
