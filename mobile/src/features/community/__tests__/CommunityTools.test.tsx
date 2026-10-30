import React from 'react';
import { AppState } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { api } from '@/services/api/client';
import { FeelingPicker, PlacePicker } from '../CommunityTools';
jest.mock('@/services/api/client', () => ({
  api: { get: jest.fn() },
  apiErrorMessage: () => 'Không tải được địa điểm',
}));
jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));
const permission = (granted: boolean) =>
  ({
    granted,
    canAskAgain: true,
    status: granted ? 'granted' : 'undetermined',
    expires: 'never',
  }) as Location.LocationPermissionResponse;
beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(AppState, 'currentState', {
    configurable: true,
    value: 'active',
    writable: true,
  });
  jest
    .mocked(Location.getForegroundPermissionsAsync)
    .mockResolvedValue(permission(false));
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({ ...permission(false), status: 'denied' });
  jest.mocked(Location.hasServicesEnabledAsync).mockResolvedValue(true);
  jest.mocked(api.get).mockResolvedValue({
    data: {
      items: [
        {
          id: 'far',
          name: 'Far actual',
          status: 'PUBLISHED',
          latitude: 16.09,
          longitude: 108.26,
        },
        {
          id: 'near',
          status: 'PUBLISHED',
          name: 'Near actual',
          latitude: 16.061,
          longitude: 108.221,
        },
      ],
      total: 2,
      page: 0,
      size: 20,
    },
  });
});
test('native feeling sheet selects stable code and supports removal', async () => {
  const change = jest.fn(),
    close = jest.fn();
  await render(
    <FeelingPicker value="GRATEFUL" onChange={change} onClose={close} />,
  );
  await fireEvent.press(screen.getByLabelText('Vui vẻ'));
  expect(change).toHaveBeenCalledWith('HAPPY');
  expect(close).toHaveBeenCalled();
  await fireEvent.press(screen.getByText('Bỏ cảm xúc'));
  expect(change).toHaveBeenLastCalledWith(null);
});
test('GPS denial still allows choosing an actual API place by name', async () => {
  const choose = jest.fn(),
    close = jest.fn();
  await render(<PlacePicker onSelect={choose} onClose={close} />);
  await screen.findByText('Near actual');
  await fireEvent.press(screen.getByText('Dùng vị trí của tôi'));
  await screen.findByText(
    'Bạn chưa cấp quyền vị trí. Vẫn có thể tìm theo tên.',
  );
  await fireEvent.press(screen.getByLabelText('Near actual'));
  expect(choose).toHaveBeenCalledWith(expect.objectContaining({ id: 'near' }));
  expect(close).toHaveBeenCalled();
  for (const [, config] of jest.mocked(api.get).mock.calls)
    expect(config?.params).not.toHaveProperty('latitude');
});
test('GPS services off is explained without triggering location group sharing', async () => {
  jest
    .mocked(Location.getForegroundPermissionsAsync)
    .mockResolvedValue(permission(true));
  jest.mocked(Location.hasServicesEnabledAsync).mockResolvedValue(false);
  await render(<PlacePicker onSelect={jest.fn()} onClose={jest.fn()} />);
  await screen.findByText(
    'GPS đang tắt. Bật dịch vụ vị trí hoặc tìm theo tên.',
  );
  expect(Location.watchPositionAsync).not.toHaveBeenCalled();
});
test('granted approximate GPS sorts real results and stops its one-fix watcher', async () => {
  const remove = jest.fn();
  jest
    .mocked(Location.getForegroundPermissionsAsync)
    .mockResolvedValue(permission(true));
  jest
    .mocked(Location.watchPositionAsync)
    .mockImplementation(async (_options, success) => {
      success({
        coords: {
          latitude: 16.06,
          longitude: 108.22,
          accuracy: 1500,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: 1,
      });
      return { remove };
    });
  await render(<PlacePicker onSelect={jest.fn()} onClose={jest.fn()} />);
  await screen.findByText('Near actual');
  await screen.findByText(/Độ chính xác GPS thấp/);
  expect(
    screen.getAllByRole('button', { name: /^(Near|Far) actual$/ })[0].props
      .accessibilityLabel,
  ).toBe('Near actual');
  expect(remove).toHaveBeenCalled();
});
test('network failure offers a retry instead of synthetic GPS results', async () => {
  jest.mocked(api.get).mockRejectedValue(new Error('offline'));
  await render(<PlacePicker onSelect={jest.fn()} onClose={jest.fn()} />);
  await screen.findByText('Không tải được địa điểm. Vui lòng thử lại.');
  expect(screen.queryByText('Near actual')).toBeNull();
  expect(screen.getByText('Thử lại địa điểm')).toBeTruthy();
});
