import { formatTripDateRange, normalizeTripStatus, resolveTripStatus } from '../tripStatus';

describe('tripStatus utility', () => {
  const fixedNow = new Date(2026, 10, 26, 12, 0, 0); // 26/11/2026

  it('resolves expired PLANNING trip to COMPLETED', () => {
    expect(resolveTripStatus('2026-11-13', '2026-11-16', 'PLANNING', fixedNow)).toBe('COMPLETED');
  });

  it('resolves ongoing trip to ACTIVE even if DB status is PLANNING', () => {
    expect(resolveTripStatus('2026-11-25', '2026-11-28', 'PLANNING', fixedNow)).toBe('ACTIVE');
  });

  it('resolves future trip to PLANNING', () => {
    expect(resolveTripStatus('2026-12-01', '2026-12-04', 'PLANNING', fixedNow)).toBe('PLANNING');
  });

  it('preserves CANCELLED regardless of dates', () => {
    expect(resolveTripStatus('2026-11-25', '2026-11-28', 'CANCELLED', fixedNow)).toBe('CANCELLED');
  });

  it('normalizes legacy ONGOING, IN_PROGRESS, and ENDED statuses', () => {
    expect(normalizeTripStatus('ONGOING')).toBe('ACTIVE');
    expect(normalizeTripStatus('IN_PROGRESS')).toBe('ACTIVE');
    expect(normalizeTripStatus('ENDED')).toBe('COMPLETED');
  });

  it('formats same-month and cross-month ranges cleanly', () => {
    expect(formatTripDateRange('2026-11-13', '2026-11-16')).toBe('13 – 16/11/2026');
    expect(formatTripDateRange('2026-11-29', '2026-12-02')).toBe('29/11 – 2/12/2026');
  });
});
