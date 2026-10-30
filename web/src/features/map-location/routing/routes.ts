import type { components } from '@/types/api.generated';
import { validPoint } from '../coordinates';

export type RouteWaypoint = { latitude: number; longitude: number; label?: string };
export type RouteInput = components['schemas']['RouteInput'] & {
  waypoints?: RouteWaypoint[];
};
export type RouteStep = {
  instruction: string;
  distanceMeters: number;
  durationMillis: number;
  name?: string;
};

export type RouteLeg = {
  fromLabel: string;
  toLabel: string;
  distanceMeters: number;
  durationMillis: number;
  summary?: string;
  steps?: RouteStep[];
};

export type RouteResult = components['schemas']['RouteResult'] & {
  legs?: RouteLeg[];
};
export type TravelMode = components['schemas']['RouteInput']['mode'];

export const MAX_ROUTE_POINTS = 6;

export function validateRouteInput(input: RouteInput) {
  const points = [input.origin, ...(input.waypoints ?? []), input.destination];
  if (points.length > MAX_ROUTE_POINTS) throw new Error('Lộ trình hỗ trợ tối đa 6 điểm.');
  if (points.some((point) => !validPoint(point))) throw new Error('Chọn đủ các địa điểm hợp lệ.');
  if (!['DRIVING', 'WALKING'].includes(input.mode)) throw new Error('Phương tiện chưa được hỗ trợ.');
  if (points.some((point, index) => index > 0 && point.latitude === points[index - 1].latitude && point.longitude === points[index - 1].longitude)) {
    throw new Error('Hai điểm liên tiếp cần có tọa độ khác nhau.');
  }
}

/** Use the web server so localhost/CORS configuration never leaks into browser routing. */
export async function computeVistaRoute(input: RouteInput): Promise<RouteResult | null> {
  validateRouteInput(input);
  const response = await fetch('/api/v1/map/routes', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input), signal: AbortSignal.timeout(35000),
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new Error(problem?.detail || 'Không lấy được tuyến đường. Hãy thử lại.');
  }
  const text = await response.text();
  if (!text) return null;
  const route = JSON.parse(text) as RouteResult | null;
  if (!route) return null;
  if (!Array.isArray(route.path) || route.path.length < 2 || route.path.some((point) => !validPoint({latitude: point.lat, longitude: point.lng})) ||
      !Number.isFinite(route.distanceMeters) || route.distanceMeters < 0 || !Number.isFinite(route.durationMillis) || route.durationMillis < 0 ||
      (input.waypoints?.length && route.legs?.length !== input.waypoints.length + 1)) {
    throw new Error('Dịch vụ chưa trả đủ các chặng hợp lệ cho lộ trình.');
  }
  return { ...route, input };
}

export function routeError(reason: unknown) {
  if (reason instanceof Error && reason.name === 'TimeoutError') return 'Dịch vụ chỉ đường phản hồi quá lâu. Vui lòng thử lại.';
  return reason instanceof Error && !['TypeError', 'TimeoutError'].includes(reason.name)
    ? reason.message
    : 'Không lấy được tuyến đường. Kiểm tra kết nối rồi thử lại.';
}

export class LatestRouteRequest {
  private version = 0;
  invalidate() {
    this.version++;
  }
  async run<T>(
    request: () => Promise<T>,
    accept: (value: T) => void,
    reject: (reason: unknown) => void
  ) {
    const version = ++this.version;
    try {
      const value = await request();
      if (version === this.version) accept(value);
    } catch (reason) {
      if (version === this.version) reject(reason);
    }
  }
}
