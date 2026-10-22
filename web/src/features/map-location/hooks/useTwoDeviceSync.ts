'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Coordinates, SyncDevice, EventLogItem } from '../types';

interface UseTwoDeviceSyncOptions {
  currentCoords?: Coordinates | null;
  onLogEvent?: (item: Omit<EventLogItem, 'id' | 'timestamp'>) => void;
}

/**
 * useTwoDeviceSync - [DEV ONLY]
 * Hook mô phỏng chu kỳ cập nhật tọa độ 10–15s giữa hai thiết bị (Mock Transport).
 * 
 * Lưu ý:
 * - Dành riêng cho màn hình kiểm thử kỹ thuật nội bộ (/dev/map-location).
 * - Không đưa dữ liệu thiết bị B giả vào màn hình người dùng tuần 2 mặc định.
 * - Tuân thủ React 19 / React Compiler: không gọi Date.now() khi render, dọn dẹp timer và ref an toàn.
 */
export function useTwoDeviceSync({ currentCoords, onLogEvent }: UseTwoDeviceSyncOptions = {}) {
  const [isOptInShared, setIsOptInShared] = useState<boolean>(false);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(12); // Trong khoảng 10 - 15 giây
  const [countdown, setCountdown] = useState<number>(12);
  const [syncCount, setSyncCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Thiết bị B (mô phỏng đồng đội trên cung đường Đà Nẵng)
  const [partnerDevice, setPartnerDevice] = useState<SyncDevice>(() => ({
    deviceId: 'device-b-partner',
    deviceName: 'Bạn đồng hành (Thiết bị B)',
    role: 'partner',
    latitude: 16.0645, // Bãi biển Mỹ Khê
    longitude: 108.2468,
    lastUpdatedAt: 0,
    isSharing: true,
  }));

  const onLogRef = useRef(onLogEvent);
  useEffect(() => {
    onLogRef.current = onLogEvent;
  }, [onLogEvent]);

  const log = useCallback((title: string, details?: string) => {
    if (onLogRef.current) {
      onLogRef.current({
        type: 'sync',
        isSimulation: true,
        title,
        details,
      });
    }
  }, []);

  // Thực hiện một nhịp gửi / nhận vị trí mock
  const triggerMockSync = useCallback(() => {
    setIsSyncing(true);

    // Giả lập độ trễ mạng truyền tải và di chuyển nhẹ của thiết bị B
    const timer = setTimeout(() => {
      setPartnerDevice((prev) => {
        const deltaLat = (Math.random() - 0.48) * 0.0008;
        const deltaLng = (Math.random() - 0.48) * 0.0008;
        return {
          ...prev,
          latitude: prev.latitude + deltaLat,
          longitude: prev.longitude + deltaLng,
          lastUpdatedAt: Date.now(),
        };
      });

      setSyncCount((c) => c + 1);
      setIsSyncing(false);

      log(
        'Chu kỳ đồng bộ 10-15s (Mock Transport)',
        `Gửi tọa độ Thiết bị A ${currentCoords ? `(${currentCoords.latitude.toFixed(4)}, ${currentCoords.longitude.toFixed(4)})` : '(chưa có GPS)'} và nhận tọa độ cập nhật từ Thiết bị B.`
      );
    }, 600);

    return () => clearTimeout(timer);
  }, [currentCoords, log]);

  // Timer đếm ngược chu kỳ polling 10-15s
  useEffect(() => {
    if (!isOptInShared) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          triggerMockSync();
          return intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOptInShared, intervalSeconds, triggerMockSync]);

  const toggleOptIn = useCallback(() => {
    setIsOptInShared((prev) => {
      const next = !prev;
      if (next) {
        setCountdown(intervalSeconds);
        log('Bật Đồng thuận chia sẻ (Opt-in)', `Bắt đầu chu kỳ polling vị trí mỗi ${intervalSeconds}s.`);
      } else {
        log('Dừng Chia sẻ vị trí', 'Đã tắt phiên đồng bộ mock.');
      }
      return next;
    });
  }, [intervalSeconds, log]);

  return {
    isOptInShared,
    toggleOptIn,
    intervalSeconds,
    setIntervalSeconds,
    countdown,
    syncCount,
    isSyncing,
    partnerDevice,
    triggerMockSync,
  };
}
