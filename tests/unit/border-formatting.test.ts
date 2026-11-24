import { describe, it, expect } from 'vitest';
import { SparseCellMap, CellRange } from '@/types/cell';
import { applyBordersToRange } from '@/engine/formatting/range-formatting';

describe('Border Formatting Engine', () => {
  it('applies all borders to every cell in a 2x2 range', () => {
    const cells: SparseCellMap = {};
    const range: CellRange = { startRow: 0, startCol: 0, endRow: 1, endCol: 1 };

    const updated = applyBordersToRange(cells, range, 'all', 'thin', '#2563eb');

    ['0:0', '0:1', '1:0', '1:1'].forEach((key) => {
      const b = updated[key]?.style?.borders;
      expect(b).toBeDefined();
      expect(b?.top?.style).toBe('thin');
      expect(b?.top?.color).toBe('#2563eb');
      expect(b?.bottom?.style).toBe('thin');
      expect(b?.left?.style).toBe('thin');
      expect(b?.right?.style).toBe('thin');
    });
  });

  it('applies outside borders only to outer edges of a 2x2 range', () => {
    const cells: SparseCellMap = {};
    const range: CellRange = { startRow: 0, startCol: 0, endRow: 1, endCol: 1 };

    const updated = applyBordersToRange(cells, range, 'outside', 'medium', '#000000');

    // 0:0 is top-left: has top and left, no bottom or right
    expect(updated['0:0']?.style?.borders?.top?.style).toBe('medium');
    expect(updated['0:0']?.style?.borders?.left?.style).toBe('medium');
    expect(updated['0:0']?.style?.borders?.bottom).toBeUndefined();
    expect(updated['0:0']?.style?.borders?.right).toBeUndefined();

    // 1:1 is bottom-right: has bottom and right, no top or left
    expect(updated['1:1']?.style?.borders?.bottom?.style).toBe('medium');
    expect(updated['1:1']?.style?.borders?.right?.style).toBe('medium');
    expect(updated['1:1']?.style?.borders?.top).toBeUndefined();
    expect(updated['1:1']?.style?.borders?.left).toBeUndefined();
  });

  it('applies individual borders (top, bottom, left, right)', () => {
    const cells: SparseCellMap = {};
    const range: CellRange = { startRow: 2, startCol: 2, endRow: 3, endCol: 3 };

    const withBottom = applyBordersToRange(cells, range, 'bottom', 'double', '#000000');
    // Row 3 should have bottom border, Row 2 should not
    expect(withBottom['3:2']?.style?.borders?.bottom?.style).toBe('double');
    expect(withBottom['3:3']?.style?.borders?.bottom?.style).toBe('double');
    expect(withBottom['2:2']?.style?.borders?.bottom).toBeUndefined();

    const withTop = applyBordersToRange(cells, range, 'top', 'thin', '#ef4444');
    // Row 2 should have top border, Row 3 should not
    expect(withTop['2:2']?.style?.borders?.top?.style).toBe('thin');
    expect(withTop['2:3']?.style?.borders?.top?.style).toBe('thin');
    expect(withTop['3:2']?.style?.borders?.top).toBeUndefined();
  });

  it('clears all borders with none', () => {
    const cells: SparseCellMap = {
      '0:0': {
        value: 'Bordered',
        dataType: 'string',
        style: {
          bold: true,
          borders: {
            top: { style: 'thick', color: '#000000' }
          }
        }
      }
    };

    const range: CellRange = { startRow: 0, startCol: 0, endRow: 0, endCol: 0 };
    const cleared = applyBordersToRange(cells, range, 'none');

    expect(cleared['0:0']?.style?.borders).toBeUndefined();
    expect(cleared['0:0']?.style?.bold).toBe(true); // Preserves other style properties
  });
});
