import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { tokens } from '../../theme/tokens';
import type { MapCoordinate } from './index';

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
  onMarkerPress?: (marker: MapMarker) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * MapViewAdapter - Owned by TV5 (Community User / Safety User).
 * Provides a decoupled abstraction over mobile map rendering.
 * Consumed by:
 * - TV1 (Destination detail location preview)
 * - TV2 (Trip destination preview)
 * - TV3 (Itinerary daily route map)
 * - TV5 (Group map, meetup points, live location sharing)
 */
export const MapViewAdapter: React.FC<MapViewAdapterProps> = ({
  center,
  zoom = 14,
  markers = [],
  routePoints = [],
  onMarkerPress,
  style,
  testID = 'map-view-adapter',
}) => {
  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.headerBadge}>
        <Text style={styles.badgeText}>BẢN ĐỒ VISTA (TV5 ADAPTER)</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.centerText}>
          Tâm bản đồ: {center.latitude.toFixed(4)}, {center.longitude.toFixed(4)} (Zoom: {zoom})
        </Text>
        {routePoints.length > 0 && (
          <Text style={styles.subText}>Tuyến đường: {routePoints.length} điểm dừng</Text>
        )}
      </View>

      <View style={styles.markersContainer}>
        {markers.map((marker) => (
          <TouchableOpacity
            key={marker.id}
            style={styles.markerCard}
            onPress={() => onMarkerPress?.(marker)}
            activeOpacity={0.7}
          >
            <View style={styles.markerPin} />
            <View style={styles.markerTextWrapper}>
              <Text style={styles.markerTitle}>{marker.title || marker.label || 'Điểm mốc'}</Text>
              <Text style={styles.markerCoords}>
                {marker.latitude.toFixed(4)}, {marker.longitude.toFixed(4)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: tokens.colors.canvas,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    padding: tokens.spacing.md,
    minHeight: 200,
    justifyContent: 'space-between',
  },
  headerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
  },
  badgeText: {
    color: tokens.colors.surface,
    fontSize: tokens.font.small,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  infoBox: {
    marginVertical: tokens.spacing.sm,
  },
  centerText: {
    fontSize: tokens.font.small,
    color: tokens.colors.ink,
    fontWeight: '600',
  },
  subText: {
    fontSize: tokens.font.small,
    color: tokens.colors.muted,
    marginTop: 2,
  },
  markersContainer: {
    gap: tokens.spacing.xs,
  },
  markerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.surface,
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  markerPin: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: tokens.colors.accent,
    marginRight: tokens.spacing.sm,
  },
  markerTextWrapper: {
    flex: 1,
  },
  markerTitle: {
    fontSize: tokens.font.small,
    fontWeight: '600',
    color: tokens.colors.ink,
  },
  markerCoords: {
    fontSize: 11,
    color: tokens.colors.muted,
  },
});
