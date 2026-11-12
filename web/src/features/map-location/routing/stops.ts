import type { Coordinates, DestinationMarker } from '../types';

// Product limit, enforced by the VISTA routing endpoint as well.
export { MAX_ROUTE_POINTS } from './routes';
export type PlannerStop = { id: string; placeId: string };
let nextStopId = 0;
export const createStop = (placeId = ''): PlannerStop => ({
  id: globalThis.crypto?.randomUUID?.() ?? `route-stop-${Date.now()}-${++nextStopId}`, placeId,
});
export const initialStops = (): PlannerStop[] => [
  { id: 'route-origin', placeId: '' }, { id: 'route-destination', placeId: '' },
];
export const stopRole = (index: number, count: number) =>
  index === 0 ? 'Điểm xuất phát' : index === count - 1 ? 'Điểm đến' : `Điểm dừng ${index}`;

export function moveStop(stops: PlannerStop[], id: string, target: number) {
  const source = stops.findIndex((stop) => stop.id === id);
  if (source <= 0 || target <= 0 || target >= stops.length || source === target) return stops;
  const next = [...stops];
  next.splice(target, 0, next.splice(source, 1)[0]);
  return next;
}

export function resolveStops(stops: PlannerStop[], destinations: DestinationMarker[], gps: Coordinates | null) {
  return stops.map((stop, index) => {
    const role = stopRole(index, stops.length);
    if (index === 0 && stop.placeId === 'gps' && gps) {
      return { latitude: gps.latitude, longitude: gps.longitude, label: 'Vị trí của bạn' };
    }
    const place = destinations.find((destination) => destination.id === stop.placeId);
    if (!place) throw new Error(`Hãy chọn ${role.toLowerCase()} hợp lệ.`);
    return { latitude: place.latitude, longitude: place.longitude, label: place.name };
  });
}
