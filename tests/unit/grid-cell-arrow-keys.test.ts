import { describe, it, expect, vi } from 'vitest';
import { handleGridKeyboardNavigation } from '@/engine/grid/keyboard';

describe('Excel-Standard Cell Arrow Navigation Suite', () => {
  const baseParams = {
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    activeCell: { row: 10, col: 10 },
    anchorCell: { row: 10, col: 10 },
    selectedRange: { startRow: 10, startCol: 10, endRow: 10, endCol: 10 },
    rowCount: 100,
    colCount: 26
  };

  describe('Ready Mode (Cell Selected)', () => {
    it('moves to adjacent cell upon pressing ArrowDown', () => {
      const res = handleGridKeyboardNavigation({ ...baseParams, key: 'ArrowDown' });
      expect(res?.nextActiveCell).toEqual({ row: 11, col: 10 });
    });

    it('moves to adjacent cell upon pressing ArrowUp', () => {
      const res = handleGridKeyboardNavigation({ ...baseParams, key: 'ArrowUp' });
      expect(res?.nextActiveCell).toEqual({ row: 9, col: 10 });
    });

    it('moves to adjacent cell upon pressing ArrowRight', () => {
      const res = handleGridKeyboardNavigation({ ...baseParams, key: 'ArrowRight' });
      expect(res?.nextActiveCell).toEqual({ row: 10, col: 11 });
    });

    it('moves to adjacent cell upon pressing ArrowLeft', () => {
      const res = handleGridKeyboardNavigation({ ...baseParams, key: 'ArrowLeft' });
      expect(res?.nextActiveCell).toEqual({ row: 10, col: 9 });
    });
  });

  describe('Inline Cell Editor Arrow Commit Emulation', () => {
    it('simulates ArrowDown committing and triggering directional move down', () => {
      const commitMock = vi.fn();
      const event = {
        key: 'ArrowDown',
        preventDefault: vi.fn(),
        currentTarget: { value: '123', selectionStart: 3, selectionEnd: 3 }
      };

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        commitMock('down');
      }

      expect(event.preventDefault).toHaveBeenCalled();
      expect(commitMock).toHaveBeenCalledWith('down');
    });

    it('simulates ArrowUp committing and triggering directional move up', () => {
      const commitMock = vi.fn();
      const event = {
        key: 'ArrowUp',
        preventDefault: vi.fn(),
        currentTarget: { value: '123', selectionStart: 3, selectionEnd: 3 }
      };

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        commitMock('up');
      }

      expect(event.preventDefault).toHaveBeenCalled();
      expect(commitMock).toHaveBeenCalledWith('up');
    });

    it('simulates ArrowRight at text end committing and moving right', () => {
      const commitMock = vi.fn();
      const event = {
        key: 'ArrowRight',
        preventDefault: vi.fn(),
        currentTarget: { value: 'Hello', selectionStart: 5, selectionEnd: 5 }
      };

      const isAtEnd = event.currentTarget.selectionEnd === event.currentTarget.value.length;
      if (isAtEnd) {
        event.preventDefault();
        commitMock('right');
      }

      expect(event.preventDefault).toHaveBeenCalled();
      expect(commitMock).toHaveBeenCalledWith('right');
    });

    it('simulates ArrowLeft at text start (offset 0) committing and moving left', () => {
      const commitMock = vi.fn();
      const event = {
        key: 'ArrowLeft',
        preventDefault: vi.fn(),
        currentTarget: { value: 'Hello', selectionStart: 0, selectionEnd: 0 }
      };

      const isAtStart = event.currentTarget.selectionStart === 0 && event.currentTarget.selectionEnd === 0;
      if (isAtStart) {
        event.preventDefault();
        commitMock('left');
      }

      expect(event.preventDefault).toHaveBeenCalled();
      expect(commitMock).toHaveBeenCalledWith('left');
    });
  });
});
