import type { StyleProp, ViewStyle } from 'react-native';

export interface MapCoordinate {
  latitude: number;
  longitude: number;
  label?: string;
}
export interface MapMarker extends MapCoordinate {
  id: string;
  title?: string;
  description?: string;
  imageUrl?: string | null;
  category?: string;
  province?: string;
  address?: string;
  rating?: string;
  reviews?: string;
  distanceMeters?: number;
}
export interface MapDestination extends MapMarker {
  name: string;
  province?: string;
  category?: string;
  thumbnailUrl?: string;
}
export interface MapViewAdapterProps {
  center?: MapCoordinate;
  destinations?: MapDestination[];
  onSelectDestination?: (destination: MapMarker | null) => void;
  routeGeometry?: MapCoordinate[];
  onStatusChange?: (status: 'loading' | 'ready' | 'error') => void;
  zoom?: number;
  /** Compatibility alias for existing consumers; prefer destinations. */
  markers?: MapMarker[];
  routePoints?: MapCoordinate[];
  userLocation?: MapCoordinate | null;
  selectedDestinationId?: string | null;
  onMarkerPress?: (marker: MapMarker) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  onLocateUser?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}
export function validCoordinate(value: unknown): value is MapCoordinate {
  if (!value || typeof value !== 'object') return false;
  const { latitude, longitude } = value as MapCoordinate;
  return (
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    Math.abs(latitude) <= 90 &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude) &&
    Math.abs(longitude) <= 180
  );
}
export function selectMarker(markers: MapMarker[], id: string) {
  return markers.find((marker) => marker.id === id && validCoordinate(marker));
}

/**
 * Great-circle distance between two coordinates in meters using the Haversine formula (đường chim bay).
 */
export function computeDistanceMeters(
  from: MapCoordinate,
  to: MapCoordinate,
): number {
  if (!validCoordinate(from) || !validCoordinate(to)) return Infinity;
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Human-readable distance formatting: e.g. "800 m" or "1.5 km".
 */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '';
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}
