export type MapProviderType = 'maplibre-vector' | 'leaflet-osm';

export type MapViewMode = '2d' | '3d';

export type MapEngineStatus =
  'loading' | 'ready' | 'error' | 'webgl-unsupported' | 'style-error';

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
  priceMin: number;
  priceMax: number;
  openingHours: string;
  sourceUrl: string;
  thumbnailUrl?: string;
}

export interface Bridge3DConfig {
  id: string;
  name: string;
  anchor: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
  westAbutment: {
    latitude: number;
    longitude: number;
  };
  eastAbutment: {
    latitude: number;
    longitude: number;
  };
  bearing: number; // degrees clockwise from true north
  deckElevationMeters: number;
  totalLengthMeters: number;
  deckWidthMeters: number;
  dragonMaxHeightMeters: number;
  scale: number;
  coordinateSource: string;
  notes: string;
  enableNightLighting?: boolean;
}

export interface SyncDevice {
  deviceId: string;
  deviceName: string;
  role: 'me' | 'partner';
  latitude: number;
  longitude: number;
  lastUpdatedAt: number;
  isSharing: boolean;
}

export type EventType = 'gps' | 'permission' | 'lifecycle' | 'map' | 'sync';

export interface EventLogItem {
  id: string;
  timestamp: string;
  type: EventType;
  isSimulation: boolean;
  title: string;
  details?: string;
}

export interface MapViewAdapterProps {
  destinations: DestinationMarker[];
  selectedDestinationId?: string | null;
  onSelectDestination?: (destination: DestinationMarker | null) => void;
  userCoords?: Coordinates | null;
  onRequestUserLocation?: () => void;
  mode?: MapViewMode;
  onModeChange?: (mode: MapViewMode) => void;
  bridgeConfig?: Bridge3DConfig;
  showBridge3D?: boolean;
  initialCenter?: { latitude: number; longitude: number; zoom?: number };
  styleUrl?: string;
  onStatusChange?: (status: MapEngineStatus, details?: string) => void;
  onError?: (error: Error) => void;
  className?: string;
  showSelectedCard?: boolean;
}
