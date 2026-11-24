import { describe, it, expect } from 'vitest';
import { numberFormatter } from '@/engine/formatting/number-formatter';
import { FormulaError } from '@/engine/calculation/errors';
import { dateToSerial } from '@/engine/calculation/date-utils';
import { CellValue } from '@/types/cell';

describe('Number Formatting Engine', () => {
  describe('General & Text Formats', () => {
    it('formats General format naturally without altering numbers or strings', () => {
      expect(numberFormatter.format(1234)).toBe('1234');
      expect(numberFormatter.format(12.345)).toBe('12.345');
      expect(numberFormatter.format('Hello')).toBe('Hello');
      expect(numberFormatter.format(true)).toBe('TRUE');
      expect(numberFormatter.format(false)).toBe('FALSE');
      expect(numberFormatter.format(null)).toBe('');
      expect(numberFormatter.format(undefined as unknown as CellValue)).toBe('');
    });

    it('displays content as raw text with @ format', () => {
      expect(numberFormatter.format(1234, '@')).toBe('1234');
      expect(numberFormatter.format('OmniSheet', '@')).toBe('OmniSheet');
    });

    it('returns formula errors untouched regardless of format pattern', () => {
      expect(numberFormatter.format(FormulaError.DIV_ZERO, '$#,##0.00')).toBe('#DIV/0!');
      expect(numberFormatter.format(FormulaError.NA, '0.00%')).toBe('#N/A');
      expect(numberFormatter.format(FormulaError.CYCLE, 'YYYY-MM-DD')).toBe('#CYCLE!');
    });
  });

  describe('Number Formats', () => {
    it('formats numbers with fixed decimal places', () => {
      expect(numberFormatter.format(123.4, '0.00')).toBe('123.40');
      expect(numberFormatter.format(123.456, '0.00')).toBe('123.46');
      expect(numberFormatter.format(123, '0.0')).toBe('123.0');
      expect(numberFormatter.format(123.456, '0')).toBe('123');
    });

    it('formats numbers with thousands grouping separators', () => {
      expect(numberFormatter.format(1234567.89, '#,##0.00')).toBe('1,234,567.89');
      expect(numberFormatter.format(1234567, '#,##0')).toBe('1,234,567');
      expect(numberFormatter.format(-1234567.89, '#,##0.00')).toBe('-1,234,567.89');
    });
  });

  describe('Currency Formats', () => {
    it('formats USD ($), EUR (€), GBP (£), INR (₹), and JPY (¥)', () => {
      expect(numberFormatter.format(1234.5, '$#,##0.00')).toBe('$1,234.50');
      expect(numberFormatter.format(-1234.5, '$#,##0.00')).toBe('-$1,234.50');

      expect(numberFormatter.format(2500, '€#,##0.00')).toBe('€2,500.00');
      expect(numberFormatter.format(1999.99, '£#,##0.00')).toBe('£1,999.99');
      expect(numberFormatter.format(50000, '₹#,##0.00')).toBe('₹50,000.00');
      expect(numberFormatter.format(15000, '¥#,##0')).toBe('¥15,000');
    });
  });

  describe('Percentage Formats', () => {
    it('multiplies value by 100 and formats as percentage', () => {
      expect(numberFormatter.format(0.25, '0%')).toBe('25%');
      expect(numberFormatter.format(0.1234, '0.0%')).toBe('12.3%');
      expect(numberFormatter.format(0.123456, '0.00%')).toBe('12.35%');
      expect(numberFormatter.format(-0.05, '0%')).toBe('-5%');
    });
  });

  describe('Date & Time Formats', () => {
    // 2026-11-24 UTC serial number = (Date.UTC(2026, 10, 24) - Date.UTC(1899, 11, 30)) / 86400000
    // Date.UTC(2026, 10, 24) is 46349
    it('formats dates from serial numbers and date strings', () => {
      const serial2026 = dateToSerial(2026, 11, 24); // 2026-11-24

      expect(numberFormatter.format(serial2026, 'YYYY-MM-DD')).toBe('2026-11-24');
      expect(numberFormatter.format(serial2026, 'DD/MM/YYYY')).toBe('24/11/2026');
      expect(numberFormatter.format(serial2026, 'MM/DD/YYYY')).toBe('11/24/2026');
      expect(numberFormatter.format(serial2026, 'DD-MMM-YYYY')).toBe('24-Nov-2026');
      expect(numberFormatter.format(serial2026, 'MMM DD, YYYY')).toBe('Nov 24, 2026');

      // ISO date string input
      expect(numberFormatter.format('2026-06-15T00:00:00.000Z', 'YYYY-MM-DD')).toBe('2026-06-15');
    });

    it('formats time in 24-hour and 12-hour formats', () => {
      // 14:30:45 = (14*3600 + 30*60 + 45)/86400 = 52245 / 86400 = 0.6046875
      const timeSerial = 46349.6046875;

      expect(numberFormatter.format(timeSerial, 'HH:MM')).toBe('14:30');
      expect(numberFormatter.format(timeSerial, 'HH:MM:SS')).toBe('14:30:45');
      expect(numberFormatter.format(timeSerial, 'hh:mm A')).toBe('02:30 PM');
      expect(numberFormatter.format(timeSerial, 'hh:mm:ss A')).toBe('02:30:45 PM');
    });
  });

  describe('Scientific Notation', () => {
    it('formats large and small numbers in scientific format', () => {
      expect(numberFormatter.format(1234.56, '0.00E+00')).toBe('1.23E+03');
      expect(numberFormatter.format(0.00045, '0.0E+0')).toBe('4.5E-4');
    });
  });

  describe('Custom Multi-section Formats', () => {
    it('evaluates multi-section format: positive;negative;zero;text', () => {
      const customPattern = '$#,##0.00;($#,##0.00);"-";"Text: "@';

      expect(numberFormatter.format(100, customPattern)).toBe('$100.00');
      expect(numberFormatter.format(-100, customPattern)).toBe('($100.00)');
      expect(numberFormatter.format(0, customPattern)).toBe('-');
      expect(numberFormatter.format('Notes', customPattern)).toBe('Text: Notes');
    });
  });
});
