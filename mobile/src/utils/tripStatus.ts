export type EffectiveTripStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

/**
 * Parse YYYY-MM-DD or DD/MM/YYYY into a local Date at 12:00:00 (noon)
 * to avoid UTC midnight rollover across timezones.
 */
export function parseLocalNoonDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const clean = dateStr.trim();
  if (!clean) return null;

  let year: number;
  let month: number;
  let day: number;

  if (clean.includes('-')) {
    const parts = clean.split('T')[0].split('-');
    if (parts.length !== 3 || parts[0].length !== 4) return null;
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length !== 3) return null;
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  } else {
    return null;
  }

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const dt = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) {
    return null;
  }
  return dt;
}

/**
 * Normalize backend/legacy status strings (ONGOING, IN_PROGRESS, ENDED) into canonical Mobile statuses.
 */
export function normalizeTripStatus(rawStatus?: string | null): EffectiveTripStatus {
  const norm = (rawStatus || '').trim().toUpperCase();
  if (norm === 'CANCELLED') return 'CANCELLED';
  if (norm === 'ACTIVE' || norm === 'ONGOING' || norm === 'IN_PROGRESS') return 'ACTIVE';
  if (norm === 'COMPLETED' || norm === 'ENDED') return 'COMPLETED';
  return 'PLANNING';
}

/**
 * Resolve effective trip status from calendar dates and fallback DB status.
 */
export function resolveTripStatus(
  startDateStr?: string | null,
  endDateStr?: string | null,
  fallbackStatus?: string | null,
  currentDate: Date = new Date()
): EffectiveTripStatus {
  const normalizedFallback = normalizeTripStatus(fallbackStatus);
  if (normalizedFallback === 'CANCELLED') {
    return 'CANCELLED';
  }

  const startNoon = parseLocalNoonDate(startDateStr);
  const endNoon = parseLocalNoonDate(endDateStr);
  if (!startNoon || !endNoon || endNoon.getTime() < startNoon.getTime()) {
    return normalizedFallback;
  }

  const todayNoon = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
    12,
    0,
    0,
    0
  );

  const todayTime = todayNoon.getTime();
  if (todayTime < startNoon.getTime()) return 'PLANNING';
  if (todayTime <= endNoon.getTime()) return 'ACTIVE';
  return 'COMPLETED';
}

/**
 * Format trip date range safely using local noon dates.
 */
export function formatTripDateRange(startDate?: string | null, endDate?: string | null): string {
  if (!startDate || !endDate) return 'Chưa định ngày';
  const s = parseLocalNoonDate(startDate);
  const e = parseLocalNoonDate(endDate);
  if (!s || !e) return `${startDate} – ${endDate}`;

  const sDay = s.getDate();
  const sMonth = s.getMonth() + 1;
  const sYear = s.getFullYear();
  const eDay = e.getDate();
  const eMonth = e.getMonth() + 1;
  const eYear = e.getFullYear();

  if (sYear === eYear && sMonth === eMonth) {
    return `${sDay} – ${eDay}/${eMonth}/${eYear}`;
  }
  if (sYear === eYear) {
    return `${sDay}/${sMonth} – ${eDay}/${eMonth}/${eYear}`;
  }
  return `${sDay}/${sMonth}/${sYear} – ${eDay}/${eMonth}/${eYear}`;
}
