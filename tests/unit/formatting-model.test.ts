import { describe, it, expect } from 'vitest';
import { SparseCellMap, CellRange } from '@/types/cell';
import {
  applyStyleToRange,
  clearFormattingFromRange
} from '@/engine/formatting/range-formatting';
import { coordToKey } from '@/utils/coordinates';

describe('Cell Formatting Data Model & Range Operations', () => {
  it('applies font styling, colors, and alignments to existing cells', () => {
    const cells: SparseCellMap = {
      '0:0': { value: 'Hello', dataType: 'string' }
    };

    const range: CellRange = { startRow: 0, startCol: 0, endRow: 0, endCol: 0 };
    const updated = applyStyleToRange(cells, range, {
      fontFamily: 'Arial, sans-serif',
      fontSize: 14,
      bold: true,
      italic: true,
      textColor: '#2563eb',
      backgroundColor: '#f1f5f9',
      horizontalAlignment: 'center',
      verticalAlignment: 'top',
      wrapText: true
    });

    const styledCell = updated['0:0'];
    expect(styledCell).toBeDefined();
    expect(styledCell?.value).toBe('Hello'); // Value preserved
    expect(styledCell?.style?.fontFamily).toBe('Arial, sans-serif');
    expect(styledCell?.style?.fontSize).toBe(14);
    expect(styledCell?.style?.bold).toBe(true);
    expect(styledCell?.style?.italic).toBe(true);
    expect(styledCell?.style?.textColor).toBe('#2563eb');
    expect(styledCell?.style?.backgroundColor).toBe('#f1f5f9');
    expect(styledCell?.style?.horizontalAlignment).toBe('center');
    expect(styledCell?.style?.verticalAlignment).toBe('top');
    expect(styledCell?.style?.wrapText).toBe(true);
  });

  it('materializes sparse cells when formatting empty grid coordinates', () => {
    const emptyCells: SparseCellMap = {};
    const range: CellRange = { startRow: 2, startCol: 3, endRow: 2, endCol: 3 };

    const updated = applyStyleToRange(emptyCells, range, {
      bold: true,
      backgroundColor: '#fef3c7'
    });

    const cellKey = coordToKey(2, 3);
    expect(updated[cellKey]).toBeDefined();
    expect(updated[cellKey]?.value).toBeNull();
    expect(updated[cellKey]?.dataType).toBe('empty');
    expect(updated[cellKey]?.style?.bold).toBe(true);
    expect(updated[cellKey]?.style?.backgroundColor).toBe('#fef3c7');
  });

  it('preserves existing unmentioned style properties when updating styles', () => {
    const cells: SparseCellMap = {
      '0:0': {
        value: 100,
        dataType: 'number',
        style: {
          bold: true,
          fontFamily: 'Georgia, serif',
          textColor: '#10b981'
        }
      }
    };

    const range: CellRange = { startRow: 0, startCol: 0, endRow: 0, endCol: 0 };
    const updated = applyStyleToRange(cells, range, {
      italic: true,
      fontSize: 16
    });

    const style = updated['0:0']?.style;
    expect(style?.bold).toBe(true); // Preserved
    expect(style?.fontFamily).toBe('Georgia, serif'); // Preserved
    expect(style?.textColor).toBe('#10b981'); // Preserved
    expect(style?.italic).toBe(true); // Added
    expect(style?.fontSize).toBe(16); // Added
  });

  it('formats entire rectangular multi-cell ranges', () => {
    const cells: SparseCellMap = {
      '0:0': { value: 'A1', dataType: 'string' },
      '1:1': { value: 'B2', dataType: 'string' }
    };

    const range: CellRange = { startRow: 0, startCol: 0, endRow: 1, endCol: 1 };
    const updated = applyStyleToRange(cells, range, { bold: true });

    // 0:0, 0:1, 1:0, 1:1 should all have bold: true
    expect(updated['0:0']?.style?.bold).toBe(true);
    expect(updated['0:1']?.style?.bold).toBe(true);
    expect(updated['1:0']?.style?.bold).toBe(true);
    expect(updated['1:1']?.style?.bold).toBe(true);
  });

  it('clears formatting from range while preserving values, formulas, and pruning empty cells', () => {
    const cells: SparseCellMap = {
      '0:0': {
        value: 'Important',
        formula: '=A2',
        dataType: 'formula',
        style: { bold: true, backgroundColor: '#ef4444' }
      },
      '0:1': {
        value: null,
        dataType: 'empty',
        style: { backgroundColor: '#fef3c7' }
      }
    };

    const range: CellRange = { startRow: 0, startCol: 0, endRow: 0, endCol: 1 };
    const cleared = clearFormattingFromRange(cells, range);

    // Populated cell preserves content and loses style
    expect(cleared['0:0']).toBeDefined();
    expect(cleared['0:0']?.value).toBe('Important');
    expect(cleared['0:0']?.formula).toBe('=A2');
    expect(cleared['0:0']?.style).toBeUndefined();

    // Empty cell that only had formatting is pruned from sparse map
    expect(cleared['0:1']).toBeUndefined();
  });
});
