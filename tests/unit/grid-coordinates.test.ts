import { describe, it, expect } from 'vitest';
import {
  colIndexToName,
  nameToColIndex,
  coordToA1,
  a1ToCoord,
  rangeToA1,
  a1ToRange,
  isCoordInRange
} from '@/utils/coordinates';
import { normalizeRange } from '@/engine/grid/selection';

describe('Grid Coordinate Utilities', () => {
  describe('Column Label Conversion', () => {
    it('converts 0-based column indices to Excel column labels correctly', () => {
      expect(colIndexToName(0)).toBe('A');
      expect(colIndexToName(25)).toBe('Z');
      expect(colIndexToName(26)).toBe('AA');
      expect(colIndexToName(27)).toBe('AB');
      expect(colIndexToName(51)).toBe('AZ');
      expect(colIndexToName(52)).toBe('BA');
      expect(colIndexToName(701)).toBe('ZZ');
      expect(colIndexToName(702)).toBe('AAA');
    });

    it('throws error for negative column index', () => {
      expect(() => colIndexToName(-1)).toThrow(/Column index cannot be negative/);
    });

    it('converts Excel column labels to 0-based column indices correctly', () => {
      expect(nameToColIndex('A')).toBe(0);
      expect(nameToColIndex('z')).toBe(25); // Case-insensitive
      expect(nameToColIndex('AA')).toBe(26);
      expect(nameToColIndex('AB')).toBe(27);
      expect(nameToColIndex('AZ')).toBe(51);
      expect(nameToColIndex('BA')).toBe(52);
      expect(nameToColIndex('ZZ')).toBe(701);
      expect(nameToColIndex('AAA')).toBe(702);
    });

    it('throws error for invalid column labels', () => {
      expect(() => nameToColIndex('')).toThrow(/Invalid column name/);
      expect(() => nameToColIndex('123')).toThrow(/Invalid column name/);
      expect(() => nameToColIndex('A1')).toThrow(/Invalid column name/);
    });
  });

  describe('Cell Reference Conversion (A1)', () => {
    it('converts cell coordinates to A1 reference', () => {
      expect(coordToA1({ row: 0, col: 0 })).toBe('A1');
      expect(coordToA1({ row: 0, col: 25 })).toBe('Z1');
      expect(coordToA1({ row: 0, col: 26 })).toBe('AA1');
      expect(coordToA1({ row: 0, col: 51 })).toBe('AZ1');
      expect(coordToA1({ row: 0, col: 52 })).toBe('BA1');
      expect(coordToA1({ row: 99, col: 1 })).toBe('B100');
      expect(coordToA1({ row: 999, col: 25 })).toBe('Z1000');
    });

    it('parses valid A1 references to cell coordinates', () => {
      expect(a1ToCoord('A1')).toEqual({ row: 0, col: 0 });
      expect(a1ToCoord('z1')).toEqual({ row: 0, col: 25 });
      expect(a1ToCoord('AA1')).toEqual({ row: 0, col: 26 });
      expect(a1ToCoord('AZ1')).toEqual({ row: 0, col: 51 });
      expect(a1ToCoord('BA1')).toEqual({ row: 0, col: 52 });
      expect(a1ToCoord('B100')).toEqual({ row: 99, col: 1 });
      expect(a1ToCoord('  c5  ')).toEqual({ row: 4, col: 2 });
    });

    it('returns null for invalid A1 references', () => {
      expect(a1ToCoord('')).toBeNull();
      expect(a1ToCoord('A0')).toBeNull(); // Row must be >= 1
      expect(a1ToCoord('A-1')).toBeNull();
      expect(a1ToCoord('123')).toBeNull();
      expect(a1ToCoord('ABC')).toBeNull();
      expect(a1ToCoord('A1:B2')).toBeNull();
    });
  });

  describe('Range Notation & Normalization', () => {
    it('formats a CellRange as Excel range string', () => {
      expect(rangeToA1({ startRow: 0, startCol: 0, endRow: 9, endCol: 2 })).toBe('A1:C10');
      expect(rangeToA1({ startRow: 3, startCol: 1, endRow: 3, endCol: 1 })).toBe('B4:B4');
    });

    it('parses valid range strings to normalized CellRange', () => {
      expect(a1ToRange('A1:C10')).toEqual({
        startRow: 0,
        startCol: 0,
        endRow: 9,
        endCol: 2
      });

      // Inverted range order should be normalized
      expect(a1ToRange('C10:A1')).toEqual({
        startRow: 0,
        startCol: 0,
        endRow: 9,
        endCol: 2
      });

      // Single cell string
      expect(a1ToRange('B5')).toEqual({
        startRow: 4,
        startCol: 1,
        endRow: 4,
        endCol: 1
      });
    });

    it('normalizes arbitrary inverted ranges', () => {
      const inverted = { startRow: 10, startCol: 5, endRow: 2, endCol: 1 };
      const normalized = normalizeRange(inverted);
      expect(normalized).toEqual({
        startRow: 2,
        startCol: 1,
        endRow: 10,
        endCol: 5
      });
    });

    it('checks if a coordinate is inside a range', () => {
      const range = { startRow: 2, startCol: 2, endRow: 5, endCol: 5 };
      expect(isCoordInRange({ row: 2, col: 2 }, range)).toBe(true);
      expect(isCoordInRange({ row: 4, col: 3 }, range)).toBe(true);
      expect(isCoordInRange({ row: 5, col: 5 }, range)).toBe(true);
      expect(isCoordInRange({ row: 1, col: 2 }, range)).toBe(false);
      expect(isCoordInRange({ row: 6, col: 4 }, range)).toBe(false);
      expect(isCoordInRange({ row: 3, col: 6 }, range)).toBe(false);
    });
  });
});
