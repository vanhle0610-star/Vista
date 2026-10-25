import type { components } from '@/types/api.generated';
import { validPoint } from '../data/publicDestinations';

export type RouteInput = components['schemas']['RouteInput'];
export type RouteResult = components['schemas']['RouteResult'];
export type TravelMode = RouteInput['mode'];
export function validateRouteInput(input: RouteInput) {
  if (!validPoint(input.origin) || !validPoint(input.destination)) throw new Error('Chọn đủ hai địa điểm hợp lệ.');
  if (!['DRIVING', 'WALKING'].includes(input.mode)) throw new Error('Phương tiện chưa được hỗ trợ.');
  if (input.origin.latitude === input.destination.latitude && input.origin.longitude === input.destination.longitude)
    throw new Error('Điểm xuất phát và điểm đến cần khác nhau.');
}
export async function computeVistaRoute(input: RouteInput): Promise<RouteResult | null> {
  validateRouteInput(input);
  const base = (process.env.NEXT_PUBLIC_API_URL ?? '/api/v1').replace(/\/+$/, '');
  const response = await fetch(`${base}/map/routes`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input), signal: AbortSignal.timeout(20000) });
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new Error(problem?.detail ?? `Không tính được tuyến (${response.status}).`);
  }
  const data = await response.text();
  return data ? JSON.parse(data) as RouteResult | null : null;
}
export function routeError(reason: unknown) {
  return reason instanceof Error && !['TypeError', 'TimeoutError'].includes(reason.name) ? reason.message : 'Không lấy được tuyến đường. Kiểm tra kết nối rồi thử lại.';
}
export class LatestRouteRequest {
  private version = 0;
  invalidate() { this.version++; }
  async run<T>(request: () => Promise<T>, accept: (value: T) => void, reject: (reason: unknown) => void) {
    const version = ++this.version;
    try { const value = await request(); if (version === this.version) accept(value); }
    catch (reason) { if (version === this.version) reject(reason); }
  }
}
