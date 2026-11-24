import { describe, it, expect } from 'vitest';
import {
  applySubtotals,
  removeSubtotals,
  isRowCollapsed,
  toggleRowGroup,
  addRowGroup,
  removeRowGroup,
} from '../../src/engine/analysis/subtotals';
import { Cell } from '../../src/types/cell';
import { SubtotalConfig, RowGroup } from '../../src/types/analysis';
import { coordToKey } from '../../src/utils/coordinates';

describe('Subtotals & Grouping Engine', () => {
  describe('applySubtotals', () => {
    // Dataset:
    // Category (Col 0), Amount (Col 1)
    // Hardware, 100
    // Hardware, 200
    // Software, 300
    const rawCells: Record<string, Cell> = {
      [coordToKey(0, 0)]: { value: 'Hardware', dataType: 'string' },
      [coordToKey(0, 1)]: { value: 100, dataType: 'number' },
      [coordToKey(1, 0)]: { value: 'Hardware', dataType: 'string' },
      [coordToKey(1, 1)]: { value: 200, dataType: 'number' },
      [coordToKey(2, 0)]: { value: 'Software', dataType: 'string' },
      [coordToKey(2, 1)]: { value: 300, dataType: 'number' },
    };

    it('inserts subtotal rows for each group transition and creates outline groups', () => {
      const config: SubtotalConfig = {
        range: { startRow: 0, startCol: 0, endRow: 2, endCol: 1 },
        groupByCol: 0,
        agg: 'sum',
        targetCols: [1],
        addGrandTotal: true,
        replaceExisting: false,
      };

      const result = applySubtotals(config, rawCells);

      // We expect:
      // Row 0: Hardware 100
      // Row 1: Hardware 200
      // Row 2: Subtotal Hardware Total (100+200=300)
      // Row 3: Software 300
      // Row 4: Subtotal Software Total (300)
      // Row 5: Grand Total (600)
      expect(result.rowsAdded).toBe(3); // 2 group subtotals + 1 grand total
      expect(result.newCells[coordToKey(2, 0)]?.value).toBe('Hardware Total');
      expect(result.newCells[coordToKey(2, 1)]?.value).toBe(300);
      expect(result.newCells[coordToKey(2, 1)]?.formula).toContain('=SUBTOTAL(9,');

      expect(result.newCells[coordToKey(4, 0)]?.value).toBe('Software Total');
      expect(result.newCells[coordToKey(4, 1)]?.value).toBe(300);

      expect(result.newCells[coordToKey(5, 0)]?.value).toBe('Grand Total');
      expect(result.newCells[coordToKey(5, 1)]?.value).toBe(600);

      // Verify row outline groups
      expect(result.newRowGroups.length).toBeGreaterThan(0);
      expect(result.newRowGroups[0]?.startRow).toBe(0);
      expect(result.newRowGroups[0]?.endRow).toBe(1);
    });
  });

  describe('removeSubtotals', () => {
    it('removes subtotal and grand total rows and restores original row positions', () => {
      const cellsWithSubtotals: Record<string, Cell> = {
        [coordToKey(0, 0)]: { value: 'Hardware', dataType: 'string' },
        [coordToKey(1, 0)]: { value: 'Hardware Total', dataType: 'string' },
        [coordToKey(2, 0)]: { value: 'Software', dataType: 'string' },
        [coordToKey(3, 0)]: { value: 'Grand Total', dataType: 'string' },
      };

      const { newCells, newRowGroups } = removeSubtotals(cellsWithSubtotals);
      expect(newRowGroups).toHaveLength(0);
      expect(newCells[coordToKey(0, 0)]?.value).toBe('Hardware');
      expect(newCells[coordToKey(1, 0)]?.value).toBe('Software');
      expect(newCells[coordToKey(2, 0)]).toBeUndefined();
    });
  });

  describe('Row Group Outlines', () => {
    it('manages collapse state correctly', () => {
      const groups: RowGroup[] = [
        { startRow: 2, endRow: 5, level: 1, isCollapsed: false },
      ];

      expect(isRowCollapsed(3, groups)).toBe(false);

      const toggled = toggleRowGroup(groups, 0);
      expect(toggled[0]?.isCollapsed).toBe(true);
      expect(isRowCollapsed(3, toggled)).toBe(true);
      expect(isRowCollapsed(1, toggled)).toBe(false);
      expect(isRowCollapsed(6, toggled)).toBe(false);
    });

    it('adds and removes manual row group outlines', () => {
      const g1 = addRowGroup([], 2, 5);
      expect(g1).toHaveLength(1);
      expect(g1[0]?.level).toBe(1);

      // Nested group
      const g2 = addRowGroup(g1, 3, 4);
      expect(g2).toHaveLength(2);
      expect(g2[1]?.level).toBe(2);

      const removed = removeRowGroup(g2, 3, 4);
      expect(removed).toHaveLength(1);
      expect(removed[0]?.level).toBe(1);
    });
  });
});
