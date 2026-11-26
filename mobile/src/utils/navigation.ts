import { router } from 'expo-router';

/**
 * Safely navigate back if a history entry exists; otherwise replace with a fallback route
 * so Expo Web reloads on detail pages never trigger an unhandled GO_BACK error.
 */
export function safeGoBack(fallbackRoute = '/(tabs)/trips'): void {
  if (typeof router.canGoBack === 'function' && router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallbackRoute as any);
  }
}
