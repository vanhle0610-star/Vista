/** Test-only synthetic transport, excluded from the app's public exports and navigation. */
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
