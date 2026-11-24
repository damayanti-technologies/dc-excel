import { FormulaError } from './errors';
import { CellValue } from '@/types/cell';

/**
 * Base epoch for Excel-compatible serial date system.
 * Day 0 represents December 30, 1899 (accounting for the historical 1900 leap-year offset).
 */
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 86_400_000;

let mockClock: Date | (() => Date) | null = null;

/**
 * Sets a mock clock for deterministic testing of TODAY() and NOW().
 */
export function setMockClock(dateOrProvider: Date | (() => Date) | null): void {
  mockClock = dateOrProvider;
}

/**
 * Returns current date or mocked date.
 */
export function getCurrentClock(): Date {
  if (typeof mockClock === 'function') {
    return mockClock();
  }
  return mockClock ? new Date(mockClock.getTime()) : new Date();
}

/**
 * Converts Year, Month (1-12), Day (1-31), Hour, Minute, Second to a date serial number.
 * Uses UTC to ensure timezone independence.
 */
export function dateToSerial(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0
): number {
  // Two-digit year support (0-99 -> 1900-1999)
  let y = year;
  if (y >= 0 && y < 100) {
    y += 1900;
  }

  // Construct UTC date (month is 0-indexed in Date.UTC)
  const utcMs = Date.UTC(y, month - 1, day, hour, minute, second);
  const rawSerial = (utcMs - EXCEL_EPOCH_MS) / MS_PER_DAY;

  return rawSerial;
}

/**
 * Converts a serial number to Year, Month (1-12), Day (1-31), Hour (0-23), Minute (0-59), Second (0-59).
 */
export function serialToDate(serial: number): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const dayPart = Math.floor(serial);
  const fracPart = serial - dayPart;

  const dateMs = EXCEL_EPOCH_MS + dayPart * MS_PER_DAY;
  const d = new Date(dateMs);

  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();

  const totalSeconds = Math.round(fracPart * 86400);
  const hour = Math.floor(totalSeconds / 3600) % 24;
  const minute = Math.floor((totalSeconds % 3600) / 60);
  const second = totalSeconds % 60;

  return { year, month, day, hour, minute, second };
}

/**
 * Parses a cell value (number, date string, or date) into a date serial number.
 * Returns null if the value cannot be parsed as a valid date.
 */
export function parseDateOrSerial(val: CellValue): number | null {
  if (val === null || val === undefined || val === '') return null;

  if (typeof val === 'number') {
    if (!Number.isFinite(val) || Number.isNaN(val)) return null;
    return val;
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;

    // Check if numeric string
    const num = Number(trimmed);
    if (!Number.isNaN(num) && Number.isFinite(num)) {
      return num;
    }

    // Try parsing standard date strings e.g. YYYY-MM-DD or MM/DD/YYYY
    const parsedMs = Date.parse(trimmed);
    if (!Number.isNaN(parsedMs)) {
      const d = new Date(parsedMs);
      return dateToSerial(
        d.getFullYear(),
        d.getMonth() + 1,
        d.getDate(),
        d.getHours(),
        d.getMinutes(),
        d.getSeconds()
      );
    }
  }

  return null;
}

/**
 * Calculates date difference based on unit.
 * Units: "Y", "M", "D", "YM", "YD", "MD".
 */
export function datedif(startSerial: number, endSerial: number, unit: string): number | string {
  if (startSerial > endSerial) {
    return FormulaError.NUM;
  }

  const s = serialToDate(startSerial);
  const e = serialToDate(endSerial);
  const u = unit.toUpperCase().trim();

  switch (u) {
    case 'Y': {
      let years = e.year - s.year;
      if (e.month < s.month || (e.month === s.month && e.day < s.day)) {
        years--;
      }
      return Math.max(0, years);
    }
    case 'M': {
      let months = (e.year - s.year) * 12 + (e.month - s.month);
      if (e.day < s.day) {
        months--;
      }
      return Math.max(0, months);
    }
    case 'D': {
      return Math.floor(endSerial) - Math.floor(startSerial);
    }
    case 'YM': {
      let months = e.month - s.month;
      if (e.day < s.day) {
        months--;
      }
      if (months < 0) {
        months += 12;
      }
      return months;
    }
    case 'YD': {
      // Days difference ignoring year
      const sDayOfYear = Math.floor(dateToSerial(2000, s.month, s.day));
      let eDayOfYear = Math.floor(dateToSerial(2000, e.month, e.day));
      if (eDayOfYear < sDayOfYear) {
        eDayOfYear = Math.floor(dateToSerial(2001, e.month, e.day));
      }
      return eDayOfYear - sDayOfYear;
    }
    case 'MD': {
      // Days difference ignoring month and year
      let days = e.day - s.day;
      if (days < 0) {
        // Days in previous month
        const prevMonthDays = new Date(Date.UTC(e.year, e.month - 1, 0)).getUTCDate();
        days += prevMonthDays;
      }
      return days;
    }
    default:
      return FormulaError.NUM;
  }
}

