import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { LocationController } from './locationController';

export function useForegroundLocation(focused: boolean) {
  const [controller] = useState(
    () =>
      new LocationController({
        permission: Location.getForegroundPermissionsAsync,
        request: Location.requestForegroundPermissionsAsync,
        services: Location.hasServicesEnabledAsync,
        watch: (success, failure) =>
          Location.watchPositionAsync(
            { accuracy: Location.Accuracy.Balanced, distanceInterval: 5 },
            (location) => success(location.coords),
            failure,
          ),
      }),
  );
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  useEffect(() => {
    controller.setActive(focused && AppState.currentState === 'active');
    const listener = AppState.addEventListener('change', (state) =>
      controller.setActive(focused && state === 'active'),
    );
    return () => {
      listener.remove();
      controller.setActive(false);
    };
  }, [focused, controller]);
  return { ...state, request: controller.request, stop: controller.stop };
}
