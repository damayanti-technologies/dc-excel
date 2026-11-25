import { describe, it, expect } from 'vitest';
import { SparseCellMap } from '@/types/sheet';
import { SortConfig } from '@/types/data-tools';
import { coordToKey } from '@/utils/coordinates';
import { compareCellValues, detectTableRange, sortRange } from '@/engine/data-tools/sorting';

describe('Data Tools: Sorting Engine', () => {
  describe('compareCellValues', () => {
    it('compares numbers numerically in ascending order', () => {
      expect(compareCellValues(2, 10, 'asc')).toBeLessThan(0);
      expect(compareCellValues(10, 2, 'asc')).toBeGreaterThan(0);
      expect(compareCellValues(5, 5, 'asc')).toBe(0);
    });

    it('compares numbers numerically in descending order', () => {
      expect(compareCellValues(2, 10, 'desc')).toBeGreaterThan(0);
      expect(compareCellValues(10, 2, 'desc')).toBeLessThan(0);
    });

    it('compares strings alphabetically', () => {
      expect(compareCellValues('Apple', 'Banana', 'asc')).toBeLessThan(0);
      expect(compareCellValues('Banana', 'Apple', 'asc')).toBeGreaterThan(0);
      expect(compareCellValues('Apple', 'Banana', 'desc')).toBeGreaterThan(0);
    });

    it('places blanks at the bottom regardless of sort direction', () => {
      expect(compareCellValues(null, 'Apple', 'asc')).toBe(1);
      expect(compareCellValues('Apple', null, 'asc')).toBe(-1);
      expect(compareCellValues(null, 'Apple', 'desc')).toBe(1);
      expect(compareCellValues('Apple', null, 'desc')).toBe(-1);
      expect(compareCellValues('', 50, 'asc')).toBe(1);
      expect(compareCellValues(50, '', 'desc')).toBe(-1);
      expect(compareCellValues(null, '', 'asc')).toBe(0);
    });

    it('compares dates accurately', () => {
      const d1 = new Date('2024-01-01');
      const d2 = new Date('2025-01-01');
      expect(compareCellValues(d1, d2, 'asc')).toBeLessThan(0);
      expect(compareCellValues(d1, d2, 'desc')).toBeGreaterThan(0);
    });
  });

  describe('detectTableRange', () => {
    it('detects contiguous bounding box around coordinate', () => {
      const cells: SparseCellMap = {
        [coordToKey(1, 1)]: { value: 'Name', dataType: 'string' },
        [coordToKey(1, 2)]: { value: 'Score', dataType: 'string' },
        [coordToKey(2, 1)]: { value: 'Alice', dataType: 'string' },
        [coordToKey(2, 2)]: { value: 95, dataType: 'number' },
        [coordToKey(3, 1)]: { value: 'Bob', dataType: 'string' },
        [coordToKey(3, 2)]: { value: 82, dataType: 'number' },
      };

      const range = detectTableRange(cells, { row: 2, col: 1 });
      expect(range).toEqual({
        startRow: 1,
        startCol: 1,
        endRow: 3,
        endCol: 2
      });
    });

    it('returns single cell if no populated cells exist', () => {
      const range = detectTableRange({}, { row: 5, col: 5 });
      expect(range).toEqual({
        startRow: 5,
        startCol: 5,
        endRow: 5,
        endCol: 5
      });
    });
  });

  describe('sortRange', () => {
    it('sorts records ascending by a numeric column while preserving row integrity', () => {
      const cells: SparseCellMap = {
        // Headers (Row 0)
        [coordToKey(0, 0)]: { value: 'Name', dataType: 'string' },
        [coordToKey(0, 1)]: { value: 'Age', dataType: 'string' },
        // Row 1: Charlie, 35
        [coordToKey(1, 0)]: { value: 'Charlie', dataType: 'string' },
        [coordToKey(1, 1)]: { value: 35, dataType: 'number' },
        // Row 2: Alice, 25
        [coordToKey(2, 0)]: { value: 'Alice', dataType: 'string' },
        [coordToKey(2, 1)]: { value: 25, dataType: 'number' },
        // Row 3: Bob, 30
        [coordToKey(3, 0)]: { value: 'Bob', dataType: 'string' },
        [coordToKey(3, 1)]: { value: 30, dataType: 'number' },
      };

      const config: SortConfig = {
        range: { startRow: 0, startCol: 0, endRow: 3, endCol: 1 },
        levels: [{ col: 1, direction: 'asc' }],
        hasHeaders: true
      };

      const sorted = sortRange(cells, config);

      // Row 0 unchanged
      expect(sorted[coordToKey(0, 0)]?.value).toBe('Name');
      expect(sorted[coordToKey(0, 1)]?.value).toBe('Age');

      // Row 1 should now be Alice, 25
      expect(sorted[coordToKey(1, 0)]?.value).toBe('Alice');
      expect(sorted[coordToKey(1, 1)]?.value).toBe(25);

      // Row 2 should be Bob, 30
      expect(sorted[coordToKey(2, 0)]?.value).toBe('Bob');
      expect(sorted[coordToKey(2, 1)]?.value).toBe(30);

      // Row 3 should be Charlie, 35
      expect(sorted[coordToKey(3, 0)]?.value).toBe('Charlie');
      expect(sorted[coordToKey(3, 1)]?.value).toBe(35);
    });

    it('performs multi-level sorting (Dept asc, Salary desc)', () => {
      const cells: SparseCellMap = {
        // Headers
        [coordToKey(0, 0)]: { value: 'Dept', dataType: 'string' },
        [coordToKey(0, 1)]: { value: 'Salary', dataType: 'string' },
        [coordToKey(0, 2)]: { value: 'Name', dataType: 'string' },
        // Row 1: Sales, 50k, Alice
        [coordToKey(1, 0)]: { value: 'Sales', dataType: 'string' },
        [coordToKey(1, 1)]: { value: 50000, dataType: 'number' },
        [coordToKey(1, 2)]: { value: 'Alice', dataType: 'string' },
        // Row 2: Eng, 90k, Bob
        [coordToKey(2, 0)]: { value: 'Eng', dataType: 'string' },
        [coordToKey(2, 1)]: { value: 90000, dataType: 'number' },
        [coordToKey(2, 2)]: { value: 'Bob', dataType: 'string' },
        // Row 3: Sales, 75k, Charlie
        [coordToKey(3, 0)]: { value: 'Sales', dataType: 'string' },
        [coordToKey(3, 1)]: { value: 75000, dataType: 'number' },
        [coordToKey(3, 2)]: { value: 'Charlie', dataType: 'string' },
        // Row 4: Eng, 120k, Diana
        [coordToKey(4, 0)]: { value: 'Eng', dataType: 'string' },
        [coordToKey(4, 1)]: { value: 120000, dataType: 'number' },
        [coordToKey(4, 2)]: { value: 'Diana', dataType: 'string' },
      };

      const config: SortConfig = {
        range: { startRow: 0, startCol: 0, endRow: 4, endCol: 2 },
        levels: [
          { col: 0, direction: 'asc' }, // Dept asc: Eng, then Sales
          { col: 1, direction: 'desc' } // Salary desc: 120k, 90k; 75k, 50k
        ],
        hasHeaders: true
      };

      const sorted = sortRange(cells, config);

      // Row 1: Eng, Diana (120k)
      expect(sorted[coordToKey(1, 0)]?.value).toBe('Eng');
      expect(sorted[coordToKey(1, 2)]?.value).toBe('Diana');

      // Row 2: Eng, Bob (90k)
      expect(sorted[coordToKey(2, 0)]?.value).toBe('Eng');
      expect(sorted[coordToKey(2, 2)]?.value).toBe('Bob');

      // Row 3: Sales, Charlie (75k)
      expect(sorted[coordToKey(3, 0)]?.value).toBe('Sales');
      expect(sorted[coordToKey(3, 2)]?.value).toBe('Charlie');

      // Row 4: Sales, Alice (50k)
      expect(sorted[coordToKey(4, 0)]?.value).toBe('Sales');
      expect(sorted[coordToKey(4, 2)]?.value).toBe('Alice');
    });

    it('preserves cell formatting and formulas during sort', () => {
      const cells: SparseCellMap = {
        [coordToKey(0, 0)]: { value: 20, dataType: 'number', style: { bold: true } },
        [coordToKey(0, 1)]: { value: 100, formula: '=A1*5', dataType: 'number' },
        [coordToKey(1, 0)]: { value: 10, dataType: 'number', style: { italic: true } },
        [coordToKey(1, 1)]: { value: 50, formula: '=A2*5', dataType: 'number' }
      };

      const config: SortConfig = {
        range: { startRow: 0, startCol: 0, endRow: 1, endCol: 1 },
        levels: [{ col: 0, direction: 'asc' }],
        hasHeaders: false
      };

      const sorted = sortRange(cells, config);

      // Row 0 is now 10 (italic) with relative formula adjusted to row 1 (=A1*5)
      expect(sorted[coordToKey(0, 0)]?.value).toBe(10);
      expect(sorted[coordToKey(0, 0)]?.style?.italic).toBe(true);
      expect(sorted[coordToKey(0, 1)]?.formula).toBe('=A1*5');

      // Row 1 is now 20 (bold) with relative formula adjusted to row 2 (=A2*5)
      expect(sorted[coordToKey(1, 0)]?.value).toBe(20);
      expect(sorted[coordToKey(1, 0)]?.style?.bold).toBe(true);
      expect(sorted[coordToKey(1, 1)]?.formula).toBe('=A2*5');
    });
  });
});
