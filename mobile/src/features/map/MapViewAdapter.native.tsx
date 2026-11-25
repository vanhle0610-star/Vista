import React, { Component, lazy, Suspense, type ReactNode } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { ActivityIndicator, View } from 'react-native';
import type { MapViewAdapterProps } from './types';
import { validCoordinate } from './types';
import { MapVisualCanvas } from './MapVisualCanvas';

export type { MapViewAdapterProps, MapMarker } from './types';

const NativeMap = lazy(() => import('./NativeMap'));

class NativeMapBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function MapViewAdapter(props: MapViewAdapterProps) {
  const allMarkers = (props.destinations ?? props.markers ?? [])
    .filter(validCoordinate)
    .map((m) => ({
      ...m,
      title: 'name' in m && typeof m.name === 'string' ? m.name : m.title ?? 'Điểm đến',
    }));

  const hasRoute = Boolean(props.routeGeometry && props.routeGeometry.length > 1);

  const canvasFallback = (
    <View style={props.style}>
      <MapVisualCanvas
        markers={allMarkers}
        selectedMarkerId={props.selectedDestinationId}
        onSelectMarker={(marker) => {
          props.onMarkerPress?.(marker);
          props.onSelectDestination?.(marker);
        }}
        userLocation={props.userLocation}
        routeGeometry={props.routeGeometry}
        routeMode={hasRoute}
        onLocateUser={props.onLocateUser}
        onZoomIn={props.onZoomIn}
        onZoomOut={props.onZoomOut}
      />
    </View>
  );

  // In Expo Go or if native MapLibre binaries are absent, render vector Da Nang MapVisualCanvas
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return canvasFallback;
  }

  return (
    <NativeMapBoundary fallback={canvasFallback}>
      <Suspense
        fallback={
          <ActivityIndicator accessibilityLabel="Đang mở bản đồ" />
        }
      >
        <NativeMap {...props} />
      </Suspense>
    </NativeMapBoundary>
  );
}