/**
 * Shifts a date serial by a given number of months.
 */
export function edate(startSerial: number, months: number): number {
  const { year, month, day } = serialToDate(startSerial);
  const totalMonths = month - 1 + Math.trunc(months);
  const targetYear = year + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12 + 1;

  // Clamp day to maximum days in target month
  const maxDays = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const clampedDay = Math.min(day, maxDays);

  return Math.floor(dateToSerial(targetYear, targetMonth, clampedDay));
}

/**
 * Returns the serial number of the last day of the month shifted by months.
 */
export function eomonth(startSerial: number, months: number): number {
  const { year, month } = serialToDate(startSerial);
  const totalMonths = month - 1 + Math.trunc(months);
  const targetYear = year + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12 + 1;

  const maxDays = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  return Math.floor(dateToSerial(targetYear, targetMonth, maxDays));
}

/**
 * Day of the week (1 to 7).
 */
export function weekday(serial: number, returnType = 1): number {
  const dayPart = Math.floor(serial);
  const d = new Date(EXCEL_EPOCH_MS + dayPart * MS_PER_DAY);
  const sundayZero = d.getUTCDay(); // 0 = Sun, 1 = Mon ... 6 = Sat

  switch (returnType) {
    case 1:
      // Sunday = 1 to Saturday = 7
      return sundayZero + 1;
    case 2:
      // Monday = 1 to Sunday = 7
      return sundayZero === 0 ? 7 : sundayZero;
    case 3:
      // Monday = 0 to Sunday = 6
      return sundayZero === 0 ? 6 : sundayZero - 1;
    default:
      return sundayZero + 1;
  }
}

/**
 * Week number of the year.
 */
export function weeknum(serial: number, returnType = 1): number {
  const { year, month, day } = serialToDate(serial);
  const currentMs = Date.UTC(year, month - 1, day);
  const firstJanMs = Date.UTC(year, 0, 1);
  const firstJanDay = new Date(firstJanMs).getUTCDay(); // 0 = Sun, 1 = Mon

  // Adjust for returnType (1 = week starts Sunday, 2 = week starts Monday)
  let dayOffset = firstJanDay;
  if (returnType === 2) {
    dayOffset = (firstJanDay + 6) % 7;
  }

  const daysSinceFirstJan = Math.floor((currentMs - firstJanMs) / MS_PER_DAY);
  return Math.floor((daysSinceFirstJan + dayOffset) / 7) + 1;
}

/**
 * Calculates working days between start and end date (inclusive), skipping weekends and holidays.
 */
export function networkdays(
  startSerial: number,
  endSerial: number,
  holidays: number[] = []
): number {
  const startDay = Math.floor(startSerial);
  const endDay = Math.floor(endSerial);

  const direction = startDay <= endDay ? 1 : -1;
  const holidaySet = new Set(holidays.map((h) => Math.floor(h)));

  let count = 0;
  let curr = startDay;

  while (true) {
    const d = new Date(EXCEL_EPOCH_MS + curr * MS_PER_DAY);
    const dayOfWeek = d.getUTCDay(); // 0 = Sun, 6 = Sat

    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(curr)) {
      count++;
    }

    if (curr === endDay) break;
    curr += direction;
  }

  return count * direction;
}

/**
 * Adds a given number of working days to a start date, skipping weekends and holidays.
 */
export function workday(
  startSerial: number,
  days: number,
  holidays: number[] = []
): number {
  let curr = Math.floor(startSerial);
  const remaining = Math.trunc(days);
  if (remaining === 0) return curr;

  const direction = remaining > 0 ? 1 : -1;
  let steps = Math.abs(remaining);
  const holidaySet = new Set(holidays.map((h) => Math.floor(h)));

  while (steps > 0) {
    curr += direction;
    const d = new Date(EXCEL_EPOCH_MS + curr * MS_PER_DAY);
    const dayOfWeek = d.getUTCDay();

    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(curr)) {
      steps--;
    }
  }

  return curr;
}
