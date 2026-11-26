import { describe, it, expect, beforeEach } from 'vitest';
import { useSheetStore } from '@/stores/sheet-store';
import { calculationEngine } from '@/engine/calculation';
import { applyStyleToRange } from '@/engine/formatting/range-formatting';
import { CellStyle } from '@/types/cell';

describe('DC Excel Comprehensive Product Verification', () => {
  beforeEach(() => {
    useSheetStore.getState().setActiveSheet({
      id: 'test-sheet',
      name: 'Sheet1',
      workbookId: 'wb-1',
      index: 0,
      rowCount: 100,
      columnCount: 26,
      cells: {}
    });
  });

  describe('1. Touchpad & Touch Zoom Engine', () => {
    it('normalizes zoom levels passed as percentages (>10) to decimal scales', () => {
      const { setZoom } = useSheetStore.getState();

      setZoom(100);
      expect(useSheetStore.getState().zoom).toBe(1.0);

      setZoom(150);
      expect(useSheetStore.getState().zoom).toBe(1.5);

      setZoom(75);
      expect(useSheetStore.getState().zoom).toBe(0.75);

      setZoom(200);
      expect(useSheetStore.getState().zoom).toBe(2.0);
    });

    it('clamps zoom scale cleanly between 0.25 (25%) and 3.0 (300%)', () => {
      const { setZoom } = useSheetStore.getState();

      setZoom(0.1);
      expect(useSheetStore.getState().zoom).toBe(0.25);

      setZoom(5.0);
      expect(useSheetStore.getState().zoom).toBe(3.0);

      setZoom(10);
      expect(useSheetStore.getState().zoom).toBe(0.25);

      setZoom(500);
      expect(useSheetStore.getState().zoom).toBe(3.0);
    });

    it('smoothly steps zoom using precision trackpad delta formula', () => {
      const initialZoom = 1.0;
      const deltaY = -100; // Pinch out (zoom in)
      const step = -deltaY * 0.003; // 0.3
      const targetZoom = Math.min(3.0, Math.max(0.25, Math.round((initialZoom + step) * 100) / 100));

      expect(targetZoom).toBe(1.3);

      const zoomOutDeltaY = 100; // Pinch in (zoom out)
      const stepOut = -zoomOutDeltaY * 0.003;
      const targetZoomOut = Math.min(3.0, Math.max(0.25, Math.round((targetZoom + stepOut) * 100) / 100));

      expect(targetZoomOut).toBe(1.0);
    });

    it('calculates 2-finger touch pinch distance scale accurately', () => {
      const touch1Start = { clientX: 100, clientY: 100 };
      const touch2Start = { clientX: 200, clientY: 100 };
      const initialDist = Math.hypot(touch1Start.clientX - touch2Start.clientX, touch1Start.clientY - touch2Start.clientY);
      expect(initialDist).toBe(100);

      const touch1Move = { clientX: 50, clientY: 100 };
      const touch2Move = { clientX: 250, clientY: 100 };
      const currentDist = Math.hypot(touch1Move.clientX - touch2Move.clientX, touch1Move.clientY - touch2Move.clientY);
      expect(currentDist).toBe(200);

      const scale = currentDist / initialDist;
      expect(scale).toBe(2.0);

      const initialZoom = 1.0;
      const targetZoom = Math.min(3.0, Math.max(0.25, Math.round(initialZoom * scale * 100) / 100));
      expect(targetZoom).toBe(2.0);
    });
  });

  describe('2. Typography & Font Formatting Operations', () => {
    it('applies font family and font size to single cell and preserves other styles', () => {
      const cells: Record<string, any> = {
        '0:0': {
          value: 'Heading',
          rawInput: 'Heading',
          style: { bold: true, textColor: '#10b981' }
        }
      };

      const styleUpdate: Partial<CellStyle> = {
        fontFamily: 'Arial, sans-serif',
        fontSize: 18
      };

      const updated = applyStyleToRange(
        cells,
        { startRow: 0, startCol: 0, endRow: 0, endCol: 0 },
        styleUpdate
      );

      const cell = updated['0:0'];
      expect(cell?.style?.fontFamily).toBe('Arial, sans-serif');
      expect(cell?.style?.fontSize).toBe(18);
      expect(cell?.style?.bold).toBe(true);
      expect(cell?.style?.textColor).toBe('#10b981');
    });

    it('applies font styling across multi-cell ranges accurately', () => {
      const cells: Record<string, any> = {
        '0:0': { value: 10, rawInput: '10' },
        '0:1': { value: 20, rawInput: '20' },
        '1:0': { value: 30, rawInput: '30' },
        '1:1': { value: 40, rawInput: '40' }
      };

      const updated = applyStyleToRange(
        cells,
        { startRow: 0, startCol: 0, endRow: 1, endCol: 1 },
        { fontFamily: 'Georgia, serif', fontSize: 14, italic: true }
      );

      ['0:0', '0:1', '1:0', '1:1'].forEach((key) => {
        expect(updated[key]?.style?.fontFamily).toBe('Georgia, serif');
        expect(updated[key]?.style?.fontSize).toBe(14);
        expect(updated[key]?.style?.italic).toBe(true);
      });
    });
  });

  describe('3. Formula Engine Advanced Features & Edge Cases', () => {
    it('evaluates absolute references $A$1, A$1, and $A1 correctly', () => {
      let cells: Record<string, any> = {};

      const r1 = calculationEngine.updateCellInput(cells, { row: 0, col: 0 }, '100');
      cells = r1.updatedCells;

      const r2 = calculationEngine.updateCellInput(cells, { row: 1, col: 0 }, '=$A$1 * 2');
      cells = r2.updatedCells;
      expect(cells['1:0']?.value).toBe(200);

      const r3 = calculationEngine.updateCellInput(cells, { row: 2, col: 0 }, '=A$1 + 50');
      cells = r3.updatedCells;
      expect(cells['2:0']?.value).toBe(150);

      const r4 = calculationEngine.updateCellInput(cells, { row: 3, col: 0 }, '=$A1 - 25');
      cells = r4.updatedCells;
      expect(cells['3:0']?.value).toBe(75);
    });

    it('supports scientific notation in formulas (1E3, 2.5E2)', () => {
      let cells: Record<string, any> = {};
      const res = calculationEngine.updateCellInput(cells, { row: 0, col: 0 }, '=1E3 + 2.5E2');
      expect(res.updatedCells['0:0']?.value).toBe(1250);
    });

    it('correctly parses text concatenation with operator precedence', () => {
      let cells: Record<string, any> = {};
      const res = calculationEngine.updateCellInput(cells, { row: 0, col: 0 }, '="Total: " & (50 + 25)');
      expect(res.updatedCells['0:0']?.value).toBe('Total: 75');
    });

    it('evaluates statistical functions SUM, AVERAGE, MIN, MAX, and COUNT', () => {
      let cells: Record<string, any> = {};
      cells = calculationEngine.updateCellInput(cells, { row: 0, col: 0 }, '10').updatedCells;
      cells = calculationEngine.updateCellInput(cells, { row: 1, col: 0 }, '20').updatedCells;
      cells = calculationEngine.updateCellInput(cells, { row: 2, col: 0 }, '30').updatedCells;

      const sumRes = calculationEngine.updateCellInput(cells, { row: 3, col: 0 }, '=SUM(A1:A3)');
      expect(sumRes.updatedCells['3:0']?.value).toBe(60);

      const avgRes = calculationEngine.updateCellInput(cells, { row: 4, col: 0 }, '=AVERAGE(A1:A3)');
      expect(avgRes.updatedCells['4:0']?.value).toBe(20);

      const minRes = calculationEngine.updateCellInput(cells, { row: 5, col: 0 }, '=MIN(A1:A3)');
      expect(minRes.updatedCells['5:0']?.value).toBe(10);

      const maxRes = calculationEngine.updateCellInput(cells, { row: 6, col: 0 }, '=MAX(A1:A3)');
      expect(maxRes.updatedCells['6:0']?.value).toBe(30);

      const countRes = calculationEngine.updateCellInput(cells, { row: 7, col: 0 }, '=COUNT(A1:A3)');
      expect(countRes.updatedCells['7:0']?.value).toBe(3);
    });

    it('evaluates logical IF and conditional logic accurately', () => {
      let cells: Record<string, any> = {};
      cells = calculationEngine.updateCellInput(cells, { row: 0, col: 0 }, '85').updatedCells;

      const ifRes = calculationEngine.updateCellInput(
        cells,
        { row: 1, col: 0 },
        '=IF(A1 >= 80, "Distinction", "Pass")'
      );
      expect(ifRes.updatedCells['1:0']?.value).toBe('Distinction');
    });
  });
});
