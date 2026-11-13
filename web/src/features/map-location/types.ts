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
  imageUrl?: string;
  rating?: number | null;
  reviewCount?: number;
}

export type Destination = DestinationMarker;

export interface RouteStop {
  id?: string;
  latitude: number;
  longitude: number;
  label: string;
  role?: string;
  tag?: string; // 'A', 'B', 'C', 'D' or '1', '2', '3'...
  type?: 'origin' | 'waypoint' | 'destination';
  dayNumber?: number;
  color?: string;
}

export interface MultiDayRoute {
  dayNumber: number;
  color: string;
  geometry: { lat: number; lng: number }[];
  stops: RouteStop[];
}

export interface MapViewAdapterProps {
  destinations: DestinationMarker[];
  selectedDestinationId?: string | null;
  onSelectDestination?: (destination: DestinationMarker | null) => void;
  userLocation?: Coordinates | null;
  routeGeometry?: { lat: number; lng: number }[];
  routeStops?: RouteStop[];
  multiDayRoutes?: MultiDayRoute[];
  hideDestinationMarkers?: boolean;
  onDirections?: (destination: DestinationMarker) => void;
  onRequestUserLocation?: () => void;
  gpsStatus?: GeolocationStatus;
  gpsError?: string | null;
  initialCenter?: { latitude: number; longitude: number; zoom?: number };
  onStatusChange?: (status: 'loading' | 'ready' | 'error') => void;
  className?: string;
  showSelectedCard?: boolean;
  cameraTarget?: { latitude: number; longitude: number; zoom?: number } | null;
  onAddToTrip?: (destination: DestinationMarker) => void;
  route?: import('./routing/routes').RouteResult | null;
  currentCityName?: string;
  onOpenRouteDetail?: () => void;
  sidebarCollapsed?: boolean;
  locationBadgeLabel?: string;
  disableAutoCenterOnSelect?: boolean;
}
