import {
  LocationController,
  type LocationDriver,
  type LocationPermission,
} from '../locationController';
const granted: LocationPermission = {
  status: 'granted',
  granted: true,
  canAskAgain: true,
};
const undetermined: LocationPermission = {
  status: 'undetermined',
  granted: false,
  canAskAgain: true,
};
const fix = { latitude: 16.06, longitude: 108.22, accuracy: 20 };
async function flush() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}
function setup(permission = undetermined) {
  let success: Parameters<LocationDriver['watch']>[0] = () => {};
  let failure: () => void = () => {};
  const remove = jest.fn();
  const driver: jest.Mocked<LocationDriver> = {
    permission: jest.fn().mockResolvedValue(permission),
    request: jest.fn().mockResolvedValue(granted),
    services: jest.fn().mockResolvedValue(true),
    watch: jest.fn().mockImplementation(async (onSuccess, onFailure) => {
      success = onSuccess;
      failure = onFailure;
      return { remove };
    }),
  };
  const controller = new LocationController(driver, 1000);
  controller.setActive(true);
  return {
    controller,
    driver,
    remove,
    fix: () => success(fix),
    fail: () => failure(),
  };
}
describe('Foreground location privacy and lifecycle', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  it('does not ask or locate before explicit action; granted fix removes subscription', async () => {
    const s = setup();
    await flush();
    expect(s.driver.request).not.toHaveBeenCalled();
    expect(s.driver.watch).not.toHaveBeenCalled();
    await s.controller.request();
    s.fix();
    expect(s.controller.getSnapshot().status).toBe('granted');
    expect(s.remove).toHaveBeenCalledTimes(1);
    expect(s.controller.getSnapshot().position).toEqual(fix);
    s.controller.setActive(false);
  });
  it.each([
    ['denied', true, 'denied'],
    ['denied', false, 'blocked'],
  ] as const)(
    'handles denied permission canAskAgain=%s',
    async (status, canAskAgain, expected) => {
      const s = setup({ status, granted: false, canAskAgain });
      s.driver.request.mockResolvedValue({
        status,
        granted: false,
        canAskAgain,
      });
      await s.controller.request();
      expect(s.controller.getSnapshot().status).toBe(expected);
      expect(s.driver.watch).not.toHaveBeenCalled();
      if (!canAskAgain) expect(s.driver.request).not.toHaveBeenCalled();
    },
  );
  it('distinguishes services disabled', async () => {
    const s = setup(granted);
    s.driver.services.mockResolvedValue(false);
    await s.controller.request();
    expect(s.controller.getSnapshot().status).toBe('services-off');
    expect(s.driver.watch).not.toHaveBeenCalled();
  });
  it('times out, removes watcher and ignores late fix', async () => {
    const s = setup(granted);
    await s.controller.request();
    jest.advanceTimersByTime(1001);
    s.fix();
    expect(s.controller.getSnapshot().status).toBe('timeout');
    expect(s.remove).toHaveBeenCalledTimes(1);
    expect(s.controller.getSnapshot().position).toBeNull();
  });
  it('handles native failure without leaking coordinates', async () => {
    const s = setup(granted);
    await s.controller.request();
    s.fail();
    expect(s.controller.getSnapshot().status).toBe('unavailable');
    expect(s.remove).toHaveBeenCalled();
  });
  it('removes watcher in background and rechecks permission on return', async () => {
    const s = setup(granted);
    await s.controller.request();
    s.controller.setActive(false);
    s.fix();
    expect(s.remove).toHaveBeenCalled();
    expect(s.controller.getSnapshot().position).toBeNull();
    s.driver.permission.mockResolvedValue({
      status: 'denied',
      granted: false,
      canAskAgain: false,
    });
    s.controller.setActive(true);
    await flush();
    expect(s.controller.getSnapshot().status).toBe('blocked');
    expect(s.driver.watch).toHaveBeenCalledTimes(1);
  });
  it('resumes only after prior opt-in, with a new subscription', async () => {
    const s = setup(granted);
    await s.controller.request();
    s.controller.setActive(false);
    s.controller.setActive(true);
    await flush();
    expect(s.driver.watch).toHaveBeenCalledTimes(2);
    s.fix();
    expect(s.controller.getSnapshot().status).toBe('granted');
    s.controller.setActive(false);
  });
  it('cleans up on route blur and removes a subscription that resolves after cancellation', async () => {
    const s = setup(granted);
    let resolve!: (subscription: { remove: () => void }) => void;
    s.driver.watch.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const request = s.controller.request();
    await flush();
    s.controller.setActive(false);
    resolve({ remove: s.remove });
    await request;
    expect(s.remove).toHaveBeenCalledTimes(1);
    expect(s.controller.getSnapshot().position).toBeNull();
  });
  it('cancels old request on repeated action', async () => {
    const s = setup(granted);
    await s.controller.request();
    await s.controller.request();
    expect(s.remove).toHaveBeenCalledTimes(1);
    s.controller.stop();
    expect(s.remove).toHaveBeenCalledTimes(2);
  });
  it('marks approximate permission and low accuracy', async () => {
    const s = setup({ ...granted, android: { accuracy: 'coarse' } });
    await s.controller.request();
    s.fix();
    expect(s.controller.getSnapshot().approximate).toBe(true);
  });
  it('does not restart after explicit stop', async () => {
    const s = setup(granted);
    await s.controller.request();
    s.controller.stop();
    s.controller.setActive(false);
    s.controller.setActive(true);
    await flush();
    expect(s.driver.watch).toHaveBeenCalledTimes(1);
  });
});
