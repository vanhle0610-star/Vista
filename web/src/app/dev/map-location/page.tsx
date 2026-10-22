'use client';

import React, { useState, useCallback } from 'react';
import { MapLocationHeader } from '@/features/map-location/components/MapLocationHeader';
import { PermissionCard } from '@/features/map-location/components/PermissionCard';
import { MapViewer } from '@/features/map-location/components/MapViewer';
import { TwoDeviceSyncCard } from '@/features/map-location/components/TwoDeviceSyncCard';
import { TestingHarnessCard } from '@/features/map-location/components/TestingHarnessCard';
import { MapComparisonModal } from '@/features/map-location/components/MapComparisonModal';
import { useGeolocation } from '@/features/map-location/hooks/useGeolocation';
import { useTwoDeviceSync } from '@/features/map-location/hooks/useTwoDeviceSync';
import type { EventLogItem } from '@/features/map-location/types';
import styles from './map-location.module.css';

export default function MapLocationDevPage() {
  const [logs, setLogs] = useState<EventLogItem[]>([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState<boolean>(false);

  // Bộ ghi nhật ký sự kiện trong phiên
  const handleLogEvent = useCallback((item: Omit<EventLogItem, 'id' | 'timestamp'>) => {
    const newLog: EventLogItem = {
      ...item,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 99)]); // Giữ tối đa 100 sự kiện gần nhất
  }, []);

  // Hook quản lý GPS Geolocation & Page Visibility
  const {
    coords,
    status,
    errorMessage,
    isWatching,
    isPageHidden,
    lastUpdated,
    requestCurrentPosition,
    toggleWatchPosition,
    dismissPrompt,
    simulatePermission,
    simulateVisibility,
  } = useGeolocation({ onLogEvent: handleLogEvent });

  // Hook quản lý Đồng bộ 2 thiết bị 10-15s (Mock Transport)
  const {
    isOptInShared,
    toggleOptIn,
    intervalSeconds,
    setIntervalSeconds,
    countdown,
    syncCount,
    isSyncing,
    partnerDevice,
    triggerMockSync,
  } = useTwoDeviceSync({
    currentCoords: coords,
    onLogEvent: handleLogEvent,
  });

  const handleClearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const handleMapLog = useCallback(
    (type: 'map', isSimulation: boolean, title: string, details?: string) => {
      handleLogEvent({ type, isSimulation, title, details });
    },
    [handleLogEvent]
  );

  return (
    <div className={styles.pageRoot}>
      {/* 1. Header nhận diện VISTA */}
      <MapLocationHeader />

      <main className={styles.mainContainer}>
        {/* 2. Phần đầu trang (Hero Banner) theo yêu cầu */}
        <section className={styles.heroIntro}>
          <div className={styles.introEyebrowRow}>
            <span className={styles.introEyebrow}>Bản đồ & Định vị — Thử nghiệm nội bộ</span>
            <span className="vista-dev-badge">TV5 • TUẦN 2 (MAPLIBRE 3D)</span>
          </div>
          <h1 className={styles.heroTitle}>
            Khám phá điểm đến, <span className={styles.heroHighlight}>bắt đầu từ vị trí của bạn.</span>
          </h1>
          <p className={styles.heroDesc}>
            Môi trường kiểm thử Geolocation API, vòng đời Page Visibility, MapLibre GL JS kết hợp Three.js mô phỏng Cầu Rồng 3D thực tế và bộ công cụ kiểm thử thiết bị.
          </p>
        </section>

        {/* 3. Bố cục 2 cột chính (Desktop) */}
        <div className={styles.columnsLayout}>
          {/* CỘT TRÁI: Quyền định vị (Location Permissions & GPS State) */}
          <section aria-label="Quyền định vị và GPS">
            <PermissionCard
              geoState={{
                coords,
                status,
                errorMessage,
                isWatching,
                isPageHidden,
                lastUpdated,
              }}
              onRequestPosition={requestCurrentPosition}
              onToggleWatch={toggleWatchPosition}
              onDismiss={dismissPrompt}
            />
          </section>

          {/* CỘT PHẢI: Thử bản đồ (Map Viewer & Sample Markers) */}
          <section aria-label="Khung hiển thị bản đồ">
            <MapViewer
              userCoords={coords}
              partnerDevice={partnerDevice}
              isSharingActive={isOptInShared}
              onRequestUserLocation={requestCurrentPosition}
              onOpenComparisonModal={() => setIsComparisonOpen(true)}
              onLogEvent={handleMapLog}
            />
          </section>
        </div>

        {/* 4. Khu vực thử nghiệm bổ sung: Cập nhật 2 thiết bị & Bộ công cụ kiểm thử */}
        <div className={styles.subSectionRow}>
          {/* Thử cập nhật giữa hai thiết bị 10-15s */}
          <section aria-label="Thử nghiệm đồng bộ hai thiết bị">
            <TwoDeviceSyncCard
              userCoords={coords}
              partnerDevice={partnerDevice}
              isOptInShared={isOptInShared}
              intervalSeconds={intervalSeconds}
              countdown={countdown}
              syncCount={syncCount}
              isSyncing={isSyncing}
              onToggleOptIn={toggleOptIn}
              onChangeInterval={setIntervalSeconds}
              onTriggerSync={triggerMockSync}
            />
          </section>

          {/* Khu vực kiểm thử nội bộ (Test Harness & Event Log) */}
          <section aria-label="Bộ công cụ kiểm thử nội bộ">
            <TestingHarnessCard
              logs={logs}
              onClearLogs={handleClearLogs}
              onSimulatePermission={simulatePermission}
              onSimulateVisibility={simulateVisibility}
              isPageHidden={isPageHidden}
            />
          </section>
        </div>
      </main>

      {/* 5. Modal so sánh hai phương án bản đồ & Đề xuất kiến trúc */}
      <MapComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
      />
    </div>
  );
}
