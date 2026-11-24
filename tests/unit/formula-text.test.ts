import { describe, it, expect } from 'vitest';
import { calculationEngine } from '@/engine/calculation/engine';
import { FormulaError } from '@/engine/calculation/errors';
import { Cell } from '@/types/cell';

describe('Text Functions', () => {
  const cells: Record<string, Cell> = {
    '0:0': { value: 'Hello World', dataType: 'string' },
    '1:0': { value: '  Spreadsheet  ', dataType: 'string' },
    '2:0': { value: 'quick brown fox', dataType: 'string' },
    '3:0': { value: 'Part-102-X', dataType: 'string' },
    '4:0': { value: 'foo,bar,baz', dataType: 'string' },
    '0:1': { value: 'Apple', dataType: 'string' },
    '1:1': { value: 'Banana', dataType: 'string' },
    '2:1': { value: '', dataType: 'string' },
    '3:1': { value: 'Cherry', dataType: 'string' }
  };

  it('evaluates LEFT, RIGHT, and MID', () => {
    expect(calculationEngine.evaluateFormula('=LEFT(A1, 5)', cells)).toBe('Hello');
    expect(calculationEngine.evaluateFormula('=LEFT(A1)', cells)).toBe('H');
    expect(calculationEngine.evaluateFormula('=RIGHT(A1, 5)', cells)).toBe('World');
    expect(calculationEngine.evaluateFormula('=RIGHT(A1)', cells)).toBe('d');
    expect(calculationEngine.evaluateFormula('=MID(A1, 7, 5)', cells)).toBe('World');
    expect(calculationEngine.evaluateFormula('=MID(A4, 6, 3)', cells)).toBe('102');
  });

  it('evaluates LEN and TRIM', () => {
    expect(calculationEngine.evaluateFormula('=LEN(A1)', cells)).toBe(11);
    expect(calculationEngine.evaluateFormula('=TRIM(A2)', cells)).toBe('Spreadsheet');
  });

  it('evaluates UPPER, LOWER, and PROPER case casing', () => {
    expect(calculationEngine.evaluateFormula('=UPPER(A3)', cells)).toBe('QUICK BROWN FOX');
    expect(calculationEngine.evaluateFormula('=LOWER(A1)', cells)).toBe('hello world');
    expect(calculationEngine.evaluateFormula('=PROPER(A3)', cells)).toBe('Quick Brown Fox');
  });

  it('evaluates CONCAT, CONCATENATE, and TEXTJOIN', () => {
    expect(calculationEngine.evaluateFormula('=CONCATENATE("Omni", "Sheet")', cells)).toBe('OmniSheet');
    expect(calculationEngine.evaluateFormula('=CONCAT(B1:B2)', cells)).toBe('AppleBanana');
    // TEXTJOIN with ignore_empty = TRUE
    expect(calculationEngine.evaluateFormula('=TEXTJOIN(", ", TRUE, B1:B4)', cells)).toBe('Apple, Banana, Cherry');
    // TEXTJOIN with ignore_empty = FALSE
    expect(calculationEngine.evaluateFormula('=TEXTJOIN("-", FALSE, "A", "", "B")', cells)).toBe('A--B');
  });

  it('evaluates SUBSTITUTE and REPLACE', () => {
    expect(calculationEngine.evaluateFormula('=SUBSTITUTE("banana", "a", "o")', cells)).toBe('bonono');
    expect(calculationEngine.evaluateFormula('=SUBSTITUTE("banana", "a", "o", 1)', cells)).toBe('bonana');
    expect(calculationEngine.evaluateFormula('=SUBSTITUTE("banana", "a", "o", 2)', cells)).toBe('banona');
    expect(calculationEngine.evaluateFormula('=REPLACE("abcdef", 3, 2, "ZZ")', cells)).toBe('abZZef');
  });

  it('evaluates FIND and SEARCH', () => {
    // FIND is case-sensitive
    expect(calculationEngine.evaluateFormula('=FIND("World", A1)', cells)).toBe(7);
    expect(calculationEngine.evaluateFormula('=FIND("world", A1)', cells)).toBe(FormulaError.VALUE);
    expect(calculationEngine.evaluateFormula('=FIND("o", A1, 6)', cells)).toBe(8);

    // SEARCH is case-insensitive and supports wildcards
    expect(calculationEngine.evaluateFormula('=SEARCH("world", A1)', cells)).toBe(7);
    expect(calculationEngine.evaluateFormula('=SEARCH("W?rld", A1)', cells)).toBe(7);
    expect(calculationEngine.evaluateFormula('=SEARCH("notfound", A1)', cells)).toBe(FormulaError.VALUE);
  });

  it('evaluates EXACT, REPT, and CLEAN', () => {
    expect(calculationEngine.evaluateFormula('=EXACT("Omni", "Omni")', cells)).toBe(true);
    expect(calculationEngine.evaluateFormula('=EXACT("Omni", "omni")', cells)).toBe(false);
    expect(calculationEngine.evaluateFormula('=REPT("ha", 3)', cells)).toBe('hahaha');

    const controlCell: Record<string, Cell> = {
      '0:0': { value: 'text\x07\x1Fhere', dataType: 'string' }
    };
    expect(calculationEngine.evaluateFormula('=CLEAN(A1)', controlCell)).toBe('texthere');
  });
});
