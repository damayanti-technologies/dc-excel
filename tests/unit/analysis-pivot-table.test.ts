import { describe, it, expect } from 'vitest';
import {
  aggregateValues,
  generatePivotTable,
} from '../../src/engine/analysis/pivot-table';
import { Cell } from '../../src/types/cell';
import { PivotTableConfig } from '../../src/types/analysis';
import { coordToKey } from '../../src/utils/coordinates';

describe('Pivot Table Engine', () => {
  describe('aggregateValues', () => {
    const values = [10, 20, 30, '40', 'invalid', null, 50];

    it('computes sum', () => {
      expect(aggregateValues(values, 'sum')).toBe(150);
    });

    it('computes count', () => {
      expect(aggregateValues(values, 'count')).toBe(6); // non-null, non-empty
    });

    it('computes count_numbers', () => {
      expect(aggregateValues(values, 'count_numbers')).toBe(5); // 10, 20, 30, 40, 50
    });

    it('computes average', () => {
      expect(aggregateValues(values, 'average')).toBe(30);
    });

    it('computes min and max', () => {
      expect(aggregateValues(values, 'min')).toBe(10);
      expect(aggregateValues(values, 'max')).toBe(50);
    });
  });

  describe('generatePivotTable', () => {
    // Dataset:
    // Region (Col 0), Product (Col 1), Sales (Col 2)
    // North, Widget, 100
    // North, Gadget, 200
    // South, Widget, 300
    // South, Gadget, 400
    const rawCells: Record<string, Cell> = {
      [coordToKey(0, 0)]: { value: 'Region', dataType: 'string' },
      [coordToKey(0, 1)]: { value: 'Product', dataType: 'string' },
      [coordToKey(0, 2)]: { value: 'Sales', dataType: 'string' },

      [coordToKey(1, 0)]: { value: 'North', dataType: 'string' },
      [coordToKey(1, 1)]: { value: 'Widget', dataType: 'string' },
      [coordToKey(1, 2)]: { value: 100, dataType: 'number' },

      [coordToKey(2, 0)]: { value: 'North', dataType: 'string' },
      [coordToKey(2, 1)]: { value: 'Gadget', dataType: 'string' },
      [coordToKey(2, 2)]: { value: 200, dataType: 'number' },

      [coordToKey(3, 0)]: { value: 'South', dataType: 'string' },
      [coordToKey(3, 1)]: { value: 'Widget', dataType: 'string' },
      [coordToKey(3, 2)]: { value: 300, dataType: 'number' },

      [coordToKey(4, 0)]: { value: 'South', dataType: 'string' },
      [coordToKey(4, 1)]: { value: 'Gadget', dataType: 'string' },
      [coordToKey(4, 2)]: { value: 400, dataType: 'number' },
    };

    const getCell = (r: number, c: number) => rawCells[coordToKey(r, c)];

    it('generates grouped pivot table with row fields and grand totals', () => {
      const config: PivotTableConfig = {
        id: 'pivot-1',
        name: 'Sales By Region',
        sourceSheetId: 'sheet-1',
        sourceRange: { startRow: 0, startCol: 0, endRow: 4, endCol: 2 },
        hasHeaders: true,
        rowFields: [0], // Region
        columnFields: [],
        valueFields: [
          {
            fieldIndex: 2, // Sales
            fieldName: 'Sales',
            agg: 'sum',
            displayName: 'Sum of Sales',
          },
        ],
        filterFields: [],
        destinationSheetId: 'sheet-1',
        destinationCoord: { row: 6, col: 0 },
        showGrandTotalsRow: true,
        showGrandTotalsCol: false,
        showSubtotals: false,
      };

      const result = generatePivotTable(config, getCell);

      expect(result.rowCount).toBe(4); // Header, North, South, Grand Total
      expect(result.colCount).toBe(2); // Region label, Sum of Sales

      // Header row
      expect(result.cells[coordToKey(6, 0)]?.value).toBe('Region');
      expect(result.cells[coordToKey(6, 1)]?.value).toBe('Sum of Sales');

      // North row: 100 + 200 = 300
      expect(result.cells[coordToKey(7, 0)]?.value).toBe('North');
      expect(result.cells[coordToKey(7, 1)]?.value).toBe(300);

      // South row: 300 + 400 = 700
      expect(result.cells[coordToKey(8, 0)]?.value).toBe('South');
      expect(result.cells[coordToKey(8, 1)]?.value).toBe(700);

      // Grand Total row: 1000
      expect(result.cells[coordToKey(9, 0)]?.value).toBe('Grand Total');
      expect(result.cells[coordToKey(9, 1)]?.value).toBe(1000);
    });

    it('generates cross-tabulation with row fields and column fields', () => {
      const config: PivotTableConfig = {
        id: 'pivot-2',
        name: 'Cross Tab',
        sourceSheetId: 'sheet-1',
        sourceRange: { startRow: 0, startCol: 0, endRow: 4, endCol: 2 },
        hasHeaders: true,
        rowFields: [0], // Region (North, South)
        columnFields: [1], // Product (Widget, Gadget)
        valueFields: [
          {
            fieldIndex: 2,
            fieldName: 'Sales',
            agg: 'sum',
            displayName: 'Total Sales',
          },
        ],
        filterFields: [],
        destinationSheetId: 'sheet-1',
        destinationCoord: { row: 0, col: 5 },
        showGrandTotalsRow: true,
        showGrandTotalsCol: true,
        showSubtotals: false,
      };

      const result = generatePivotTable(config, getCell);
      expect(result.rowCount).toBe(4); // Header, North, South, Grand Total
      expect(result.colCount).toBe(4); // Region col, Widget col, Gadget col, Total col
    });
  });
});
