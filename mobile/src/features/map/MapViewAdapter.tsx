import { View, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { tokens } from '@/theme/tokens';
import { validCoordinate, type MapViewAdapterProps } from './types';
export type { MapViewAdapterProps, MapMarker } from './types';

/** Explicit unsupported-platform fallback, not a native map implementation. */
export function MapViewAdapter({
  markers = [],
  destinations,
  onSelectDestination,
  onMarkerPress,
  style,
  testID,
}: MapViewAdapterProps) {
  return (
    <View style={[styles.container, style]} testID={testID}>
      <AppText>
        Phiên bản này chưa hỗ trợ hiển thị bản đồ. Bạn vẫn có thể chọn địa điểm bên dưới.
      </AppText>
      {(destinations ?? markers).filter(validCoordinate).map((marker) => (
        <AppButton
          key={marker.id}
          label={'name' in marker && typeof marker.name === 'string' ? marker.name : marker.title ?? 'Điểm đến'}
          variant="secondary"
          onPress={() => { onMarkerPress?.(marker); onSelectDestination?.(marker); }}
        />
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 8,
    backgroundColor: tokens.colors.surface,
    minHeight: 280,
  },
});
