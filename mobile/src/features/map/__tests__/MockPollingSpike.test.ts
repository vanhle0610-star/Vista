import { MockPollingSpike } from '../test-support/MockPollingSpike';
it('polls only after start, prevents duplicate timers, and stops on cleanup', () => {
  jest.useFakeTimers();
  const receive = jest.fn();
  const spike = new MockPollingSpike(receive);
  jest.advanceTimersByTime(12000);
  expect(receive).not.toHaveBeenCalled();
  spike.start();
  spike.start();
  jest.advanceTimersByTime(24000);
  expect(receive).toHaveBeenCalledTimes(2);
  spike.stop();
  jest.advanceTimersByTime(24000);
  expect(receive).toHaveBeenCalledTimes(2);
  jest.useRealTimers();
});
