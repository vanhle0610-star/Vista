import React from 'react';
import { View, StyleSheet } from 'react-native';
import { tokens } from '@/theme/tokens';
import { validCoordinate, type MapViewAdapterProps } from './types';
import { MapVisualCanvas } from './MapVisualCanvas';

export type { MapViewAdapterProps, MapMarker } from './types';

/** Fallback & Web Vector Da Nang Map Adapter */
export function MapViewAdapter({
  markers = [],
  destinations,
  onSelectDestination,
  onMarkerPress,
  userLocation,
  selectedDestinationId,
  routeGeometry,
  onLocateUser,
  onZoomIn,
  onZoomOut,
  style,
  testID,
}: MapViewAdapterProps) {
  const allMarkers = (destinations ?? markers).filter(validCoordinate).map((m) => ({
    ...m,
    title: 'name' in m && typeof m.name === 'string' ? m.name : m.title ?? 'Điểm đến',
  }));

  const hasRoute = Boolean(routeGeometry && routeGeometry.length > 1);

  return (
    <View style={[styles.container, style]} testID={testID}>
      <MapVisualCanvas
        markers={allMarkers}
        selectedMarkerId={selectedDestinationId}
        onSelectMarker={(marker) => {
          onMarkerPress?.(marker);
          onSelectDestination?.(marker);
        }}
        userLocation={userLocation}
        routeGeometry={routeGeometry}
        routeMode={hasRoute}
        onLocateUser={onLocateUser}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 280,
    backgroundColor: tokens.colors.surface,
  },
});
