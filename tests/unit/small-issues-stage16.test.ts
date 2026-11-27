import { describe, it, expect, beforeEach } from 'vitest';
import { CalculationEngine, parseRawCellValue } from '@/engine/calculation/engine';
import { Cell } from '@/types/cell';
import { Sheet } from '@/types/sheet';
import { coordToKey } from '@/utils/coordinates';

describe('Small Issues & New Formulas Verification (Stage 16)', () => {
  let engine: CalculationEngine;

  beforeEach(() => {
    engine = new CalculationEngine();
  });

  describe('1. MAXIFS and MINIFS', () => {
    it('evaluates MAXIFS with multiple conditions', () => {
      const cells: Record<string, Cell> = {
        [coordToKey(0, 0)]: { value: 10, dataType: 'number' }, // A1
        [coordToKey(1, 0)]: { value: 20, dataType: 'number' }, // A2
        [coordToKey(2, 0)]: { value: 30, dataType: 'number' }, // A3
        [coordToKey(3, 0)]: { value: 40, dataType: 'number' }, // A4

        [coordToKey(0, 1)]: { value: 'East', dataType: 'string' }, // B1
        [coordToKey(1, 1)]: { value: 'West', dataType: 'string' }, // B2
        [coordToKey(2, 1)]: { value: 'East', dataType: 'string' }, // B3
        [coordToKey(3, 1)]: { value: 'West', dataType: 'string' }, // B4
      };

      const maxEast = engine.evaluateFormula('=MAXIFS(A1:A4, B1:B4, "East")', cells);
      expect(maxEast).toBe(30);

      const maxWest = engine.evaluateFormula('=MAXIFS(A1:A4, B1:B4, "West")', cells);
      expect(maxWest).toBe(40);
    });

    it('evaluates MINIFS with multiple conditions', () => {
      const cells: Record<string, Cell> = {
        [coordToKey(0, 0)]: { value: 10, dataType: 'number' }, // A1
        [coordToKey(1, 0)]: { value: 20, dataType: 'number' }, // A2
        [coordToKey(2, 0)]: { value: 30, dataType: 'number' }, // A3
        [coordToKey(3, 0)]: { value: 40, dataType: 'number' }, // A4

        [coordToKey(0, 1)]: { value: 'East', dataType: 'string' },
        [coordToKey(1, 1)]: { value: 'West', dataType: 'string' },
        [coordToKey(2, 1)]: { value: 'East', dataType: 'string' },
        [coordToKey(3, 1)]: { value: 'West', dataType: 'string' },
      };

      const minEast = engine.evaluateFormula('=MINIFS(A1:A4, B1:B4, "East")', cells);
      expect(minEast).toBe(10);

      const minWest = engine.evaluateFormula('=MINIFS(A1:A4, B1:B4, "West")', cells);
      expect(minWest).toBe(20);
    });
  });

  describe('2. SIN, COS, and SUMSQ', () => {
    it('evaluates SIN and COS', () => {
      expect(engine.evaluateFormula('=SIN(0)', {})).toBe(0);
      expect(engine.evaluateFormula('=COS(0)', {})).toBe(1);
      const halfPiSin = engine.evaluateFormula('=ROUND(SIN(PI() / 2), 4)', {});
      expect(halfPiSin).toBe(1);
    });

    it('evaluates SUMSQ', () => {
      // 3^2 + 4^2 = 9 + 16 = 25
      expect(engine.evaluateFormula('=SUMSQ(3, 4)', {})).toBe(25);
      expect(engine.evaluateFormula('=SUMSQ(1, 2, 3)', {})).toBe(14);
    });
  });

  describe('3. ISEVEN and ISODD', () => {
    it('evaluates ISEVEN and ISODD correctly for numbers and truncated floats', () => {
      expect(engine.evaluateFormula('=ISEVEN(4)', {})).toBe(true);
      expect(engine.evaluateFormula('=ISEVEN(5)', {})).toBe(false);
      expect(engine.evaluateFormula('=ISEVEN(4.8)', {})).toBe(true);
      expect(engine.evaluateFormula('=ISODD(3)', {})).toBe(true);
      expect(engine.evaluateFormula('=ISODD(4)', {})).toBe(false);
      expect(engine.evaluateFormula('=ISODD(3.9)', {})).toBe(true);
    });
  });

  describe('4. AVERAGEA', () => {
    it('evaluates AVERAGEA taking text as 0 and booleans as 1/0', () => {
      const cells: Record<string, Cell> = {
        [coordToKey(0, 0)]: { value: 10, dataType: 'number' },  // A1: 10
        [coordToKey(1, 0)]: { value: true, dataType: 'boolean' },// A2: 1
        [coordToKey(2, 0)]: { value: 'text', dataType: 'string' },// A3: 0
        [coordToKey(3, 0)]: { value: 5, dataType: 'number' },   // A4: 5
      };

      // (10 + 1 + 0 + 5) / 4 = 16 / 4 = 4
      const result = engine.evaluateFormula('=AVERAGEA(A1:A4)', cells);
      expect(result).toBe(4);
    });
  });

  describe('5. LET Function', () => {
    it('evaluates basic LET binding and expression', () => {
      const result = engine.evaluateFormula('=LET(x, 5, x * 2)', {});
      expect(result).toBe(10);
    });

    it('evaluates multi-variable LET bindings where later vars reference earlier vars', () => {
      const result = engine.evaluateFormula('=LET(width, 10, height, 20, area, width * height, area + 5)', {});
      expect(result).toBe(205);
    });

    it('evaluates LET combining cell references and scoped variables', () => {
      const cells: Record<string, Cell> = {
        [coordToKey(0, 0)]: { value: 50, dataType: 'number' } // A1
      };
      const result = engine.evaluateFormula('=LET(base, A1, multiplier, 3, base * multiplier)', cells);
      expect(result).toBe(150);
    });
  });

  describe('6. TEXTSPLIT Function', () => {
    it('evaluates TEXTSPLIT on a delimited string', () => {
      const result = engine.evaluateFormula('=TEXTSPLIT("apple,banana,orange", ",")', {});
      expect(result).toBe('apple');
    });

    it('evaluates TEXTSPLIT with row delimiters', () => {
      const result = engine.evaluateFormula('=TEXTSPLIT("first;second;third", "", ";")', {});
      expect(result).toBe('first');
    });
  });

  describe('7. Coordinate Functions Dependency Cycle Immunity: =COLUMN(B1)', () => {
    it('does not produce #CYCLE! when =COLUMN(B1) is typed in cell B1 (row 0, col 1)', () => {
      const sheet = {
        id: 's1',
        workbookId: 'wb1',
        name: 'Sheet1',
        index: 0,
        rowCount: 100,
        columnCount: 26,
        cells: {
          [coordToKey(0, 1)]: { value: null, formula: '=COLUMN(B1)', dataType: 'formula' } // B1
        }
      } as Sheet;

      const { updatedCells, cycles } = engine.recalculateSheet(sheet);
      expect(cycles).toHaveLength(0);
      expect(updatedCells[coordToKey(0, 1)]?.value).toBe(2);
    });

    it('evaluates =ROW(A5) in cell A5 without cycles', () => {
      const sheet = {
        id: 's1',
        workbookId: 'wb1',
        name: 'Sheet1',
        index: 0,
        rowCount: 100,
        columnCount: 26,
        cells: {
          [coordToKey(4, 0)]: { value: null, formula: '=ROW(A5)', dataType: 'formula' } // A5
        }
      } as Sheet;

      const { updatedCells, cycles } = engine.recalculateSheet(sheet);
      expect(cycles).toHaveLength(0);
      expect(updatedCells[coordToKey(4, 0)]?.value).toBe(5);
    });

    it('evaluates parameterless =ROW() and =COLUMN()', () => {
      const sheet = {
        id: 's1',
        workbookId: 'wb1',
        name: 'Sheet1',
        index: 0,
        rowCount: 100,
        columnCount: 26,
        cells: {
          [coordToKey(2, 3)]: { value: null, formula: '=ROW()', dataType: 'formula' },    // D3 row 3
          [coordToKey(2, 4)]: { value: null, formula: '=COLUMN()', dataType: 'formula' } // E3 col 5
        }
      } as Sheet;

      const { updatedCells } = engine.recalculateSheet(sheet);
      expect(updatedCells[coordToKey(2, 3)]?.value).toBe(3);
      expect(updatedCells[coordToKey(2, 4)]?.value).toBe(5);
    });
  });

  describe('8. Currency Typing into Cell ($5 -> Number 5 with Currency Format)', () => {
    it('parses $5 into numeric 5 with format "$#,##0"', () => {
      const parsed = parseRawCellValue('$5');
      expect(parsed.value).toBe(5);
      expect(parsed.dataType).toBe('number');
      expect(parsed.format).toBe('"$"#,##0');
    });

    it('parses $5.00 into numeric 5 with format "$#,##0.00"', () => {
      const parsed = parseRawCellValue('$5.00');
      expect(parsed.value).toBe(5);
      expect(parsed.dataType).toBe('number');
      expect(parsed.format).toBe('"$"#,##0.00');
    });

    it('parses -$1,250.75 and ($1,250.75)', () => {
      const parsedNegative = parseRawCellValue('-$1,250.75');
      expect(parsedNegative.value).toBe(-1250.75);
      expect(parsedNegative.dataType).toBe('number');

      const parsedParen = parseRawCellValue('($1,250.75)');
      expect(parsedParen.value).toBe(-1250.75);
      expect(parsedParen.dataType).toBe('number');
    });
  });

  describe('9. COUNTBLANK Bounded Range Accuracy', () => {
    it('counts empty cell in A1:A3 when A1 and A2 have values and A3 is blank', () => {
      const cells: Record<string, Cell> = {
        [coordToKey(0, 0)]: { value: 10, dataType: 'number' }, // A1
        [coordToKey(1, 0)]: { value: 20, dataType: 'number' }, // A2
        // A3 is omitted / empty
      };

      const result = engine.evaluateFormula('=COUNTBLANK(A1:A3)', cells);
      expect(result).toBe(1);
    });

    it('counts all blank cells in an empty range', () => {
      const result = engine.evaluateFormula('=COUNTBLANK(B1:B5)', {});
      expect(result).toBe(5);
    });
  });
});
