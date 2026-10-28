import type { components } from '@/types/api.generated';
import { validPoint } from '../data/publicDestinations';

export type RouteWaypoint = { latitude: number; longitude: number; label?: string };
export type RouteInput = components['schemas']['RouteInput'] & {
  waypoints?: RouteWaypoint[];
};
export type RouteResult = components['schemas']['RouteResult'];
export type TravelMode = components['schemas']['RouteInput']['mode'];

export function validateRouteInput(input: RouteInput) {
  if (!validPoint(input.origin) || !validPoint(input.destination)) {
    throw new Error('Chọn đủ hai địa điểm hợp lệ.');
  }
  if (!['DRIVING', 'WALKING'].includes(input.mode)) {
    throw new Error('Phương tiện chưa được hỗ trợ.');
  }
  if (
    input.origin.latitude === input.destination.latitude &&
    input.origin.longitude === input.destination.longitude
  ) {
    throw new Error('Điểm xuất phát và điểm đến cần khác nhau.');
  }
}

/**
 * Tính toán tuyến đường thông minh:
 * 1. Ưu tiên gọi backend VISTA (nếu cấu hình ORS_API_KEY).
 * 2. Fallback sang OpenStreetMap OSRM (miễn phí, không cần key, chính xác theo đường giao thông Việt Nam).
 * 3. Fallback sang ước lượng khoảng cách Haversine nếu cả 2 dịch vụ mạng bị nghẽn.
 */
export async function computeVistaRoute(input: RouteInput): Promise<RouteResult | null> {
  validateRouteInput(input);
  const base = (process.env.NEXT_PUBLIC_API_URL ?? '/api/v1').replace(/\/+$/, '');

  // 1. Thử gọi backend routing (OpenRouteService nếu có cấu hình key)
  try {
    const response = await fetch(`${base}/map/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(6000),
    });

    if (response.ok) {
      const data = await response.text();
      if (data) {
        return JSON.parse(data) as RouteResult;
      }
    }
  } catch {
    // Backend chưa cấu hình ORS_API_KEY hoặc offline -> chuyển sang OpenStreetMap OSRM
  }

  // 2. OpenStreetMap OSRM Free Routing Service (Miễn phí 100%, không cần key)
  try {
    const orig = input.origin;
    const dest = input.destination;
    const waypoints = input.waypoints || [];
    const allPoints: Array<{ latitude: number; longitude: number }> = [orig, ...waypoints, dest];
    const coordsStr = allPoints.map((p) => `${p.longitude},${p.latitude}`).join(';');
    const profile = input.mode === 'WALKING' ? 'walking' : 'driving';
    const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${coordsStr}?overview=full&geometries=geojson`;

    const osrmRes = await fetch(osrmUrl, { signal: AbortSignal.timeout(10000) });
    if (osrmRes.ok) {
      const json = await osrmRes.json();
      if (json && json.code === 'Ok' && Array.isArray(json.routes) && json.routes.length > 0) {
        const primaryRoute = json.routes[0];
        const rawCoords: [number, number][] = primaryRoute.geometry?.coordinates || [];

        // Chuyển đổi [lng, lat] của GeoJSON sang { lat, lng } theo chuẩn VISTA
        const path = rawCoords.map(([lng, lat]) => ({ lat, lng }));

        const distanceMeters = Math.round(primaryRoute.distance || 0);
        const durationMillis = Math.round((primaryRoute.duration || 0) * 1000);

        return {
          input,
          path,
          distanceMeters,
          durationMillis,
          warnings:
            input.mode === 'WALKING'
              ? ['Tuyến đi bộ hiển thị theo mạng lưới đường bộ OpenStreetMap. Hãy chú ý an toàn giao thông.']
              : [],
          attribution: 'Tuyến đường thời gian thực qua OpenStreetMap (OSRM) · Không phát sinh chi phí',
        };
      }
    }
  } catch (osrmErr) {
    console.warn('OSRM routing fallback failed, using direct geodesic path:', osrmErr);
  }

  // 3. Fallback cuối cùng: Cung đường hình học nội suy mượt mà
  const orig = input.origin;
  const dest = input.destination;
  const directPath = generateCurvedPath(
    { lat: orig.latitude, lng: orig.longitude },
    { lat: dest.latitude, lng: dest.longitude }
  );

  const approxDistance = calculateHaversineDistance(
    orig.latitude,
    orig.longitude,
    dest.latitude,
    dest.longitude
  );

  // Giả định tốc độ trung bình: ô tô 35 km/h, đi bộ 4.5 km/h
  const speedKmh = input.mode === 'WALKING' ? 4.5 : 35;
  const durationMillis = Math.round((approxDistance / (speedKmh * 1000)) * 3600 * 1000);

  return {
    input,
    path: directPath,
    distanceMeters: Math.round(approxDistance),
    durationMillis,
    warnings: ['Ước tính khoảng cách trực tiếp trên bản đồ OpenStreetMap.'],
    attribution: 'Bản quyền dữ liệu bản đồ © OpenStreetMap contributors',
  };
}

/**
 * Tính khoảng cách bề mặt địa cầu theo công thức Haversine (mét)
 */
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Bán kính trái đất (mét)
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Tạo cung đường nội suy các điểm giữa 2 toạ độ
 */
function generateCurvedPath(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  steps = 15
): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = start.lat + (end.lat - start.lat) * t;
    const lng = start.lng + (end.lng - start.lng) * t;
    points.push({ lat, lng });
  }
  return points;
}

export function routeError(reason: unknown) {
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
