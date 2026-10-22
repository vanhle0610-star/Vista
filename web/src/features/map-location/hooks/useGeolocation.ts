'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Coordinates, GeolocationState, GeolocationStatus, EventLogItem } from '../types';

interface UseGeolocationOptions {
  onLogEvent?: (item: Omit<EventLogItem, 'id' | 'timestamp'>) => void;
}

export function useGeolocation({ onLogEvent }: UseGeolocationOptions = {}) {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    status: 'idle',
    errorMessage: null,
    isWatching: false,
    isPageHidden: false,
    lastUpdated: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const wasWatchingBeforeHideRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const onLogRef = useRef(onLogEvent);

  // Cập nhật an toàn ref qua useEffect theo chuẩn React 19
  useEffect(() => {
    onLogRef.current = onLogEvent;
  }, [onLogEvent]);

  const log = useCallback((type: EventLogItem['type'], isSimulation: boolean, title: string, details?: string) => {
    if (onLogRef.current) {
      onLogRef.current({ type, isSimulation, title, details });
    }
  }, []);

  // Xử lý thành công GPS
  const handlePositionSuccess = useCallback(
    (pos: GeolocationPosition, isLiveWatch: boolean = false) => {
      if (!isMountedRef.current) return;

      const coords: Coordinates = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: Math.round(pos.coords.accuracy),
        altitude: pos.coords.altitude,
        speed: pos.coords.speed,
        heading: pos.coords.heading,
        timestamp: pos.timestamp,
      };

      setState((prev) => ({
        ...prev,
        coords,
        status: 'granted',
        errorMessage: null,
        lastUpdated: Date.now(),
        isWatching: isLiveWatch,
      }));

      log(
        'gps',
        false,
        isLiveWatch ? 'GPS Cập nhật (Live Watcher)' : 'GPS Lấy thành công',
        `Tọa độ: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)} | Độ chính xác: ±${coords.accuracy}m`
      );
    },
    [log]
  );

  // Xử lý lỗi GPS
  const handlePositionError = useCallback(
    (err: GeolocationPositionError) => {
      if (!isMountedRef.current) return;

      let status: GeolocationStatus = 'unavailable';
      let message = 'Không thể xác định vị trí hiện tại.';

      switch (err.code) {
        case err.PERMISSION_DENIED:
          status = 'denied';
          message = 'Bạn đã từ chối quyền truy cập vị trí. Vui lòng mở cài đặt trình duyệt để cấp lại quyền.';
          break;
        case err.POSITION_UNAVAILABLE:
          status = 'unavailable';
          message = 'Không có tín hiệu GPS, phần cứng định vị tắt hoặc mạng không xác định được vị trí.';
          break;
        case err.TIMEOUT:
          status = 'timeout';
          message = 'Quá thời gian chờ phản hồi GPS từ thiết bị (Timeout).';
          break;
      }

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      setState((prev) => ({
        ...prev,
        status,
        errorMessage: message,
        isWatching: false,
        // Khi bị từ chối quyền, xóa ngay tọa độ đang lưu để bảo vệ tính riêng tư
        coords: status === 'denied' ? null : prev.coords,
      }));

      log('gps', false, `Lỗi GPS: ${status.toUpperCase()}`, message);
    },
    [log]
  );

  // Bắt đầu theo dõi định vị liên tục (Live Watcher)
  const startWatchingInternal = useCallback(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) return;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => handlePositionSuccess(pos, true),
      (err) => handlePositionError(err),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );

    watchIdRef.current = id;
    setState((prev) => ({ ...prev, isWatching: true }));
    log('gps', false, 'Bật Live GPS Watcher', 'Theo dõi tọa độ GPS thời gian thực.');
  }, [handlePositionSuccess, handlePositionError, log]);

  // 1. Kiểm tra Permission ban đầu & Lắng nghe thay đổi quyền
  useEffect(() => {
    isMountedRef.current = true;
    if (typeof window === 'undefined') return;

    if (!('geolocation' in navigator)) {
      // Đợi microtask để tránh warning set-state-in-effect
      queueMicrotask(() => {
        if (isMountedRef.current) {
          setState((prev) => ({
            ...prev,
            status: 'unsupported',
            errorMessage: 'Trình duyệt không hỗ trợ Geolocation API.',
          }));
        }
      });
      return;
    }

    let permissionObj: PermissionStatus | null = null;

    const handlePermissionChange = () => {
      if (!isMountedRef.current || !permissionObj) return;

      const permState = permissionObj.state;
      if (permState === 'denied') {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        setState((prev) => ({
          ...prev,
          status: 'denied',
          coords: null,
          isWatching: false,
          errorMessage: 'Người dùng đã thu hồi quyền định vị trong trình duyệt.',
        }));
        log('permission', false, 'Quyền bị thu hồi (DENIED)', 'Dừng watcher và xóa tọa độ hiển thị.');
      } else if (permState === 'granted') {
        setState((prev) => ({ ...prev, status: 'granted', errorMessage: null }));
        log('permission', false, 'Quyền đã được cấp (GRANTED)');
      } else {
        setState((prev) => ({ ...prev, status: 'prompt', errorMessage: null }));
        log('permission', false, 'Quyền ở trạng thái PROMPT');
      }
    };

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((perm) => {
          if (!isMountedRef.current) return;
          permissionObj = perm;

          setState((prev) => ({
            ...prev,
            status: perm.state === 'granted' ? 'granted' : perm.state === 'denied' ? 'denied' : 'prompt',
          }));

          perm.addEventListener('change', handlePermissionChange);
        })
        .catch(() => {
          if (isMountedRef.current) {
            setState((prev) => ({ ...prev, status: 'prompt' }));
          }
        });
    }

    return () => {
      isMountedRef.current = false;
      if (permissionObj) {
        permissionObj.removeEventListener('change', handlePermissionChange);
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [log]);

  // 2. Tích hợp Page Visibility API (dừng watcher khi tab ẩn, khôi phục khi tab hiện)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      const isHidden = document.visibilityState === 'hidden';
      setState((prev) => ({ ...prev, isPageHidden: isHidden }));

      if (isHidden) {
        log('lifecycle', false, 'Tab chuyển sang nền (Hidden)', 'Tự động tạm dừng Live GPS Watcher để tiết kiệm pin.');
        if (watchIdRef.current !== null) {
          wasWatchingBeforeHideRef.current = true;
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
          setState((prev) => ({ ...prev, isWatching: false }));
        }
      } else {
        log('lifecycle', false, 'Tab quay lại tiêu điểm (Visible)', 'Kiểm tra quyền và khôi phục Live GPS Watcher.');
        if (wasWatchingBeforeHideRef.current) {
          wasWatchingBeforeHideRef.current = false;
          startWatchingInternal();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [startWatchingInternal, log]);

  // 3. Yêu cầu lấy vị trí một lần (User chủ động bấm)
  const requestCurrentPosition = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState((prev) => ({
        ...prev,
        status: 'unsupported',
        errorMessage: 'Trình duyệt này không hỗ trợ Geolocation API.',
      }));
      return;
    }

    setState((prev) => ({ ...prev, status: 'requesting', errorMessage: null }));
    log('permission', false, 'Yêu cầu vị trí GPS', 'Gọi navigator.geolocation.getCurrentPosition()');

    navigator.geolocation.getCurrentPosition(
      (pos) => handlePositionSuccess(pos, false),
      (err) => handlePositionError(err),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [handlePositionSuccess, handlePositionError, log]);

  // 4. Bật / Tắt theo dõi trực tiếp
  const toggleWatchPosition = useCallback(() => {
    if (state.isWatching) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      wasWatchingBeforeHideRef.current = false;
      setState((prev) => ({ ...prev, isWatching: false }));
      log('gps', false, 'Dừng Watcher', 'Đã ngừng theo dõi tọa độ định kỳ.');
    } else {
      startWatchingInternal();
    }
  }, [state.isWatching, startWatchingInternal, log]);

  // 5. Thao tác "Để sau"
  const dismissPrompt = useCallback(() => {
    setState((prev) => ({
      ...prev,
      status: prev.status === 'granted' ? 'granted' : 'idle',
      errorMessage: null,
    }));
    log('permission', false, 'Người dùng chọn: Để sau', 'Tạm thời ẩn lời nhắc quyền truy cập vị trí.');
  }, [log]);

  // 6. Các thao tác Mô phỏng kiểm thử nội bộ (Simulations for QA)
  const simulatePermission = useCallback(
    (type: 'granted' | 'denied' | 'unavailable' | 'timeout') => {
      if (type === 'granted') {
        const mockCoords: Coordinates = {
          latitude: 16.06082 + (Math.random() - 0.5) * 0.003,
          longitude: 108.22690 + (Math.random() - 0.5) * 0.003,
          accuracy: 12,
          altitude: 8.5,
          speed: 1.2,
          heading: 90,
          timestamp: Date.now(),
        };
        setState((prev) => ({
          ...prev,
          coords: mockCoords,
          status: 'granted',
          errorMessage: null,
          lastUpdated: Date.now(),
        }));
        log('permission', true, 'MÔ PHỎNG: Cấp quyền thành công', `Tọa độ giả lập Cầu Rồng: ${mockCoords.latitude.toFixed(5)}, ${mockCoords.longitude.toFixed(5)}`);
      } else if (type === 'denied') {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        setState((prev) => ({
          ...prev,
          status: 'denied',
          coords: null,
          errorMessage: '[MÔ PHỎNG] Người dùng đã từ chối quyền truy cập vị trí trong trình duyệt.',
          isWatching: false,
        }));
        log('permission', true, 'MÔ PHỎNG: Quyền bị từ chối (Denied)');
      } else if (type === 'unavailable') {
        setState((prev) => ({
          ...prev,
          status: 'unavailable',
          errorMessage: '[MÔ PHỎNG] Dịch vụ định vị GPS bị tắt hoặc không có tín hiệu phần cứng.',
          isWatching: false,
        }));
        log('gps', true, 'MÔ PHỎNG: Mất dịch vụ vị trí (Position Unavailable)');
      } else if (type === 'timeout') {
        setState((prev) => ({
          ...prev,
          status: 'timeout',
          errorMessage: '[MÔ PHỎNG] Yêu cầu lấy tọa độ GPS hết hạn (Timeout > 10.000ms).',
          isWatching: false,
        }));
        log('gps', true, 'MÔ PHỎNG: Hết hạn chờ GPS (Timeout)');
      }
    },
    [log]
  );

  const simulateVisibility = useCallback(
    (hidden: boolean) => {
      setState((prev) => ({ ...prev, isPageHidden: hidden }));
      log('lifecycle', true, hidden ? 'MÔ PHỎNG: Ẩn tab' : 'MÔ PHỎNG: Hiện lại tab');
    },
    [log]
  );

  return {
    ...state,
    requestCurrentPosition,
    toggleWatchPosition,
    dismissPrompt,
    simulatePermission,
    simulateVisibility,
  };
}
