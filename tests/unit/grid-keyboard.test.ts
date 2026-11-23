import { describe, it, expect } from 'vitest';
import { handleGridKeyboardNavigation } from '@/engine/grid/keyboard';

describe('Grid Keyboard Navigation', () => {
  const baseParams = {
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    activeCell: { row: 5, col: 5 },
    anchorCell: { row: 5, col: 5 },
    selectedRange: { startRow: 5, startCol: 5, endRow: 5, endCol: 5 },
    rowCount: 100,
    colCount: 26
  };

  it('navigates with single arrow keys', () => {
    // ArrowUp
    const up = handleGridKeyboardNavigation({ ...baseParams, key: 'ArrowUp' });
    expect(up?.nextActiveCell).toEqual({ row: 4, col: 5 });
    expect(up?.nextSelectedRange).toEqual({ startRow: 4, startCol: 5, endRow: 4, endCol: 5 });

    // ArrowDown
    const down = handleGridKeyboardNavigation({ ...baseParams, key: 'ArrowDown' });
    expect(down?.nextActiveCell).toEqual({ row: 6, col: 5 });

    // ArrowLeft
    const left = handleGridKeyboardNavigation({ ...baseParams, key: 'ArrowLeft' });
    expect(left?.nextActiveCell).toEqual({ row: 5, col: 4 });

    // ArrowRight
    const right = handleGridKeyboardNavigation({ ...baseParams, key: 'ArrowRight' });
    expect(right?.nextActiveCell).toEqual({ row: 5, col: 6 });
  });

  it('clamps navigation at grid boundaries', () => {
    // Cannot move above row 0
    const top = handleGridKeyboardNavigation({
      ...baseParams,
      activeCell: { row: 0, col: 0 },
      key: 'ArrowUp'
    });
    expect(top?.nextActiveCell).toEqual({ row: 0, col: 0 });

    // Cannot move left of col 0
    const left = handleGridKeyboardNavigation({
      ...baseParams,
      activeCell: { row: 0, col: 0 },
      key: 'ArrowLeft'
    });
    expect(left?.nextActiveCell).toEqual({ row: 0, col: 0 });

    // Cannot move beyond rowCount - 1
    const bottom = handleGridKeyboardNavigation({
      ...baseParams,
      activeCell: { row: 99, col: 25 },
      key: 'ArrowDown'
    });
    expect(bottom?.nextActiveCell).toEqual({ row: 99, col: 25 });
  });

  it('expands range when Shift + Arrow is used', () => {
    const shiftRight = handleGridKeyboardNavigation({
      ...baseParams,
      key: 'ArrowRight',
      shiftKey: true
    });

    expect(shiftRight?.nextActiveCell).toEqual({ row: 5, col: 6 });
    expect(shiftRight?.nextAnchorCell).toEqual({ row: 5, col: 5 });
    expect(shiftRight?.nextSelectedRange).toEqual({
      startRow: 5,
      startCol: 5,
      endRow: 5,
      endCol: 6
    });

    // Expanding diagonally
    const shiftDown = handleGridKeyboardNavigation({
      ...baseParams,
      activeCell: { row: 5, col: 6 },
      anchorCell: { row: 5, col: 5 },
      key: 'ArrowDown',
      shiftKey: true
    });

    expect(shiftDown?.nextSelectedRange).toEqual({
      startRow: 5,
      startCol: 5,
      endRow: 6,
      endCol: 6
    });
  });

  it('navigates with Tab and Enter', () => {
    // Tab moves right
    const tab = handleGridKeyboardNavigation({ ...baseParams, key: 'Tab' });
    expect(tab?.nextActiveCell).toEqual({ row: 5, col: 6 });

    // Shift+Tab moves left
    const shiftTab = handleGridKeyboardNavigation({ ...baseParams, key: 'Tab', shiftKey: true });
    expect(shiftTab?.nextActiveCell).toEqual({ row: 5, col: 4 });

    // Enter moves down
    const enter = handleGridKeyboardNavigation({ ...baseParams, key: 'Enter' });
    expect(enter?.nextActiveCell).toEqual({ row: 6, col: 5 });

    // Shift+Enter moves up
    const shiftEnter = handleGridKeyboardNavigation({ ...baseParams, key: 'Enter', shiftKey: true });
    expect(shiftEnter?.nextActiveCell).toEqual({ row: 4, col: 5 });
  });

  it('jumps with Home, End, Ctrl+Home, Ctrl+End', () => {
    // Home jumps to column 0 on same row
    const home = handleGridKeyboardNavigation({ ...baseParams, key: 'Home' });
    expect(home?.nextActiveCell).toEqual({ row: 5, col: 0 });

    // End jumps to last column on same row
    const end = handleGridKeyboardNavigation({ ...baseParams, key: 'End' });
    expect(end?.nextActiveCell).toEqual({ row: 5, col: 25 });

    // Ctrl+Home jumps to A1 (row 0, col 0)
    const ctrlHome = handleGridKeyboardNavigation({ ...baseParams, key: 'Home', ctrlKey: true });
    expect(ctrlHome?.nextActiveCell).toEqual({ row: 0, col: 0 });

    // Ctrl+End jumps to max used coordinate or last cell
    const ctrlEnd = handleGridKeyboardNavigation({
      ...baseParams,
      key: 'End',
      ctrlKey: true,
      maxUsedCoord: { row: 12, col: 8 }
    });
    expect(ctrlEnd?.nextActiveCell).toEqual({ row: 12, col: 8 });
  });

  it('returns null for non-navigation keys', () => {
    expect(handleGridKeyboardNavigation({ ...baseParams, key: 'a' })).toBeNull();
    expect(handleGridKeyboardNavigation({ ...baseParams, key: '1' })).toBeNull();
    expect(handleGridKeyboardNavigation({ ...baseParams, key: 'Escape' })).toBeNull();
  });
});
