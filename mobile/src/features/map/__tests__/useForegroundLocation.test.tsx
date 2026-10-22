import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import { useForegroundLocation } from '../useForegroundLocation';
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ granted: true, canAskAgain: true, status: 'granted' }),
  requestForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn().mockResolvedValue(true),
  watchPositionAsync: jest.fn(),
}));
it('connects AppState and navigation focus to native subscription cleanup', async () => {
  const remove = jest.fn();
  const removeListener = jest.fn();
  let notify!: (state: AppStateStatus) => void;
  const previousState = AppState.currentState;
  AppState.currentState = 'active';
  const listener = jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, callback) => {
      notify = callback;
      return { remove: removeListener };
    });
  jest.mocked(Location.watchPositionAsync).mockResolvedValue({ remove });
  const hook = await renderHook(
    ({ focused }: { focused: boolean }) => useForegroundLocation(focused),
    { initialProps: { focused: true } },
  );
  await act(async () => {
    await hook.result.current.request();
  });
  expect(Location.watchPositionAsync).toHaveBeenCalledTimes(1);
  await act(async () => {
    notify('background');
  });
  expect(remove).toHaveBeenCalledTimes(1);
  expect(hook.result.current.position).toBeNull();
  await act(async () => {
    notify('active');
  });
  expect(Location.watchPositionAsync).toHaveBeenCalledTimes(2);
  await hook.rerender({ focused: false });
  expect(remove).toHaveBeenCalledTimes(2);
  await hook.unmount();
  expect(removeListener).toHaveBeenCalled();
  listener.mockRestore();
  AppState.currentState = previousState;
});
