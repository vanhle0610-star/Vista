/**
 * Utility functions for Trip date parsing, day calculation, and weekday localization.
 * Pure functions, timezone-safe (local noon instantiation).
 */

export const VI_WEEKDAYS = [
  'CHỦ NHẬT',
  'THỨ HAI',
  'THỨ BA',
  'THỨ TƯ',
  'THỨ NĂM',
  'THỨ SÁU',
  'THỨ BẢY',
];

export interface DateParts {
  day: number;
  month: number;
  year: number | null;
}

export interface TripDateValidationResult {
  isValid: boolean;
  error?: 'FORMAT_ERROR' | 'INVALID_START_DATE' | 'INVALID_END_DATE' | 'END_BEFORE_START';
  message?: string;
  startDate?: Date;
  endDate?: Date;
  diffDays?: number;
  totalDays?: number;
}

export interface ItineraryDayMeta {
  dayNumber: number;
  dayOfWeek: string;    // 'CHỦ NHẬT', 'THỨ HAI', ...
  dayDate: string;      // '01', '02', '03', ...
  monthText: string;    // 'Tháng 11'
  yearText: string;     // '2026'
  fullDateStr: string;  // '01/11/2026'
  dateObj?: Date;
  isValid: boolean;
}

export interface CuteDayTheme {
  headerBg: string;
  headerColor: string;
  icon: string;
  borderColor: string;
}

export const CUTE_DAY_THEMES: CuteDayTheme[] = [
  { headerBg: '#EEF2FF', headerColor: '#4F46E5', icon: '🏮', borderColor: '#818CF8' }, // Ngày 1: Indigo
  { headerBg: '#ECFDF5', headerColor: '#059669', icon: '🌅', borderColor: '#34D399' }, // Ngày 2: Emerald
  { headerBg: '#FFF1F2', headerColor: '#E11D48', icon: '🏺', borderColor: '#FB7185' }, // Ngày 3: Rose
  { headerBg: '#FEF3C7', headerColor: '#D97706', icon: '🌲', borderColor: '#FBBF24' }, // Ngày 4: Amber
  { headerBg: '#F3E8FF', headerColor: '#7E22CE', icon: '☕', borderColor: '#C084FC' }, // Ngày 5: Purple
  { headerBg: '#E0F2FE', headerColor: '#0284C7', icon: '🌊', borderColor: '#38BDF8' }, // Ngày 6: Sky
  { headerBg: '#FCE7F3', headerColor: '#DB2777', icon: '🌸', borderColor: '#F472B6' }, // Ngày 7: Pink
];

export function getThemeForDay(dayNumber: number): CuteDayTheme {
  const index = Math.max(0, (dayNumber - 1) % CUTE_DAY_THEMES.length);
  return CUTE_DAY_THEMES[index];
}

/**
 * Parse a date string in DD/MM/YYYY, DD/MM, or YYYY-MM-DD format.
 */
export function parseDateParts(str?: string): DateParts | null {
  if (!str) return null;
  const clean = str.trim();
  if (!clean) return null;

  // Format YYYY-MM-DD
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return { year: y, month: m, day: d };
      }
    }
  }

  // Format DD/MM/YYYY or DD/MM
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length >= 2) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const y = parts.length >= 3 && parts[2].length === 4 ? parseInt(parts[2], 10) : null;
      if (!isNaN(d) && !isNaN(m)) {
        return { day: d, month: m, year: y };
      }
    }
  }

  return null;
}

/**
 * Verify whether year, month (1-12), day actually form a valid calendar date.
 */
export function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  // Use noon (12:00) to avoid timezone rollover and DST shifts
  const dt = new Date(year, month - 1, day, 12, 0, 0);
  return dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === day;
}

/**
 * Validate and calculate trip date range, with cross-year inference for missing start years.
 * Formula: totalDays = diffDays + 1
 */
