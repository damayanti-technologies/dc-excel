import { describe, it, expect } from 'vitest';
import { CalculationEngine } from '../../src/engine/calculation/engine';
import { Cell } from '../../src/types/cell';
import { NamedRange } from '../../src/types/analysis';
import { resolveNamedRange } from '../../src/engine/analysis/named-ranges';
import { coordToKey } from '../../src/utils/coordinates';

describe('Calculation Engine Named Range Integration', () => {
  const calcEngine = new CalculationEngine();

  it('evaluates =SUM(Sales) with named range resolver', () => {
    // Sheet setup:
    // A1 = 100, A2 = 200, A3 = 300
    // Named range "Sales" refers to A1:A3 (rows 0-2, col 0)
    const rawCells: Record<string, Cell> = {
      [coordToKey(0, 0)]: { value: 100, dataType: 'number' },
      [coordToKey(1, 0)]: { value: 200, dataType: 'number' },
      [coordToKey(2, 0)]: { value: 300, dataType: 'number' },
      [coordToKey(3, 0)]: { value: null, formula: '=SUM(Sales)', dataType: 'number' },
    };

    const namedRanges: NamedRange[] = [
      {
        id: 'nr-sales',
        name: 'Sales',
        scope: 'workbook',
        sheetId: 'sheet-1',
        range: { startRow: 0, startCol: 0, endRow: 2, endCol: 0 },
      },
    ];

    const namedRangeResolver = (name: string) => {
      const resolved = resolveNamedRange(name, 'sheet-1', namedRanges);
      return resolved || null;
    };

    const sheet = {
      id: 'sheet-1',
      workbookId: 'wb-1',
      name: 'Sheet1',
      index: 0,
      rowCount: 100,
      columnCount: 26,
      cells: rawCells,
    };

    const { updatedCells } = calcEngine.recalculateSheet(sheet, namedRangeResolver);

    expect(updatedCells[coordToKey(3, 0)]?.value).toBe(600);
  });

  it('evaluates nested arithmetic with named ranges: =AVERAGE(Sales) * 2', () => {
    const rawCells: Record<string, Cell> = {
      [coordToKey(0, 0)]: { value: 50, dataType: 'number' },
      [coordToKey(1, 0)]: { value: 150, dataType: 'number' },
      [coordToKey(2, 0)]: { value: null, formula: '=AVERAGE(Sales) * 2', dataType: 'number' },
    };

    const namedRanges: NamedRange[] = [
      {
        id: 'nr-sales',
        name: 'Sales',
        scope: 'workbook',
        sheetId: 'sheet-1',
        range: { startRow: 0, startCol: 0, endRow: 1, endCol: 0 },
      },
    ];

    const namedRangeResolver = (name: string) => {
      const resolved = resolveNamedRange(name, 'sheet-1', namedRanges);
      return resolved || null;
    };

    const sheet = {
      id: 'sheet-1',
      workbookId: 'wb-1',
      name: 'Sheet1',
      index: 0,
      rowCount: 100,
      columnCount: 26,
      cells: rawCells,
    };

    const { updatedCells } = calcEngine.recalculateSheet(sheet, namedRangeResolver);

    // Average of 50 and 150 is 100; 100 * 2 = 200
    expect(updatedCells[coordToKey(2, 0)]?.value).toBe(200);
  });
});
