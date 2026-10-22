/**
 * Feature: Map & Directions (BF-01, BF-05)
 * Sở hữu theo Actor: TV5 (Community User / Safety User)
 * Cung cấp: MapViewAdapter cho TV1 (Điểm đến), TV2 (Chuyến đi), TV3 (Lịch trình)
 */
export type { MapCoordinate } from './types';

export {
  MapViewAdapter,
  type MapMarker,
  type MapViewAdapterProps,
} from './MapViewAdapter';
export { LocationPermissionCard } from './LocationPermissionCard';
export { useForegroundLocation } from './useForegroundLocation';
