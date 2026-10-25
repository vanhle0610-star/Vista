import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { api, apiErrorMessage } from '@/services/api/client';
import type { components } from '@/types/api.generated';
import { tokens } from '@/theme/tokens';
import { MapViewAdapter } from './MapViewAdapter';
import { LocationPermissionCard } from './LocationPermissionCard';
import { useForegroundLocation } from './useForegroundLocation';
import { loadMapDestinations } from './destinations';
import { validCoordinate, type MapCoordinate, type MapMarker } from './types';

export function MapScreen() {
  const params = useLocalSearchParams<{
    destinationId?: string;
    directions?: string;
  }>();
  const focused = useIsFocused();
  const location = useForegroundLocation(focused);
  const [selected, setSelected] = useState<MapMarker | null>(null);
  const [focusUser, setFocusUser] = useState(false);
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const [origin, setOrigin] = useState<MapMarker | 'gps' | null>(null);
  const [originSearch, setOriginSearch] = useState('');
  const [mode, setMode] = useState<'DRIVING' | 'WALKING'>('DRIVING');
  const [destinationSearch, setDestinationSearch] = useState('');
  const [partialDestinations, setPartialDestinations] = useState<
    Awaited<ReturnType<typeof loadMapDestinations>> | null
  >(null);
  const [route, setRoute] = useState<
    components['schemas']['RouteResult'] | null
  >(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [computing, setComputing] = useState(false);
  const requests = useRef(0);
  const routeFromGps = useRef(false);
  useEffect(() => {
    if (!location.position && routeFromGps.current) {
      routeFromGps.current = false;
      requests.current++;
      queueMicrotask(() => {
        setRoute(null);
        setComputing(false);
        setRouteError(null);
      });
    }
  }, [location.position]);
  useEffect(() => {
    if (directionsOpen && location.position && !origin)
      queueMicrotask(() => setOrigin('gps'));
  }, [directionsOpen, location.position, origin]);
  const [center, setCenter] = useState<MapCoordinate>({
    latitude: 16.061168,
    longitude: 108.227897,
  });
  const [cameraZoom, setCameraZoom] = useState(12);
  useEffect(() => {
    if (!focusUser || location.status === 'requesting') return;
    const position = location.position;
    queueMicrotask(() => {
      if (position) {
        setCenter(position);
        setCameraZoom(15);
      }
      // Locate is a one-time camera action, not an implicit follow mode.
      setFocusUser(false);
    });
  }, [focusUser, location.position, location.status]);
  const query = useQuery({
    queryKey: ['map-destinations'],
    queryFn: ({ signal }) => loadMapDestinations(signal, (result) => {
      if (!signal.aborted) setPartialDestinations(result);
    }),
    enabled: focused,
    retry: 1,
  });
  const detail = useQuery({
    queryKey: ['destination', params.destinationId],
    queryFn: async ({ signal }) =>
      (
        await api.get<components['schemas']['DestinationDetail']>(
          `/destinations/${params.destinationId}`,
          { signal },
        )
      ).data,
    enabled: focused && Boolean(params.destinationId),
    retry: 1,
  });
  useEffect(() => {
    const data = detail.data;
    if (!data || !validCoordinate(data)) return;
    requests.current++;
    const marker = {
      id: data.id,
      title: data.name,
      description: `${data.province} · ${data.category}`,
      latitude: data.latitude,
      longitude: data.longitude,
    };
    queueMicrotask(() => {
      setSelected(marker);
      setCenter(marker);
      setCameraZoom(12);
      setFocusUser(false);
      setDirectionsOpen(params.directions === '1');
      setRoute(null);
      setComputing(false);
    });
  }, [detail.data, params.directions]);
  useEffect(
    () => () => {
      requests.current++;
    },
    [],
  );
  useEffect(() => {
    if (!focused) {
      requests.current++;
      queueMicrotask(() => setComputing(false));
    }
  }, [focused]);
  const destinationData = query.data ?? partialDestinations;
  const markers = destinationData?.markers ?? [];
  const allMarkers =
    selected && !markers.some((m) => m.id === selected.id)
      ? [selected, ...markers]
      : markers;
  const visibleRoute =
    route?.input.fromGps && !location.position ? null : route;
  const routeGeometry = useMemo(
    () =>
      visibleRoute?.path.map((p) => ({ latitude: p.lat, longitude: p.lng })),
    [visibleRoute],
  );
  const clearRoute = () => {
    requests.current++;
    routeFromGps.current = false;
    setComputing(false);
    setRoute(null);
    setRouteError(null);
  };
  const compute = async () => {
    const start = origin === 'gps' ? location.position : origin;
    if (!start || !selected || computing) return;
    if (
      start.latitude === selected.latitude &&
      start.longitude === selected.longitude
    ) {
      setRouteError('Chọn hai địa điểm khác nhau.');
      return;
    }
    const generation = ++requests.current;
    routeFromGps.current = origin === 'gps';
    setComputing(true);
    setRoute(null);
    setRouteError(null);
    try {
      const { data } = await api.post<
        components['schemas']['RouteResult'] | null
      >(
        '/map/routes',
        {
          origin: {
            latitude: start.latitude,
            longitude: start.longitude,
            label:
              origin === 'gps'
                ? 'Vị trí của tôi'
                : (origin?.title ?? 'Điểm xuất phát'),
          },
          destination: {
            latitude: selected.latitude,
            longitude: selected.longitude,
            label: selected.title ?? 'Điểm đến',
          },
          mode,
          fromGps: origin === 'gps',
        },
        { timeout: 20000 },
      );
      if (generation === requests.current) {
        setRoute(data || null);
        if (!data)
          setRouteError('Chưa tìm thấy tuyến phù hợp. Hãy chọn địa điểm khác.');
      }
    } catch (error) {
      if (generation === requests.current)
        setRouteError(apiErrorMessage(error));
    } finally {
      if (generation === requests.current) setComputing(false);
    }
  };
  const select = (marker: MapMarker) => {
    clearRoute();
    setSelected(marker);
    setCenter(marker);
    setCameraZoom(12);
    setFocusUser(false);
  };
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.heading}>
        <AppText style={styles.title}>Bản đồ VISTA</AppText>
        <AppText>Khám phá địa điểm và tìm đường cho hành trình của bạn</AppText>
      </View>
      <View style={styles.map}>
        <MapViewAdapter
          center={center}
          zoom={cameraZoom}
          destinations={allMarkers.map((marker) => ({
            ...marker,
            name: marker.title ?? 'Địa điểm',
          }))}
          routeGeometry={routeGeometry}
          userLocation={location.position}
          selectedDestinationId={selected?.id}
          onSelectDestination={(marker) => {
            if (marker) select(marker);
          }}
          style={styles.mapCanvas}
        />
        <View style={styles.locate}>
          <AppButton
            label="◎ Vị trí của tôi"
            onPress={() => {
              setFocusUser(true);
              void location.request();
            }}
          />
        </View>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.panel}
      >
        <ScrollView
          style={styles.panel}
          contentContainerStyle={styles.panelContent}
        >
          {detail.isError && (
            <View style={styles.gap}>
              <AppText>Chưa tải được địa điểm trong liên kết.</AppText>
              <AppButton
                label="Thử lại địa điểm"
                onPress={() => {
                  void detail.refetch();
                }}
              />
            </View>
          )}
          {detail.data && !validCoordinate(detail.data) && (
            <AppText>
              {detail.data.name}: chưa có tọa độ hợp lệ. Vui lòng quay lại trang
              chi tiết để xem thông tin.
            </AppText>
          )}
          {query.isPending && <AppText>Đang tải địa điểm từ máy chủ…</AppText>}
          {query.isError && (
            <View style={styles.gap}>
              <AppText>
                Không tải được địa điểm: {apiErrorMessage(query.error)}
              </AppText>
              <AppButton
                label="Thử lại địa điểm"
                onPress={() => {
                  void query.refetch();
                }}
              />
            </View>
          )}
          {destinationData && (
            <AppText>
              {destinationData.markers.length
                ? `${destinationData.markers.length} địa điểm`
                : 'Danh sách địa điểm trống.'}
              {destinationData.rejected
                ? ` · Bỏ qua ${destinationData.rejected} địa điểm thiếu/sai tọa độ.`
                : ''}
            </AppText>
          )}
          {selected && (
            <View style={styles.selection}>
              <AppText style={styles.title}>{selected.title}</AppText>
              <AppText>{selected.description}</AppText>
              <AppButton
                label="Xem chi tiết"
                variant="secondary"
                onPress={() =>
                  router.push({
                    pathname: '/destination/[id]',
                    params: { id: selected.id },
                  })
                }
              />
              <AppButton
                label="Chỉ đường"
                onPress={() => {
                  clearRoute();
                  setDirectionsOpen(true);
                  if (location.position) setOrigin('gps');
                }}
              />
              <AppButton
                label="Đóng thông tin"
                variant="secondary"
                onPress={() => {
                  clearRoute();
                  setSelected(null);
                  setDirectionsOpen(false);
                }}
              />
            </View>
          )}
          {directionsOpen && selected && (
            <View style={styles.selection}>
              <AppText style={styles.title}>
                Chỉ đường đến {selected.title}
              </AppText>
              <AppText>
                Điểm xuất phát:{' '}
                {origin === 'gps'
                  ? 'Vị trí của tôi'
                  : (origin?.title ?? 'Chưa chọn')}
              </AppText>
              <AppButton
                label="Dùng vị trí của tôi"
                variant="secondary"
                onPress={() => {
                  clearRoute();
                  setOrigin('gps');
                  if (!location.position) void location.request();
                }}
              />
              <TextInput
                value={originSearch}
                onChangeText={setOriginSearch}
                placeholder="Tìm địa điểm xuất phát"
                placeholderTextColor={tokens.colors.muted}
                style={styles.input}
                accessibilityLabel="Tìm điểm xuất phát"
              />
              {allMarkers
                .filter(
                  (m) =>
                    m.id !== selected.id &&
                    (m.title ?? '')
                      .toLocaleLowerCase('vi')
                      .includes(originSearch.toLocaleLowerCase('vi')),
                )
                .slice(0, 8)
                .map((m) => (
                  <AppButton
                    key={m.id}
                    label={m.title ?? 'Địa điểm'}
                    variant="secondary"
                    onPress={() => {
                      clearRoute();
                      setOrigin(m);
                    }}
                  />
                ))}
              <AppButton
                label={
                  mode === 'DRIVING'
                    ? 'Phương tiện: Ô tô — đổi sang đi bộ'
                    : 'Phương tiện: Đi bộ — đổi sang ô tô'
                }
                variant="secondary"
                onPress={() => {
                  clearRoute();
                  setMode(mode === 'DRIVING' ? 'WALKING' : 'DRIVING');
                }}
              />
              <AppText>
                Khi tính tuyến, hai tọa độ được gửi qua VISTA đến dịch vụ chỉ
                đường. Thời gian ước tính chưa tính giao thông trực tiếp.
              </AppText>
              <AppButton
                label={computing ? 'Đang tính tuyến…' : 'Tính tuyến đường'}
                disabled={
                  computing ||
                  !origin ||
                  (origin === 'gps' && !location.position)
                }
                onPress={() => {
                  void compute();
                }}
              />
              {routeError && (
                <AppText accessibilityLiveRegion="polite">{routeError}</AppText>
              )}
              {visibleRoute && (
                <AppText>
                  {(visibleRoute.distanceMeters / 1000).toFixed(1)} km · khoảng{' '}
                  {Math.max(1, Math.ceil(visibleRoute.durationMillis / 60000))}{' '}
                  phút · {visibleRoute.attribution}
                </AppText>
              )}
              <AppButton
                label="Đóng chỉ đường"
                variant="secondary"
                onPress={() => {
                  clearRoute();
                  setDirectionsOpen(false);
                }}
              />
            </View>
          )}
          <LocationPermissionCard
            {...location}
            onRequest={() => {
              setFocusUser(true);
              void location.request();
            }}
            onStop={location.stop}
          />
          {!directionsOpen && (
            <View style={styles.gap}>
              <TextInput
                value={destinationSearch}
                onChangeText={setDestinationSearch}
                placeholder="Tìm địa điểm trên bản đồ"
                placeholderTextColor={tokens.colors.muted}
                style={styles.input}
                accessibilityLabel="Tìm địa điểm trên bản đồ"
              />
              {allMarkers
                .filter((marker) =>
                  (marker.title ?? '')
                    .toLocaleLowerCase('vi')
                    .includes(destinationSearch.toLocaleLowerCase('vi')),
                )
                .slice(0, 10)
                .map((marker) => (
                  <AppButton
                    key={marker.id}
                    label={marker.title ?? 'Địa điểm'}
                    variant="secondary"
                    onPress={() => select(marker)}
                  />
                ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.colors.canvas },
  heading: { padding: 12, gap: 4 },
  title: { fontSize: 20, fontWeight: '800', color: tokens.colors.cyan },
  map: { flex: 1, minHeight: 220, marginHorizontal: 8 },
  mapCanvas: { minHeight: 0 },
  locate: { position: 'absolute', top: 12, right: 12 },
  panel: { maxHeight: 310, flexShrink: 1 },
  panelContent: { padding: 12, gap: 12 },
  selection: {
    gap: 8,
    padding: 12,
    backgroundColor: tokens.colors.surface,
    borderRadius: 12,
  },
  gap: { gap: 8 },
  input: {
    padding: 12,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: 10,
    color: tokens.colors.ink,
  },
  devLink: { color: tokens.colors.cyan, paddingVertical: 12 },
});
