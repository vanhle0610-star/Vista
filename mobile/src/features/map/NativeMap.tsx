import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import {
  Camera,
  type CameraRef,
  Map,
  ViewAnnotation,
  GeoJSONSource,
  Layer,
} from '@maplibre/maplibre-react-native';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { tokens } from '@/theme/tokens';
import {
  validCoordinate,
  selectMarker,
  type MapViewAdapterProps,
} from './types';

const mapStyle = 'https://tiles.openfreemap.org/styles/liberty';
const emptyRoute: NonNullable<MapViewAdapterProps['routeGeometry']> = [];
export default function NativeMap({
  center,
  zoom = 12,
  markers = [],
  routePoints = emptyRoute,
  destinations,
  routeGeometry,
  onSelectDestination,
  onStatusChange,
  userLocation,
  selectedDestinationId,
  onMarkerPress,
  style,
  testID = 'map-view-adapter',
}: MapViewAdapterProps) {
  const camera = useRef<CameraRef>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const report = useEffectEvent(() => onStatusChange?.(status));
  useEffect(() => {
    report();
  }, [status]);
  useEffect(() => {
    if (status !== 'loading') return;
    const timer = setTimeout(() => setStatus('error'), 20000);
    return () => clearTimeout(timer);
  }, [status, attempt]);
  const validMarkers = (
    destinations?.map((destination) => ({
      ...destination,
      title: destination.name,
    })) ?? markers
  ).filter(validCoordinate);
  const geometry = routeGeometry ?? routePoints;
  const route = geometry.filter(validCoordinate);
  useEffect(() => {
    if (geometry.length < 2 || status !== 'ready') return;
    const points = geometry.filter(validCoordinate);
    if (points.length < 2) return;
    let west = 180,
      south = 90,
      east = -180,
      north = -90;
    for (const point of points) {
      west = Math.min(west, point.longitude);
      east = Math.max(east, point.longitude);
      south = Math.min(south, point.latitude);
      north = Math.max(north, point.latitude);
    }
    camera.current?.fitBounds([west, south, east, north], {
      padding: { top: 40, right: 40, bottom: 40, left: 40 },
      duration: 700,
    });
  }, [geometry, status]);
  const validUser = validCoordinate(userLocation) ? userLocation : null;
  const selected = selectMarker(validMarkers, selectedDestinationId ?? '');
  const target = validCoordinate(center)
    ? center
    : (selected ?? { latitude: 16.061168, longitude: 108.227897 });
  const longitude = Number(target.longitude);
  const latitude = Number(target.latitude);
  // A GPS marker update must not reapply the controlled camera stop after a pan.
  const cameraCenter = useMemo<[number, number]>(
    () => [longitude, latitude],
    [longitude, latitude],
  );
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
        touchRotate={false}
        touchPitch={false}
        onDidFinishLoadingMap={() => setStatus('ready')}
        onDidFailLoadingMap={() => setStatus('error')}
      >
        <Camera
          ref={camera}
          center={cameraCenter}
          zoom={zoom}
          pitch={0}
          bearing={0}
        />
        {validMarkers.map((marker) => (
          <ViewAnnotation
            key={marker.id}
            id={marker.id}
            lngLat={[marker.longitude, marker.latitude]}
            selected={selected?.id === marker.id}
            onPress={() => {
              onMarkerPress?.(marker);
              onSelectDestination?.(marker);
            }}
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
              style={styles.userHaloContainer}
              pointerEvents="none"
            >
              <View style={styles.userAccuracyCircle} />
              <View style={styles.userDot} />
            </View>
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
          OpenFreeMap · © OpenMapTiles · © OpenStreetMap
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
    left: 8,
    bottom: 74,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  attributionText: { fontSize: 10, color: '#17324d', fontWeight: '500' },
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  selected: {
    backgroundColor: tokens.colors.primaryDark,
    borderColor: tokens.colors.cyan,
    borderWidth: 4,
  },
  pinText: { color: '#fff', fontSize: 13 },
  userHaloContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAccuracyCircle: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(2, 132, 199, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.45)',
  },
  userDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#0284C7',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  user: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#00cec9',
    borderWidth: 3,
    borderColor: '#fff',
  },
});
