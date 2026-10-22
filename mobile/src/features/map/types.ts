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
}
export interface MapViewAdapterProps {
  center: MapCoordinate;
  zoom?: number;
  markers?: MapMarker[];
  routePoints?: MapCoordinate[];
  userLocation?: MapCoordinate | null;
  selectedDestinationId?: string | null;
  onMarkerPress?: (marker: MapMarker) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
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
