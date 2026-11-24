import { describe, it, expect } from 'vitest';
import { SparseCellMap } from '@/types/sheet';
import { FilterConfig, ColumnFilter } from '@/types/data-tools';
import { coordToKey } from '@/utils/coordinates';
import {
  matchesCondition,
  matchesColumnFilter,
  evaluateFilters,
  getDistinctColumnValues
} from '@/engine/data-tools/filtering';

describe('Data Tools: Filtering Engine', () => {
  describe('matchesCondition', () => {
    it('evaluates text condition filters', () => {
      expect(matchesCondition('Hello World', { type: 'contains', val1: 'World' })).toBe(true);
      expect(matchesCondition('Hello World', { type: 'contains', val1: 'Earth' })).toBe(false);
      expect(matchesCondition('Product A', { type: 'begins_with', val1: 'Prod' })).toBe(true);
      expect(matchesCondition('Product A', { type: 'ends_with', val1: 'A' })).toBe(true);
    });

    it('evaluates numeric condition filters', () => {
      expect(matchesCondition(150, { type: 'greater_than', val1: '100' })).toBe(true);
      expect(matchesCondition(50, { type: 'greater_than', val1: '100' })).toBe(false);
      expect(matchesCondition(100, { type: 'greater_or_equal', val1: '100' })).toBe(true);
      expect(matchesCondition(75, { type: 'between', val1: '50', val2: '100' })).toBe(true);
      expect(matchesCondition(120, { type: 'between', val1: '50', val2: '100' })).toBe(false);
    });

    it('evaluates blank condition filters', () => {
      expect(matchesCondition(null, { type: 'is_blank', val1: '' })).toBe(true);
      expect(matchesCondition('', { type: 'is_blank', val1: '' })).toBe(true);
      expect(matchesCondition('Text', { type: 'is_blank', val1: '' })).toBe(false);
      expect(matchesCondition('Text', { type: 'is_not_blank', val1: '' })).toBe(true);
      expect(matchesCondition(null, { type: 'is_not_blank', val1: '' })).toBe(false);
    });
  });

  describe('matchesColumnFilter', () => {
    it('matches when selectedValues contains the value', () => {
      const filter: ColumnFilter = {
        col: 0,
        selectedValues: ['Active', 'Pending']
      };
      expect(matchesColumnFilter('Active', filter)).toBe(true);
      expect(matchesColumnFilter('Pending', filter)).toBe(true);
      expect(matchesColumnFilter('Archived', filter)).toBe(false);
    });

    it('matches blanks when empty string is in selectedValues', () => {
      const filter: ColumnFilter = {
        col: 0,
        selectedValues: ['']
      };
      expect(matchesColumnFilter(null, filter)).toBe(true);
      expect(matchesColumnFilter('', filter)).toBe(true);
      expect(matchesColumnFilter('Val', filter)).toBe(false);
    });
  });

  describe('evaluateFilters and getDistinctColumnValues', () => {
    const cells: SparseCellMap = {
      // Headers
      [coordToKey(0, 0)]: { value: 'City', dataType: 'string' },
      [coordToKey(0, 1)]: { value: 'Category', dataType: 'string' },
      [coordToKey(0, 2)]: { value: 'Sales', dataType: 'string' },
      // Row 1: NY, Tech, 500
      [coordToKey(1, 0)]: { value: 'NY', dataType: 'string' },
      [coordToKey(1, 1)]: { value: 'Tech', dataType: 'string' },
      [coordToKey(1, 2)]: { value: 500, dataType: 'number' },
      // Row 2: LA, Food, 150
      [coordToKey(2, 0)]: { value: 'LA', dataType: 'string' },
      [coordToKey(2, 1)]: { value: 'Food', dataType: 'string' },
      [coordToKey(2, 2)]: { value: 150, dataType: 'number' },
      // Row 3: NY, Food, 200
      [coordToKey(3, 0)]: { value: 'NY', dataType: 'string' },
      [coordToKey(3, 1)]: { value: 'Food', dataType: 'string' },
      [coordToKey(3, 2)]: { value: 200, dataType: 'number' },
      // Row 4: Chicago, Tech, 800
      [coordToKey(4, 0)]: { value: 'Chicago', dataType: 'string' },
      [coordToKey(4, 1)]: { value: 'Tech', dataType: 'string' },
      [coordToKey(4, 2)]: { value: 800, dataType: 'number' },
    };

    it('extracts unique column values correctly', () => {
      const cities = getDistinctColumnValues(cells, { startRow: 0, startCol: 0, endRow: 4, endCol: 2 }, 0, true);
      expect(cities).toEqual(['Chicago', 'LA', 'NY']);
    });

    it('computes hidden row indices with multi-column AND logic', () => {
      // Filter City === 'NY' AND Sales > 300
      const filterConfig: FilterConfig = {
        range: { startRow: 0, startCol: 0, endRow: 4, endCol: 2 },
        columnFilters: {
          0: { col: 0, selectedValues: ['NY'] },
          2: { col: 2, condition: { type: 'greater_than', val1: '300' } }
        }
      };

      const hiddenRows = evaluateFilters(cells, filterConfig);

      // Only Row 1 (NY, Tech, 500) matches both!
      // Rows 2 (LA), 3 (NY but 200 <= 300), 4 (Chicago) should be hidden
      expect(hiddenRows).toContain(2);
      expect(hiddenRows).toContain(3);
      expect(hiddenRows).toContain(4);
      expect(hiddenRows).not.toContain(1);
      expect(hiddenRows).not.toContain(0); // Header never hidden
    });
  });
});
