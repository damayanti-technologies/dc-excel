import { describe, it, expect } from 'vitest';
import {
  coordToKey,
  keyToCoord,
  colIndexToName,
  nameToColIndex,
  coordToA1,
  a1ToCoord,
  rangeToA1,
  a1ToRange,
  isCoordInRange
} from '@/utils/coordinates';
import { defaultFormatter } from '@/engine/formatting';
import { Cell } from '@/types/cell';

describe('Data Model & Coordinate Utilities', () => {
  it('converts row/col coordinates to sparse key and back', () => {
    const key = coordToKey(4, 12);
    expect(key).toBe('4:12');

    const coord = keyToCoord(key);
    expect(coord).toEqual({ row: 4, col: 12 });
  });

  it('converts 0-indexed column numbers to Excel column labels', () => {
    expect(colIndexToName(0)).toBe('A');
    expect(colIndexToName(1)).toBe('B');
    expect(colIndexToName(25)).toBe('Z');
    expect(colIndexToName(26)).toBe('AA');
    expect(colIndexToName(27)).toBe('AB');
    expect(colIndexToName(51)).toBe('AZ');
    expect(colIndexToName(52)).toBe('BA');
    expect(colIndexToName(701)).toBe('ZZ');
    expect(colIndexToName(702)).toBe('AAA');
  });

  it('converts Excel column labels to 0-indexed column numbers', () => {
    expect(nameToColIndex('A')).toBe(0);
    expect(nameToColIndex('B')).toBe(1);
    expect(nameToColIndex('Z')).toBe(25);
    expect(nameToColIndex('AA')).toBe(26);
    expect(nameToColIndex('AB')).toBe(27);
    expect(nameToColIndex('ZZ')).toBe(701);
    expect(nameToColIndex('AAA')).toBe(702);
  });

  it('converts coordinates to A1 notation and back', () => {
    expect(coordToA1({ row: 0, col: 0 })).toBe('A1');
    expect(coordToA1({ row: 9, col: 2 })).toBe('C10');

    expect(a1ToCoord('A1')).toEqual({ row: 0, col: 0 });
    expect(a1ToCoord('C10')).toEqual({ row: 9, col: 2 });
    expect(a1ToCoord('Z100')).toEqual({ row: 99, col: 25 });
    expect(a1ToCoord('INVALID')).toBeNull();
  });

  it('formats and parses rectangular cell ranges', () => {
    const range = { startRow: 0, startCol: 0, endRow: 9, endCol: 2 };
    expect(rangeToA1(range)).toBe('A1:C10');

    const parsed = a1ToRange('A1:C10');
    expect(parsed).toEqual(range);

    const singleCellRange = a1ToRange('B5');
    expect(singleCellRange).toEqual({ startRow: 4, startCol: 1, endRow: 4, endCol: 1 });
  });

  it('correctly determines whether a coordinate is inside a range', () => {
    const range = { startRow: 2, startCol: 2, endRow: 5, endCol: 5 };
    expect(isCoordInRange({ row: 3, col: 3 }, range)).toBe(true);
    expect(isCoordInRange({ row: 2, col: 2 }, range)).toBe(true);
    expect(isCoordInRange({ row: 5, col: 5 }, range)).toBe(true);
    expect(isCoordInRange({ row: 1, col: 3 }, range)).toBe(false);
    expect(isCoordInRange({ row: 6, col: 3 }, range)).toBe(false);
  });

  it('supports sparse cell data model with styles and formatting', () => {
    const sparseMap: Record<string, Cell> = {};
    const key = coordToKey(0, 0);

    sparseMap[key] = {
      value: 1250.5,
      dataType: 'number',
      style: {
        bold: true,
        textColor: '#0f766e',
        numberFormat: '$#,##0.00'
      }
    };

    expect(sparseMap[key]?.value).toBe(1250.5);
    expect(sparseMap[key]?.dataType).toBe('number');
    expect(sparseMap[key]?.style?.bold).toBe(true);

    // Formatter check
    const formatted = defaultFormatter.format(
      sparseMap[key]?.value ?? null,
      sparseMap[key]?.style?.numberFormat
    );
    expect(formatted).toContain('1,250.50');
  });
});
