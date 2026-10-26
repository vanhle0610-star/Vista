import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { LocationController } from './locationController';

export function useForegroundLocation(focused: boolean) {
  const consentGeneration = useRef(0);
  const persistedChoice = useRef<Promise<void>>(Promise.resolve());
  const [automaticEnabled, setAutomaticEnabled] = useState(false);
  const [choiceKnown, setChoiceKnown] = useState(false);
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
    let alive = true;
    const generation = consentGeneration.current;
    controller.setActive(focused && AppState.currentState === 'active');
    const readChoice = persistedChoice.current.then(() =>
      Platform.OS === 'web'
        ? (globalThis.localStorage?.getItem('vista-map-opt-in') ?? null)
        : SecureStore.getItemAsync('vista-map-opt-in'),
    );
    void readChoice
      .then((choice) => {
        if (alive && generation === consentGeneration.current) {
          setChoiceKnown(choice !== null);
          setAutomaticEnabled(choice === 'true');
          if (choice === 'true') controller.resumeOptIn();
        }
      })
      .catch(() => {});
    const listener = AppState.addEventListener('change', (state) =>
      controller.setActive(focused && state === 'active'),
    );
    return () => {
      alive = false;
      listener.remove();
      controller.setActive(false);
    };
  }, [focused, controller]);
  const remember = (value: boolean) => {
    consentGeneration.current++;
    setChoiceKnown(true);
    setAutomaticEnabled(value);
    persistedChoice.current = persistedChoice.current
      .then(async () => {
        if (Platform.OS === 'web')
          globalThis.localStorage?.setItem('vista-map-opt-in', String(value));
        else await SecureStore.setItemAsync('vista-map-opt-in', String(value));
      })
      .catch(() => {});
  };
  return {
    ...state,
    automaticEnabled,
    choiceKnown,
    request: () => {
      remember(true);
      return controller.request();
    },
    stop: () => {
      remember(false);
      controller.stop();
    },
  };
}
