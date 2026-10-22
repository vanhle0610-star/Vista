import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useIsFocused } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { apiErrorMessage } from '@/services/api/client';
import { tokens } from '@/theme/tokens';
import { MapViewAdapter } from './MapViewAdapter';
import { LocationPermissionCard } from './LocationPermissionCard';
import { useForegroundLocation } from './useForegroundLocation';
import { loadMapDestinations } from './destinations';
import type { MapCoordinate, MapMarker } from './types';

export function MapScreen() {
  const focused = useIsFocused();
  const location = useForegroundLocation(focused);
  const [selected, setSelected] = useState<MapMarker | null>(null);
  const [focusUser, setFocusUser] = useState(false);
  const [center, setCenter] = useState<MapCoordinate>({
    latitude: 16.061168,
    longitude: 108.227897,
  });
  const query = useQuery({
    queryKey: ['map-destinations'],
    queryFn: ({ signal }) => loadMapDestinations(signal),
    enabled: focused,
    retry: 1,
  });
  const select = (marker: MapMarker) => {
    setSelected(marker);
    setCenter(marker);
    setFocusUser(false);
  };
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.heading}>
        <AppText style={styles.title}>Bản đồ VISTA</AppText>
        <AppText>Khám phá địa điểm · GPS theo lựa chọn của bạn</AppText>
      </View>
      <View style={styles.map}>
        <MapViewAdapter
          center={focusUser && location.position ? location.position : center}
          zoom={focusUser && location.position ? 15 : 12}
          markers={query.isError ? [] : (query.data?.markers ?? [])}
          userLocation={location.position}
          selectedDestinationId={selected?.id}
          onMarkerPress={select}
        />
      </View>
      <ScrollView
        style={styles.panel}
        contentContainerStyle={styles.panelContent}
      >
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
        {query.data && !query.isError && (
          <AppText>
            {query.data.markers.length
              ? `${query.data.markers.length} địa điểm từ API VISTA`
              : 'Danh sách địa điểm trống.'}
            {query.data.rejected
              ? ` · Bỏ qua ${query.data.rejected} địa điểm thiếu/sai tọa độ.`
              : ''}
          </AppText>
        )}
        {selected && (
          <View style={styles.selection}>
            <AppText style={styles.title}>{selected.title}</AppText>
            <AppText>{selected.description}</AppText>
            <AppButton
              label="Đóng thông tin"
              variant="secondary"
              onPress={() => setSelected(null)}
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
        {__DEV__ && (
          <Link href="/dev/map-location" style={styles.devLink}>
            Mở kiểm tra GPS nội bộ
          </Link>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.colors.canvas },
  heading: { padding: 12, gap: 4 },
  title: { fontSize: 20, fontWeight: '800', color: tokens.colors.cyan },
  map: { flex: 1, minHeight: 320, marginHorizontal: 8 },
  panel: { maxHeight: 310 },
  panelContent: { padding: 12, gap: 12 },
  selection: {
    gap: 8,
    padding: 12,
    backgroundColor: tokens.colors.surface,
    borderRadius: 12,
  },
  gap: { gap: 8 },
  devLink: { color: tokens.colors.cyan, paddingVertical: 12 },
});
