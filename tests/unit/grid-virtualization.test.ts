import { describe, it, expect } from 'vitest';
import { GridVirtualizer } from '@/engine/grid/virtualizer';

describe('Grid Virtualizer & Viewport Calculations', () => {
  it('computes uniform row offsets and total dimensions accurately', () => {
    // 100 rows, 20 columns, default 28px height, 100px width
    const virtualizer = new GridVirtualizer(100, 20);

    expect(virtualizer.getRowHeight(0)).toBe(28);
    expect(virtualizer.getColWidth(0)).toBe(100);

    expect(virtualizer.getRowOffset(0)).toBe(0);
    expect(virtualizer.getRowOffset(1)).toBe(28);
    expect(virtualizer.getRowOffset(10)).toBe(280);

    expect(virtualizer.getColOffset(0)).toBe(0);
    expect(virtualizer.getColOffset(1)).toBe(100);
    expect(virtualizer.getColOffset(5)).toBe(500);

    expect(virtualizer.getTotalHeight()).toBe(2800);
    expect(virtualizer.getTotalWidth()).toBe(2000);
  });

  it('handles custom row heights and custom column widths', () => {
    const customHeights = { 0: 50, 2: 70 };
    const customWidths = { 1: 150, 4: 200 };

    const virtualizer = new GridVirtualizer(10, 10, customHeights, customWidths);

    expect(virtualizer.getRowHeight(0)).toBe(50);
    expect(virtualizer.getRowHeight(1)).toBe(28); // default
    expect(virtualizer.getRowHeight(2)).toBe(70);

    // Row offsets
    expect(virtualizer.getRowOffset(0)).toBe(0);
    expect(virtualizer.getRowOffset(1)).toBe(50);
    expect(virtualizer.getRowOffset(2)).toBe(78); // 50 + 28
    expect(virtualizer.getRowOffset(3)).toBe(148); // 78 + 70

    // Col offsets
    expect(virtualizer.getColWidth(0)).toBe(100);
    expect(virtualizer.getColWidth(1)).toBe(150);
    expect(virtualizer.getColOffset(0)).toBe(0);
    expect(virtualizer.getColOffset(1)).toBe(100);
    expect(virtualizer.getColOffset(2)).toBe(250); // 100 + 150
  });

  it('performs binary search to find row and col index at pixel coordinates', () => {
    const virtualizer = new GridVirtualizer(1000, 100);

    // Row 0 is [0, 28)
    expect(virtualizer.getRowIndexAtY(0)).toBe(0);
    expect(virtualizer.getRowIndexAtY(27)).toBe(0);
    expect(virtualizer.getRowIndexAtY(28)).toBe(1);
    expect(virtualizer.getRowIndexAtY(280)).toBe(10);
    expect(virtualizer.getRowIndexAtY(2800)).toBe(100);

    // Column 0 is [0, 100)
    expect(virtualizer.getColIndexAtX(0)).toBe(0);
    expect(virtualizer.getColIndexAtX(99)).toBe(0);
    expect(virtualizer.getColIndexAtX(100)).toBe(1);
    expect(virtualizer.getColIndexAtX(550)).toBe(5);
  });

  it('calculates visible viewport with overscan', () => {
    const virtualizer = new GridVirtualizer(1000, 100);
    const viewport = virtualizer.computeVisibleRange(
      560, // scrollTop (row 20)
      300, // scrollLeft (col 3)
      800, // width
      600, // height
      1.0
    );

    // Row 20 to approx Row 41, plus overscan of 6 rows
    expect(viewport.startRow).toBeLessThanOrEqual(20);
    expect(viewport.startRow).toBe(14); // 20 - 6
    expect(viewport.endRow).toBeGreaterThanOrEqual(41);

    // Col 3 to approx Col 11, plus overscan of 4 cols
    expect(viewport.startCol).toBe(0); // 3 - 4 clamped to 0
    expect(viewport.endCol).toBeGreaterThanOrEqual(11);
  });

  it('scales dimensions and offsets when zoom is applied', () => {
    const virtualizer = new GridVirtualizer(10, 10);

    // At 50% zoom
    expect(virtualizer.getRowHeight(0, 0.5)).toBe(14);
    expect(virtualizer.getColWidth(0, 0.5)).toBe(50);
    expect(virtualizer.getTotalHeight(0.5)).toBe(140);
    expect(virtualizer.getTotalWidth(0.5)).toBe(500);

    // At 150% zoom
    expect(virtualizer.getRowHeight(0, 1.5)).toBe(42);
    expect(virtualizer.getColWidth(0, 1.5)).toBe(150);
    expect(virtualizer.getTotalHeight(1.5)).toBe(420);
    expect(virtualizer.getTotalWidth(1.5)).toBe(1500);
  });

  it('calculates bounding pixel rectangle for single cell and multi-cell range', () => {
    const virtualizer = new GridVirtualizer(100, 20);

    // Cell at row 2, col 3 (y = 56, x = 300, w = 100, h = 28)
    const cellRect = virtualizer.getCellRect(2, 3);
    expect(cellRect).toEqual({ x: 300, y: 56, width: 100, height: 28 });

    // Range from (1, 1) to (3, 2)
    // Rows 1, 2, 3 -> y = 28, height = 3 * 28 = 84
    // Cols 1, 2 -> x = 100, width = 2 * 100 = 200
    const rangeRect = virtualizer.getRangeRect({
      startRow: 1,
      startCol: 1,
      endRow: 3,
      endCol: 2
    });
    expect(rangeRect).toEqual({ x: 100, y: 28, width: 200, height: 84 });
  });
});
