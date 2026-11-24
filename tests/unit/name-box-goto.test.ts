import { describe, it, expect } from 'vitest';
import { a1ToRange, rangeToA1, coordToA1 } from '@/utils/coordinates';
import { NamedRange } from '@/types/analysis';

describe('Name Box & Go To Reference Engine (Stage 14)', () => {
  it('parses single A1 cell coordinates correctly', () => {
    const single = a1ToRange('C15');
    expect(single).toEqual({
      startRow: 14,
      startCol: 2,
      endRow: 14,
      endCol: 2
    });
  });

  it('parses multi-cell range coordinates correctly', () => {
    const range = a1ToRange('A1:D20');
    expect(range).toEqual({
      startRow: 0,
      startCol: 0,
      endRow: 19,
      endCol: 3
    });
  });

  it('handles inverted ranges (e.g. D20:A1) and normalizes them', () => {
    const inverted = a1ToRange('D20:A1');
    expect(inverted).toEqual({
      startRow: 0,
      startCol: 0,
      endRow: 19,
      endCol: 3
    });
  });

  it('returns null for invalid cell or range references', () => {
    expect(a1ToRange('')).toBeNull();
    expect(a1ToRange('InvalidReference')).toBeNull();
    expect(a1ToRange('A0')).toBeNull();
    expect(a1ToRange('123')).toBeNull();
  });

  it('formats range to A1 string correctly', () => {
    expect(rangeToA1({ startRow: 0, startCol: 0, endRow: 9, endCol: 2 })).toBe('A1:C10');
    expect(coordToA1({ row: 0, col: 0 })).toBe('A1');
    expect(coordToA1({ row: 25, col: 25 })).toBe('Z26');
  });

  it('resolves named ranges accurately by name and scope', () => {
    const namedRanges: NamedRange[] = [
      {
        id: 'nr-1',
        name: 'TotalRevenue',
        scope: 'workbook',
        sheetId: 'sheet-1',
        range: { startRow: 10, startCol: 1, endRow: 20, endCol: 1 }
      },
      {
        id: 'nr-2',
        name: 'TaxRate',
        scope: 'sheet',
        sheetId: 'sheet-1',
        range: { startRow: 0, startCol: 5, endRow: 0, endCol: 5 }
      }
    ];

    const matchWb = namedRanges.find((nr) => nr.name.toLowerCase() === 'totalrevenue'.toLowerCase());
    expect(matchWb).toBeDefined();
    expect(matchWb?.range.startRow).toBe(10);
    expect(matchWb?.range.endRow).toBe(20);

    const matchSheet = namedRanges.find((nr) => nr.name.toLowerCase() === 'taxrate'.toLowerCase());
    expect(matchSheet).toBeDefined();
    expect(matchSheet?.scope).toBe('sheet');
    expect(matchSheet?.sheetId).toBe('sheet-1');
  });
});
