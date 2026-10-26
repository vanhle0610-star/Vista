import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { MapScreen } from '../MapScreen';
import { api } from '@/services/api/client';
import type { components } from '@/types/api.generated';
import type { useForegroundLocation } from '../useForegroundLocation';
import { MapViewAdapter } from '../MapViewAdapter';

const mockMarker = { id: 'a', title: 'Điểm đến A', latitude: 16, longitude: 108 };
let mockLocation: ReturnType<typeof useForegroundLocation>;
jest.mock('expo-router', () => ({
  useIsFocused: () => true,
  useLocalSearchParams: () => ({}),
  router: { push: jest.fn() },
}));
jest.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) =>
    queryKey[0] === 'map-destinations'
      ? { data: { markers: [mockMarker], rejected: 0 } }
      : {},
}));
jest.mock('../useForegroundLocation', () => ({
  useForegroundLocation: () => mockLocation,
}));
jest.mock('../MapViewAdapter', () => ({ MapViewAdapter: jest.fn(() => null) }));
jest.mock('@/services/api/client', () => ({
  api: { post: jest.fn() },
  apiErrorMessage: () => 'Lỗi kiểm thử',
}));

beforeEach(() => jest.clearAllMocks());

it('discards a pending GPS route after permission is revoked, including after a new fix', async () => {
  mockLocation = {
    position: { latitude: 16.1, longitude: 108.1 },
    status: 'granted', approximate: false, automaticEnabled: true, choiceKnown: true,
    request: jest.fn().mockResolvedValue(undefined), stop: jest.fn(),
  };
  let complete!: (response: { data: components['schemas']['RouteResult'] }) => void;
  jest.mocked(api.post).mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));
  const view = await render(<MapScreen />);
  await fireEvent.press(screen.getByText('Điểm đến A'));
  await fireEvent.press(screen.getByText('Chỉ đường'));
  await fireEvent.press(screen.getByText('Tính tuyến đường'));
  expect(api.post).toHaveBeenCalledTimes(1);
  mockLocation = { ...mockLocation, position: null, status: 'blocked' };
  await view.rerender(<MapScreen />);
  await act(async () => {
    complete({ data: {
      input: { origin: { latitude: 16.1, longitude: 108.1, label: 'GPS' },
        destination: { latitude: 16, longitude: 108, label: 'A' }, mode: 'DRIVING', fromGps: true },
      path: [{ lat: 16.1, lng: 108.1 }, { lat: 16, lng: 108 }],
      distanceMeters: 1000, durationMillis: 60000, warnings: [], attribution: 'STALE_ROUTE',
    } });
  });
  mockLocation = { ...mockLocation, position: { latitude: 16.2, longitude: 108.2 }, status: 'granted' };
  await view.rerender(<MapScreen />);
  expect(screen.queryByText(/STALE_ROUTE/)).toBeNull();
  expect(screen.queryByText('Đang tính tuyến…')).toBeNull();
}, 15000);

it('centers once after locating, then leaves the camera alone on later GPS fixes', async () => {
  mockLocation = {
    position: { latitude: 16.1, longitude: 108.1 }, status: 'granted',
    approximate: false, automaticEnabled: true, choiceKnown: true,
    request: jest.fn().mockResolvedValue(undefined), stop: jest.fn(),
  };
  const view = await render(<MapScreen />);
  await fireEvent.press(screen.getByText('◎ Vị trí của tôi'));
  expect(jest.mocked(MapViewAdapter).mock.calls.at(-1)?.[0].center).toMatchObject({
    latitude: 16.1, longitude: 108.1,
  });
  mockLocation = { ...mockLocation, position: { latitude: 16.2, longitude: 108.2 } };
  await view.rerender(<MapScreen />);
  const props = jest.mocked(MapViewAdapter).mock.calls.at(-1)?.[0];
  expect(props?.center).toMatchObject({ latitude: 16.1, longitude: 108.1 });
  expect(props?.userLocation).toMatchObject({ latitude: 16.2, longitude: 108.2 });
}, 15000);
