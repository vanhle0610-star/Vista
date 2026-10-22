/** In-memory synthetic transport. Tests timer/UI only, never a network or GPS measurement. */
export class MockPollingSpike {
  private timer?: ReturnType<typeof setInterval>;
  private sequence = 0;
  constructor(
    private onReceive: (sequence: number) => void,
    private intervalMs = 12000,
  ) {}
  start() {
    this.stop();
    this.timer = setInterval(
      () => this.onReceive(++this.sequence),
      this.intervalMs,
    );
  }
  stop() {
    clearInterval(this.timer);
    this.timer = undefined;
  }
}
