import { useState } from 'react';
import { Linking, Platform, View, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { tokens } from '@/theme/tokens';
import type { LocationState, LocationStatus } from './locationController';

const messages: Record<LocationStatus, string> = {
  idle: 'Cho phép vị trí để tìm bạn trên bản đồ. Bạn vẫn xem được địa điểm khi bỏ qua.',
  requesting: 'Đang xác định vị trí…',
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
  choiceKnown,
  automaticEnabled,
}: LocationState & {
  onRequest: () => void;
  onStop: () => void;
  choiceKnown?: boolean;
  automaticEnabled?: boolean;
}) {
  const [settingsError, setSettingsError] = useState(false);
  if (choiceKnown && !automaticEnabled) return null;
  if (automaticEnabled && status === 'granted')
    return (
      <View style={styles.card}>
        <AppText>
          {approximate
            ? 'Đang hiển thị vị trí gần đúng của bạn.'
            : 'Đã hiển thị vị trí của bạn trên bản đồ.'}
        </AppText>
        <AppButton
          label="Tắt tự định vị"
          variant="secondary"
          onPress={onStop}
        />
      </View>
    );
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
        Cho phép VISTA dùng vị trí khi bạn mở bản đồ để hiển thị vị trí hiện tại
        và tính đường đi. Khi bạn tính tuyến, tọa độ được gửi đến dịch vụ chỉ
        đường. Không tự chia sẻ cho nhóm.
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
                ? 'Cho phép định vị'
                : 'Thử lại định vị'
          }
          disabled={status === 'requesting'}
          onPress={onRequest}
        />
      )}
      {status === 'services-off' && Platform.OS === 'android' && (
        <AppButton
          label="Mở cài đặt vị trí"
          variant="secondary"
          onPress={() => {
            setSettingsError(false);
            void Linking.sendIntent(
              'android.settings.LOCATION_SOURCE_SETTINGS',
            ).catch(() => setSettingsError(true));
          }}
        />
      )}
      {settingsError && (
        <AppText>
          Không mở được cài đặt. Hãy mở Cài đặt thiết bị → VISTA → Quyền vị trí.
        </AppText>
      )}
      <AppButton
        label={automaticEnabled ? 'Tắt tự định vị' : 'Để sau'}
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
