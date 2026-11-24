import { describe, it, expect } from 'vitest';
import { calculationEngine } from '@/engine/calculation/engine';
import { Cell } from '@/types/cell';

describe('Math & Statistical Functions', () => {
  const numbersData: Record<string, Cell> = {
    '0:0': { value: 10, dataType: 'number' },
    '1:0': { value: 20, dataType: 'number' },
    '2:0': { value: 30, dataType: 'number' },
    '3:0': { value: 40, dataType: 'number' },
    '4:0': { value: 50, dataType: 'number' },
    // Col B: multipliers for SUMPRODUCT
    '0:1': { value: 2, dataType: 'number' },
    '1:1': { value: 3, dataType: 'number' },
    '2:1': { value: 4, dataType: 'number' },
    '3:1': { value: 5, dataType: 'number' },
    '4:1': { value: 6, dataType: 'number' },
    // Mixed column C
    '0:2': { value: 15, dataType: 'number' },
    '1:2': { value: 'Text', dataType: 'string' },
    '2:2': { value: 15, dataType: 'number' },
    '3:2': { value: 25, dataType: 'number' },
    '4:2': { value: '', dataType: 'string' }
  };

  describe('Math Functions', () => {
    it('evaluates rounding functions: ROUND, ROUNDUP, ROUNDDOWN, INT, TRUNC', () => {
      const empty: Record<string, Cell> = {};
      expect(calculationEngine.evaluateFormula('=ROUND(3.14159, 2)', empty)).toBe(3.14);
      expect(calculationEngine.evaluateFormula('=ROUND(3.145, 2)', empty)).toBe(3.15);
      expect(calculationEngine.evaluateFormula('=ROUNDUP(3.141, 2)', empty)).toBe(3.15);
      expect(calculationEngine.evaluateFormula('=ROUNDDOWN(3.149, 2)', empty)).toBe(3.14);
      expect(calculationEngine.evaluateFormula('=INT(-3.7)', empty)).toBe(-4);
      expect(calculationEngine.evaluateFormula('=TRUNC(-3.7)', empty)).toBe(-3);
    });

    it('evaluates ABS, MOD, POWER, SQRT, SIGN', () => {
      const empty: Record<string, Cell> = {};
      expect(calculationEngine.evaluateFormula('=ABS(-42)', empty)).toBe(42);
      expect(calculationEngine.evaluateFormula('=MOD(10, 3)', empty)).toBe(1);
      expect(calculationEngine.evaluateFormula('=POWER(2, 5)', empty)).toBe(32);
      expect(calculationEngine.evaluateFormula('=SQRT(144)', empty)).toBe(12);
      expect(calculationEngine.evaluateFormula('=SIGN(-25)', empty)).toBe(-1);
      expect(calculationEngine.evaluateFormula('=SIGN(50)', empty)).toBe(1);
    });

    it('evaluates logarithmic and exponential functions: PI, EXP, LN, LOG, LOG10, FACT', () => {
      const empty: Record<string, Cell> = {};
      expect(Number(calculationEngine.evaluateFormula('=PI()', empty)).toFixed(4)).toBe('3.1416');
      expect(Number(calculationEngine.evaluateFormula('=EXP(1)', empty)).toFixed(4)).toBe('2.7183');
      expect(calculationEngine.evaluateFormula('=LN(EXP(2))', empty)).toBeCloseTo(2);
      expect(calculationEngine.evaluateFormula('=LOG10(1000)', empty)).toBe(3);
      expect(calculationEngine.evaluateFormula('=LOG(8, 2)', empty)).toBe(3);
      expect(calculationEngine.evaluateFormula('=FACT(5)', empty)).toBe(120);
    });

    it('evaluates PRODUCT and SUMPRODUCT', () => {
      expect(calculationEngine.evaluateFormula('=PRODUCT(A1:A3)', numbersData)).toBe(10 * 20 * 30);
      // SUMPRODUCT: (10*2 + 20*3 + 30*4 + 40*5 + 50*6) = 20 + 60 + 120 + 200 + 300 = 700
      expect(calculationEngine.evaluateFormula('=SUMPRODUCT(A1:A5, B1:B5)', numbersData)).toBe(700);
    });
  });

  describe('Statistical Functions', () => {
    it('evaluates AVERAGE, COUNT, COUNTA, MIN, MAX', () => {
      expect(calculationEngine.evaluateFormula('=AVERAGE(A1:A5)', numbersData)).toBe(30);
      expect(calculationEngine.evaluateFormula('=MIN(A1:A5)', numbersData)).toBe(10);
      expect(calculationEngine.evaluateFormula('=MAX(A1:A5)', numbersData)).toBe(50);
      // COUNT ignores text and blank cells
      expect(calculationEngine.evaluateFormula('=COUNT(C1:C5)', numbersData)).toBe(3);
      // COUNTA counts non-empty cells
      expect(calculationEngine.evaluateFormula('=COUNTA(C1:C4)', numbersData)).toBe(4);
    });

    it('evaluates MEDIAN, MODE, LARGE, SMALL', () => {
      // A1:A5 = [10, 20, 30, 40, 50], median is 30
      expect(calculationEngine.evaluateFormula('=MEDIAN(A1:A5)', numbersData)).toBe(30);
      // C1:C4 has 15, 'Text', 15, 25 -> Mode is 15
      expect(calculationEngine.evaluateFormula('=MODE(C1:C4)', numbersData)).toBe(15);
      // LARGE(A1:A5, 2) is 40
      expect(calculationEngine.evaluateFormula('=LARGE(A1:A5, 2)', numbersData)).toBe(40);
      // SMALL(A1:A5, 2) is 20
      expect(calculationEngine.evaluateFormula('=SMALL(A1:A5, 2)', numbersData)).toBe(20);
    });

    it('evaluates STDEV, STDEVP, VAR, VARP, RANK, PERCENTILE, QUARTILE', () => {
      // Sample [10, 20, 30, 40, 50]
      // Mean = 30, Var = ((20^2 + 10^2 + 0 + 10^2 + 20^2)/4) = 1000/4 = 250
      expect(calculationEngine.evaluateFormula('=VAR(A1:A5)', numbersData)).toBe(250);
      expect(calculationEngine.evaluateFormula('=VARP(A1:A5)', numbersData)).toBe(200);
      expect(calculationEngine.evaluateFormula('=STDEV(A1:A5)', numbersData)).toBeCloseTo(Math.sqrt(250));
      expect(calculationEngine.evaluateFormula('=STDEVP(A1:A5)', numbersData)).toBeCloseTo(Math.sqrt(200));

      // RANK of 40 in A1:A5 descending (default 0) is 2
      expect(calculationEngine.evaluateFormula('=RANK(40, A1:A5)', numbersData)).toBe(2);
      // RANK of 40 in A1:A5 ascending (order 1) is 4
      expect(calculationEngine.evaluateFormula('=RANK(40, A1:A5, 1)', numbersData)).toBe(4);

      // PERCENTILE and QUARTILE
      expect(calculationEngine.evaluateFormula('=QUARTILE(A1:A5, 2)', numbersData)).toBe(30);
      expect(calculationEngine.evaluateFormula('=PERCENTILE(A1:A5, 0.5)', numbersData)).toBe(30);
    });
  });
});
