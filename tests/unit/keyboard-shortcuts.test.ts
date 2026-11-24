import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SHORTCUTS,
  matchShortcut,
  getShortcutDisplay
} from '@/engine/shortcuts';
import { handleGridKeyboardNavigation } from '@/engine/grid/keyboard';
import { SparseCellMap } from '@/types/cell';

describe('Keyboard Shortcuts & Navigation Engine (Stage 14)', () => {
  it('registers comprehensive shortcut definitions across all expected categories', () => {
    expect(DEFAULT_SHORTCUTS.length).toBeGreaterThanOrEqual(18);

    const categories = new Set(DEFAULT_SHORTCUTS.map((s) => s.category));
    expect(categories.has('workbook')).toBe(true);
    expect(categories.has('editing')).toBe(true);
    expect(categories.has('navigation')).toBe(true);
    expect(categories.has('formatting')).toBe(true);
    expect(categories.has('help')).toBe(true);
  });

  it('retrieves shortcut display strings correctly', () => {
    expect(getShortcutDisplay('save')).toBe('Ctrl + S');
    expect(getShortcutDisplay('undo')).toBe('Ctrl + Z');
    expect(getShortcutDisplay('command_palette')).toBe('Ctrl + Shift + P');
    expect(getShortcutDisplay('insert_date')).toBe('Ctrl + ;');
    expect(getShortcutDisplay('insert_time')).toBe('Ctrl + Shift + ;');
  });

  it('accurately matches shortcut key combinations', () => {
    const saveDef = DEFAULT_SHORTCUTS.find((s) => s.id === 'save')!;
    expect(
      matchShortcut(saveDef, {
        key: 's',
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false
      })
    ).toBe(true);

    // False if Ctrl is missing
    expect(
      matchShortcut(saveDef, {
        key: 's',
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false
      })
    ).toBe(false);

    // False if key differs
    expect(
      matchShortcut(saveDef, {
        key: 'x',
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false
      })
    ).toBe(false);

    const paletteDef = DEFAULT_SHORTCUTS.find((s) => s.id === 'command_palette')!;
    expect(
      matchShortcut(paletteDef, {
        key: 'p',
        ctrlKey: true,
        metaKey: false,
        shiftKey: true,
        altKey: false
      })
    ).toBe(true);
  });

  it('handles standard grid arrow navigation (ArrowDown, ArrowUp, ArrowRight, ArrowLeft)', () => {
    const resDown = handleGridKeyboardNavigation({
      key: 'ArrowDown',
      shiftKey: false,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      activeCell: { row: 5, col: 5 },
      anchorCell: { row: 5, col: 5 },
      selectedRange: { startRow: 5, startCol: 5, endRow: 5, endCol: 5 },
      rowCount: 100,
      colCount: 26
    });

    expect(resDown?.nextActiveCell).toEqual({ row: 6, col: 5 });
    expect(resDown?.nextSelectedRange).toEqual({ startRow: 6, startCol: 5, endRow: 6, endCol: 5 });

    const resRight = handleGridKeyboardNavigation({
      key: 'ArrowRight',
      shiftKey: false,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      activeCell: { row: 5, col: 5 },
      anchorCell: { row: 5, col: 5 },
      selectedRange: { startRow: 5, startCol: 5, endRow: 5, endCol: 5 },
      rowCount: 100,
      colCount: 26
    });

    expect(resRight?.nextActiveCell).toEqual({ row: 5, col: 6 });
  });

  it('handles Shift + Arrow range selection expansion without shifting anchor', () => {
    const resShiftRight = handleGridKeyboardNavigation({
      key: 'ArrowRight',
      shiftKey: true,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      activeCell: { row: 2, col: 2 },
      anchorCell: { row: 2, col: 2 },
      selectedRange: { startRow: 2, startCol: 2, endRow: 2, endCol: 2 },
      rowCount: 100,
      colCount: 26
    });

    expect(resShiftRight?.nextActiveCell).toEqual({ row: 2, col: 3 });
    expect(resShiftRight?.nextAnchorCell).toEqual({ row: 2, col: 2 });
    expect(resShiftRight?.nextSelectedRange).toEqual({ startRow: 2, startCol: 2, endRow: 2, endCol: 3 });
  });

  it('handles Home and Ctrl+Home navigation (navigates to cell A1)', () => {
    const resCtrlHome = handleGridKeyboardNavigation({
      key: 'Home',
      shiftKey: false,
      ctrlKey: true,
      metaKey: false,
      altKey: false,
      activeCell: { row: 50, col: 12 },
      anchorCell: { row: 50, col: 12 },
      selectedRange: { startRow: 50, startCol: 12, endRow: 50, endCol: 12 },
      rowCount: 100,
      colCount: 26
    });

    expect(resCtrlHome?.nextActiveCell).toEqual({ row: 0, col: 0 });
  });

  it('handles Ctrl + Arrow jumping to data block edge', () => {
    // Continuous block from row 2 to row 5 in column 1
    const cells: SparseCellMap = {
      '2:1': { value: 'Item 1', dataType: 'string' },
      '3:1': { value: 'Item 2', dataType: 'string' },
      '4:1': { value: 'Item 3', dataType: 'string' },
      '5:1': { value: 'Item 4', dataType: 'string' },
      // Empty rows 6..9
      '10:1': { value: 'Next Block', dataType: 'string' }
    };

    // Starting at row 2, pressing Ctrl+Down should jump to the last contiguous filled cell (row 5)
    const resJumpBlock = handleGridKeyboardNavigation({
      key: 'ArrowDown',
      shiftKey: false,
      ctrlKey: true,
      metaKey: false,
      altKey: false,
      activeCell: { row: 2, col: 1 },
      anchorCell: { row: 2, col: 1 },
      selectedRange: { startRow: 2, startCol: 1, endRow: 2, endCol: 1 },
      rowCount: 100,
      colCount: 26,
      cells
    });

    expect(resJumpBlock?.nextActiveCell).toEqual({ row: 5, col: 1 });

    // Starting at row 5, pressing Ctrl+Down should jump across the empty space to next block (row 10)
    const resJumpGap = handleGridKeyboardNavigation({
      key: 'ArrowDown',
      shiftKey: false,
      ctrlKey: true,
      metaKey: false,
      altKey: false,
      activeCell: { row: 5, col: 1 },
      anchorCell: { row: 5, col: 1 },
      selectedRange: { startRow: 5, startCol: 1, endRow: 5, endCol: 1 },
      rowCount: 100,
      colCount: 26,
      cells
    });

    expect(resJumpGap?.nextActiveCell).toEqual({ row: 10, col: 1 });
  });
});
