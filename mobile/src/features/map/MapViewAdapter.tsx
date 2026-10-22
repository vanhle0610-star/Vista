import { View, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { tokens } from '@/theme/tokens';
import { validCoordinate, type MapViewAdapterProps } from './types';
export type { MapViewAdapterProps, MapMarker } from './types';

/** Explicit unsupported-platform fallback, not a native map implementation. */
export function MapViewAdapter({
  markers = [],
  onMarkerPress,
  style,
  testID,
}: MapViewAdapterProps) {
  return (
    <View style={[styles.container, style]} testID={testID}>
      <AppText>
        Bản đồ native cần bản development build Android/iOS. Bản Expo web và
        Expo Go chỉ hiển thị danh sách dự phòng.
      </AppText>
      {markers.filter(validCoordinate).map((marker) => (
        <AppButton
          key={marker.id}
          label={marker.title ?? 'Điểm đến'}
          variant="secondary"
          onPress={() => onMarkerPress?.(marker)}
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
