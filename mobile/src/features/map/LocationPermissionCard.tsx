import { useState } from 'react';
import { Linking, View, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { tokens } from '@/theme/tokens';
import type { LocationState, LocationStatus } from './locationController';

const messages: Record<LocationStatus, string> = {
  idle: 'Cho phép vị trí để tìm bạn trên bản đồ. Bạn vẫn xem được địa điểm khi bỏ qua.',
  requesting: 'Đang xin quyền hoặc tìm vị trí…',
  granted: 'Đã xác định vị trí của bạn.',
  denied: 'Bạn đã từ chối. Có thể thử lại khi muốn dùng vị trí.',
  blocked: 'Quyền vị trí đang bị chặn. Hãy cho phép trong cài đặt ứng dụng.',
  'services-off':
    'Dịch vụ vị trí của thiết bị đang tắt. Hãy bật GPS trong cài đặt rồi thử lại.',
  unavailable: 'Không lấy được vị trí. Hãy kiểm tra GPS rồi thử lại.',
  timeout: 'Tìm vị trí quá lâu. Hãy thử lại ở nơi thoáng hơn.',
  paused: 'Định vị đã dừng khi màn hình không hoạt động.',
};
export function LocationPermissionCard({
  status,
  position,
  approximate,
  onRequest,
  onStop,
}: LocationState & { onRequest: () => void; onStop: () => void }) {
  const [settingsError, setSettingsError] = useState(false);
  return (
    <View style={styles.card}>
      <AppText style={styles.title}>Vị trí của tôi</AppText>
      <AppText accessibilityLiveRegion="polite">{messages[status]}</AppText>
      {position && (
        <AppText>
          {approximate ? 'Vị trí gần đúng' : 'Vị trí hiện tại'}
          {position.accuracy != null
            ? ` · sai số khoảng ${Math.round(position.accuracy)} m`
            : ''}
        </AppText>
      )}
      <AppText style={styles.note}>
        Chỉ dùng khi mở màn hình. Không chia sẻ vị trí cho người khác.
      </AppText>
      {status === 'blocked' ? (
        <AppButton
          label="Mở cài đặt ứng dụng"
          onPress={() => {
            setSettingsError(false);
            void Linking.openSettings().catch(() => setSettingsError(true));
          }}
        />
      ) : (
        <AppButton
          label={
            status === 'granted'
              ? 'Cập nhật vị trí'
              : status === 'idle'
                ? 'Vị trí của tôi'
                : 'Thử lại định vị'
          }
          disabled={status === 'requesting'}
          onPress={onRequest}
        />
      )}
      {settingsError && (
        <AppText>
          Không mở được cài đặt. Hãy mở Cài đặt thiết bị → VISTA → Quyền vị trí.
        </AppText>
      )}
      <AppButton
        label={position ? 'Tắt vị trí' : 'Để sau'}
        variant="secondary"
        onPress={onStop}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    gap: 8,
    padding: 12,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.md,
  },
  title: { fontWeight: '700', color: tokens.colors.cyan },
  note: { fontSize: 12, color: tokens.colors.muted },
});
