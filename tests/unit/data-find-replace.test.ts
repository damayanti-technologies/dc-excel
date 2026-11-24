import { describe, it, expect } from 'vitest';
import { Sheet } from '@/types/sheet';
import { FindOptions } from '@/types/data-tools';
import { coordToKey } from '@/utils/coordinates';
import {
  findMatches,
  findMatchesInSheet,
  replaceMatchInSheet,
  replaceAllMatches
} from '@/engine/data-tools/find-replace';

describe('Data Tools: Find & Replace Engine', () => {
  const sheet1: Sheet = {
    id: 's1',
    workbookId: 'wb1',
    name: 'Sales',
    index: 0,
    rowCount: 10,
    columnCount: 5,
    cells: {
      [coordToKey(0, 0)]: { value: 'Product', dataType: 'string' },
      [coordToKey(0, 1)]: { value: 'Cost', dataType: 'string' },
      [coordToKey(1, 0)]: { value: 'Apple Widget', dataType: 'string' },
      [coordToKey(1, 1)]: { value: 25, dataType: 'number' },
      [coordToKey(2, 0)]: { value: 'Pineapple Widget', dataType: 'string' },
      [coordToKey(2, 1)]: { value: 45, formula: '=B2*1.5', dataType: 'number' },
    }
  };

  const sheet2: Sheet = {
    id: 's2',
    workbookId: 'wb1',
    name: 'Inventory',
    index: 1,
    rowCount: 10,
    columnCount: 5,
    cells: {
      [coordToKey(0, 0)]: { value: 'Apple Stock', dataType: 'string' },
      [coordToKey(0, 1)]: { value: 120, dataType: 'number' },
    }
  };

  describe('findMatchesInSheet', () => {
    it('finds substring matches case-insensitively', () => {
      const options: FindOptions = {
        query: 'apple',
        matchCase: false,
        matchEntireCell: false,
        searchFormulas: false,
        scope: 'sheet'
      };
      const matches = findMatchesInSheet(sheet1, options);
      expect(matches.length).toBe(2);
      expect(matches.map((m) => m.cellValue)).toContain('Apple Widget');
      expect(matches.map((m) => m.cellValue)).toContain('Pineapple Widget');
    });

    it('respects case-sensitivity', () => {
      const options: FindOptions = {
        query: 'apple',
        matchCase: true,
        matchEntireCell: false,
        searchFormulas: false,
        scope: 'sheet'
      };
      const matches = findMatchesInSheet(sheet1, options);
      // 'Pineapple' has lowercase 'apple', 'Apple Widget' has uppercase 'Apple'
      expect(matches.length).toBe(1);
      expect(matches[0]?.cellValue).toBe('Pineapple Widget');
    });

    it('matches entire cell contents only', () => {
      const options: FindOptions = {
        query: 'Cost',
        matchCase: false,
        matchEntireCell: true,
        searchFormulas: false,
        scope: 'sheet'
      };
      const matches = findMatchesInSheet(sheet1, options);
      expect(matches.length).toBe(1);
      expect(matches[0]?.cellKey).toBe(coordToKey(0, 1));
    });

    it('finds matches in formulas when enabled', () => {
      const options: FindOptions = {
        query: '1.5',
        matchCase: false,
        matchEntireCell: false,
        searchFormulas: true,
        scope: 'sheet'
      };
      const matches = findMatchesInSheet(sheet1, options);
      expect(matches.length).toBe(1);
      expect(matches[0]?.formula).toBe('=B2*1.5');
    });
  });

  describe('findMatches across workbook', () => {
    it('searches all sheets when scope is workbook', () => {
      const options: FindOptions = {
        query: 'Apple',
        matchCase: false,
        matchEntireCell: false,
        searchFormulas: false,
        scope: 'workbook'
      };
      const matches = findMatches([sheet1, sheet2], sheet1.id, options);
      expect(matches.length).toBe(3); // 2 in sheet1, 1 in sheet2
      expect(matches.map((m) => m.sheetName)).toEqual(['Sales', 'Sales', 'Inventory']);
    });
  });

  describe('replace operations', () => {
    it('replaces a single match in a sheet', () => {
      const match = {
        sheetId: 's1',
        sheetName: 'Sales',
        row: 1,
        col: 0,
        cellKey: coordToKey(1, 0),
        cellValue: 'Apple Widget'
      };
      const options: FindOptions = {
        query: 'Apple',
        replaceWith: 'Orange',
        matchCase: false,
        matchEntireCell: false,
        searchFormulas: false,
        scope: 'sheet'
      };

      const { updatedSheet, replaced } = replaceMatchInSheet(sheet1, match, options);
      expect(replaced).toBe(true);
      expect(updatedSheet.cells[coordToKey(1, 0)]?.value).toBe('Orange Widget');
    });

    it('replaces all matches across workbook', () => {
      const options: FindOptions = {
        query: 'Apple',
        replaceWith: 'Orange',
        matchCase: false,
        matchEntireCell: false,
        searchFormulas: false,
        scope: 'workbook'
      };

      const { updatedSheets, replacementCount } = replaceAllMatches([sheet1, sheet2], sheet1.id, options);
      expect(replacementCount).toBe(3);
      expect(updatedSheets[0]?.cells[coordToKey(1, 0)]?.value).toBe('Orange Widget');
      expect(updatedSheets[0]?.cells[coordToKey(2, 0)]?.value).toBe('PineOrange Widget');
      expect(updatedSheets[1]?.cells[coordToKey(0, 0)]?.value).toBe('Orange Stock');
    });
  });
});