export function validateAndParseTripDates(startDateStr?: string, endDateStr?: string): TripDateValidationResult {
  const pStart = parseDateParts(startDateStr);
  const pEnd = parseDateParts(endDateStr);

  if (!pStart || !pEnd) {
    return {
      isValid: false,
      error: 'FORMAT_ERROR',
      message: 'Định dạng ngày bắt đầu hoặc kết thúc không hợp lệ.',
    };
  }

  const endYear = pEnd.year || new Date().getFullYear();
  if (!isValidCalendarDate(endYear, pEnd.month, pEnd.day)) {
    return {
      isValid: false,
      error: 'INVALID_END_DATE',
      message: 'Ngày kết thúc không tồn tại trên lịch.',
    };
  }
  const endDate = new Date(endYear, pEnd.month - 1, pEnd.day, 12, 0, 0);

  // Infer startYear: if startMonth > endMonth (e.g. 30/12 to 02/01/2027), startYear = endYear - 1
  let startYear = pStart.year;
  if (!startYear) {
    if (pStart.month > pEnd.month) {
      startYear = endYear - 1;
    } else {
      startYear = endYear;
    }
  }

  if (!isValidCalendarDate(startYear, pStart.month, pStart.day)) {
    return {
      isValid: false,
      error: 'INVALID_START_DATE',
      message: 'Ngày bắt đầu không tồn tại trên lịch.',
    };
  }
  const startDate = new Date(startYear, pStart.month - 1, pStart.day, 12, 0, 0);

  if (endDate.getTime() < startDate.getTime()) {
    return {
      isValid: false,
      error: 'END_BEFORE_START',
      message: 'Ngày kết thúc không thể diễn ra trước ngày bắt đầu.',
      startDate,
      endDate,
    };
  }

  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const totalDays = diffDays + 1;

  return {
    isValid: true,
    startDate,
    endDate,
    diffDays,
    totalDays,
  };
}

/**
 * Return formatted metadata (day of week, date, month, year) for day N of the trip.
 * Safe noon calculation prevents timezone skew.
 */
export function getTripDayMeta(
  startDateStr?: string,
  endDateStr?: string,
  dayNumber = 1
): ItineraryDayMeta {
  const validation = validateAndParseTripDates(startDateStr, endDateStr);

  if (!validation.isValid || !validation.startDate) {
    return {
      dayNumber,
      dayOfWeek: '',
      dayDate: String(dayNumber).padStart(2, '0'),
      monthText: '',
      yearText: '',
      fullDateStr: '',
      isValid: false,
    };
  }

  const base = validation.startDate;
  const target = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate() + (dayNumber - 1),
    12,
    0,
    0
  );

  const d = target.getDate();
  const m = target.getMonth() + 1;
  const y = target.getFullYear();

  return {
    dayNumber,
    dayOfWeek: VI_WEEKDAYS[target.getDay()],
    dayDate: String(d).padStart(2, '0'),
    monthText: `Tháng ${m}`,
    yearText: String(y),
    fullDateStr: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`,
    dateObj: target,
    isValid: true,
  };
}

export type TripStatusType = 'ACTIVE' | 'PLANNING' | 'COMPLETED';

export interface TripStatusResult {
  status: TripStatusType;
  isDerived: boolean;
  isValidDate: boolean;
  dateError?: string;
}

/**
 * Resolve detailed trip status based on current calendar date and trip date range.
 * Compares strictly at local calendar noon (12:00:00) to prevent timezone/DST skew.
 * Does not mutate input or storage.
 */
export function resolveTripStatusDetails(
  startDateStr?: string,
  endDateStr?: string,
  fallbackStatus?: string,
  currentDate: Date = new Date()
): TripStatusResult {
  const normFallback = (fallbackStatus || '').toUpperCase();
  const safeFallback: TripStatusType =
    normFallback === 'ACTIVE' || normFallback === 'COMPLETED' ? (normFallback as TripStatusType) : 'PLANNING';

  const validation = validateAndParseTripDates(startDateStr, endDateStr);
  if (!validation.isValid || !validation.startDate || !validation.endDate) {
    return {
      status: safeFallback,
      isDerived: false,
      isValidDate: false,
      dateError: validation.message || 'Ngày chuyến đi không hợp lệ',
    };
  }

  // Normalized local calendar day at noon (12:00:00)
  const todayNoon = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
    12,
    0,
    0
  );
  const startNoon = validation.startDate; // already at 12:00:00
  const endNoon = validation.endDate;     // already at 12:00:00

  const todayTime = todayNoon.getTime();
  const startTime = startNoon.getTime();
  const endTime = endNoon.getTime();

  let derived: TripStatusType;
  if (todayTime < startTime) {
    derived = 'PLANNING';
  } else if (todayTime <= endTime) {
    derived = 'ACTIVE';
  } else {
    derived = 'COMPLETED';
  }

  return {
    status: derived,
    isDerived: true,
    isValidDate: true,
  };
}

/**
 * Convenience helper to resolve the effective display status string.
 */
export function resolveTripStatus(
  startDateStr?: string,
  endDateStr?: string,
  fallbackStatus?: string,
  currentDate: Date = new Date()
): TripStatusType {
  return resolveTripStatusDetails(startDateStr, endDateStr, fallbackStatus, currentDate).status;
}

