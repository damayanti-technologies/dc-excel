import { describe, it, expect } from 'vitest';
import { BUILT_IN_CELL_STYLES } from '@/engine/formatting/constants';
import { applyStyleToRange, clearFormattingFromRange } from '@/engine/formatting/range-formatting';
import { SparseCellMap, CellRange } from '@/types/cell';

describe('Built-in Cell Styles Presets', () => {
  it('contains all standard expected style presets', () => {
    const ids = BUILT_IN_CELL_STYLES.map((s) => s.id);
    expect(ids).toContain('normal');
    expect(ids).toContain('title');
    expect(ids).toContain('heading-1');
    expect(ids).toContain('heading-2');
    expect(ids).toContain('total');
    expect(ids).toContain('good');
    expect(ids).toContain('bad');
    expect(ids).toContain('warning');
    expect(ids).toContain('accent-header');
  });

  it('applies "Title" preset correctly to a cell range', () => {
    const titlePreset = BUILT_IN_CELL_STYLES.find((s) => s.id === 'title')!;
    expect(titlePreset).toBeDefined();

    const cells: SparseCellMap = {
      '0:0': { value: 'Financial Overview', dataType: 'string' }
    };
    const range: CellRange = { startRow: 0, startCol: 0, endRow: 0, endCol: 0 };

    const updated = applyStyleToRange(cells, range, titlePreset.style);
    const cell = updated['0:0'];
    expect(cell?.value).toBe('Financial Overview');
    expect(cell?.style?.fontSize).toBe(18);
    expect(cell?.style?.bold).toBe(true);
    expect(cell?.style?.textColor).toBe('#0f172a');
    expect(cell?.style?.borders?.bottom?.style).toBe('thick');
  });

  it('applies "Good", "Bad", and "Warning" status styles', () => {
    const goodPreset = BUILT_IN_CELL_STYLES.find((s) => s.id === 'good')!;
    const badPreset = BUILT_IN_CELL_STYLES.find((s) => s.id === 'bad')!;
    const warningPreset = BUILT_IN_CELL_STYLES.find((s) => s.id === 'warning')!;

    let cells: SparseCellMap = {
      '1:0': { value: 'Pass', dataType: 'string' },
      '2:0': { value: 'Fail', dataType: 'string' },
      '3:0': { value: 'Pending', dataType: 'string' }
    };

    cells = applyStyleToRange(cells, { startRow: 1, startCol: 0, endRow: 1, endCol: 0 }, goodPreset.style);
    cells = applyStyleToRange(cells, { startRow: 2, startCol: 0, endRow: 2, endCol: 0 }, badPreset.style);
    cells = applyStyleToRange(cells, { startRow: 3, startCol: 0, endRow: 3, endCol: 0 }, warningPreset.style);

    expect(cells['1:0']?.style?.textColor).toBe('#166534');
    expect(cells['1:0']?.style?.backgroundColor).toBe('#dcfce7');

    expect(cells['2:0']?.style?.textColor).toBe('#991b1b');
    expect(cells['2:0']?.style?.backgroundColor).toBe('#fee2e2');

    expect(cells['3:0']?.style?.textColor).toBe('#92400e');
    expect(cells['3:0']?.style?.backgroundColor).toBe('#fef3c7');
  });

  it('applies "Total" preset with top thin and bottom double borders', () => {
    const totalPreset = BUILT_IN_CELL_STYLES.find((s) => s.id === 'total')!;
    const cells: SparseCellMap = {
      '5:3': { value: 12500, dataType: 'number' }
    };
    const range: CellRange = { startRow: 5, startCol: 3, endRow: 5, endCol: 3 };

    const updated = applyStyleToRange(cells, range, totalPreset.style);
    const cell = updated['5:3'];
    expect(cell?.style?.bold).toBe(true);
    expect(cell?.style?.borders?.top?.style).toBe('thin');
    expect(cell?.style?.borders?.bottom?.style).toBe('double');
  });

  it('clears formatting resets styles and prunes empty unformatted cells', () => {
    const accentPreset = BUILT_IN_CELL_STYLES.find((s) => s.id === 'accent-header')!;
    let cells: SparseCellMap = {
      '0:0': { value: 'Important', dataType: 'string' },
      '0:1': { value: null, dataType: 'empty' } // empty cell that received styling
    };

    cells = applyStyleToRange(cells, { startRow: 0, startCol: 0, endRow: 0, endCol: 1 }, accentPreset.style);
    expect(cells['0:0']?.style).toBeDefined();
    expect(cells['0:1']?.style).toBeDefined();

    // Clear formatting
    const cleared = clearFormattingFromRange(cells, { startRow: 0, startCol: 0, endRow: 0, endCol: 1 });
    expect(cleared['0:0']).toBeDefined();
    expect(cleared['0:0']?.value).toBe('Important');
    expect(cleared['0:0']?.style).toBeUndefined();

    // '0:1' was empty with no value/formula, so clearing formatting should prune it from the sparse map
    expect(cleared['0:1']).toBeUndefined();
  });
});
