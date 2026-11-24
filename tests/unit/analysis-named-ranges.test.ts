import { describe, it, expect } from 'vitest';
import {
  validateRangeName,
  resolveNamedRange,
  formatRangeReference,
  parseRangeReference,
  expandNamedRangeCoordinates,
} from '../../src/engine/analysis/named-ranges';
import { NamedRange } from '../../src/types/analysis';

describe('Named Ranges Engine', () => {
  describe('validateRangeName', () => {
    it('accepts valid alphanumeric names with underscores and dots', () => {
      expect(validateRangeName('Sales').isValid).toBe(true);
      expect(validateRangeName('Q4_Revenue').isValid).toBe(true);
      expect(validateRangeName('_my_var').isValid).toBe(true);
      expect(validateRangeName('Tax.Rate.2024').isValid).toBe(true);
    });

    it('rejects empty or whitespace-only names', () => {
      expect(validateRangeName('').isValid).toBe(false);
      expect(validateRangeName('   ').isValid).toBe(false);
    });

    it('rejects names starting with numbers or invalid characters', () => {
      expect(validateRangeName('123Sales').isValid).toBe(false);
      expect(validateRangeName('-Tax').isValid).toBe(false);
      expect(validateRangeName('Total Sales').isValid).toBe(false); // contains space
      expect(validateRangeName('Sales$').isValid).toBe(false);
    });

    it('rejects boolean literals TRUE and FALSE', () => {
      expect(validateRangeName('TRUE').isValid).toBe(false);
      expect(validateRangeName('false').isValid).toBe(false);
    });

    it('rejects cell coordinate collisions', () => {
      expect(validateRangeName('A1').isValid).toBe(false);
      expect(validateRangeName('b10').isValid).toBe(false);
      expect(validateRangeName('AA99').isValid).toBe(false);
      expect(validateRangeName('R1C1').isValid).toBe(false);
    });

    it('rejects duplicate names within scope', () => {
      const existing = ['Sales', 'Expenses'];
      expect(validateRangeName('Sales', existing).isValid).toBe(false);
      expect(validateRangeName('sales', existing).isValid).toBe(false); // case-insensitive
      expect(validateRangeName('Profit', existing).isValid).toBe(true);
    });
  });

  describe('resolveNamedRange', () => {
    const namedRanges: NamedRange[] = [
      {
        id: 'nr-1',
        name: 'Sales',
        scope: 'workbook',
        sheetId: 'sheet-1',
        range: { startRow: 0, startCol: 0, endRow: 9, endCol: 0 },
      },
      {
        id: 'nr-2',
        name: 'TaxRate',
        scope: 'sheet-2',
        sheetId: 'sheet-2',
        range: { startRow: 0, startCol: 1, endRow: 0, endCol: 1 },
      },
      {
        id: 'nr-3',
        name: 'TaxRate',
        scope: 'workbook',
        sheetId: 'sheet-1',
        range: { startRow: 0, startCol: 2, endRow: 0, endCol: 2 },
      },
    ];

    it('resolves workbook-scoped name', () => {
      const resolved = resolveNamedRange('Sales', 'sheet-1', namedRanges);
      expect(resolved).toBeDefined();
      expect(resolved?.id).toBe('nr-1');
    });

    it('prefers sheet-scoped name over workbook-scoped name when matching sheet', () => {
      const resolved = resolveNamedRange('TaxRate', 'sheet-2', namedRanges);
      expect(resolved).toBeDefined();
      expect(resolved?.id).toBe('nr-2');
      expect(resolved?.scope).toBe('sheet-2');
    });

    it('falls back to workbook scope when sheet scope does not match', () => {
      const resolved = resolveNamedRange('TaxRate', 'sheet-1', namedRanges);
      expect(resolved).toBeDefined();
      expect(resolved?.id).toBe('nr-3');
      expect(resolved?.scope).toBe('workbook');
    });
  });

  describe('formatRangeReference and parseRangeReference', () => {
    it('formats single cell range to A1 string', () => {
      expect(formatRangeReference({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 })).toBe('A1');
    });

    it('formats multi-cell range to A1:B10 string', () => {
      expect(formatRangeReference({ startRow: 0, startCol: 0, endRow: 9, endCol: 1 })).toBe('A1:B10');
    });

    it('parses single cell reference into CellRange', () => {
      const parsed = parseRangeReference('C5');
      expect(parsed).toEqual({ startRow: 4, startCol: 2, endRow: 4, endCol: 2 });
    });

    it('parses bounding box reference into CellRange', () => {
      const parsed = parseRangeReference('A1:D20');
      expect(parsed).toEqual({ startRow: 0, startCol: 0, endRow: 19, endCol: 3 });
    });

    it('returns null on invalid reference strings', () => {
      expect(parseRangeReference('invalid')).toBeNull();
      expect(parseRangeReference('A:B')).toBeNull();
    });
  });

  describe('expandNamedRangeCoordinates', () => {
    it('expands 2x2 range into 4 coordinate objects', () => {
      const coords = expandNamedRangeCoordinates({
        startRow: 1,
        startCol: 1,
        endRow: 2,
        endCol: 2,
      });
      expect(coords).toHaveLength(4);
      expect(coords).toEqual([
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 2, col: 1 },
        { row: 2, col: 2 },
      ]);
    });
  });
});
