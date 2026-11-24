import { describe, it, expect } from 'vitest';
import { calculationEngine } from '@/engine/calculation/engine';
import { FormulaError } from '@/engine/calculation/errors';
import { Cell } from '@/types/cell';

describe('Lookup & Reference Functions', () => {
  // Mock dataset:
  // Row 0 (1): A1="ID", B1="Name", C1="Department", D1="Salary"
  // Row 1 (2): A2=101,  B2="Alice", C2="Engineering", D2=95000
  // Row 2 (3): A3=102,  B3="Bob",   C3="Marketing",   D3=75000
  // Row 3 (4): A4=103,  B4="Carol", C4="Sales",       D4=82000
  // Row 4 (5): A5=104,  B5="Dave",  C5="Engineering", D5=110000
  const sampleData: Record<string, Cell> = {
    '0:0': { value: 'ID', dataType: 'string' },
    '0:1': { value: 'Name', dataType: 'string' },
    '0:2': { value: 'Department', dataType: 'string' },
    '0:3': { value: 'Salary', dataType: 'string' },

    '1:0': { value: 101, dataType: 'number' },
    '1:1': { value: 'Alice', dataType: 'string' },
    '1:2': { value: 'Engineering', dataType: 'string' },
    '1:3': { value: 95000, dataType: 'number' },

    '2:0': { value: 102, dataType: 'number' },
    '2:1': { value: 'Bob', dataType: 'string' },
    '2:2': { value: 'Marketing', dataType: 'string' },
    '2:3': { value: 75000, dataType: 'number' },

    '3:0': { value: 103, dataType: 'number' },
    '3:1': { value: 'Carol', dataType: 'string' },
    '3:2': { value: 'Sales', dataType: 'string' },
    '3:3': { value: 82000, dataType: 'number' },

    '4:0': { value: 104, dataType: 'number' },
    '4:1': { value: 'Dave', dataType: 'string' },
    '4:2': { value: 'Engineering', dataType: 'string' },
    '4:3': { value: 110000, dataType: 'number' }
  };

  describe('VLOOKUP', () => {
    it('performs exact match lookup (range_lookup = FALSE or 0)', () => {
      expect(calculationEngine.evaluateFormula('=VLOOKUP(102, A2:D5, 2, FALSE)', sampleData)).toBe('Bob');
      expect(calculationEngine.evaluateFormula('=VLOOKUP(103, A2:D5, 3, 0)', sampleData)).toBe('Sales');
      expect(calculationEngine.evaluateFormula('=VLOOKUP(104, A2:D5, 4, FALSE)', sampleData)).toBe(110000);
    });

    it('returns #N/A when exact match is not found', () => {
      expect(calculationEngine.evaluateFormula('=VLOOKUP(999, A2:D5, 2, FALSE)', sampleData)).toBe(FormulaError.NA);
    });

    it('returns #REF! when colIndex exceeds range column count', () => {
      expect(calculationEngine.evaluateFormula('=VLOOKUP(102, A2:D5, 5, FALSE)', sampleData)).toBe(FormulaError.REF);
    });

    it('performs approximate match on sorted numbers (range_lookup = TRUE or omitted)', () => {
      // 102.5 should match 102
      expect(calculationEngine.evaluateFormula('=VLOOKUP(102.5, A2:D5, 2, TRUE)', sampleData)).toBe('Bob');
      expect(calculationEngine.evaluateFormula('=VLOOKUP(105, A2:D5, 2)', sampleData)).toBe('Dave');
    });

    it('supports wildcard text matching with * and ?', () => {
      // Match by partial name in a table where Name is first column: B2:D5
      expect(calculationEngine.evaluateFormula('=VLOOKUP("Car*", B2:D5, 2, FALSE)', sampleData)).toBe('Sales');
      expect(calculationEngine.evaluateFormula('=VLOOKUP("B?b", B2:D5, 3, FALSE)', sampleData)).toBe(75000);
    });
  });

  describe('HLOOKUP', () => {
    // Horizontal dataset:
    // Row 0: Q1(10), Q2(20), Q3(30), Q4(40)
    // Row 1: Target(100), Target(200), Target(300), Target(400)
    const hData: Record<string, Cell> = {
      '0:0': { value: 'Q1', dataType: 'string' },
      '0:1': { value: 'Q2', dataType: 'string' },
      '0:2': { value: 'Q3', dataType: 'string' },
      '0:3': { value: 'Q4', dataType: 'string' },

      '1:0': { value: 100, dataType: 'number' },
      '1:1': { value: 200, dataType: 'number' },
      '1:2': { value: 300, dataType: 'number' },
      '1:3': { value: 400, dataType: 'number' }
    };

    it('performs horizontal lookup', () => {
      expect(calculationEngine.evaluateFormula('=HLOOKUP("Q3", A1:D2, 2, FALSE)', hData)).toBe(300);
      expect(calculationEngine.evaluateFormula('=HLOOKUP("Q5", A1:D2, 2, FALSE)', hData)).toBe(FormulaError.NA);
      expect(calculationEngine.evaluateFormula('=HLOOKUP("Q1", A1:D2, 3, FALSE)', hData)).toBe(FormulaError.REF);
    });
  });

  describe('XLOOKUP', () => {
    it('performs exact match lookup across disjoint vectors', () => {
      // Look up 103 in A2:A5, return from B2:B5
      expect(calculationEngine.evaluateFormula('=XLOOKUP(103, A2:A5, B2:B5)', sampleData)).toBe('Carol');
      // Reverse lookup: Look up "Carol" in B2:B5, return ID from A2:A5
      expect(calculationEngine.evaluateFormula('=XLOOKUP("Carol", B2:B5, A2:A5)', sampleData)).toBe(103);
    });

    it('returns custom not_found value when lookup fails', () => {
      expect(calculationEngine.evaluateFormula('=XLOOKUP(999, A2:A5, B2:B5, "Not Found")', sampleData)).toBe('Not Found');
    });

    it('supports wildcard search (match_mode = 2)', () => {
      expect(calculationEngine.evaluateFormula('=XLOOKUP("Al*", B2:B5, D2:D5, 0, 2)', sampleData)).toBe(95000);
    });

    it('supports omitted arguments like XLOOKUP(102, A2:A5, B2:B5, , 0)', () => {
      expect(calculationEngine.evaluateFormula('=XLOOKUP(102, A2:A5, B2:B5,, 0)', sampleData)).toBe('Bob');
    });
  });

  describe('INDEX and MATCH', () => {
    it('evaluates MATCH for position', () => {
      // Exact match (0)
      expect(calculationEngine.evaluateFormula('=MATCH(103, A2:A5, 0)', sampleData)).toBe(3);
      expect(calculationEngine.evaluateFormula('=MATCH("Carol", B2:B5, 0)', sampleData)).toBe(3);
      // Wildcard match
      expect(calculationEngine.evaluateFormula('=MATCH("Da*", B2:B5, 0)', sampleData)).toBe(4);
      // Not found
      expect(calculationEngine.evaluateFormula('=MATCH(999, A2:A5, 0)', sampleData)).toBe(FormulaError.NA);
    });

    it('evaluates INDEX with 2D array and row/col indices', () => {
      // Row 2, Col 2 in A2:D5 -> Row 2 is 102/Bob, Col 2 is Bob
      expect(calculationEngine.evaluateFormula('=INDEX(A2:D5, 2, 2)', sampleData)).toBe('Bob');
      expect(calculationEngine.evaluateFormula('=INDEX(A2:D5, 4, 4)', sampleData)).toBe(110000);
    });

    it('evaluates INDEX with 1D vector', () => {
      expect(calculationEngine.evaluateFormula('=INDEX(B2:B5, 1)', sampleData)).toBe('Alice');
      expect(calculationEngine.evaluateFormula('=INDEX(B2:B5, 3)', sampleData)).toBe('Carol');
    });

    it('combines INDEX and MATCH seamlessly', () => {
      // Two-way index match: Look up salary of Carol
      const formula = '=INDEX(D2:D5, MATCH("Carol", B2:B5, 0))';
      expect(calculationEngine.evaluateFormula(formula, sampleData)).toBe(82000);

      // Look up ID for Dave
      const formula2 = '=INDEX(A2:A5, MATCH("Dave", B2:B5, 0))';
      expect(calculationEngine.evaluateFormula(formula2, sampleData)).toBe(104);
    });
  });
});
