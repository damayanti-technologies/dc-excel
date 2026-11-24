import { describe, it, expect, beforeEach } from 'vitest';
import { useFormatPainterStore } from '@/stores/format-painter-store';
import { applyStyleToRange } from '@/engine/formatting/range-formatting';
import { CellStyle, SparseCellMap, CellRange } from '@/types/cell';

describe('Format Painter Store & Behavior', () => {
  beforeEach(() => {
    useFormatPainterStore.getState().deactivate();
  });

  it('initializes with inactive state and null source style', () => {
    const state = useFormatPainterStore.getState();
    expect(state.isActive).toBe(false);
    expect(state.isLocked).toBe(false);
    expect(state.sourceStyle).toBeNull();
  });

  it('activates in single-use mode on single click', () => {
    const sourceStyle: CellStyle = {
      bold: true,
      textColor: '#ef4444',
      backgroundColor: '#fee2e2',
      fontSize: 14
    };

    useFormatPainterStore.getState().activate(sourceStyle, false);

    const state = useFormatPainterStore.getState();
    expect(state.isActive).toBe(true);
    expect(state.isLocked).toBe(false);
    expect(state.sourceStyle).toEqual(sourceStyle);
  });

  it('activates in persistent locked mode on double click', () => {
    const sourceStyle: CellStyle = {
      italic: true,
      underline: true,
      horizontalAlignment: 'center'
    };

    useFormatPainterStore.getState().activate(sourceStyle, true);

    const state = useFormatPainterStore.getState();
    expect(state.isActive).toBe(true);
    expect(state.isLocked).toBe(true);
    expect(state.sourceStyle).toEqual(sourceStyle);
  });

  it('deactivates and resets state on deactivate()', () => {
    useFormatPainterStore.getState().activate({ bold: true }, true);
    expect(useFormatPainterStore.getState().isActive).toBe(true);

    useFormatPainterStore.getState().deactivate();
    const state = useFormatPainterStore.getState();
    expect(state.isActive).toBe(false);
    expect(state.isLocked).toBe(false);
    expect(state.sourceStyle).toBeNull();
  });

  it('applies source style to target range while preserving values and formulas', () => {
    const cells: SparseCellMap = {
      '0:0': { value: 'Source Header', dataType: 'string', style: { bold: true, textColor: '#1e40af', backgroundColor: '#dbeafe' } },
      '1:1': { value: 450, dataType: 'number', formula: '=SUM(A1:A5)' },
      '1:2': { value: 'Plain Text', dataType: 'string' }
    };

    // Activate format painter with cell (0,0)'s style
    const sourceStyle = cells['0:0']?.style;
    useFormatPainterStore.getState().activate(sourceStyle, false);

    const activeStyle = useFormatPainterStore.getState().sourceStyle;
    expect(activeStyle).toBeDefined();

    // Destination range B2:C2 (row 1, cols 1..2)
    const destRange: CellRange = {
      startRow: 1,
      startCol: 1,
      endRow: 1,
      endCol: 2
    };

    const updated = applyStyleToRange(cells, destRange, activeStyle!);

    // Check that target styles are updated
    expect(updated['1:1']?.style?.bold).toBe(true);
    expect(updated['1:1']?.style?.textColor).toBe('#1e40af');
    expect(updated['1:1']?.style?.backgroundColor).toBe('#dbeafe');
    expect(updated['1:2']?.style?.bold).toBe(true);

    // Check that target values and formulas are strictly preserved
    expect(updated['1:1']?.value).toBe(450);
    expect(updated['1:1']?.formula).toBe('=SUM(A1:A5)');
    expect(updated['1:2']?.value).toBe('Plain Text');
  });
});
