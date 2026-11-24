import { CellValue } from '@/types/cell';
import { isFormulaError } from '@/engine/calculation/errors';
import { serialToDate } from '@/engine/calculation/date-utils';

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Formats a numeric value using a fixed decimal place specification and optional thousands separators.
 */
function formatNumberWithDecimals(
  val: number,
  decimals: number,
  useGrouping: boolean
): string {
  const isNeg = val < 0;
  const absVal = Math.abs(val);

  // Round to specified decimal places
  const fixed = absVal.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');

  let formattedInt = intPart!;
  if (useGrouping) {
    formattedInt = formattedInt.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  const result = decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
  return isNeg ? `-${result}` : result;
}

/**
 * Formats a Date/time component into padded two-digit string.
 */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Parses a value into a Date object (supporting Date instances, ISO strings, or Excel serial numbers).
 */
function toDateParts(val: CellValue): {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
} | null {
  if (val instanceof Date) {
    return {
      year: val.getFullYear(),
      month: val.getMonth() + 1,
      day: val.getDate(),
      hour: val.getHours(),
      minute: val.getMinutes(),
      second: val.getSeconds()
    };
  }

  if (typeof val === 'number') {
    if (Number.isNaN(val)) return null;
    return serialToDate(val);
  }

  if (typeof val === 'string' && val.trim() !== '') {
    // Check if ISO or standard date string
    const parsed = Date.parse(val);
    if (!Number.isNaN(parsed)) {
      const d = new Date(parsed);
      return {
        year: d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
        day: d.getUTCDate(),
        hour: d.getUTCHours(),
        minute: d.getUTCMinutes(),
        second: d.getUTCSeconds()
      };
    }
  }

  return null;
}

/**
 * Core spreadsheet value formatting engine.
 */
export class NumberFormatter {
  /**
   * Formats a raw cell value according to an Excel-compatible format mask.
   * Does NOT alter the underlying cell value.
   */
  public format(value: CellValue, pattern?: string, locale = 'en-US'): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (isFormulaError(value)) {
      return String(value);
    }

    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }

    const fmt = (pattern || 'General').trim();

    if (fmt === 'General') {
      if (typeof value === 'number') {
        // Avoid precision floating point display issues (e.g. 0.1 + 0.2)
        const s = value.toString();
        if (s.includes('.') && s.length > 12) {
          const rounded = Number(value.toPrecision(10));
          return rounded.toString();
        }
        return s;
      }
      return String(value);
    }

    if (fmt === '@' || fmt === 'Text') {
      return String(value);
    }

    // Handle Multi-section Custom Format: positive; negative; zero; text
    if (fmt.includes(';')) {
      const sections = fmt.split(';');
      if (typeof value === 'number') {
        if (value > 0 && sections[0]) {
          return this.format(value, sections[0].trim(), locale);
        } else if (value < 0 && sections[1]) {
          const negSection = sections[1].trim();
          const hasParens = negSection.startsWith('(') && negSection.endsWith(')');
          const innerFmt = negSection.replace(/^\(/, '').replace(/\)$/, '').replace(/^-/, '');
          const absFormatted = this.format(Math.abs(value), innerFmt, locale);
          return hasParens ? `(${absFormatted})` : `-${absFormatted}`;
        } else if (value === 0 && sections[2]) {
          const zeroSection = sections[2].trim();
          if (zeroSection === '"-"' || zeroSection === '-') return '-';
          return this.format(0, zeroSection.replace(/"/g, ''), locale);
        }
      } else if (sections[3]) {
        const textSection = sections[3].trim().replace(/"/g, '');
        return textSection.replace('@', String(value));
      }
    }

    // Percentage formats (e.g. "0%", "0.0%", "0.00%")
    if (fmt.endsWith('%') || fmt.includes('%')) {
      const num = typeof value === 'number' ? value : Number(value);
      if (Number.isNaN(num)) return String(value);

      const percentVal = num * 100;
      let decimals = 0;
      const decMatch = fmt.match(/\.(0+)/);
      if (decMatch && decMatch[1]) {
        decimals = decMatch[1].length;
      }
      return `${percentVal.toFixed(decimals)}%`;
    }

    // Currency formats (e.g. "$#,##0.00", "€#,##0.00", "£#,##0.00", "₹#,##0.00", "¥#,##0")
    const currencyMatch = fmt.match(/^([$€£₹¥])(.*)$/);
    if (currencyMatch && currencyMatch[1] && currencyMatch[2]) {
      const symbol = currencyMatch[1];
      const rest = currencyMatch[2];
      const num = typeof value === 'number' ? value : Number(value);
      if (Number.isNaN(num)) return String(value);

      let decimals = 2;
      const decMatch = rest.match(/\.(0+)/);
      if (decMatch && decMatch[1]) {
        decimals = decMatch[1].length;
      } else if (!rest.includes('.')) {
        decimals = 0;
      }

      const useGrouping = rest.includes(',');
      const formattedNum = formatNumberWithDecimals(Math.abs(num), decimals, useGrouping);
      return num < 0 ? `-${symbol}${formattedNum}` : `${symbol}${formattedNum}`;
    }

    // Standard number formats with decimals / grouping (e.g. "#,##0.00", "0.00", "#,##0")
    if (fmt.includes('0') || fmt.includes('#')) {
      const num = typeof value === 'number' ? value : Number(value);
      if (Number.isNaN(num)) return String(value);

      // Scientific notation (e.g. "0.00E+00", "0.0E+0")
      if (fmt.toUpperCase().includes('E+') || fmt.toUpperCase().includes('E-')) {
        let decimals = 2;
        const sciMatch = fmt.match(/\.(0+)E/i);
        if (sciMatch && sciMatch[1]) {
          decimals = sciMatch[1].length;
        }
        let expStr = num.toExponential(decimals).toUpperCase();
        if (fmt.toUpperCase().includes('E+00') || fmt.toUpperCase().includes('E-00')) {
          expStr = expStr.replace(/([+-])(\d)$/, '$10$2');
        }
        return expStr;
      }

      let decimals = 0;
      const decMatch = fmt.match(/\.(0+)/);
      if (decMatch && decMatch[1]) {
        decimals = decMatch[1].length;
      }

      const useGrouping = fmt.includes(',');
      return formatNumberWithDecimals(num, decimals, useGrouping);
    }

    // Date & Time formats
    const dateParts = toDateParts(value);
    if (dateParts) {
      const { year, month, day, hour, minute, second } = dateParts;
      const monthNameShort = MONTH_NAMES_SHORT[month - 1] ?? '';

      switch (fmt) {
        case 'YYYY-MM-DD':
          return `${year}-${pad2(month)}-${pad2(day)}`;
        case 'DD/MM/YYYY':
          return `${pad2(day)}/${pad2(month)}/${year}`;
        case 'MM/DD/YYYY':
          return `${pad2(month)}/${pad2(day)}/${year}`;
        case 'DD-MMM-YYYY':
          return `${pad2(day)}-${monthNameShort}-${year}`;
        case 'MMM DD, YYYY':
          return `${monthNameShort} ${pad2(day)}, ${year}`;
        case 'HH:MM':
          return `${pad2(hour)}:${pad2(minute)}`;
        case 'HH:MM:SS':
          return `${pad2(hour)}:${pad2(minute)}:${pad2(second)}`;
        case 'hh:mm A': {
          const h12 = hour % 12 === 0 ? 12 : hour % 12;
          const ampm = hour >= 12 ? 'PM' : 'AM';
          return `${pad2(h12)}:${pad2(minute)} ${ampm}`;
        }
        case 'hh:mm:ss A': {
          const h12 = hour % 12 === 0 ? 12 : hour % 12;
          const ampm = hour >= 12 ? 'PM' : 'AM';
          return `${pad2(h12)}:${pad2(minute)}:${pad2(second)} ${ampm}`;
        }
        default:
          break;
      }
    }

    return String(value);
  }
}

export const numberFormatter = new NumberFormatter();
