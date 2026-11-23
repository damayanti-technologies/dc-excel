import { CellValue } from '@/types/cell';

/**
 * Interface for formatters that render cell values according to Excel number format masks.
 */
export interface IValueFormatter {
  format(value: CellValue, formatPattern?: string, locale?: string): string;
}

export class SimpleValueFormatter implements IValueFormatter {
  public format(value: CellValue, formatPattern?: string, locale = 'en-US'): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }

    if (value instanceof Date) {
      return value.toLocaleDateString(locale);
    }

    if (typeof value === 'number') {
      if (!formatPattern || formatPattern === 'General') {
        return value.toString();
      }
      if (formatPattern === '0.00') {
        return value.toFixed(2);
      }
      if (formatPattern === '0%') {
        return `${Math.round(value * 100)}%`;
      }
      if (formatPattern === '0.0%') {
        return `${(value * 100).toFixed(1)}%`;
      }
      if (formatPattern.includes('$')) {
        return new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(value);
      }
      return value.toLocaleString(locale);
    }

    return String(value);
  }
}

export const defaultFormatter = new SimpleValueFormatter();
