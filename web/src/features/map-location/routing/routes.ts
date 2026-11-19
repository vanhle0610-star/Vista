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

export type RoadLegSummary = { distanceKm: number; durationMin: number };

export type RouteLeg = {
  fromLabel: string;
  toLabel: string;
  distanceMeters: number;
  durationMillis: number;
  distanceKm?: number;
  durationMin?: number;
  summary?: string;
  steps?: RouteStep[];
};

export type RouteResult = Omit<components['schemas']['RouteResult'], 'legs'> & {
  legs?: RouteLeg[];
  source?: string;
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
  const waypoints = input.waypoints || [];
  const allPoints: Array<{ latitude: number; longitude: number }> = [input.origin, ...waypoints, input.destination];

  // 1. Ưu tiên gọi Server-side Cached Road Routing Proxy (/api/routing/road) — tránh CORS & tăng tốc cache
  if (typeof window !== 'undefined') {
    try {
      const roadRes = await fetch('/api/routing/road', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: input.mode,
          points: allPoints.map((p) => ({ lat: p.latitude, lng: p.longitude })),
        }),
        signal: AbortSignal.timeout(9000),
      });
      if (roadRes.ok) {
        const rData = await roadRes.json();
        if (rData && Array.isArray(rData.path) && rData.path.length >= 2) {
          const normalizedLegs: RouteLeg[] | undefined = Array.isArray(rData.legs)
            ? rData.legs.map((lg: any) => {
                const dKm = Number(lg?.distanceKm) || 0;
                const dMin = Number(lg?.durationMin) || 0;
                return {
                  fromLabel: String(lg?.fromLabel || ''),
                  toLabel: String(lg?.toLabel || ''),
                  distanceKm: dKm,
                  durationMin: dMin,
                  distanceMeters: Number(lg?.distanceMeters) || Math.round(dKm * 1000),
                  durationMillis: Number(lg?.durationMillis) || Math.round(dMin * 60000),
                };
              })
            : undefined;
          return {
            input,
            path: rData.path,
            distanceMeters: Number(rData.distanceMeters) || 0,
            durationMillis: Number(rData.durationMillis) || 0,
            legs: normalizedLegs,
            source: rData.source || 'osrm-road',
            warnings:
              input.mode === 'WALKING'
                ? ['Tuyến đi bộ hiển thị theo mạng lưới đường bộ OpenStreetMap. Hãy chú ý an toàn giao thông.']
                : [],
            attribution: 'Tuyến đường bộ thực tế qua OpenStreetMap (OSRM · Cached)',
          };
        }
      }
    } catch {
      // Fallback sang backend / OSRM trực tiếp
    }
  }

  const base = (process.env.NEXT_PUBLIC_API_URL ?? '/api/v1').replace(/\/+$/, '');

  // 2. Thử gọi backend routing (OpenRouteService nếu có cấu hình key)
  try {
    const response = await fetch(`${base}/map/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(5000),
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

  // 3. OpenStreetMap OSRM Free Routing Service (Miễn phí 100%, không cần key)
  try {
    const coordsStr = allPoints.map((p) => `${p.longitude},${p.latitude}`).join(';');
    const profile = input.mode === 'WALKING' ? 'walking' : 'driving';
    const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${coordsStr}?overview=full&geometries=geojson`;

    const osrmRes = await fetch(osrmUrl, { signal: AbortSignal.timeout(8000) });
    if (osrmRes.ok) {
      const json = await osrmRes.json();
      if (json && json.code === 'Ok' && Array.isArray(json.routes) && json.routes.length > 0) {
        const primaryRoute = json.routes[0];
        const rawCoords: [number, number][] = primaryRoute.geometry?.coordinates || [];

        const path = rawCoords.map(([lng, lat]) => ({ lat, lng }));
        const distanceMeters = Math.round(primaryRoute.distance || 0);
        const durationMillis = Math.round((primaryRoute.duration || 0) * 1000);
        const legs: RouteLeg[] = Array.isArray(primaryRoute.legs)
          ? primaryRoute.legs.map((lg: any) => {
              const distM = Math.round(Number(lg?.distance) || 0);
              const durMs = Math.round((Number(lg?.duration) || 0) * 1000);
              return {
                fromLabel: '',
                toLabel: '',
                distanceMeters: distM,
                durationMillis: durMs,
                distanceKm: Number((distM / 1000).toFixed(1)),
                durationMin: Math.max(1, Math.round(durMs / 60000)),
              };
            })
          : [];

        return {
          input,
          path,
          distanceMeters,
          durationMillis,
          legs,
          source: 'osrm-direct',
          warnings:
            input.mode === 'WALKING'
              ? ['Tuyến đi bộ hiển thị theo mạng lưới đường bộ OpenStreetMap. Hãy chú ý an toàn giao thông.']
              : [],
          attribution: 'Tuyến đường thời gian thực qua OpenStreetMap (OSRM) · Không phát sinh chi phí',
        };
      }
    }
  } catch (osrmErr) {
    console.warn('OSRM routing fallback failed, using multi-waypoint path:', osrmErr);
  }

  // 4. Fallback cuối cùng: giữ nguyên đủ mọi waypoints + tính legs ước lượng
  const directPath: { lat: number; lng: number }[] = [];
  const fallbackLegs: RoadLegSummary[] = [];
  let totalDist = 0;
  const speedKmh = input.mode === 'WALKING' ? 4.5 : 32;

  for (let i = 0; i < allPoints.length - 1; i++) {
    const a = allPoints[i];
    const b = allPoints[i + 1];
    const legSeg = generateCurvedPath({ lat: a.latitude, lng: a.longitude }, { lat: b.latitude, lng: b.longitude }, 10);
    if (i > 0) legSeg.shift();
    directPath.push(...legSeg);
    const m = calculateHaversineDistance(a.latitude, a.longitude, b.latitude, b.longitude) * 1.25;
    totalDist += m;
    fallbackLegs.push({
      distanceKm: Number((m / 1000).toFixed(1)),
      durationMin: Math.max(2, Math.round((m / 1000 / speedKmh) * 60)),
    });
  }

  const durationMillis = Math.round((totalDist / (speedKmh * 1000)) * 3600 * 1000);

  return {
    input,
    path: directPath,
    distanceMeters: Math.round(totalDist),
    durationMillis,
    legs: fallbackLegs.map((lg) => ({
      fromLabel: '',
      toLabel: '',
      distanceMeters: Math.round(lg.distanceKm * 1000),
      durationMillis: Math.round(lg.durationMin * 60000),
      distanceKm: lg.distanceKm,
      durationMin: lg.durationMin,
    })),
    source: 'geodesic-fallback',
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
