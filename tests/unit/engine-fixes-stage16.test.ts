import { describe, it, expect, beforeEach } from 'vitest';
import { CalculationEngine } from '@/engine/calculation/engine';
import { FormulaError } from '@/engine/calculation/errors';
import { insertRow, deleteRow, insertColumn } from '@/engine/grid/operations';
import { copyRange, applyPasteData } from '@/engine/grid/clipboard';
import { SaveQueue } from '@/engine/persistence/save-queue';
import { Sheet } from '@/types/sheet';
import { coordToKey } from '@/utils/coordinates';

describe('Stage 16 Engine & Architecture Fixes', () => {
  let engine: CalculationEngine;

  beforeEach(() => {
    engine = new CalculationEngine();
  });

  describe('Issue 5: Absolute References ($A$1, A$1, $A1)', () => {
    it('evaluates =$A$1+1 and =A$1+1 correctly', () => {
      const sheet: Sheet = {
        id: 's1',
        workbookId: 'wb1',
        name: 'Sheet1',
        index: 0,
        rowCount: 10,
        columnCount: 10,
        cells: {
          [coordToKey(0, 0)]: { value: 10, dataType: 'number' },
          [coordToKey(1, 0)]: { value: null, formula: '=$A$1+1', dataType: 'formula' },
          [coordToKey(2, 0)]: { value: null, formula: '=A$1+5', dataType: 'formula' },
          [coordToKey(3, 0)]: { value: null, formula: '=$A1+10', dataType: 'formula' },
        },
      };

      const { updatedCells } = engine.recalculateSheet(sheet);
      expect(updatedCells[coordToKey(1, 0)]?.value).toBe(11);
      expect(updatedCells[coordToKey(2, 0)]?.value).toBe(15);
      expect(updatedCells[coordToKey(3, 0)]?.value).toBe(20);
    });
  });

  describe('Issue 5: Scientific Notation (1E5)', () => {
    it('evaluates =1E5 as 100000', () => {
      const sheet: Sheet = {
        id: 's1',
        workbookId: 'wb1',
        name: 'Sheet1',
        index: 0,
        rowCount: 5,
        columnCount: 5,
        cells: {
          [coordToKey(0, 0)]: { value: null, formula: '=1E5', dataType: 'formula' },
          [coordToKey(1, 0)]: { value: null, formula: '=2.5e2 + 10', dataType: 'formula' },
        },
      };

      const { updatedCells } = engine.recalculateSheet(sheet);
      expect(updatedCells[coordToKey(0, 0)]?.value).toBe(100000);
      expect(updatedCells[coordToKey(1, 0)]?.value).toBe(260);
    });

    it('parses raw cell input with scientific notation', () => {
      const result = engine.updateCellInput({}, { row: 0, col: 0 }, '1E5');
      expect(result.updatedCells[coordToKey(0, 0)]?.value).toBe(100000);
      expect(result.updatedCells[coordToKey(0, 0)]?.dataType).toBe('number');
    });
  });

  describe('Issue 5: Full Column (A:A) and Full Row (1:1) Ranges', () => {
    it('evaluates =SUM(A:A) without hanging or expanding to 1M items', () => {
      const sheet: Sheet = {
        id: 's1',
        workbookId: 'wb1',
        name: 'Sheet1',
        index: 0,
        rowCount: 100,
        columnCount: 10,
        cells: {
          [coordToKey(0, 0)]: { value: 10, dataType: 'number' },
          [coordToKey(1, 0)]: { value: 20, dataType: 'number' },
          [coordToKey(2, 0)]: { value: 30, dataType: 'number' },
          [coordToKey(0, 1)]: { value: null, formula: '=SUM(A:A)', dataType: 'formula' },
        },
      };

      const { updatedCells } = engine.recalculateSheet(sheet);
      expect(updatedCells[coordToKey(0, 1)]?.value).toBe(60);
    });

    it('evaluates =SUM(1:1) for full row range', () => {
      const sheet: Sheet = {
        id: 's1',
        workbookId: 'wb1',
        name: 'Sheet1',
        index: 0,
        rowCount: 10,
        columnCount: 100,
        cells: {
          [coordToKey(0, 0)]: { value: 5, dataType: 'number' },
          [coordToKey(0, 1)]: { value: 15, dataType: 'number' },
          [coordToKey(0, 2)]: { value: 25, dataType: 'number' },
          [coordToKey(1, 0)]: { value: null, formula: '=SUM(1:1)', dataType: 'formula' },
        },
      };

      const { updatedCells } = engine.recalculateSheet(sheet);
      expect(updatedCells[coordToKey(1, 0)]?.value).toBe(45);
    });
  });

  describe('Issue 5: Cross-Sheet References (Sheet2!A1)', () => {
    it('evaluates cross-sheet cell and range references', () => {
      const sheet2Cells = {
        [coordToKey(0, 0)]: { value: 123, dataType: 'number' as const },
        [coordToKey(1, 0)]: { value: 77, dataType: 'number' as const },
      };

      const activeSheet: Sheet = {
        id: 's1',
        workbookId: 'wb1',
        name: 'Sheet1',
        index: 0,
        rowCount: 10,
        columnCount: 10,
        cells: {
          [coordToKey(0, 0)]: { value: null, formula: '=Sheet2!A1 + 7', dataType: 'formula' },
          [coordToKey(1, 0)]: { value: null, formula: '=SUM(Sheet2!A1:A2)', dataType: 'formula' },
        },
      };

      const crossSheetResolver = (name: string) => {
        if (name.toLowerCase() === 'sheet2') return sheet2Cells;
        return undefined;
      };

      const { updatedCells } = engine.recalculateSheet(activeSheet, undefined, crossSheetResolver);
      expect(updatedCells[coordToKey(0, 0)]?.value).toBe(130);
      expect(updatedCells[coordToKey(1, 0)]?.value).toBe(200);
    });
  });

  describe('Issue 6: Parser Lexical and Syntax Error Handling', () => {
    it('returns #VALUE! for unknown characters like =1+2 @ 3 instead of truncating silently', () => {
      const sheet: Sheet = {
        id: 's1',
        workbookId: 'wb1',
        name: 'Sheet1',
        index: 0,
        rowCount: 5,
        columnCount: 5,
        cells: {
          [coordToKey(0, 0)]: { value: null, formula: '=1+2 @ 3', dataType: 'formula' },
        },
      };

      const { updatedCells } = engine.recalculateSheet(sheet);
      expect(updatedCells[coordToKey(0, 0)]?.value).toBe(FormulaError.VALUE);
    });

    it('returns #VALUE! for unterminated string literals like ="abc', () => {
      const sheet: Sheet = {
        id: 's1',
        workbookId: 'wb1',
        name: 'Sheet1',
        index: 0,
        rowCount: 5,
        columnCount: 5,
        cells: {
          [coordToKey(0, 0)]: { value: null, formula: '="abc', dataType: 'formula' },
        },
      };

      const { updatedCells } = engine.recalculateSheet(sheet);
      expect(updatedCells[coordToKey(0, 0)]?.value).toBe(FormulaError.VALUE);
    });
  });

  describe('Issue 3: Row/Column Operations Adjust Formulas', () => {
    it('shifts formula references when a row is inserted above', () => {
      const sheet: Sheet = {
        id: 's1',
        workbookId: 'wb1',
        name: 'Sheet1',
        index: 0,
        rowCount: 10,
        columnCount: 10,
        cells: {
          [coordToKey(0, 0)]: { value: 10, dataType: 'number' },
          [coordToKey(1, 0)]: { value: 20, dataType: 'number' },
          [coordToKey(2, 0)]: { value: null, formula: '=SUM(A1:A2)', dataType: 'formula' },
        },
      };

      // Insert row at index 1 ('above') -> row 0 stays at 0, new empty row at 1, old row 1 moves to 2, old row 2 moves to 3
      const updated = insertRow(sheet, 1, 'above');
      const formulaCell = updated.cells[coordToKey(3, 0)];
      expect(formulaCell).toBeDefined();
      expect(formulaCell?.formula).toBe('=SUM(A1:A3)');
    });

    it('turns deleted cell references into #REF!', () => {
      const sheet: Sheet = {
        id: 's1',
        workbookId: 'wb1',
        name: 'Sheet1',
        index: 0,
        rowCount: 10,
        columnCount: 10,
        cells: {
          [coordToKey(0, 0)]: { value: 10, dataType: 'number' },
          [coordToKey(1, 0)]: { value: 20, dataType: 'number' },
          [coordToKey(2, 0)]: { value: null, formula: '=A2+5', dataType: 'formula' },
        },
      };

      // Delete row 1 (the cell A2 that is referenced by row 2)
      const updated = deleteRow(sheet, 1);
      const formulaCell = updated.cells[coordToKey(1, 0)];
      expect(formulaCell).toBeDefined();
      expect(formulaCell?.formula).toBe('=#REF!+5');
    });

    it('shifts column references when a column is inserted', () => {
      const sheet: Sheet = {
        id: 's1',
        workbookId: 'wb1',
        name: 'Sheet1',
        index: 0,
        rowCount: 10,
        columnCount: 10,
        cells: {
          [coordToKey(0, 0)]: { value: 10, dataType: 'number' },
          [coordToKey(0, 1)]: { value: 20, dataType: 'number' },
          [coordToKey(0, 2)]: { value: null, formula: '=A1+B1', dataType: 'formula' },
        },
      };

      const updated = insertColumn(sheet, 1, 'before');
      const formulaCell = updated.cells[coordToKey(0, 3)];
      expect(formulaCell).toBeDefined();
      expect(formulaCell?.formula).toBe('=A1+C1');
    });
  });

  describe('Issue 4: Clipboard Paste Preserves Formatting and Shifts Relative References', () => {
    it('shifts relative references while preserving absolute references and formats on paste', async () => {
      const sheet: Sheet = {
        id: 's1',
        workbookId: 'wb1',
        name: 'Sheet1',
        index: 0,
        rowCount: 10,
        columnCount: 10,
        cells: {
          [coordToKey(0, 0)]: { value: 10, dataType: 'number' },
          [coordToKey(0, 1)]: {
            value: 20,
            formula: '=A1+$A$1',
            dataType: 'formula',
            style: { bold: true, textColor: '#10b981' },
          },
        },
      };

      // Copy range B1:B1 (row 0, col 1)
      const payload = await copyRange({ startRow: 0, startCol: 1, endRow: 0, endCol: 1 }, sheet.cells);
      expect(payload.cells[coordToKey(0, 0)]?.formula).toBe('=A1+$A$1');

      // Paste at B3 (row 2, col 1) -> deltaRow = +2, deltaCol = 0
      const pasteResult = applyPasteData({ row: 2, col: 1 }, payload.rawText, sheet);
      const pastedCell = pasteResult.updatedCells[coordToKey(2, 1)];

      expect(pastedCell).toBeDefined();
      // Relative reference A1 should shift to A3; absolute reference $A$1 must stay $A$1
      expect(pastedCell?.formula).toBe('=A3+$A$1');
      // Styling preserved!
      expect(pastedCell?.style?.bold).toBe(true);
      expect(pastedCell?.style?.textColor).toBe('#10b981');
    });
  });

  describe('Issue 1 & 2: Autosave Concurrency and Generation Tracking', () => {
    it('does not clear pendingSheets when a new edit arrives during in-flight save', async () => {
      let saveSuccessCount = 0;

      const queue = new SaveQueue({
        debounceMs: 5,
        onSaveSuccess: () => {
          saveSuccessCount++;
        },
      });

      const mockWorkbook = {
        id: 'wb1',
        name: 'Workbook 1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        sheetIds: ['s1'],
        activeSheetId: 's1',
      };

      // 1. Initial edit to Sheet1
      const initialSheet: Sheet = {
        id: 's1',
        workbookId: 'wb1',
        name: 'Sheet1',
        index: 0,
        rowCount: 10,
        columnCount: 10,
        cells: { [coordToKey(0, 0)]: { value: 1, dataType: 'number' } },
      };
      queue.enqueue(mockWorkbook, [initialSheet]);

      // Start flush (in-flight)
      const flushPromise = queue.flush();

      // 2. While flush is saving, another edit arrives to Sheet2!
      const subsequentSheet: Sheet = {
        id: 's2',
        workbookId: 'wb1',
        name: 'Sheet2',
        index: 1,
        rowCount: 10,
        columnCount: 10,
        cells: { [coordToKey(0, 0)]: { value: 999, dataType: 'number' } },
      };
      queue.enqueue(mockWorkbook, [subsequentSheet]);

      await flushPromise;

      // Because generation changed during flush, the queue must still be dirty and retain Sheet2
      expect(queue.isDirty).toBe(true);

      // Next flush writes the subsequent sheet
      await queue.flush();
      expect(queue.isDirty).toBe(false);
      expect(saveSuccessCount).toBeGreaterThanOrEqual(2);

      queue.reset();
    });
  });

  describe('Issue 7: Large Sheet Dependency Graph Performance', () => {
    it('handles deep dependency chain of 1,000 cells without call stack overflow', () => {
      const chainSheet: Sheet = {
        id: 's1',
        workbookId: 'wb1',
        name: 'Sheet1',
        index: 0,
        rowCount: 1200,
        columnCount: 5,
        cells: {
          [coordToKey(0, 0)]: { value: 1, dataType: 'number' },
        },
      };

      // Build chain: A2 = A1 + 1, A3 = A2 + 1, ... up to A1000
      for (let r = 1; r < 1000; r++) {
        chainSheet.cells[coordToKey(r, 0)] = {
          value: null,
          formula: `=A${r} + 1`,
          dataType: 'formula',
        };
      }

      // Should complete quickly and without maximum call stack size exceeded
      const { updatedCells, cycles } = engine.recalculateSheet(chainSheet);
      expect(cycles.length).toBe(0);
      expect(updatedCells[coordToKey(999, 0)]?.value).toBe(1000);
    });
  });
});
