'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { computeVistaRoute, LatestRouteRequest, routeError, validateRouteInput, type RouteInput, type RouteResult } from '../routing/routes';

type State = { status: 'idle' | 'loading' | 'success' | 'empty' | 'error'; route: RouteResult | null; error: string | null };
const idle: State = { status: 'idle', route: null, error: null };
export function useRoutePlanner(hasGps: boolean) {
  const [state, setState] = useState<State>(idle);
  const [requests] = useState(() => new LatestRouteRequest());
  const fromGps = useRef(false);
  const clear = useCallback(() => { requests.invalidate(); fromGps.current = false; setState(idle); }, [requests]);
  useEffect(() => () => requests.invalidate(), [requests]);
  useEffect(() => {
    if (!hasGps && fromGps.current) {
      requests.invalidate(); fromGps.current = false;
      queueMicrotask(() => setState(idle));
    }
  }, [hasGps, requests]);
  const compute = useCallback((input: RouteInput) => {
    requests.invalidate();
    try { validateRouteInput(input); }
    catch (error) { setState({ status: 'error', route: null, error: error instanceof Error ? error.message : 'Chọn đủ điểm xuất phát và điểm đến.' }); return; }
    fromGps.current = input.fromGps;
    setState({ status: 'loading', route: null, error: null });
    void requests.run(() => computeVistaRoute(input),
      (route) => setState({ status: route ? 'success' : 'empty', route, error: null }),
      (reason) => setState({ status: 'error', route: null, error: routeError(reason) }));
  }, [requests]);
  return { ...state, clear, compute };
}
