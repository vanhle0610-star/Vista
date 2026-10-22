import { validCoordinate, type MapCoordinate } from './types';

export type LocationStatus =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'services-off'
  | 'unavailable'
  | 'timeout'
  | 'paused';
export interface LocationState {
  status: LocationStatus;
  position: (MapCoordinate & { accuracy?: number | null }) | null;
  approximate: boolean;
}
export interface LocationPermission {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
  android?: { accuracy: string };
  ios?: { accuracy: string };
}
export interface LocationDriver {
  permission: () => Promise<LocationPermission>;
  request: () => Promise<LocationPermission>;
  services: () => Promise<boolean>;
  watch: (
    success: (coords: MapCoordinate & { accuracy?: number | null }) => void,
    failure: () => void,
  ) => Promise<{ remove: () => void }>;
}

/** One foreground fix, then remove the native subscription. Never transmits coordinates. */
export class LocationController {
  private state: LocationState = {
    status: 'idle',
    position: null,
    approximate: false,
  };
  private listeners = new Set<() => void>();
  private generation = 0;
  private subscription?: { remove: () => void };
  private timer?: ReturnType<typeof setTimeout>;
  private active = false;
  private wanted = false;
  constructor(
    private driver: LocationDriver,
    private timeoutMs = 15000,
  ) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(next: Partial<LocationState>) {
    this.state = { ...this.state, ...next };
    this.listeners.forEach((listener) => listener());
  }
  private cancel() {
    this.generation++;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.subscription?.remove();
    this.subscription = undefined;
  }
  setActive(active: boolean) {
    this.active = active;
    this.cancel();
    this.update({
      position: null,
      approximate: false,
      status: active ? 'idle' : 'paused',
    });
    if (active) void this.locate(false);
  }
  stop = () => {
    this.wanted = false;
    this.cancel();
    this.update({ status: 'idle', position: null, approximate: false });
  };
  request = async () => {
    this.wanted = true;
    await this.locate(true);
  };
  private async locate(ask: boolean) {
    if (!this.active) return;
    this.cancel();
    const generation = this.generation;
    const current = () => this.active && this.generation === generation;
    if (ask || this.wanted)
      this.update({ status: 'requesting', position: null });
    try {
      let permission = await this.driver.permission();
      if (!current()) return;
      if (ask && !permission.granted && permission.canAskAgain)
        permission = await this.driver.request();
      if (!current()) return;
      if (!permission.granted) {
        this.update({
          status:
            permission.status === 'undetermined'
              ? 'idle'
              : permission.canAskAgain
                ? 'denied'
                : 'blocked',
          position: null,
        });
        return;
      }
      if (!(await this.driver.services())) {
        if (current()) this.update({ status: 'services-off', position: null });
        return;
      }
      if (!current()) return;
      if (!this.wanted) {
        this.update({ status: 'idle' });
        return;
      }
      this.update({
        status: 'requesting',
        approximate:
          permission.android?.accuracy === 'coarse' ||
          permission.ios?.accuracy === 'reduced',
      });
      const finish = (
        status: LocationStatus,
        coords?: MapCoordinate & { accuracy?: number | null },
      ) => {
        if (!current()) return;
        this.cancel();
        this.update({
          status,
          position: coords ?? null,
          approximate: this.state.approximate || (coords?.accuracy ?? 0) > 100,
        });
      };
      this.timer = setTimeout(() => finish('timeout'), this.timeoutMs);
      const subscription = await this.driver.watch(
        (coords) =>
          validCoordinate(coords)
            ? finish('granted', coords)
            : finish('unavailable'),
        () => finish('unavailable'),
      );
      if (current()) this.subscription = subscription;
      else subscription.remove();
    } catch {
      if (current()) {
        this.cancel();
        this.update({ status: 'unavailable', position: null });
      }
    }
  }
}
