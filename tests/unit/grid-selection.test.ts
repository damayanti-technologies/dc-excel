import { describe, it, expect } from 'vitest';
import {
  normalizeRange,
  createRange,
  isCellInRange,
  isCellActive,
  isSingleCell,
  getRangeDimensions,
  formatRangeLabel,
  isHeaderHighlighted
} from '@/engine/grid/selection';

describe('Grid Selection Engine', () => {
  it('creates normalized ranges regardless of drag direction', () => {
    // Direct normalizeRange
    const norm = normalizeRange({ startRow: 5, startCol: 8, endRow: 2, endCol: 3 });
    expect(norm).toEqual({ startRow: 2, startCol: 3, endRow: 5, endCol: 8 });

    // Top-left to bottom-right
    const r1 = createRange({ row: 0, col: 0 }, { row: 4, col: 3 });
    expect(r1).toEqual({ startRow: 0, startCol: 0, endRow: 4, endCol: 3 });

    // Bottom-right to top-left
    const r2 = createRange({ row: 4, col: 3 }, { row: 0, col: 0 });
    expect(r2).toEqual({ startRow: 0, startCol: 0, endRow: 4, endCol: 3 });

    // Top-right to bottom-left
    const r3 = createRange({ row: 1, col: 5 }, { row: 3, col: 2 });
    expect(r3).toEqual({ startRow: 1, startCol: 2, endRow: 3, endCol: 5 });
  });

  it('determines whether cell is within range', () => {
    const range = { startRow: 1, startCol: 1, endRow: 3, endCol: 4 };

    expect(isCellInRange({ row: 1, col: 1 }, range)).toBe(true);
    expect(isCellInRange({ row: 2, col: 3 }, range)).toBe(true);
    expect(isCellInRange({ row: 3, col: 4 }, range)).toBe(true);

    expect(isCellInRange({ row: 0, col: 1 }, range)).toBe(false);
    expect(isCellInRange({ row: 4, col: 2 }, range)).toBe(false);
    expect(isCellInRange({ row: 2, col: 5 }, range)).toBe(false);
    expect(isCellInRange({ row: 1, col: 1 }, null)).toBe(false);
  });

  it('identifies single cell vs multi-cell range', () => {
    expect(isSingleCell({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 })).toBe(true);
    expect(isSingleCell({ startRow: 4, startCol: 2, endRow: 4, endCol: 2 })).toBe(true);
    expect(isSingleCell({ startRow: 0, startCol: 0, endRow: 1, endCol: 0 })).toBe(false);
    expect(isSingleCell({ startRow: 0, startCol: 0, endRow: 0, endCol: 1 })).toBe(false);
    expect(isSingleCell(null)).toBe(false);
  });

  it('calculates range dimension rows and columns', () => {
    const range = { startRow: 2, startCol: 1, endRow: 5, endCol: 4 };
    const dims = getRangeDimensions(range);
    expect(dims).toEqual({ rows: 4, cols: 4 });
  });

  it('formats range labels correctly for display', () => {
    // Single cell
    expect(formatRangeLabel({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 })).toBe('A1');
    expect(formatRangeLabel({ startRow: 9, startCol: 2, endRow: 9, endCol: 2 })).toBe('C10');

    // Range static
    expect(formatRangeLabel({ startRow: 0, startCol: 0, endRow: 4, endCol: 2 })).toBe('A1:C5');

    // Range while dragging
    expect(formatRangeLabel({ startRow: 0, startCol: 0, endRow: 4, endCol: 2 }, true)).toBe('5R × 3C');
  });

  it('highlights corresponding row and column headers in selection', () => {
    const range = { startRow: 2, startCol: 1, endRow: 4, endCol: 3 };

    // Rows: 2, 3, 4 should be highlighted
    expect(isHeaderHighlighted(1, range, 'row')).toBe(false);
    expect(isHeaderHighlighted(2, range, 'row')).toBe(true);
    expect(isHeaderHighlighted(3, range, 'row')).toBe(true);
    expect(isHeaderHighlighted(4, range, 'row')).toBe(true);
    expect(isHeaderHighlighted(5, range, 'row')).toBe(false);

    // Columns: 1, 2, 3 should be highlighted (B, C, D)
    expect(isHeaderHighlighted(0, range, 'col')).toBe(false);
    expect(isHeaderHighlighted(1, range, 'col')).toBe(true);
    expect(isHeaderHighlighted(2, range, 'col')).toBe(true);
    expect(isHeaderHighlighted(3, range, 'col')).toBe(true);
    expect(isHeaderHighlighted(4, range, 'col')).toBe(false);
  });

  it('checks active cell equality', () => {
    expect(isCellActive({ row: 1, col: 2 }, { row: 1, col: 2 })).toBe(true);
    expect(isCellActive({ row: 1, col: 2 }, { row: 1, col: 3 })).toBe(false);
    expect(isCellActive({ row: 1, col: 2 }, null)).toBe(false);
  });
});
