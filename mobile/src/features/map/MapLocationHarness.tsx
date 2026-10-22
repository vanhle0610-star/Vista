import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { useForegroundLocation } from './useForegroundLocation';
import { LocationPermissionCard } from './LocationPermissionCard';
import { MockPollingSpike } from './MockPollingSpike';
import * as Location from 'expo-location';

export function MapLocationHarness() {
  const focused = useIsFocused();
  const location = useForegroundLocation(focused);
  const [polling, setPolling] = useState(false);
  const [received, setReceived] = useState(0);
  const [events, setEvents] = useState<string[]>([]);
  const [externalError, setExternalError] = useState(false);
  const [geocoding, setGeocoding] = useState(
    'Chưa chạy geocoding trên thiết bị này.',
  );
  const geocodingSession = useRef(0);
  useEffect(
    () => () => {
      geocodingSession.current++;
    },
    [focused],
  );
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      setEvents((prev) => [
        ...prev.slice(-7),
        `${new Date().toISOString().slice(11, 19)}: ${state}`,
      ]);
    });
    return () => listener.remove();
  }, []);
  useEffect(() => {
    const spike = new MockPollingSpike(setReceived);
    const update = () => {
      if (focused && polling && AppState.currentState === 'active')
        spike.start();
      else spike.stop();
    };
    update();
    const listener = AppState.addEventListener('change', update);
    return () => {
      listener.remove();
      spike.stop();
    };
  }, [focused, polling]);
  if (!__DEV__)
    return (
      <ScreenContainer>
        <AppText>Harness chỉ có trong bản phát triển.</AppText>
      </ScreenContainer>
    );
  return (
    <ScreenContainer>
      <AppText style={{ fontSize: 24, fontWeight: '800' }}>
        Kiểm tra GPS nội bộ TV5
      </AppText>
      <AppText>
        GPS ở đây dùng quyền thật của hệ điều hành. Không có nút giả lập quyền
        và không ghi tọa độ vào nhật ký.
      </AppText>
      <AppText>
        Trạng thái: {location.status} · Có vị trí:{' '}
        {location.position ? 'Có' : 'Không'} · Nền tảng: {Platform.OS}
      </AppText>
      <LocationPermissionCard
        {...location}
        onRequest={() => {
          void location.request();
        }}
        onStop={location.stop}
      />
      <AppButton
        label="Mở cài đặt để kiểm tra thu hồi quyền"
        variant="secondary"
        onPress={() => {
          void Linking.openSettings().catch(() => setExternalError(true));
        }}
      />
      <AppButton
        label="Thử mở chỉ đường Cầu Rồng (spike)"
        variant="secondary"
        onPress={() => {
          void Linking.openURL(
            'https://www.google.com/maps/dir/?api=1&destination=16.0611682,108.2278968',
          ).catch(() => setExternalError(true));
        }}
      />
      {externalError && (
        <AppText>
          Không mở được ứng dụng ngoài. Kiểm tra thiết bị và thử lại.
        </AppText>
      )}
      <AppText>{geocoding}</AppText>
      <AppButton
        label="Thử geocoding tiếng Việt: Cầu Rồng, Đà Nẵng"
        variant="secondary"
        disabled={location.status !== 'granted'}
        onPress={() => {
          const session = ++geocodingSession.current;
          setGeocoding('Đang hỏi dịch vụ geocoding của hệ điều hành…');
          void Location.geocodeAsync('Cầu Rồng, Đà Nẵng')
            .then((results) => {
              if (geocodingSession.current === session)
                setGeocoding(
                  `Geocoding trả ${results.length} kết quả. Cần đối chiếu vị trí thực tế; không tự coi có kết quả là đúng.`,
                );
            })
            .catch(() => {
              if (geocodingSession.current === session)
                setGeocoding(
                  'Geocoding không khả dụng trên thiết bị/nền tảng này.',
                );
            });
        }}
      />
      <AppText style={{ fontWeight: '700' }}>D3 · Polling MOCK 12 giây</AppText>
      <AppText>
        Chỉ truyền số thứ tự trong bộ nhớ một ứng dụng. Không gửi GPS, không kết
        nối hai thiết bị, không dùng để đo độ trễ mạng hoặc hao pin.
      </AppText>
      <AppButton
        label={polling ? 'Dừng thử polling mock' : 'Đồng ý chạy polling mock'}
        onPress={() => setPolling(!polling)}
      />
      <AppText>Số thứ tự nhận: {received}</AppText>
      <View>
        <AppText>Vòng đời gần nhất (không chứa vị trí):</AppText>
        {events.map((event, i) => (
          <AppText key={`${i}-${event}`}>{event}</AppText>
        ))}
      </View>
    </ScreenContainer>
  );
}
