import { describe, it, expect } from 'vitest';
import { calculateSelectionStatistics } from '@/engine/grid/selection-stats';
import { SparseCellMap } from '@/types/cell';

describe('Selection Statistics Engine (Stage 14)', () => {
  it('returns zero stats when range and activeCell are null', () => {
    const stats = calculateSelectionStatistics(null, null, {});
    expect(stats.cellCount).toBe(0);
    expect(stats.numericCount).toBe(0);
    expect(stats.sum).toBe(0);
    expect(stats.average).toBe(0);
    expect(stats.hasNumbers).toBe(false);
  });

  it('calculates single cell statistics correctly', () => {
    const cells: SparseCellMap = {
      '0:0': { value: 42, dataType: 'number' }
    };
    const stats = calculateSelectionStatistics(
      { startRow: 0, startCol: 0, endRow: 0, endCol: 0 },
      { row: 0, col: 0 },
      cells
    );
    expect(stats.cellCount).toBe(1);
    expect(stats.numericCount).toBe(1);
    expect(stats.sum).toBe(42);
    expect(stats.average).toBe(42);
    expect(stats.min).toBe(42);
    expect(stats.max).toBe(42);
    expect(stats.hasNumbers).toBe(true);
  });

  it('calculates multi-cell range stats with mixed values (numbers, strings, empty)', () => {
    const cells: SparseCellMap = {
      '0:0': { value: 10, dataType: 'number' },
      '0:1': { value: 20, dataType: 'number' },
      '1:0': { value: 'Product Name', dataType: 'string' }, // Non-numeric string
      '1:1': { value: 30, dataType: 'number' },
      '2:0': { value: null, dataType: 'empty' },          // Empty
      '2:1': { value: 40, dataType: 'number' }
    };
    // 3 rows x 2 columns = 6 cells
    const range = { startRow: 0, startCol: 0, endRow: 2, endCol: 1 };
    const stats = calculateSelectionStatistics(range, { row: 0, col: 0 }, cells);

    expect(stats.cellCount).toBe(6);
    expect(stats.numericCount).toBe(4); // 10, 20, 30, 40
    expect(stats.sum).toBe(100);
    expect(stats.average).toBe(25);
    expect(stats.min).toBe(10);
    expect(stats.max).toBe(40);
    expect(stats.hasNumbers).toBe(true);
  });

  it('handles inverted ranges (dragged bottom-right to top-left)', () => {
    const cells: SparseCellMap = {
      '1:1': { value: 100, dataType: 'number' },
      '2:2': { value: 200, dataType: 'number' }
    };
    const range = { startRow: 3, startCol: 3, endRow: 1, endCol: 1 };
    const stats = calculateSelectionStatistics(range, { row: 1, col: 1 }, cells);

    expect(stats.cellCount).toBe(9); // (3 - 1 + 1) * (3 - 1 + 1) = 9
    expect(stats.numericCount).toBe(2);
    expect(stats.sum).toBe(300);
    expect(stats.average).toBe(150);
    expect(stats.min).toBe(100);
    expect(stats.max).toBe(200);
  });

  it('calculates stats on large sparse selections efficiently without iterating empty cells', () => {
    const cells: SparseCellMap = {
      '50:50': { value: 500, dataType: 'number' },
      '99:99': { value: 1500, dataType: 'number' }
    };
    // 1000 rows x 1000 cols = 1,000,000 cells
    const range = { startRow: 0, startCol: 0, endRow: 999, endCol: 999 };
    const stats = calculateSelectionStatistics(range, { row: 0, col: 0 }, cells);

    expect(stats.cellCount).toBe(1000000);
    expect(stats.numericCount).toBe(2);
    expect(stats.sum).toBe(2000);
    expect(stats.average).toBe(1000);
    expect(stats.min).toBe(500);
    expect(stats.max).toBe(1500);
  });
});
