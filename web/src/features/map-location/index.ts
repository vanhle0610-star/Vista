/**
 * VISTA Map & Location Feature Module (TV5 - Week 2)
 * Public API & Components for VISTA Platform Integration
 */

// Adapter & UI Components
export { MapViewAdapter } from './adapter/MapViewAdapter';
export { DestinationList } from './components/DestinationList';
export { DestinationCard } from './components/DestinationCard';
export { GPSPermissionBar } from './components/GPSPermissionBar';
export { MapViewer } from './components/MapViewer';
export { MapLocationHeader } from './components/MapLocationHeader';
export { PermissionCard } from './components/PermissionCard';
export { TestingHarnessCard } from './components/TestingHarnessCard';
export { TwoDeviceSyncCard } from './components/TwoDeviceSyncCard';
export { MapComparisonModal } from './components/MapComparisonModal';

// 3D Architecture & Procedural Dragon Bridge
export { DragonBridgeBuilder } from './3d/DragonBridgeBuilder';
export { MapLibre3DBridgeLayer } from './3d/MapLibre3DBridgeLayer';
export { DRAGON_BRIDGE_CONFIG } from './data/bridgeConfig';

// Data & Fixtures
export { SAMPLE_DESTINATIONS, DEFAULT_MAP_CENTER } from './data/destinations';

// Hooks
export { useGeolocation } from './hooks/useGeolocation';
export { useTwoDeviceSync } from './hooks/useTwoDeviceSync';

// Types
export type {
  Coordinates,
  GeolocationState,
  GeolocationStatus,
  DestinationMarker,
  Bridge3DConfig,
  MapViewMode,
  MapEngineStatus,
  MapViewAdapterProps,
  SyncDevice,
  EventType,
  EventLogItem,
  MapProviderType,
} from './types';
