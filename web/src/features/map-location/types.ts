export type GeolocationStatus =
  | 'idle'
  | 'prompt'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'unsupported';

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp: number;
}

export interface GeolocationState {
  coords: Coordinates | null;
  status: GeolocationStatus;
  errorMessage: string | null;
  isWatching: boolean;
  isPageHidden: boolean;
  lastUpdated: number | null;
}

export interface DestinationMarker {
  id: string;
  name: string;
  province: string;
  category: string;
  latitude: number;
  longitude: number;
  description: string;
  priceMin?: number | null;
  priceMax?: number | null;
  openingHours?: string;
  sourceUrl?: string;
  thumbnailUrl?: string;
}

export interface MapViewAdapterProps {
  destinations: DestinationMarker[];
  selectedDestinationId?: string | null;
  onSelectDestination?: (destination: DestinationMarker | null) => void;
  userLocation?: Coordinates | null;
  routeGeometry?: { lat: number; lng: number }[];
  onDirections?: (destination: DestinationMarker) => void;
  onRequestUserLocation?: () => void;
  initialCenter?: { latitude: number; longitude: number; zoom?: number };
  onStatusChange?: (status: 'loading' | 'ready' | 'error') => void;
  className?: string;
  showSelectedCard?: boolean;
}
