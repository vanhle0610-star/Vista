import { validPoint } from '../coordinates';
import { validateRouteInput, type RouteInput, type RouteResult } from './routes';

type Point = RouteInput['origin'];
type OsrmRoute = {
  geometry?: { type?: string; coordinates?: number[][] };
  legs?: { distance?: number; duration?: number }[];
};

// FOSSGIS publishes a maximum of one request/second. Reserve start times even
// when several route edits arrive together; reject a long queue instead of flooding it.
let nextWalkingRequest = 0;
async function reserveWalkingRequest(signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) return false;
  const now = Date.now();
  const delay = Math.max(0, nextWalkingRequest - now);
  if (delay > 3000) return false;
  nextWalkingRequest = Math.max(now, nextWalkingRequest) + 1100;
  if (!delay) return true;
  return new Promise((resolve) => {
    const abort = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); resolve(false); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(true); }, delay);
    signal.addEventListener('abort', abort, { once: true });
  });
}

function problem(status: number, detail: string) {
  return Response.json({ status, detail }, { status, headers: { 'Cache-Control': 'no-store' } });
}

function parseInput(value: unknown): RouteInput {
  if (!value || typeof value !== 'object') throw new Error('Hãy chọn đủ các điểm của lộ trình.');
  const input = value as Partial<RouteInput>;
  if ((input.waypoints !== undefined && !Array.isArray(input.waypoints)) || typeof input.fromGps !== 'boolean') {
    throw new Error('Dữ liệu lộ trình không hợp lệ.');
  }
  const points = [input.origin, ...(input.waypoints ?? []), input.destination];
  for (const point of points) {
    if (!validPoint(point) || typeof point.label !== 'string' || point.label.length > 200) {
      throw new Error('Chọn đủ các địa điểm có tên và tọa độ hợp lệ.');
    }
  }
  validateRouteInput(input as RouteInput);
  // Forward only the supported contract, never arbitrary upstream options or URLs.
  const point = (value: Point): Point => ({ latitude: value.latitude, longitude: value.longitude, label: value.label });
  return { origin: point(input.origin!), destination: point(input.destination!), waypoints: input.waypoints?.map((value) => point(value as Point)), mode: input.mode!, fromGps: input.fromGps };
}

function completeRoute(value: unknown, input: RouteInput): value is RouteResult {
  if (!value || typeof value !== 'object') return false;
  const route = value as Partial<RouteResult>;
  const metric = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  return Array.isArray(route.path) && route.path.length >= 2 && route.path.length <= 100000 &&
    route.path.every((point) => validPoint({ latitude: point?.lat, longitude: point?.lng })) &&
    metric(route.distanceMeters) && metric(route.durationMillis) &&
    Array.isArray(route.legs) && route.legs.length === (input.waypoints?.length ?? 0) + 1 &&
    route.legs.every((leg) => leg && metric(leg.distanceMeters) && metric(leg.durationMillis) && typeof leg.fromLabel === 'string' && typeof leg.toLabel === 'string') &&
    Array.isArray(route.warnings) && route.warnings.every((warning) => typeof warning === 'string') && typeof route.attribution === 'string';
}

function backendUrl(request: Request) {
  const configured = process.env.VISTA_BACKEND_API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  const base = configured && /^https?:\/\//.test(configured) ? configured : 'http://localhost:8081/api/v1';
  const url = new URL(base.replace(/\/+$/, '') + '/map/routes');
  if (url.origin === new URL(request.url).origin) throw new Error('Recursive route proxy');
  return url;
}

