import { describe, it, expect } from 'vitest';
import { calculationEngine } from '@/engine/calculation/engine';
import { FormulaError } from '@/engine/calculation/errors';
import { Cell } from '@/types/cell';

describe('Formula Evaluator & Built-in Functions', () => {
  it('evaluates arithmetic operations and precedence', () => {
    const emptyCells: Record<string, Cell> = {};
    expect(calculationEngine.evaluateFormula('=10 + 20', emptyCells)).toBe(30);
    expect(calculationEngine.evaluateFormula('=10 * 5', emptyCells)).toBe(50);
    expect(calculationEngine.evaluateFormula('=(10 + 20) * 3', emptyCells)).toBe(90);
    expect(calculationEngine.evaluateFormula('=100 / 5', emptyCells)).toBe(20);
    expect(calculationEngine.evaluateFormula('=2 ^ 3', emptyCells)).toBe(8);
    expect(calculationEngine.evaluateFormula('=10%', emptyCells)).toBe(0.1);
  });

  it('handles division by zero (#DIV/0!)', () => {
    const emptyCells: Record<string, Cell> = {};
    expect(calculationEngine.evaluateFormula('=10 / 0', emptyCells)).toBe(FormulaError.DIV_ZERO);
    expect(calculationEngine.evaluateFormula('=(5 + 5) / (2 - 2)', emptyCells)).toBe(FormulaError.DIV_ZERO);
  });

  it('evaluates comparison operators', () => {
    const cells: Record<string, Cell> = {
      '0:0': { value: 100, dataType: 'number' },
      '0:1': { value: 50, dataType: 'number' },
      '1:0': { value: 'Apple', dataType: 'string' },
      '1:1': { value: 'apple', dataType: 'string' }
    };

    expect(calculationEngine.evaluateFormula('=A1 > B1', cells)).toBe(true);
    expect(calculationEngine.evaluateFormula('=A1 <= 50', cells)).toBe(false);
    expect(calculationEngine.evaluateFormula('=A1 >= 100', cells)).toBe(true);
    expect(calculationEngine.evaluateFormula('=A1 <> B1', cells)).toBe(true);
    // Case-insensitive string equality
    expect(calculationEngine.evaluateFormula('=A2 = B2', cells)).toBe(true);
  });

  it('evaluates text concatenation &', () => {
    const cells: Record<string, Cell> = {
      '0:0': { value: 'Hello', dataType: 'string' },
      '0:1': { value: 'OmniSheet', dataType: 'string' }
    };
    expect(calculationEngine.evaluateFormula('=A1 & " " & B1', cells)).toBe('Hello OmniSheet');
  });

  it('evaluates SUM function with cell references, constants, and ranges', () => {
    const cells: Record<string, Cell> = {
      '0:0': { value: 10, dataType: 'number' },
      '1:0': { value: 20, dataType: 'number' },
      '2:0': { value: 30, dataType: 'number' },
      '0:1': { value: 5, dataType: 'number' },
      '1:1': { value: 15, dataType: 'number' }
    };

    expect(calculationEngine.evaluateFormula('=SUM(A1:A3)', cells)).toBe(60);
    expect(calculationEngine.evaluateFormula('=SUM(A1, A2, A3)', cells)).toBe(60);
    expect(calculationEngine.evaluateFormula('=SUM(A1:A2, B1:B2, 50)', cells)).toBe(100);
  });

  it('evaluates AVERAGE, COUNT, MIN, and MAX', () => {
    const cells: Record<string, Cell> = {
      '0:0': { value: 10, dataType: 'number' },
      '1:0': { value: 20, dataType: 'number' },
      '2:0': { value: 30, dataType: 'number' },
      '3:0': { value: 'Non-numeric text', dataType: 'string' } // should be ignored by stats
    };

    expect(calculationEngine.evaluateFormula('=AVERAGE(A1:A4)', cells)).toBe(20);
    expect(calculationEngine.evaluateFormula('=COUNT(A1:A4)', cells)).toBe(3);
    expect(calculationEngine.evaluateFormula('=MIN(A1:A3)', cells)).toBe(10);
    expect(calculationEngine.evaluateFormula('=MAX(A1:A3)', cells)).toBe(30);
  });

  it('evaluates IF conditional logic and nested IFs', () => {
    const cells: Record<string, Cell> = {
      '0:0': { value: 75, dataType: 'number' },
      '0:1': { value: 20, dataType: 'number' }
    };

    expect(calculationEngine.evaluateFormula('=IF(A1 > 50, "Pass", "Fail")', cells)).toBe('Pass');
    expect(calculationEngine.evaluateFormula('=IF(B1 > 50, "Pass", "Fail")', cells)).toBe('Fail');

    // Nested IF
    const nested = '=IF(A1 > 90, "Grade A", IF(A1 > 70, "Grade B", "Grade C"))';
    expect(calculationEngine.evaluateFormula(nested, cells)).toBe('Grade B');
  });

  it('handles unknown functions with #NAME?', () => {
    const emptyCells: Record<string, Cell> = {};
    expect(calculationEngine.evaluateFormula('=UNKNOWNFUNCTION(1, 2)', emptyCells)).toBe(FormulaError.NAME);
  });
});
