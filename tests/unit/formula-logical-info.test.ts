import { describe, it, expect } from 'vitest';
import { calculationEngine } from '@/engine/calculation/engine';
import { FormulaError } from '@/engine/calculation/errors';
import { Cell } from '@/types/cell';

describe('Logical & Information Functions', () => {
  const cells: Record<string, Cell> = {
    '0:0': { value: 100, dataType: 'number' },
    '1:0': { value: 'Hello', dataType: 'string' },
    '2:0': { value: true, dataType: 'boolean' },
    '3:0': { value: FormulaError.DIV_ZERO, dataType: 'error' },
    '4:0': { value: FormulaError.NA, dataType: 'error' }
    // '5:0' is unpopulated (blank)
  };

  describe('Logical Functions', () => {
    it('evaluates IF with true and false branches', () => {
      expect(calculationEngine.evaluateFormula('=IF(A1 > 50, "Big", "Small")', cells)).toBe('Big');
      expect(calculationEngine.evaluateFormula('=IF(A1 < 50, "Big", "Small")', cells)).toBe('Small');
    });

    it('evaluates AND, OR, NOT, XOR', () => {
      expect(calculationEngine.evaluateFormula('=AND(TRUE, 1 > 0, 5 = 5)', cells)).toBe(true);
      expect(calculationEngine.evaluateFormula('=AND(TRUE, 1 < 0)', cells)).toBe(false);

      expect(calculationEngine.evaluateFormula('=OR(1 < 0, 2 > 10, 5 = 5)', cells)).toBe(true);
      expect(calculationEngine.evaluateFormula('=OR(1 < 0, 2 > 10)', cells)).toBe(false);

      expect(calculationEngine.evaluateFormula('=NOT(TRUE)', cells)).toBe(false);
      expect(calculationEngine.evaluateFormula('=NOT(1 < 0)', cells)).toBe(true);

      // XOR: odd number of true inputs
      expect(calculationEngine.evaluateFormula('=XOR(TRUE, FALSE)', cells)).toBe(true);
      expect(calculationEngine.evaluateFormula('=XOR(TRUE, TRUE)', cells)).toBe(false);
      expect(calculationEngine.evaluateFormula('=XOR(TRUE, TRUE, TRUE)', cells)).toBe(true);
    });

    it('evaluates IFERROR and IFNA error-trapping', () => {
      // IFERROR traps any error
      expect(calculationEngine.evaluateFormula('=IFERROR(10 / 0, "Safe Fallback")', cells)).toBe('Safe Fallback');
      expect(calculationEngine.evaluateFormula('=IFERROR(A4, "Caught")', cells)).toBe('Caught');
      expect(calculationEngine.evaluateFormula('=IFERROR(A1, "Not Error")', cells)).toBe(100);

      // IFNA only traps #N/A errors
      expect(calculationEngine.evaluateFormula('=IFNA(A5, "Caught NA")', cells)).toBe('Caught NA');
      // A4 is #DIV/0!, so IFNA should NOT trap it and should return #DIV/0!
      expect(calculationEngine.evaluateFormula('=IFNA(A4, "Fallback")', cells)).toBe(FormulaError.DIV_ZERO);
    });

    it('evaluates TRUE and FALSE literals', () => {
      expect(calculationEngine.evaluateFormula('=TRUE()', cells)).toBe(true);
      expect(calculationEngine.evaluateFormula('=FALSE()', cells)).toBe(false);
    });
  });

  describe('Information Functions', () => {
    it('evaluates ISBLANK', () => {
      expect(calculationEngine.evaluateFormula('=ISBLANK(A6)', cells)).toBe(true);
      expect(calculationEngine.evaluateFormula('=ISBLANK(A1)', cells)).toBe(false);
    });

    it('evaluates ISNUMBER, ISTEXT, ISLOGICAL', () => {
      expect(calculationEngine.evaluateFormula('=ISNUMBER(A1)', cells)).toBe(true);
      expect(calculationEngine.evaluateFormula('=ISNUMBER(A2)', cells)).toBe(false);

      expect(calculationEngine.evaluateFormula('=ISTEXT(A2)', cells)).toBe(true);
      expect(calculationEngine.evaluateFormula('=ISTEXT(A1)', cells)).toBe(false);

      expect(calculationEngine.evaluateFormula('=ISLOGICAL(A3)', cells)).toBe(true);
      expect(calculationEngine.evaluateFormula('=ISLOGICAL(A1)', cells)).toBe(false);
    });

    it('evaluates ISERROR, ISERR, ISNA', () => {
      // ISERROR returns true for any error (both #DIV/0! and #N/A)
      expect(calculationEngine.evaluateFormula('=ISERROR(A4)', cells)).toBe(true);
      expect(calculationEngine.evaluateFormula('=ISERROR(A5)', cells)).toBe(true);
      expect(calculationEngine.evaluateFormula('=ISERROR(A1)', cells)).toBe(false);

      // ISERR returns true for any error EXCEPT #N/A
      expect(calculationEngine.evaluateFormula('=ISERR(A4)', cells)).toBe(true);
      expect(calculationEngine.evaluateFormula('=ISERR(A5)', cells)).toBe(false);

      // ISNA returns true only for #N/A
      expect(calculationEngine.evaluateFormula('=ISNA(A5)', cells)).toBe(true);
      expect(calculationEngine.evaluateFormula('=ISNA(A4)', cells)).toBe(false);
    });

    it('evaluates TYPE code', () => {
      // 1: number, 2: text, 4: logical, 16: error, 64: array
      expect(calculationEngine.evaluateFormula('=TYPE(A1)', cells)).toBe(1);
      expect(calculationEngine.evaluateFormula('=TYPE(A2)', cells)).toBe(2);
      expect(calculationEngine.evaluateFormula('=TYPE(A3)', cells)).toBe(4);
      expect(calculationEngine.evaluateFormula('=TYPE(A4)', cells)).toBe(16);
    });
  });
});
