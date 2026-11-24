export * from './constants';
export * from './number-formatter';
export * from './range-formatting';
export * from './merge-cells';

import { CellValue } from '@/types/cell';
import { numberFormatter } from './number-formatter';

/**
 * Interface for formatters that render cell values according to Excel number format masks.
 */
export interface IValueFormatter {
  format(value: CellValue, formatPattern?: string, locale?: string): string;
}

export class StandardValueFormatter implements IValueFormatter {
  public format(value: CellValue, formatPattern?: string, locale = 'en-US'): string {
    return numberFormatter.format(value, formatPattern, locale);
  }
}

export const defaultFormatter = new StandardValueFormatter();
