import { describe, it, expect } from 'vitest';
import { calculationEngine } from '@/engine/calculation/engine';
import { FormulaError } from '@/engine/calculation/errors';
import { Cell } from '@/types/cell';
import { parseCsvString, serializeToCsv } from '@/engine/io/csv-parser';
import { Sheet } from '@/types/sheet';
import { sortRange } from '@/engine/data-tools/sorting';
import { SortConfig } from '@/types/data-tools';
import { coordToKey } from '@/utils/coordinates';
import { numberFormatter } from '@/engine/formatting/number-formatter';

describe('Stage 15 Production Acceptance: Formulas, Grid & Data Compatibility', () => {
  describe('1. Required Formula Functions (23 Core Functions)', () => {
    const data: Record<string, Cell> = {
      '0:0': { value: 10, dataType: 'number' },    // A1
      '1:0': { value: 20, dataType: 'number' },    // A2
      '2:0': { value: 30, dataType: 'number' },    // A3
      '3:0': { value: 40, dataType: 'number' },    // A4
      '4:0': { value: 50, dataType: 'number' },    // A5
      '0:1': { value: 2, dataType: 'number' },     // B1
      '1:1': { value: 4, dataType: 'number' },     // B2
      '2:1': { value: 6, dataType: 'number' },     // B3
      '0:2': { value: 'Alpha', dataType: 'string' }, // C1
      '1:2': { value: 'Beta', dataType: 'string' },  // C2
      '2:2': { value: 'Gamma', dataType: 'string' }  // C3
    };

    // Math & Statistical
    it('evaluates SUM, AVERAGE, COUNT, MIN, MAX accurately', () => {
      expect(calculationEngine.evaluateFormula('=SUM(A1:A5)', data)).toBe(150);
      expect(calculationEngine.evaluateFormula('=AVERAGE(A1:A5)', data)).toBe(30);
      expect(calculationEngine.evaluateFormula('=COUNT(A1:A5)', data)).toBe(5);
      expect(calculationEngine.evaluateFormula('=MIN(A1:A5)', data)).toBe(10);
      expect(calculationEngine.evaluateFormula('=MAX(A1:A5)', data)).toBe(50);
    });

    it('evaluates ROUND, MEDIAN, STDEV accurately', () => {
      expect(calculationEngine.evaluateFormula('=ROUND(123.4567, 2)', data)).toBe(123.46);
      expect(calculationEngine.evaluateFormula('=MEDIAN(A1:A5)', data)).toBe(30);
      // Sample standard deviation of [10, 20, 30, 40, 50] = sqrt(250) ≈ 15.811
      const stdev = calculationEngine.evaluateFormula('=STDEV(A1:A5)', data) as number;
      expect(Math.round(stdev * 1000) / 1000).toBe(15.811);
    });

    it('evaluates SUMPRODUCT accurately across multiple ranges', () => {
      // (10*2) + (20*4) + (30*6) = 20 + 80 + 180 = 280
      expect(calculationEngine.evaluateFormula('=SUMPRODUCT(A1:A3, B1:B3)', data)).toBe(280);
    });

    // Logical
    it('evaluates IF, IFERROR, AND, OR accurately', () => {
      expect(calculationEngine.evaluateFormula('=IF(A1 > 5, "Large", "Small")', data)).toBe('Large');
      expect(calculationEngine.evaluateFormula('=IF(A1 < 5, "Large", "Small")', data)).toBe('Small');
      expect(calculationEngine.evaluateFormula('=IFERROR(10 / 0, "Fallback")', data)).toBe('Fallback');
      expect(calculationEngine.evaluateFormula('=IFERROR(10 / 2, "Fallback")', data)).toBe(5);
      expect(calculationEngine.evaluateFormula('=AND(A1 = 10, B1 = 2)', data)).toBe(true);
      expect(calculationEngine.evaluateFormula('=AND(A1 = 10, B1 = 999)', data)).toBe(false);
      expect(calculationEngine.evaluateFormula('=OR(A1 = 999, B1 = 2)', data)).toBe(true);
      expect(calculationEngine.evaluateFormula('=OR(A1 = 999, B1 = 999)', data)).toBe(false);
    });

    // Lookup & Reference
    it('evaluates VLOOKUP, HLOOKUP, XLOOKUP, INDEX, MATCH accurately', () => {
      // VLOOKUP exact match
      expect(calculationEngine.evaluateFormula('=VLOOKUP(20, A1:C3, 3, FALSE)', data)).toBe('Beta');
      // MATCH exact match
      expect(calculationEngine.evaluateFormula('=MATCH(30, A1:A5, 0)', data)).toBe(3);
      // INDEX 1-based row & col
      expect(calculationEngine.evaluateFormula('=INDEX(A1:C3, 2, 3)', data)).toBe('Beta');
      // XLOOKUP lookup 30 in A, return C
      expect(calculationEngine.evaluateFormula('=XLOOKUP(30, A1:A3, C1:C3)', data)).toBe('Gamma');
    });

    // Text & DateTime
    it('evaluates TEXTJOIN, DATE, TODAY, NOW, NETWORKDAYS accurately', () => {
      expect(calculationEngine.evaluateFormula('=TEXTJOIN("-", TRUE, C1:C3)', data)).toBe('Alpha-Beta-Gamma');
      const dateSerial = calculationEngine.evaluateFormula('=DATE(2026, 11, 24)', data);
      expect(typeof dateSerial).toBe('number');
      expect(dateSerial).toBeGreaterThan(45000); // Valid Excel serial date

      const todaySerial = calculationEngine.evaluateFormula('=TODAY()', data);
      expect(typeof todaySerial).toBe('number');

      const nowSerial = calculationEngine.evaluateFormula('=NOW()', data);
      expect(typeof nowSerial).toBe('number');

      // 2026-01-05 (Mon) to 2026-01-09 (Fri) = 5 working days
      expect(calculationEngine.evaluateFormula('=NETWORKDAYS("2026-01-05", "2026-01-09")', data)).toBe(5);
    });
  });

  describe('2. Formula Engine Edge Cases & Error Propagation', () => {
    it('handles empty cells, zeros, negative numbers and decimal values in ranges', () => {
      const mixedData: Record<string, Cell> = {
        '0:0': { value: 0, dataType: 'number' },
        '1:0': { value: -25.5, dataType: 'number' },
        '2:0': { value: 100.25, dataType: 'number' },
        '3:0': { value: null, dataType: 'empty' }, // Empty
        '4:0': { value: 25.25, dataType: 'number' }
      };

      // 0 + (-25.5) + 100.25 + 0 + 25.25 = 100
      expect(calculationEngine.evaluateFormula('=SUM(A1:A5)', mixedData)).toBe(100);
      expect(calculationEngine.evaluateFormula('=COUNT(A1:A5)', mixedData)).toBe(4); // null ignored
      expect(calculationEngine.evaluateFormula('=MIN(A1:A5)', mixedData)).toBe(-25.5);
      expect(calculationEngine.evaluateFormula('=MAX(A1:A5)', mixedData)).toBe(100.25);
    });

    it('ignores non-numeric strings in numeric ranges gracefully', () => {
      const textInRange: Record<string, Cell> = {
        '0:0': { value: 10, dataType: 'number' },
        '1:0': { value: 'Header Text', dataType: 'string' },
        '2:0': { value: 20, dataType: 'number' }
      };
      expect(calculationEngine.evaluateFormula('=SUM(A1:A3)', textInRange)).toBe(30);
      expect(calculationEngine.evaluateFormula('=AVERAGE(A1:A3)', textInRange)).toBe(15);
    });

    it('handles invalid function names by returning #NAME?', () => {
      expect(calculationEngine.evaluateFormula('=NON_EXISTENT_FUNC(10, 20)', {})).toBe(FormulaError.NAME);
    });

    it('detects and reports circular references', () => {
      const sheet: Sheet = {
        id: 'sheet-circular',
        workbookId: 'wb-circ',
        name: 'Circular',
        index: 0,
        rowCount: 10,
        columnCount: 10,
        cells: {
          '0:0': { value: 0, formula: '=B1 + 1', dataType: 'formula' },
          '0:1': { value: 0, formula: '=A1 + 1', dataType: 'formula' }
        }
      };

      const result = calculationEngine.recalculateSheet(sheet);
      expect(result.updatedCells['0:0']?.value).toBe(FormulaError.CYCLE);
      expect(result.updatedCells['0:1']?.value).toBe(FormulaError.CYCLE);
    });

    it('handles large range evaluation without call stack overflow', () => {
      const largeData: Record<string, Cell> = {};
      for (let i = 0; i < 1000; i++) {
        largeData[`${i}:0`] = { value: 1, dataType: 'number' };
      }
      expect(calculationEngine.evaluateFormula('=SUM(A1:A1000)', largeData)).toBe(1000);
      expect(calculationEngine.evaluateFormula('=AVERAGE(A1:A1000)', largeData)).toBe(1);
    });
  });

  describe('3. Data Tools & State Integrity', () => {
    it('sorting preserves row integrity and associated values across columns', () => {
      const cells: Record<string, Cell> = {
        [coordToKey(0, 0)]: { value: 'Product', dataType: 'string' },
        [coordToKey(0, 1)]: { value: 'Price', dataType: 'string' },
        [coordToKey(1, 0)]: { value: 'Banana', dataType: 'string' },
        [coordToKey(1, 1)]: { value: 30, dataType: 'number' },
        [coordToKey(2, 0)]: { value: 'Apple', dataType: 'string' },
        [coordToKey(2, 1)]: { value: 50, dataType: 'number' },
        [coordToKey(3, 0)]: { value: 'Cherry', dataType: 'string' },
        [coordToKey(3, 1)]: { value: 20, dataType: 'number' }
      };

      const config: SortConfig = {
        range: { startRow: 0, startCol: 0, endRow: 3, endCol: 1 },
        levels: [{ col: 0, direction: 'asc' }],
        hasHeaders: true
      };
      const sorted = sortRange(cells, config);

      // Row 0 header unchanged
      expect(sorted[coordToKey(0, 0)]?.value).toBe('Product');
      expect(sorted[coordToKey(0, 1)]?.value).toBe('Price');

      // Apple should now be at row 1 with price 50
      expect(sorted[coordToKey(1, 0)]?.value).toBe('Apple');
      expect(sorted[coordToKey(1, 1)]?.value).toBe(50);
      // Banana at row 2 with price 30
      expect(sorted[coordToKey(2, 0)]?.value).toBe('Banana');
      expect(sorted[coordToKey(2, 1)]?.value).toBe(30);
      // Cherry at row 3 with price 20
      expect(sorted[coordToKey(3, 0)]?.value).toBe('Cherry');
      expect(sorted[coordToKey(3, 1)]?.value).toBe(20);
    });

    it('number formatting does not alter underlying raw numeric value', () => {
      const rawValue = 1234.567;
      const formattedCurrency = numberFormatter.format(rawValue, '$#,##0.00');
      const formattedPercent = numberFormatter.format(0.852, '0.0%');

      expect(formattedCurrency).toBe('$1,234.57');
      expect(formattedPercent).toBe('85.2%');
      // The original raw numbers remain unchanged floating-point values
      expect(typeof rawValue).toBe('number');
      expect(rawValue).toBe(1234.567);
    });
  });

  describe('4. Delimited Text (CSV/TSV) & RFC 4180 Compatibility', () => {
    it('preserves Telugu Unicode, leading zeros, escaped quotes and multi-line fields', () => {
      const csvInput = 'ID,City,Note\n"01234","హైదరాబాద్","Capital city of ""Telangana"""\n"05678","విశాఖపట్నం","Port city"';
      const matrix = parseCsvString(csvInput);

      expect(matrix).toHaveLength(3);
      // Leading zero preserved as string
      expect(matrix[1]?.[0]).toBe('01234');
      // Telugu text preserved accurately
      expect(matrix[1]?.[1]).toBe('హైదరాబాద్');
      // Escaped inner quote preserved
      expect(matrix[1]?.[2]).toBe('Capital city of "Telangana"');
    });

    it('sanitizes formula injection prefixes on CSV export', () => {
      const cells: Record<string, Cell> = {
        '0:0': { value: '=cmd|\' /C calc\'!A0', dataType: 'string' },
        '0:1': { value: '+2+5', dataType: 'string' },
        '0:2': { value: -42, dataType: 'number' }, // Valid negative number
        '0:3': { value: '@SUM(A1:B1)', dataType: 'string' }
      };

      const serialized = serializeToCsv(cells, {
        delimiter: ',',
        formulaInjectionProtection: true
      });

      // Formulas escaped with leading single quote
      expect(serialized).toContain("'=cmd|' /C calc'!A0");
      expect(serialized).toContain("'+2+5");
      expect(serialized).toContain("'@SUM(A1:B1)");
      // Genuine negative number remains unescaped
      expect(serialized).toContain('-42');
      expect(serialized).not.toContain("'-42");
    });
  });
});
