'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GeolocationState } from '../types';

const choiceKey = 'vista-map-location-opt-in';
export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({ coords: null, status: 'idle', errorMessage: null, isWatching: false, isPageHidden: false, lastUpdated: null });
  const [automaticEnabled, setAutomaticEnabled] = useState(false);
  const [choiceKnown, setChoiceKnown] = useState(false);
  const wanted = useRef(false), alive = useRef(false), generation = useRef(0);
  const invalidate = useCallback(() => { generation.current++; }, []);
  const clear = useCallback((denied = false) => {
    generation.current++;
    setState((old) => ({ ...old, coords: null, status: denied ? 'denied' : 'idle', errorMessage: denied ? 'Quyền vị trí đã bị chặn. Bạn có thể cấp lại trong cài đặt trình duyệt khi muốn dùng định vị.' : null }));
  }, []);
  const locate = useCallback(() => {
    if (!alive.current || document.visibilityState === 'hidden') return;
    if (!window.isSecureContext || !navigator.geolocation) {
      setState((old) => ({ ...old, status: 'unsupported', coords: null, errorMessage: 'Định vị cần HTTPS hoặc localhost và trình duyệt hỗ trợ vị trí.' })); return;
    }
    const current = ++generation.current;
    setState((old) => ({ ...old, status: 'requesting', coords: null, errorMessage: null }));
    navigator.geolocation.getCurrentPosition((position) => {
      if (!alive.current || current !== generation.current) return;
      const { latitude, longitude, accuracy } = position.coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
        setState((old) => ({ ...old, status: 'unavailable', errorMessage: 'Thiết bị chưa xác định được vị trí hợp lệ.' })); return;
      }
      setState((old) => ({ ...old, status: 'granted', coords: { latitude, longitude, accuracy, timestamp: position.timestamp }, errorMessage: null, lastUpdated: Date.now() }));
    }, (error) => {
      if (!alive.current || current !== generation.current) return;
      setState((old) => ({ ...old, coords: null, status: error.code === 1 ? 'denied' : error.code === 3 ? 'timeout' : 'unavailable',
        errorMessage: error.code === 1 ? 'Quyền vị trí đang bị chặn. Hãy mở cài đặt trình duyệt nếu muốn cấp lại.' : error.code === 3 ? 'Tìm vị trí quá lâu. Hãy thử lại.' : 'Chưa xác định được vị trí. Kiểm tra thiết bị hoặc chọn điểm xuất phát thủ công.' }));
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
  }, []);
  useEffect(() => {
    alive.current = true;
    try { const choice = localStorage.getItem(choiceKey); wanted.current = choice === 'true'; queueMicrotask(() => { if (alive.current) { setAutomaticEnabled(choice === 'true'); setChoiceKnown(choice !== null); } }); } catch { /* Session only. */ }
    let permission: PermissionStatus | null = null;
    let queryVersion = 0;
    const changed = () => {
      if (!alive.current || !permission) return;
      if (permission.state !== 'granted') clear(permission.state === 'denied');
      else if (wanted.current) locate();
    };
    const check = async () => {
      const version = ++queryVersion;
      if (!window.isSecureContext || !navigator.geolocation) { locate(); return; }
      if (!navigator.permissions?.query) return; // Never assume granted on unsupported browsers.
      try {
        const next = await navigator.permissions.query({ name: 'geolocation' });
        if (!alive.current || version !== queryVersion || document.visibilityState === 'hidden') return;
        permission?.removeEventListener('change', changed); permission = next; permission.addEventListener('change', changed); changed();
      } catch { /* Ask only in response to the user's next location action. */ }
    };
    const visibility = () => {
      const hidden = document.visibilityState === 'hidden';
      setState((old) => ({ ...old, isPageHidden: hidden }));
      if (hidden) { queryVersion++; clear(); } else void check();
    };
    void check(); document.addEventListener('visibilitychange', visibility);
    return () => { alive.current = false; invalidate(); queryVersion++; permission?.removeEventListener('change', changed); document.removeEventListener('visibilitychange', visibility); };
  }, [clear, locate, invalidate]);
  const remember = useCallback((enabled: boolean) => {
    wanted.current = enabled; setAutomaticEnabled(enabled); setChoiceKnown(true);
    try { localStorage.setItem(choiceKey, String(enabled)); } catch { /* Coordinates are never stored. */ }
  }, []);
  const requestCurrentPosition = useCallback(() => { remember(true); locate(); }, [remember, locate]);
  const dismissPrompt = useCallback(() => { remember(false); clear(); }, [remember, clear]);
  return { ...state, automaticEnabled, choiceKnown, requestCurrentPosition, dismissPrompt };
}
