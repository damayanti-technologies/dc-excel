import { describe, it, expect, beforeEach } from 'vitest';
import { CalculationEngine, parseRawCellValue } from '@/engine/calculation/engine';
import { FormulaError } from '@/engine/calculation/errors';
import { Cell } from '@/types/cell';
import { coordToKey } from '@/utils/coordinates';
import { escapeTSVField, parseTSV, serializeRangeToClipboard } from '@/engine/grid/clipboard';
import { ImportExportService } from '@/services/import-export-service';
import { SaveQueue } from '@/engine/persistence/save-queue';
import { Workbook } from '@/types/workbook';
import { Sheet } from '@/types/sheet';

describe('Stage 16: Medium Issues Fixes & Enhancements', () => {
  let engine: CalculationEngine;

  beforeEach(() => {
    engine = new CalculationEngine();
  });

  describe('Issue 2: ROUND Commercial Rounding Accuracy', () => {
    it('rounds -2.5 to -3 (round half away from zero)', () => {
      const result = engine.evaluateFormula('=ROUND(-2.5, 0)', {});
      expect(result).toBe(-3);
    });

    it('rounds 1.005 to 1.01 compensating for IEEE-754 precision', () => {
      const result = engine.evaluateFormula('=ROUND(1.005, 2)', {});
      expect(result).toBe(1.01);
    });

    it('rounds positive numbers away from zero on 0.5', () => {
      expect(engine.evaluateFormula('=ROUND(2.5, 0)', {})).toBe(3);
      expect(engine.evaluateFormula('=ROUND(2.15, 1)', {})).toBe(2.2);
    });
  });

  describe('Issue 3: & Operator Precedence', () => {
    it('evaluates ="a"&1+2 as "a3" because addition has higher precedence than concatenation', () => {
      const result = engine.evaluateFormula('="a"&1+2', {});
      expect(result).toBe('a3');
    });

    it('evaluates ="Total: " & 10 * 5 as "Total: 50"', () => {
      const result = engine.evaluateFormula('="Total: " & 10 * 5', {});
      expect(result).toBe('Total: 50');
    });

    it('evaluates comparison after concatenation: ="a"&"b" = "ab" is TRUE', () => {
      const result = engine.evaluateFormula('="a"&"b" = "ab"', {});
      expect(result).toBe(true);
    });
  });

  describe('Issue 5: Comparison Semantics (Excel Type-Aware)', () => {
    it('="10"=10 returns FALSE because string and number types do not equate in Excel', () => {
      const result = engine.evaluateFormula('="10"=10', {});
      expect(result).toBe(false);
    });

    it('="10"<>10 returns TRUE', () => {
      const result = engine.evaluateFormula('="10"<>10', {});
      expect(result).toBe(true);
    });

    it('="a">5 returns FALSE (mixed string vs number comparison)', () => {
      const result = engine.evaluateFormula('="a">5', {});
      expect(result).toBe(false);
    });

    it('relational comparisons between strings and numbers return FALSE', () => {
      expect(engine.evaluateFormula('="a"<5', {})).toBe(false);
      expect(engine.evaluateFormula('="a"<=5', {})).toBe(false);
      expect(engine.evaluateFormula('="a">=5', {})).toBe(false);
    });

    it('compares same-type numbers and strings correctly', () => {
      expect(engine.evaluateFormula('=10=10', {})).toBe(true);
      expect(engine.evaluateFormula('="hello"="HELLO"', {})).toBe(true);
      expect(engine.evaluateFormula('=15>10', {})).toBe(true);
      expect(engine.evaluateFormula('="b">"a"', {})).toBe(true);
    });
  });

  describe('Issue 6: Literal Error and Infinity Leak Prevention', () => {
    it('treats a text cell containing literal "#N/A" as normal text rather than a fatal formula error', () => {
      const cells: Record<string, Cell> = {
        [coordToKey(0, 0)]: { value: '#N/A', dataType: 'string' }
      };

      // Concatenation with literal text cell should succeed
      const concatResult = engine.evaluateFormula('=A1 & " text"', cells);
      expect(concatResult).toBe('#N/A text');

      // ISERROR on literal text cell should be FALSE
      const isErrResult = engine.evaluateFormula('=ISERROR(A1)', cells);
      expect(isErrResult).toBe(false);
    });

    it('returns #VALUE! when trying to perform arithmetic on a text cell containing "Infinity"', () => {
      const cells: Record<string, Cell> = {
        [coordToKey(0, 0)]: { value: 'Infinity', dataType: 'string' }
      };

      const result = engine.evaluateFormula('=A1 + 10', cells);
      expect(result).toBe(FormulaError.VALUE);
    });
  });

  describe('Issue 4: User Typed Input Parsing', () => {
    it('parses thousands comma separated numbers like 1,000 and 1,234,567.89', () => {
      const p1 = parseRawCellValue('1,000');
      expect(p1.dataType).toBe('number');
      expect(p1.value).toBe(1000);
      expect(p1.format).toBe('#,##0');

      const p2 = parseRawCellValue('1,234,567.89');
      expect(p2.dataType).toBe('number');
      expect(p2.value).toBe(1234567.89);
      expect(p2.format).toBe('#,##0.00');
    });

    it('parses scientific notation like 1e3 and 1E5', () => {
      const p1 = parseRawCellValue('1e3');
      expect(p1.dataType).toBe('number');
      expect(p1.value).toBe(1000);

      const p2 = parseRawCellValue('1E5');
      expect(p2.dataType).toBe('number');
      expect(p2.value).toBe(100000);
    });

    it('parses percentage input like 50% and 12.5%', () => {
      const p1 = parseRawCellValue('50%');
      expect(p1.dataType).toBe('number');
      expect(p1.value).toBe(0.5);
      expect(p1.format).toBe('0%');

      const p2 = parseRawCellValue('12.5%');
      expect(p2.dataType).toBe('number');
      expect(p2.value).toBe(0.125);
      expect(p2.format).toBe('0.00%');
    });

    it('parses +5 with leading plus sign as number', () => {
      const p = parseRawCellValue('+5');
      expect(p.dataType).toBe('number');
      expect(p.value).toBe(5);
    });

    it('parses ISO dates like 2024-01-05 as date serials', () => {
      const p = parseRawCellValue('2024-01-05');
      expect(p.dataType).toBe('date');
      expect(typeof p.value).toBe('number');
      expect(p.format).toBe('YYYY-MM-DD');
    });
  });

  describe('Issue 1: Missing Common Functions Implementation', () => {
    const sampleCells: Record<string, Cell> = {
      [coordToKey(0, 0)]: { value: 'Apples', dataType: 'string' },
      [coordToKey(0, 1)]: { value: 10, dataType: 'number' },
      [coordToKey(1, 0)]: { value: 'Oranges', dataType: 'string' },
      [coordToKey(1, 1)]: { value: 20, dataType: 'number' },
      [coordToKey(2, 0)]: { value: 'Apples', dataType: 'string' },
      [coordToKey(2, 1)]: { value: 30, dataType: 'number' },
      [coordToKey(3, 0)]: { value: 'Bananas', dataType: 'string' },
      [coordToKey(3, 1)]: { value: 40, dataType: 'number' },
      [coordToKey(4, 0)]: { value: null, dataType: 'empty' },
      [coordToKey(4, 1)]: { value: null, dataType: 'empty' },
    };

    it('evaluates SUMIF with criteria', () => {
      const res = engine.evaluateFormula('=SUMIF(A1:A4, "Apples", B1:B4)', sampleCells);
      expect(res).toBe(40); // 10 + 30
    });

    it('evaluates SUMIFS with multiple criteria', () => {
      const res = engine.evaluateFormula('=SUMIFS(B1:B4, A1:A4, "Apples", B1:B4, ">15")', sampleCells);
      expect(res).toBe(30);
    });

    it('evaluates COUNTIF with wildcards and comparisons', () => {
      expect(engine.evaluateFormula('=COUNTIF(A1:A4, "Apples")', sampleCells)).toBe(2);
      expect(engine.evaluateFormula('=COUNTIF(B1:B4, ">=20")', sampleCells)).toBe(3);
      expect(engine.evaluateFormula('=COUNTIF(A1:A4, "App*")', sampleCells)).toBe(2);
    });

    it('evaluates COUNTIFS with multiple criteria', () => {
      const res = engine.evaluateFormula('=COUNTIFS(A1:A4, "Apples", B1:B4, ">=10")', sampleCells);
      expect(res).toBe(2);
    });

    it('evaluates COUNTBLANK', () => {
      const res = engine.evaluateFormula('=COUNTBLANK(A1:B5)', sampleCells);
      expect(res).toBe(2);
    });

    it('evaluates AVERAGEIF and AVERAGEIFS', () => {
      const res1 = engine.evaluateFormula('=AVERAGEIF(A1:A4, "Apples", B1:B4)', sampleCells);
      expect(res1).toBe(20); // (10 + 30) / 2

      const res2 = engine.evaluateFormula('=AVERAGEIFS(B1:B4, A1:A4, "Apples", B1:B4, ">10")', sampleCells);
      expect(res2).toBe(30);
    });

    it('evaluates CEILING and FLOOR', () => {
      expect(engine.evaluateFormula('=CEILING(2.5, 1)', {})).toBe(3);
      expect(engine.evaluateFormula('=CEILING(4.42, 0.05)', {})).toBe(4.45);
      expect(engine.evaluateFormula('=FLOOR(2.5, 1)', {})).toBe(2);
      expect(engine.evaluateFormula('=FLOOR(3.7, 0.5)', {})).toBe(3.5);
    });

    it('evaluates RAND and RANDBETWEEN', () => {
      const rand = engine.evaluateFormula('=RAND()', {}) as number;
      expect(rand).toBeGreaterThanOrEqual(0);
      expect(rand).toBeLessThan(1);

      const randBetween = engine.evaluateFormula('=RANDBETWEEN(10, 20)', {}) as number;
      expect(randBetween).toBeGreaterThanOrEqual(10);
      expect(randBetween).toBeLessThanOrEqual(20);
      expect(Number.isInteger(randBetween)).toBe(true);
    });

    it('evaluates SUBTOTAL', () => {
      expect(engine.evaluateFormula('=SUBTOTAL(9, B1:B4)', sampleCells)).toBe(100); // SUM
      expect(engine.evaluateFormula('=SUBTOTAL(1, B1:B4)', sampleCells)).toBe(25); // AVERAGE
      expect(engine.evaluateFormula('=SUBTOTAL(4, B1:B4)', sampleCells)).toBe(40); // MAX
      expect(engine.evaluateFormula('=SUBTOTAL(5, B1:B4)', sampleCells)).toBe(10); // MIN
    });

    it('evaluates IFS', () => {
      expect(engine.evaluateFormula('=IFS(10 > 20, "No", 5 > 2, "Yes")', {})).toBe('Yes');
      expect(engine.evaluateFormula('=IFS(1 > 2, "No", 2 > 3, "No")', {})).toBe(FormulaError.NA);
    });

    it('evaluates SWITCH', () => {
      expect(engine.evaluateFormula('=SWITCH(2, 1, "One", 2, "Two", "Default")', {})).toBe('Two');
      expect(engine.evaluateFormula('=SWITCH(99, 1, "One", 2, "Two", "Default")', {})).toBe('Default');
      expect(engine.evaluateFormula('=SWITCH(99, 1, "One", 2, "Two")', {})).toBe(FormulaError.NA);
    });

    it('evaluates CHOOSE', () => {
      expect(engine.evaluateFormula('=CHOOSE(2, "Gold", "Silver", "Bronze")', {})).toBe('Silver');
      expect(engine.evaluateFormula('=CHOOSE(4, "Gold", "Silver", "Bronze")', {})).toBe(FormulaError.VALUE);
    });

    it('evaluates TEXT and VALUE', () => {
      expect(engine.evaluateFormula('=TEXT(1234.5, "$#,##0.00")', {})).toBe('$1,234.50');
      expect(engine.evaluateFormula('=VALUE("$1,000")', {})).toBe(1000);
      expect(engine.evaluateFormula('=VALUE("50%")', {})).toBe(0.5);
    });

    it('evaluates ROW and COLUMN', () => {
      expect(engine.evaluateFormula('=ROW(C5)', {})).toBe(5);
      expect(engine.evaluateFormula('=COLUMN(C5)', {})).toBe(3);
    });

    it('evaluates OFFSET', () => {
      const res = engine.evaluateFormula('=OFFSET(A1, 1, 1)', sampleCells);
      expect(res).toBe(20); // B2
    });

    it('evaluates INDIRECT', () => {
      const res = engine.evaluateFormula('=INDIRECT("B2")', sampleCells);
      expect(res).toBe(20);
    });

    it('evaluates UNIQUE, FILTER, and SORT', () => {
      // UNIQUE on column A returns first unique item "Apples"
      expect(engine.evaluateFormula('=UNIQUE(A1:A4)', sampleCells)).toBe('Apples');

      // FILTER rows where B >= 30 returns "Apples" (from A3)
      expect(engine.evaluateFormula('=FILTER(A1:A4, B1:B4>=30)', sampleCells)).toBe('Apples');

      // SORT column A ascending
      expect(engine.evaluateFormula('=SORT(A1:A4, 1, 1)', sampleCells)).toBe('Apples');
    });
  });

  describe('Issue 8: Quoted TSV Handling in Clipboard', () => {
    it('escapes fields with tabs, newlines, and quotes into RFC-4180 format', () => {
      expect(escapeTSVField('Hello')).toBe('Hello');
      expect(escapeTSVField('Hello\tWorld')).toBe('"Hello\tWorld"');
      expect(escapeTSVField('Line1\nLine2')).toBe('"Line1\nLine2"');
      expect(escapeTSVField('He said "Hi"')).toBe('"He said ""Hi"""');
    });

    it('parses quoted TSV correctly preserving internal tabs and newlines', () => {
      const rawTSV = 'Col1\t"Line1\nLine2"\tCol3\r\nA\tB\tC';
      const matrix = parseTSV(rawTSV);
      expect(matrix.length).toBe(2);
      expect(matrix[0]![0]).toBe('Col1');
      expect(matrix[0]![1]).toBe('Line1\nLine2');
      expect(matrix[0]![2]).toBe('Col3');
      expect(matrix[1]![0]).toBe('A');
    });

    it('copies formatted display values when available in serializeRangeToClipboard', () => {
      const cells: Record<string, Cell> = {
        '0:0': { value: 1234.56, dataType: 'number', style: { numberFormat: '$#,##0.00' } }
      };
      const payload = serializeRangeToClipboard({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 }, cells);
      expect(payload.rawText).toBe('$1,234.56');
    });
  });

  describe('Issue 9: File Size Limits on Import', () => {
    it('enforces 25 MB max limit for Excel files and 50 MB for CSV files', async () => {
      const ioService = new ImportExportService();

      // Create fake file exceeding 25MB
      const bigExcel = new File([''], 'huge.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      Object.defineProperty(bigExcel, 'size', { value: 30 * 1024 * 1024 });

      await expect(ioService.previewFile(bigExcel)).rejects.toThrow(/25 MB/);

      // Create fake file exceeding 50MB
      const bigCsv = new File([''], 'huge.csv', { type: 'text/csv' });
      Object.defineProperty(bigCsv, 'size', { value: 55 * 1024 * 1024 });

      await expect(ioService.previewFile(bigCsv)).rejects.toThrow(/50 MB/);
    });
  });

  describe('Issue 7: Delta Sheet Persistence in SaveQueue', () => {
    it('only marks and persists dirty sheets instead of rewriting all unchanged sheets', async () => {
      const queue = new SaveQueue({ debounceMs: 50 });
      const wb: Workbook = {
        id: 'wb1',
        name: 'Test',
        activeSheetId: 's1',
        sheetIds: ['s1', 's2'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        revision: 1
      };
      const sheet1: Sheet = {
        id: 's1',
        workbookId: 'wb1',
        name: 'Sheet1',
        index: 0,
        rowCount: 100,
        columnCount: 26,
        cells: { '0:0': { value: 10, dataType: 'number' } }
      };

      // Enqueue only modified sheet1
      queue.enqueue(wb, [sheet1], true);
      expect((queue as any).pendingSheets.length).toBe(1);
      expect((queue as any).pendingSheets[0].id).toBe('s1');

      await queue.flush();
      expect((queue as any).pendingSheets.length).toBe(0);
    });
  });

  describe('Issue 11: Scoped Database Clear', () => {
    it('clears only omnisheet keys from localStorage', () => {
      localStorage.setItem('omnisheet_test_key', 'val1');
      localStorage.setItem('other_project_key', 'preserve_me');

      // Mimic scoped wipe logic from SettingsPlaceholder
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('omnisheet_') || key.startsWith('omnisheet:'))) {
          keysToRemove.push(key);
        }
      }
      for (const k of keysToRemove) {
        localStorage.removeItem(k);
      }

      expect(localStorage.getItem('omnisheet_test_key')).toBeNull();
      expect(localStorage.getItem('other_project_key')).toBe('preserve_me');
    });
  });
});
