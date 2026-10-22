import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import {
  Camera,
  Map,
  ViewAnnotation,
  GeoJSONSource,
  Layer,
  TransformRequestManager,
  type StyleSpecification,
} from '@maplibre/maplibre-react-native';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { tokens } from '@/theme/tokens';
import {
  validCoordinate,
  selectMarker,
  type MapViewAdapterProps,
} from './types';

// SDK-wide app identity, registered once when the native module is loaded.
// The rule is limited to OSM tiles and shared by all adapter instances.
TransformRequestManager.addHeader({
  id: 'vista-osm-app-identity',
  match: '^https://tile\\.openstreetmap\\.org/',
  name: 'User-Agent',
  value: 'VISTA-Mobile/1.0 (MapLibre; OJT development)',
});

// Development spike only. Production must choose a tile provider with an agreed quota.
const mapStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};
export default function NativeMap({
  center,
  zoom = 12,
  markers = [],
  routePoints = [],
  userLocation,
  selectedDestinationId,
  onMarkerPress,
  style,
  testID = 'map-view-adapter',
}: MapViewAdapterProps) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  useEffect(() => {
    if (status !== 'loading') return;
    const timer = setTimeout(() => setStatus('error'), 20000);
    return () => clearTimeout(timer);
  }, [status, attempt]);
  const validMarkers = markers.filter(validCoordinate);
  const route = routePoints.filter(validCoordinate);
  const validUser = validCoordinate(userLocation) ? userLocation : null;
  const selected = selectMarker(validMarkers, selectedDestinationId ?? '');
  const target = validCoordinate(center)
    ? center
    : { latitude: 16.061168, longitude: 108.227897 };
  return (
    <View style={[styles.container, style]} testID={testID}>
      <Map
        key={attempt}
        style={StyleSheet.absoluteFill}
        mapStyle={mapStyle}
        attribution
        logo
        logoPosition={{ top: 12, left: 12 }}
        compass
        onDidFinishLoadingMap={() => setStatus('ready')}
        onDidFailLoadingMap={() => setStatus('error')}
      >
        <Camera center={[target.longitude, target.latitude]} zoom={zoom} />
        {validMarkers.map((marker) => (
          <ViewAnnotation
            key={marker.id}
            id={marker.id}
            lngLat={[marker.longitude, marker.latitude]}
            selected={selected?.id === marker.id}
            onPress={() => onMarkerPress?.(marker)}
          >
            <View
              accessible
              accessibilityLabel={marker.title ?? 'Điểm đến'}
              style={[
                styles.pin,
                selected?.id === marker.id && styles.selected,
              ]}
            >
              <AppText style={styles.pinText}>●</AppText>
            </View>
          </ViewAnnotation>
        ))}
        {validUser && (
          <ViewAnnotation
            id="vista-current-user"
            lngLat={[validUser.longitude, validUser.latitude]}
          >
            <View
              accessible
              accessibilityLabel="Vị trí của bạn"
              style={styles.user}
            />
          </ViewAnnotation>
        )}
        {route.length > 1 && (
          <GeoJSONSource
            id="vista-route"
            data={{
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: route.map((p) => [p.longitude, p.latitude]),
              },
            }}
          >
            <Layer
              id="vista-route-line"
              type="line"
              paint={{ 'line-color': '#0984e3', 'line-width': 3 }}
            />
          </GeoJSONSource>
        )}
      </Map>
      <View pointerEvents="none" style={styles.attribution}>
        <AppText style={styles.attributionText}>
          © OpenStreetMap contributors
        </AppText>
      </View>
      {status === 'loading' && (
        <View pointerEvents="none" style={styles.notice}>
          <ActivityIndicator />
          <AppText>Đang tải bản đồ…</AppText>
        </View>
      )}
      {status === 'error' && (
        <View style={styles.notice}>
          <AppText>Không tải được bản đồ. Kiểm tra mạng rồi thử lại.</AppText>
          <AppButton
            label="Tải lại bản đồ"
            onPress={() => {
              setStatus('loading');
              setAttempt((n) => n + 1);
            }}
          />
        </View>
      )}
      {!validMarkers.length && status === 'ready' && (
        <View pointerEvents="none" style={styles.notice}>
          <AppText>Chưa có địa điểm có tọa độ hợp lệ.</AppText>
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  attribution: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: '#ffffffec',
  },
  attributionText: { fontSize: 10, color: '#17324d' },
  container: {
    minHeight: 320,
    flex: 1,
    overflow: 'hidden',
    borderRadius: tokens.radius.md,
  },
  notice: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    padding: 12,
    gap: 8,
    borderRadius: 12,
    backgroundColor: tokens.colors.surface,
  },
  pin: {
    borderRadius: 18,
    width: 32,
    height: 32,
    backgroundColor: tokens.colors.primary,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: tokens.colors.primaryDark,
    borderColor: tokens.colors.cyan,
    borderWidth: 4,
  },
  pinText: { color: '#fff' },
  user: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#00cec9',
    borderWidth: 3,
    borderColor: '#fff',
  },
});
