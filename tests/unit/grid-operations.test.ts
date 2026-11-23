import { describe, it, expect } from 'vitest';
import { Sheet } from '@/types/sheet';
import {
  insertRow,
  deleteRow,
  insertColumn,
  deleteColumn,
  resizeRowHeight,
  resizeColumnWidth
} from '@/engine/grid/operations';

describe('Grid Row & Column Operations', () => {
  const createMockSheet = (): Sheet => ({
    id: 's-1',
    workbookId: 'wb-1',
    name: 'Sheet1',
    index: 0,
    rowCount: 10,
    columnCount: 10,
    cells: {
      '0:0': { value: 'A1', dataType: 'string' },
      '1:1': { value: 'B2', dataType: 'string' },
      '3:3': { value: 'D4', dataType: 'string' }
    },
    rowHeights: { 1: 50 },
    columnWidths: { 1: 150 }
  });

  describe('Row Management', () => {
    it('inserts row above target and shifts cells down', () => {
      const initial = createMockSheet();
      // Insert row above row 1 (B2)
      const updated = insertRow(initial, 1, 'above');

      expect(updated.rowCount).toBe(11);
      // Row 0 unchanged
      expect(updated.cells['0:0']?.value).toBe('A1');
      // Row 1 shifted to Row 2
      expect(updated.cells['1:1']).toBeUndefined();
      expect(updated.cells['2:1']?.value).toBe('B2');
      // Row 3 shifted to Row 4
      expect(updated.cells['4:3']?.value).toBe('D4');

      // Row height for former row 1 shifted to row 2
      expect(updated.rowHeights?.[2]).toBe(50);
    });

    it('inserts row below target and shifts rows beneath down', () => {
      const initial = createMockSheet();
      // Insert row below row 1
      const updated = insertRow(initial, 1, 'below');

      expect(updated.rowCount).toBe(11);
      expect(updated.cells['0:0']?.value).toBe('A1');
      expect(updated.cells['1:1']?.value).toBe('B2');
      // Row 3 shifted to Row 4
      expect(updated.cells['4:3']?.value).toBe('D4');
    });

    it('deletes selected row and shifts subsequent rows up', () => {
      const initial = createMockSheet();
      // Delete row 1 (contains B2)
      const updated = deleteRow(initial, 1);

      expect(updated.rowCount).toBe(9);
      expect(updated.cells['0:0']?.value).toBe('A1');
      // B2 was deleted
      expect(updated.cells['1:1']?.value).not.toBe('B2');
      // Former D4 (row 3) shifted to row 2
      expect(updated.cells['2:3']?.value).toBe('D4');
      // Row height for deleted row 1 is gone
      expect(updated.rowHeights?.[1]).toBeUndefined();
    });

    it('does not allow deleting the last remaining row', () => {
      const oneRowSheet: Sheet = {
        ...createMockSheet(),
        rowCount: 1
      };
      const result = deleteRow(oneRowSheet, 0);
      expect(result.rowCount).toBe(1);
    });
  });

  describe('Column Management', () => {
    it('inserts column before target and shifts cells right', () => {
      const initial = createMockSheet();
      // Insert col before col 1 (B)
      const updated = insertColumn(initial, 1, 'before');

      expect(updated.columnCount).toBe(11);
      // A1 unchanged
      expect(updated.cells['0:0']?.value).toBe('A1');
      // B2 (col 1) shifted to C2 (col 2)
      expect(updated.cells['1:1']).toBeUndefined();
      expect(updated.cells['1:2']?.value).toBe('B2');
      // D4 (col 3) shifted to E4 (col 4)
      expect(updated.cells['3:4']?.value).toBe('D4');

      // Column width for former col 1 shifted to col 2
      expect(updated.columnWidths?.[2]).toBe(150);
    });

    it('deletes selected column and shifts remaining columns left', () => {
      const initial = createMockSheet();
      // Delete col 1 (contains B2)
      const updated = deleteColumn(initial, 1);

      expect(updated.columnCount).toBe(9);
      expect(updated.cells['0:0']?.value).toBe('A1');
      // Former D4 (col 3) shifted to col 2
      expect(updated.cells['3:2']?.value).toBe('D4');
      expect(updated.columnWidths?.[1]).toBeUndefined();
    });
  });

  describe('Resize Operations', () => {
    it('resizes row height with clamping limits', () => {
      const initial = createMockSheet();

      const normal = resizeRowHeight(initial, 3, 60);
      expect(normal.rowHeights?.[3]).toBe(60);

      // Clamped to min height
      const tooSmall = resizeRowHeight(initial, 3, 5);
      expect(tooSmall.rowHeights?.[3]).toBeGreaterThanOrEqual(18);

      // Clamped to max height
      const tooLarge = resizeRowHeight(initial, 3, 1000);
      expect(tooLarge.rowHeights?.[3]).toBeLessThanOrEqual(400);
    });

    it('resizes column width with clamping limits', () => {
      const initial = createMockSheet();

      const normal = resizeColumnWidth(initial, 4, 180);
      expect(normal.columnWidths?.[4]).toBe(180);

      // Clamped to min width
      const tooSmall = resizeColumnWidth(initial, 4, 10);
      expect(tooSmall.columnWidths?.[4]).toBeGreaterThanOrEqual(30);

      // Clamped to max width
      const tooLarge = resizeColumnWidth(initial, 4, 2000);
      expect(tooLarge.columnWidths?.[4]).toBeLessThanOrEqual(800);
    });
  });
});
