import { describe, it, expect } from 'vitest';
import {
  validateSheetName,
  generateUniqueSheetName,
  generateDuplicateSheetName,
  cloneSheet,
  reorderSheetList
} from '@/engine/worksheet';
import { Sheet } from '@/types/sheet';

describe('Sheet Operations & Validation', () => {
  const existingSheets = [
    { id: 'sheet_1', name: 'Sheet1' },
    { id: 'sheet_2', name: 'Sheet2' },
    { id: 'sheet_3', name: 'Financials' }
  ];

  describe('validateSheetName', () => {
    it('accepts valid sheet names', () => {
      const res = validateSheetName('Quarterly Report 2026', existingSheets);
      expect(res.isValid).toBe(true);
      expect(res.sanitizedName).toBe('Quarterly Report 2026');
    });

    it('trims leading and trailing whitespace', () => {
      const res = validateSheetName('  Summary Data  ', existingSheets);
      expect(res.isValid).toBe(true);
      expect(res.sanitizedName).toBe('Summary Data');
    });

    it('rejects empty or whitespace-only names', () => {
      expect(validateSheetName('', existingSheets).isValid).toBe(false);
      expect(validateSheetName('   ', existingSheets).isValid).toBe(false);
    });

    it('rejects names exceeding 31 characters', () => {
      const longName = 'This name is definitely way too long for an Excel worksheet tab';
      const res = validateSheetName(longName, existingSheets);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('31 characters');
    });

    it('rejects forbidden characters (\\ / ? * : [ ])', () => {
      const forbidden = ['Sales\\2026', 'Q1/Q2', 'IsReady?', 'Target*100', 'Time:1200', '[Draft]', 'Sheet]'];
      for (const name of forbidden) {
        const res = validateSheetName(name, existingSheets);
        expect(res.isValid).toBe(false);
        expect(res.error).toContain('cannot contain');
      }
    });

    it('rejects duplicate names case-insensitively', () => {
      expect(validateSheetName('Sheet1', existingSheets).isValid).toBe(false);
      expect(validateSheetName('sheet1', existingSheets).isValid).toBe(false);
      expect(validateSheetName('FINANCIALS', existingSheets).isValid).toBe(false);
    });

    it('allows keeping the same name when editing current sheet', () => {
      const res = validateSheetName('Sheet1', existingSheets, 'sheet_1');
      expect(res.isValid).toBe(true);
    });
  });

  describe('generateUniqueSheetName', () => {
    it('generates next available default name avoiding duplicates', () => {
      expect(generateUniqueSheetName(existingSheets)).toBe('Sheet3');

      const withSheet3 = [...existingSheets, { id: 'sheet_4', name: 'Sheet3' }];
      expect(generateUniqueSheetName(withSheet3)).toBe('Sheet4');
    });

    it('reuses gaps in sheet names', () => {
      // Gap at Sheet2
      const gapSheets = [
        { id: 'sheet_1', name: 'Sheet1' },
        { id: 'sheet_3', name: 'Sheet3' }
      ];
      expect(generateUniqueSheetName(gapSheets)).toBe('Sheet2');
    });
  });

  describe('generateDuplicateSheetName', () => {
    it('creates "Name (Copy)" for first duplicate', () => {
      const name = generateDuplicateSheetName('Financials', existingSheets);
      expect(name).toBe('Financials (Copy)');
    });

    it('creates "Name (Copy 2)" when (Copy) already exists', () => {
      const sheetsWithCopy = [
        ...existingSheets,
        { id: 'sheet_copy_1', name: 'Financials (Copy)' }
      ];
      const name = generateDuplicateSheetName('Financials', sheetsWithCopy);
      expect(name).toBe('Financials (Copy 2)');
    });

    it('handles duplicating a copy directly', () => {
      const name = generateDuplicateSheetName('Data (Copy)', [{ name: 'Data' }, { name: 'Data (Copy)' }]);
      expect(name).toBe('Data (Copy 2)');
    });
  });

  describe('cloneSheet', () => {
    it('deep clones cells, styles, merged ranges, row heights, and column widths', () => {
      const originalSheet: Sheet = {
        id: 'orig_id',
        workbookId: 'wb_1',
        name: 'Source Sheet',
        index: 0,
        rowCount: 100,
        columnCount: 26,
        cells: {
          '0:0': {
            value: 'Total',
            dataType: 'string',
            style: {
              bold: true,
              textColor: '#1e3a8a',
              borders: {
                bottom: { style: 'double', color: '#000000' }
              }
            }
          },
          '0:1': {
            value: 500,
            dataType: 'number',
            formula: '=SUM(A1:A10)'
          }
        },
        rowHeights: { 0: 45 },
        columnWidths: { 0: 180 },
        mergedRanges: [{ startRow: 0, startCol: 0, endRow: 0, endCol: 2 }],
        metadata: {
          tabColor: '#2563eb',
          zoom: 1.25,
          isHidden: true
        }
      };

      const cloned = cloneSheet(originalSheet, 'new_id', 'Source Sheet (Copy)', 1);

      expect(cloned.id).toBe('new_id');
      expect(cloned.name).toBe('Source Sheet (Copy)');
      expect(cloned.index).toBe(1);
      expect(cloned.cells['0:0']?.value).toBe('Total');
      expect(cloned.cells['0:0']?.style?.bold).toBe(true);
      expect(cloned.cells['0:0']?.style?.borders?.bottom?.style).toBe('double');
      expect(cloned.cells['0:1']?.formula).toBe('=SUM(A1:A10)');
      expect(cloned.rowHeights?.[0]).toBe(45);
      expect(cloned.columnWidths?.[0]).toBe(180);
      expect(cloned.mergedRanges).toHaveLength(1);
      expect(cloned.mergedRanges?.[0]).toEqual({ startRow: 0, startCol: 0, endRow: 0, endCol: 2 });
      expect(cloned.metadata?.tabColor).toBe('#2563eb');
      // Duplicated sheet starts unhidden
      expect(cloned.metadata?.isHidden).toBe(false);

      // Verify deep copy mutation safety
      if (cloned.cells['0:0']?.style) {
        cloned.cells['0:0'].style.bold = false;
      }
      expect(originalSheet.cells['0:0']?.style?.bold).toBe(true);
    });
  });

  describe('reorderSheetList', () => {
    it('reorders elements placing source before target', () => {
      const list = ['A', 'B', 'C', 'D'];
      const reordered = reorderSheetList(list, 'C', 'A', 'before');
      expect(reordered).toEqual(['C', 'A', 'B', 'D']);
    });

    it('reorders elements placing source after target', () => {
      const list = ['A', 'B', 'C', 'D'];
      const reordered = reorderSheetList(list, 'A', 'C', 'after');
      expect(reordered).toEqual(['B', 'C', 'A', 'D']);
    });
  });
});