/** ORS remains primary. OSRM fallbacks use separate car and pedestrian road graphs. */
export async function handleRouteRequest(request: Request, fetcher: typeof fetch = fetch): Promise<Response> {
  let input: RouteInput;
  try {
    const body = await request.text();
    if (body.length > 16000) return problem(413, 'Dữ liệu lộ trình quá lớn.');
    input = parseInput(JSON.parse(body));
  } catch (error) {
    return problem(400, error instanceof SyntaxError ? 'Dữ liệu lộ trình không hợp lệ.' : error instanceof Error ? error.message : 'Dữ liệu lộ trình không hợp lệ.');
  }
  const walking = input.mode === 'WALKING';
  const modeLabel = walking ? 'đi bộ' : 'ô tô';
  try {
    const response = await fetcher(backendUrl(request), {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(input), cache: 'no-store',
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(17000)]),
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (response.ok) {
      if (data === null) return Response.json(null, { headers: { 'Cache-Control': 'no-store' } });
      if (completeRoute(data, input)) return Response.json({ ...data, input }, { headers: { 'Cache-Control': 'no-store' } });
    } else {
      // Preserve input errors, access rules and rate limits; do not bypass them via a fallback.
      if (response.status >= 400 && response.status < 500) return problem(response.status, typeof data?.detail === 'string' ? data.detail : 'Dịch vụ chỉ đường chưa xử lý được yêu cầu. Vui lòng thử lại.');
    }
  } catch { /* A stopped backend or failed ORS connection must not disable supported OSRM modes. */ }
  if (request.signal.aborted) return problem(499, 'Đã hủy yêu cầu chỉ đường.');
  if (walking && !await reserveWalkingRequest(request.signal)) {
    return problem(request.signal.aborted ? 499 : 429, request.signal.aborted ? 'Đã hủy yêu cầu chỉ đường.' : 'Dịch vụ đi bộ đang bận. Vui lòng thử lại sau vài giây.');
  }

  try {
    const points = [input.origin, ...(input.waypoints ?? []), input.destination];
    const coordinates = points.map((point) => point.longitude + ',' + point.latitude).join(';');
    // Changing /driving to /walking on the car server does not change its graph.
    // Use the FOSSGIS instance built with a pedestrian profile instead.
    const endpoint = walking ? 'https://routing.openstreetmap.de/routed-foot/route/v1/foot/' : 'https://router.project-osrm.org/route/v1/driving/';
    const response = await fetcher(endpoint + coordinates + '?overview=full&geometries=geojson&steps=false&alternatives=false', {
      headers: { Accept: 'application/json', 'User-Agent': 'VISTA-OJT/1.0 (travel route planner)', Referer: new URL('/map', request.url).href }, cache: 'no-store',
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(12000)]),
    });
    const data = await response.json() as { code?: string; routes?: OsrmRoute[]; waypoints?: unknown[] };
    if (data.code === 'NoRoute' || data.code === 'NoSegment') return Response.json(null, { headers: { 'Cache-Control': 'no-store' } });
    if (response.status === 429) return problem(429, 'Dịch vụ chỉ đường đang đạt giới hạn. Vui lòng thử lại sau.');
    if (!response.ok || data.code !== 'Ok') return problem(503, `Dịch vụ chỉ đường ${modeLabel} tạm thời không khả dụng. Vui lòng thử lại.`);
    const route = data.routes?.[0];
    if (!route || route.geometry?.type !== 'LineString' || !Array.isArray(route.geometry.coordinates) ||
        data.waypoints?.length !== points.length || !Array.isArray(route.legs) || route.legs.length !== points.length - 1) {
      return problem(502, 'Dịch vụ chưa trả đủ các chặng hợp lệ cho lộ trình.');
    }
    const legs = route.legs.map((leg, index) => ({
      fromLabel: points[index].label ?? 'Điểm xuất phát', toLabel: points[index + 1].label ?? 'Điểm đến',
      distanceMeters: leg.distance!, durationMillis: Math.round(leg.duration! * 1000),
    }));
    const result: RouteResult = {
      input, path: route.geometry.coordinates.map((point) => ({ lat: point[1], lng: point[0] })), legs,
      distanceMeters: legs.reduce((sum, leg) => sum + leg.distanceMeters, 0),
      durationMillis: legs.reduce((sum, leg) => sum + leg.durationMillis, 0),
      warnings: [walking ? 'Tuyến đi bộ tính theo dữ liệu đường dành cho người đi bộ. Hãy kiểm tra biển báo và điều kiện tiếp cận thực tế.' : 'Đang dùng tuyến ô tô OSRM dự phòng vì ORS chưa khả dụng. Thời gian ước tính, chưa tính giao thông trực tiếp.'],
      attribution: walking ? 'OSRM / FOSSGIS · © OpenStreetMap contributors' : 'OSRM · © OpenStreetMap contributors',
    };
    if (!completeRoute(result, input)) return problem(502, 'Dịch vụ trả về hình học hoặc số liệu lộ trình không hợp lệ.');
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return problem(503, `Không kết nối được dịch vụ chỉ đường ${modeLabel}. Vui lòng thử lại sau.`);
  }
}
