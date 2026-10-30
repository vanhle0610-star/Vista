'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Coordinates, GeolocationState } from '../types';

export const GPS_MAX_AGE_MS = 30000;

const choiceKey = 'vista-map-location-opt-in';
export function useGeolocation({ transient = false }: { transient?: boolean } = {}) {
  const [state, setState] = useState<GeolocationState>({ coords: null, status: 'idle', errorMessage: null, isWatching: false, isPageHidden: false, lastUpdated: null });
  const [automaticEnabled, setAutomaticEnabled] = useState(false);
  const [choiceKnown, setChoiceKnown] = useState(false);
  const wanted = useRef(transient), alive = useRef(false), generation = useRef(0);
  const inFlight = useRef<Promise<Coordinates | null> | null>(null);
  const lastFix = useRef<Coordinates | null>(null);
  const expiry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const invalidate = useCallback(() => {
    generation.current++; inFlight.current = null; lastFix.current = null;
    if (expiry.current) clearTimeout(expiry.current);
  }, []);
  const clear = useCallback((denied = false) => {
    invalidate();
    setState((old) => ({ ...old, coords: null, status: denied ? 'denied' : 'idle', errorMessage: denied ? 'Quyền vị trí đã bị chặn. Bạn có thể cấp lại trong cài đặt trình duyệt khi muốn dùng định vị.' : null }));
  }, [invalidate]);
  const locate = useCallback((): Promise<Coordinates | null> => {
    if (!alive.current || document.visibilityState === 'hidden') return Promise.resolve(null);
    if (inFlight.current) return inFlight.current;
    if (lastFix.current && Date.now() - lastFix.current.timestamp <= GPS_MAX_AGE_MS) return Promise.resolve(lastFix.current);
    if (!window.isSecureContext || !navigator.geolocation) {
      setState((old) => ({ ...old, status: 'unsupported', coords: null, errorMessage: 'Định vị cần HTTPS hoặc localhost và trình duyệt hỗ trợ vị trí.' })); return Promise.resolve(null);
    }
    const current = ++generation.current;
    setState((old) => ({ ...old, status: 'requesting', errorMessage: null }));
    const pending = new Promise<Coordinates | null>((resolve) => navigator.geolocation.getCurrentPosition((position) => {
      if (!alive.current || current !== generation.current) { resolve(null); return; }
      const { latitude, longitude, accuracy } = position.coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || !Number.isFinite(position.timestamp) || Date.now() - position.timestamp > GPS_MAX_AGE_MS || position.timestamp > Date.now() + 5000) {
        lastFix.current = null;
        setState((old) => ({ ...old, coords: null, status: 'unavailable', errorMessage: 'Thiết bị chưa trả vị trí hợp lệ và đủ mới. Hãy thử lại.' })); resolve(null); return;
      }
      const coords = { latitude, longitude, accuracy, timestamp: position.timestamp };
      lastFix.current = coords;
      setState((old) => ({ ...old, status: 'granted', coords, errorMessage: null, lastUpdated: Date.now() }));
      if (expiry.current) clearTimeout(expiry.current);
      expiry.current = setTimeout(() => { if (alive.current && current === generation.current) clear(); }, Math.max(0, GPS_MAX_AGE_MS - (Date.now() - coords.timestamp)));
      resolve(coords);
    }, (error) => {
      if (!alive.current || current !== generation.current) { resolve(null); return; }
      lastFix.current = null;
      setState((old) => ({ ...old, coords: null, status: error.code === 1 ? 'denied' : error.code === 3 ? 'timeout' : 'unavailable',
        errorMessage: error.code === 1 ? 'Quyền vị trí đang bị chặn. Hãy mở cài đặt trình duyệt nếu muốn cấp lại.' : error.code === 3 ? 'Tìm vị trí quá lâu. Hãy thử lại.' : 'Chưa xác định được vị trí. Kiểm tra thiết bị hoặc chọn điểm xuất phát thủ công.' }));
      resolve(null);
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }));
    inFlight.current = pending;
    void pending.finally(() => { if (inFlight.current === pending) inFlight.current = null; });
    return pending;
  }, [clear]);
  useEffect(() => {
    alive.current = true;
    try { const choice = transient ? "true" : localStorage.getItem(choiceKey); wanted.current = choice === 'true'; queueMicrotask(() => { if (alive.current) { setAutomaticEnabled(choice === 'true'); setChoiceKnown(choice !== null); } }); } catch { /* Session only. */ }
    let permission: PermissionStatus | null = null;
    let queryVersion = 0;
    const changed = () => {
      if (!alive.current || !permission) return;
      if (permission.state === 'denied') clear(wanted.current);
      else if (permission.state === 'granted' && wanted.current) void locate();
      else if (permission.state === 'prompt' && lastFix.current) clear();
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
  }, [clear, locate, invalidate, transient]);
  const remember = useCallback((enabled: boolean) => {
    wanted.current = enabled; setAutomaticEnabled(enabled); setChoiceKnown(true);
    try { if (!transient) localStorage.setItem(choiceKey, String(enabled)); } catch { /* Coordinates are never stored. */ }
  }, [transient]);
  const requestCurrentPosition = useCallback(() => { remember(true); return locate(); }, [remember, locate]);
  const dismissPrompt = useCallback(() => { remember(false); clear(); }, [remember, clear]);
  return { ...state, automaticEnabled, choiceKnown, requestCurrentPosition, dismissPrompt };
}
