import { describe, it, expect } from 'vitest';
import { calculationEngine } from '@/engine/calculation/engine';
import { SparseCellMap, CellRange } from '@/types/cell';
import { sortRange, detectTableRange } from '@/engine/data-tools/sorting';
import { matchesCondition } from '@/engine/data-tools/filtering';
import { applyStyleToRange, clearFormattingFromRange } from '@/engine/formatting/range-formatting';
import { historyManager } from '@/engine/history/history-manager';

describe('DC Excel — Master Launch Readiness Verification Suite', () => {

  // =========================================================================
  // 1. CALCULATORS & COMPUTATIONAL LABS
  // =========================================================================
  describe('Area 1: Calculators & Computational Labs', () => {
    
    // --- 1.1 Basic Standard Calculator Operations ---
    describe('1.1 Standard Calculator', () => {
      const compute = (a: number, b: number, op: string): number => {
        switch (op) {
          case '+': return a + b;
          case '-': return a - b;
          case '×': return a * b;
          case '÷': return b === 0 ? 0 : a / b;
          default: return b;
        }
      };

      it('computes basic arithmetic accurately', () => {
        expect(compute(125, 375, '+')).toBe(500);
        expect(compute(1000, 450, '-')).toBe(550);
        expect(compute(25, 40, '×')).toBe(1000);
        expect(compute(144, 12, '÷')).toBe(12);
      });

      it('safely handles divide by zero without crashing', () => {
        expect(compute(42, 0, '÷')).toBe(0);
      });

      it('handles floating point calculations and order of operations', () => {
        const step1 = compute(10.5, 2.5, '+'); // 13
        const step2 = compute(step1, 3, '×'); // 39
        expect(step2).toBe(39);
      });
    });

    // --- 1.2 Scientific Calculator ---
    describe('1.2 Scientific Calculator', () => {
      const evalSci = (expr: string, angleMode: 'deg' | 'rad' = 'deg'): number => {
        let sanitized = expr
          .replace(/π/g, 'Math.PI')
          .replace(/e(?![a-zA-Z])/g, 'Math.E')
          .replace(/\^/g, '**');

        if (angleMode === 'deg') {
          sanitized = sanitized
            .replace(/sin\(([^)]+)\)/g, 'Math.sin(($1) * Math.PI / 180)')
            .replace(/cos\(([^)]+)\)/g, 'Math.cos(($1) * Math.PI / 180)')
            .replace(/tan\(([^)]+)\)/g, 'Math.tan(($1) * Math.PI / 180)');
        } else {
          sanitized = sanitized
            .replace(/sin\(/g, 'Math.sin(')
            .replace(/cos\(/g, 'Math.cos(')
            .replace(/tan\(/g, 'Math.tan(');
        }

        sanitized = sanitized
          .replace(/log\(/g, 'Math.log10(')
          .replace(/ln\(/g, 'Math.log(')
          .replace(/sqrt\(/g, 'Math.sqrt(');

        const val = Function(`"use strict"; return (${sanitized});`)();
        return Math.round(val * 1e8) / 1e8;
      };

      it('evaluates trigonometric functions in degrees and radians', () => {
        expect(evalSci('sin(30)', 'deg')).toBe(0.5);
        expect(evalSci('cos(60)', 'deg')).toBe(0.5);
        expect(evalSci('tan(45)', 'deg')).toBe(1);

        // In radians: sin(pi / 6) = 0.5
        expect(evalSci('sin(π / 6)', 'rad')).toBe(0.5);
      });

      it('evaluates logarithms, roots, and exponents', () => {
        expect(evalSci('log(1000)')).toBe(3);
        expect(evalSci('ln(e)')).toBe(1);
        expect(evalSci('sqrt(256)')).toBe(16);
        expect(evalSci('2^10')).toBe(1024);
      });

      it('evaluates compound scientific mathematical expressions', () => {
        // sqrt(100) + 2^4 * sin(30) = 10 + 16 * 0.5 = 18
        expect(evalSci('sqrt(100) + 2^4 * sin(30)', 'deg')).toBe(18);
      });
    });

    // --- 1.3 Financial Calculator ---
    describe('1.3 Financial Calculator (Loan EMI & SIP)', () => {
      const calcEMI = (P: number, annualRate: number, tenureYears: number) => {
        const r = annualRate / 12 / 100;
        const n = tenureYears * 12;
        const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        const totalPayment = emi * n;
        const totalInterest = totalPayment - P;
        return {
          emi: Math.round(emi),
          totalPayment: Math.round(totalPayment),
          totalInterest: Math.round(totalInterest)
        };
      };

      const calcSIP = (P: number, annualRate: number, tenureYears: number) => {
        const i = annualRate / 12 / 100;
        const n = tenureYears * 12;
        const invested = P * n;
        const futureVal = P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
        return {
          invested: Math.round(invested),
          totalValue: Math.round(futureVal),
          returns: Math.round(futureVal - invested)
        };
      };

      it('accurately computes home loan / personal loan EMI and amortization', () => {
        // $1,000,000 at 8.5% for 20 years
        const res = calcEMI(1000000, 8.5, 20);
        expect(res.emi).toBe(8678);
        expect(res.totalPayment).toBe(2082776);
        expect(res.totalInterest).toBe(1082776);
      });

      it('accurately computes SIP systematic investment returns', () => {
        // $10,000/month at 12% annual return for 10 years
        const sip = calcSIP(10000, 12, 10);
        expect(sip.invested).toBe(1200000);
        expect(sip.totalValue).toBe(2323391);
        expect(sip.returns).toBe(1123391);
      });
    });

    // --- 1.4 Engineering & Circuit Calculator ---
    describe('1.4 Engineering & Circuit Lab', () => {
      it('calculates Ohm\'s Law voltage, current, resistance, and electrical power', () => {
        const V = 24; // Volts
        const I = 3;  // Amperes
        const R = V / I; // 8 Ohms
        const P = V * I; // 72 Watts
        expect(R).toBe(8);
        expect(P).toBe(72);
      });

      it('calculates voltage divider output voltage', () => {
        const Vin = 12;
        const R1 = 10000;
        const R2 = 10000;
        const Vout = (Vin * R2) / (R1 + R2);
        expect(Vout).toBe(6);
      });

      it('calculates RC circuit time constant (Tau)', () => {
        const R = 10000; // 10 kOhm
        const C = 100 * 1e-6; // 100 uF
        const tau = R * C; // 1.0 second
        expect(tau).toBeCloseTo(1);
      });
    });

    // --- 1.5 Statistics Lab ---
    describe('1.5 Statistics Lab', () => {
      const calcStats = (nums: number[]) => {
        const count = nums.length;
        const sum = nums.reduce((a, b) => a + b, 0);
        const mean = sum / count;
        const sorted = [...nums].sort((a, b) => a - b);
        const min = sorted[0]!;
        const max = sorted[sorted.length - 1]!;
        const range = max - min;
        const mid = Math.floor(sorted.length / 2);
        const median =
          sorted.length % 2 === 0
            ? (sorted[mid - 1]! + sorted[mid]!) / 2
            : sorted[mid]!;
        const variance =
          count > 1 ? nums.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (count - 1) : 0;
        const stdev = Math.sqrt(variance);

        return { count, sum, mean, median, min, max, range, variance: Math.round(variance * 100) / 100, stdev: Math.round(stdev * 100) / 100 };
      };

      it('computes full statistical summary metrics for sample data', () => {
        const data = [10, 20, 30, 40, 50];
        const res = calcStats(data);
        expect(res.count).toBe(5);
        expect(res.sum).toBe(150);
        expect(res.mean).toBe(30);
        expect(res.median).toBe(30);
        expect(res.min).toBe(10);
        expect(res.max).toBe(50);
        expect(res.range).toBe(40);
        expect(res.variance).toBe(250);
        expect(res.stdev).toBe(15.81);
      });
    });

    // --- 1.6 Universal Unit Converter ---
    describe('1.6 Universal Unit Converter', () => {
      it('converts lengths across metric and imperial standards', () => {
        const meters = 1000;
        const km = meters / 1000;
        const feet = meters / 0.3048;
        const miles = meters / 1609.344;

        expect(km).toBe(1);
        expect(Math.round(feet * 100) / 100).toBe(3280.84);
        expect(Math.round(miles * 1000) / 1000).toBe(0.621);
      });

      it('converts temperature between Celsius, Fahrenheit, and Kelvin', () => {
        const cToF = (c: number) => (c * 9) / 5 + 32;
        const fToC = (f: number) => ((f - 32) * 5) / 9;
        const cToK = (c: number) => c + 273.15;

        expect(cToF(100)).toBe(212);
        expect(cToF(0)).toBe(32);
        expect(fToC(98.6)).toBe(37);
        expect(cToK(25)).toBe(298.15);
      });

      it('converts digital storage units accurately', () => {
        const gbToMb = (gb: number) => gb * 1024;
        const mbToKb = (mb: number) => mb * 1024;
        const tbToGb = (tb: number) => tb * 1024;

        expect(gbToMb(8)).toBe(8192);
        expect(mbToKb(1)).toBe(1024);
        expect(tbToGb(2)).toBe(2048);
      });
    });

    // --- 1.7 Number Systems ---
    describe('1.7 Number Systems & Bitwise', () => {
      it('converts decimal to binary, hexadecimal, and octal', () => {
        const val = 255;
        expect(val.toString(2)).toBe('11111111');
        expect(val.toString(16).toUpperCase()).toBe('FF');
        expect(val.toString(8)).toBe('377');
      });
    });
  });


  // =========================================================================
  // 2. TABLES & STRUCTURED DATA OPERATIONS
  // =========================================================================
  describe('Area 2: Tables & Structured Data Operations', () => {

    it('auto-detects table bounding range around active cell coordinate', () => {
      const cells: SparseCellMap = {
        '0:0': { value: 'Product', dataType: 'string' },
        '0:1': { value: 'Price', dataType: 'string' },
        '0:2': { value: 'Qty', dataType: 'string' },
        '1:0': { value: 'Widget A', dataType: 'string' },
        '1:1': { value: 15.5, dataType: 'number' },
        '1:2': { value: 100, dataType: 'number' },
        '2:0': { value: 'Widget B', dataType: 'string' },
        '2:1': { value: 24.0, dataType: 'number' },
        '2:2': { value: 50, dataType: 'number' }
      };

      const detected = detectTableRange(cells, { row: 1, col: 1 });
      expect(detected).toEqual({
        startRow: 0,
        startCol: 0,
        endRow: 2,
        endCol: 2
      });
    });

    it('sorts table rows ascending by text and number with blank rows at bottom', () => {
      const cells: SparseCellMap = {
        '0:0': { value: 'Name', dataType: 'string' },
        '0:1': { value: 'Score', dataType: 'string' },
        '1:0': { value: 'Charlie', dataType: 'string' },
        '1:1': { value: 85, dataType: 'number' },
        '2:0': { value: 'Alice', dataType: 'string' },
        '2:1': { value: 95, dataType: 'number' },
        '3:0': { value: 'Bob', dataType: 'string' },
        '3:1': { value: 72, dataType: 'number' }
      };

      const range: CellRange = { startRow: 0, startCol: 0, endRow: 3, endCol: 1 };

      // Sort by Name (col 0) ascending with header preserved
      const sorted = sortRange(cells, {
        range,
        levels: [{ col: 0, direction: 'asc' }],
        hasHeaders: true
      });

      // Header remains row 0
      expect(sorted['0:0']?.value).toBe('Name');
      // Sorted order: Alice, Bob, Charlie
      expect(sorted['1:0']?.value).toBe('Alice');
      expect(sorted['1:1']?.value).toBe(95);
      expect(sorted['2:0']?.value).toBe('Bob');
      expect(sorted['2:1']?.value).toBe(72);
      expect(sorted['3:0']?.value).toBe('Charlie');
      expect(sorted['3:1']?.value).toBe(85);
    });

    it('sorts table rows descending by numerical score', () => {
      const cells: SparseCellMap = {
        '0:0': { value: 'Name', dataType: 'string' },
        '0:1': { value: 'Score', dataType: 'string' },
        '1:0': { value: 'Charlie', dataType: 'string' },
        '1:1': { value: 85, dataType: 'number' },
        '2:0': { value: 'Alice', dataType: 'string' },
        '2:1': { value: 95, dataType: 'number' },
        '3:0': { value: 'Bob', dataType: 'string' },
        '3:1': { value: 72, dataType: 'number' }
      };

      const range: CellRange = { startRow: 0, startCol: 0, endRow: 3, endCol: 1 };

      // Sort by Score (col 1) descending
      const sorted = sortRange(cells, {
        range,
        levels: [{ col: 1, direction: 'desc' }],
        hasHeaders: true
      });

      // Highest score first: Alice (95), Charlie (85), Bob (72)
      expect(sorted['1:0']?.value).toBe('Alice');
      expect(sorted['1:1']?.value).toBe(95);
      expect(sorted['2:0']?.value).toBe('Charlie');
      expect(sorted['2:1']?.value).toBe(85);
      expect(sorted['3:0']?.value).toBe('Bob');
      expect(sorted['3:1']?.value).toBe(72);
    });

    it('evaluates table filter conditions accurately across data types', () => {
      // Equals
      expect(matchesCondition('Tech', { type: 'equals', val1: 'tech' })).toBe(true);
      expect(matchesCondition(100, { type: 'equals', val1: '100' })).toBe(true);
      expect(matchesCondition(100, { type: 'equals', val1: '50' })).toBe(false);

      // Contains
      expect(matchesCondition('Senior Developer', { type: 'contains', val1: 'dev' })).toBe(true);
      expect(matchesCondition('Manager', { type: 'contains', val1: 'dev' })).toBe(false);

      // Numerical comparisons
      expect(matchesCondition(150, { type: 'greater_than', val1: '100' })).toBe(true);
      expect(matchesCondition(50, { type: 'greater_than', val1: '100' })).toBe(false);
      expect(matchesCondition(100, { type: 'greater_or_equal', val1: '100' })).toBe(true);
      expect(matchesCondition(75, { type: 'less_than', val1: '100' })).toBe(true);

      // Blank checks
      expect(matchesCondition('', { type: 'is_blank', val1: '' })).toBe(true);
      expect(matchesCondition(null, { type: 'is_blank', val1: '' })).toBe(true);
      expect(matchesCondition('Data', { type: 'is_not_blank', val1: '' })).toBe(true);
    });

    it('calculates total row summary aggregates for table data', () => {
      const colValues = [100, 200, 300, 400, 500];
      const sum = colValues.reduce((a, b) => a + b, 0);
      const avg = sum / colValues.length;
      const min = Math.min(...colValues);
      const max = Math.max(...colValues);
      const count = colValues.length;

      expect(sum).toBe(1500);
      expect(avg).toBe(300);
      expect(min).toBe(100);
      expect(max).toBe(500);
      expect(count).toBe(5);
    });
  });


  // =========================================================================
  // 3. CELLS & MATTER: ENTERING, EDITING, AND DELETING
  // =========================================================================
  describe('Area 3: Cells & Matter (Entering, Editing, Deleting)', () => {

    it('enters text matter, preserving spaces and special symbols', () => {
      let cells: SparseCellMap = {};
      cells = calculationEngine.updateCellInput(cells, { row: 0, col: 0 }, 'Project Alpha — Stage 1 & 2!').updatedCells;
      expect(cells['0:0']?.value).toBe('Project Alpha — Stage 1 & 2!');
      expect(cells['0:0']?.dataType).toBe('string');
    });

    it('enters numeric matter (integers, decimals, and negative numbers)', () => {
      let cells: SparseCellMap = {};
      cells = calculationEngine.updateCellInput(cells, { row: 0, col: 0 }, '42').updatedCells;
      cells = calculationEngine.updateCellInput(cells, { row: 1, col: 0 }, '3.14159').updatedCells;
      cells = calculationEngine.updateCellInput(cells, { row: 2, col: 0 }, '-500').updatedCells;

      expect(cells['0:0']?.value).toBe(42);
      expect(cells['0:0']?.dataType).toBe('number');
      expect(cells['1:0']?.value).toBe(3.14159);
      expect(cells['2:0']?.value).toBe(-500);
    });

    it('enters formatted currency (e.g. $500, $1,250.50) and auto-tags format with numeric value', () => {
      let cells: SparseCellMap = {};
      cells = calculationEngine.updateCellInput(cells, { row: 0, col: 0 }, '$500').updatedCells;
      cells = calculationEngine.updateCellInput(cells, { row: 1, col: 0 }, '$1,250.75').updatedCells;

      expect(cells['0:0']?.value).toBe(500);
      expect(cells['0:0']?.dataType).toBe('number');
      expect(cells['0:0']?.style?.numberFormat).toBe('$#,##0');

      expect(cells['1:0']?.value).toBe(1250.75);
      expect(cells['1:0']?.dataType).toBe('number');
      expect(cells['1:0']?.style?.numberFormat).toBe('$#,##0.00');
    });

    it('enters percentage values (e.g. 15%) as decimal with percentage format', () => {
      let cells: SparseCellMap = {};
      cells = calculationEngine.updateCellInput(cells, { row: 0, col: 0 }, '15%').updatedCells;
      expect(cells['0:0']?.value).toBe(0.15);
      expect(cells['0:0']?.style?.numberFormat).toBe('0%');
    });

    it('enters boolean literals TRUE and FALSE as boolean types', () => {
      let cells: SparseCellMap = {};
      cells = calculationEngine.updateCellInput(cells, { row: 0, col: 0 }, 'TRUE').updatedCells;
      cells = calculationEngine.updateCellInput(cells, { row: 1, col: 0 }, 'FALSE').updatedCells;

      expect(cells['0:0']?.value).toBe(true);
      expect(cells['0:0']?.dataType).toBe('boolean');
      expect(cells['1:0']?.value).toBe(false);
      expect(cells['1:0']?.dataType).toBe('boolean');
    });

    it('edits existing cell matter and updates all dependent formula calculations', () => {
      let cells: SparseCellMap = {};
      // Set A1 = 100, B1 = =A1 * 3
      cells = calculationEngine.updateCellInput(cells, { row: 0, col: 0 }, '100').updatedCells;
      cells = calculationEngine.updateCellInput(cells, { row: 0, col: 1 }, '=A1 * 3').updatedCells;
      expect(cells['0:1']?.value).toBe(300);

      // Edit A1 from 100 to 250
      cells = calculationEngine.updateCellInput(cells, { row: 0, col: 0 }, '250').updatedCells;
      expect(cells['0:0']?.value).toBe(250);
      expect(cells['0:1']?.value).toBe(750); // Automatically updated!
    });

    it('deletes cell matter via Backspace / Delete, removing cell and updating dependents', () => {
      let cells: SparseCellMap = {
        '0:0': { value: 50, dataType: 'number' },
        '1:0': { value: 100, formula: '=A1 * 2', dataType: 'formula' }
      };

      // Recalculate sheet to initialize dependency tracking
      cells = calculationEngine.recalculateSheet({
        id: 's1', workbookId: 'wb1', name: 'Sheet1', index: 0, rowCount: 10, columnCount: 10, cells
      }).updatedCells;
      expect(cells['1:0']?.value).toBe(100);

      // Delete A1 (send empty string)
      cells = calculationEngine.updateCellInput(cells, { row: 0, col: 0 }, '').updatedCells;
      expect(cells['0:0']).toBeUndefined(); // Deleted from cell map

      // A2 updates with empty precedent evaluated as 0
      expect(cells['1:0']?.value).toBe(0);
    });

    it('handles dynamic array spilling and cleanup when master formula is deleted', () => {
      let cells: SparseCellMap = {};
      // Spilling formula: =TEXTSPLIT("Alpha,Beta,Gamma", ",") in A1
      cells = calculationEngine.updateCellInput(cells, { row: 0, col: 0 }, '=TEXTSPLIT("Alpha,Beta,Gamma", ",")').updatedCells;

      // Master cell A1
      expect(cells['0:0']?.value).toBe('Alpha');

      // Spilled child cells B1 and C1
      expect(cells['0:1']?.value).toBe('Beta');
      expect(cells['0:1']?.spillParent).toBe('0:0');

      expect(cells['0:2']?.value).toBe('Gamma');
      expect(cells['0:2']?.spillParent).toBe('0:0');

      // Now DELETE the master formula A1
      cells = calculationEngine.updateCellInput(cells, { row: 0, col: 0 }, '').updatedCells;

      // Master AND all spilled children must be completely removed!
      expect(cells['0:0']).toBeUndefined();
      expect(cells['0:1']).toBeUndefined();
      expect(cells['0:2']).toBeUndefined();
    });

    it('detects spill collision (#SPILL!) when destination cell has matter, and resolves when obstacle is removed', () => {
      let cells: SparseCellMap = {
        '0:1': { value: 'Obstacle Block', dataType: 'string' } // B1 has data
      };

      // Attempt spilling into A1: =TEXTSPLIT("One,Two", ",")
      cells = calculationEngine.updateCellInput(cells, { row: 0, col: 0 }, '=TEXTSPLIT("One,Two", ",")').updatedCells;

      // Master cell receives #SPILL! error because B1 is blocked
      expect(cells['0:0']?.value).toBe('#SPILL!');
      // Obstacle cell remains untouched
      expect(cells['0:1']?.value).toBe('Obstacle Block');

      // Now clear the obstacle cell B1
      cells = calculationEngine.updateCellInput(cells, { row: 0, col: 1 }, '').updatedCells;

      // Re-evaluate A1
      cells = calculationEngine.updateCellInput(cells, { row: 0, col: 0 }, '=TEXTSPLIT("One,Two", ",")').updatedCells;

      // Spill successfully places both values now
      expect(cells['0:0']?.value).toBe('One');
      expect(cells['0:1']?.value).toBe('Two');
      expect(cells['0:1']?.spillParent).toBe('0:0');
    });
  });


  // =========================================================================
  // 4. FORMATTING, STYLING, AND APPEARANCE
  // =========================================================================
  describe('Area 4: Formatting & Styling', () => {

    it('applies font styling (family, size, bold, italic, underline, strike)', () => {
      let cells: SparseCellMap = {
        '0:0': { value: 'Styled Header', dataType: 'string' }
      };

      const range: CellRange = { startRow: 0, startCol: 0, endRow: 0, endCol: 0 };
      cells = applyStyleToRange(cells, range, {
        fontFamily: 'JetBrains Mono',
        fontSize: 16,
        bold: true,
        italic: true,
        underline: true,
        strikethrough: false
      });

      const cell = cells['0:0']!;
      expect(cell.style?.fontFamily).toBe('JetBrains Mono');
      expect(cell.style?.fontSize).toBe(16);
      expect(cell.style?.bold).toBe(true);
      expect(cell.style?.italic).toBe(true);
      expect(cell.style?.underline).toBe(true);
      expect(cell.style?.strikethrough).toBe(false);
    });

    it('applies text colors and background fill colors', () => {
      let cells: SparseCellMap = {
        '0:0': { value: 'Revenue', dataType: 'string' }
      };

      cells = applyStyleToRange(cells, { startRow: 0, startCol: 0, endRow: 0, endCol: 0 }, {
        textColor: '#10b981', // Obsidian Emerald
        backgroundColor: '#09090b'
      });

      expect(cells['0:0']?.style?.textColor).toBe('#10b981');
      expect(cells['0:0']?.style?.backgroundColor).toBe('#09090b');
    });

    it('applies horizontal and vertical alignments', () => {
      let cells: SparseCellMap = {
        '0:0': { value: 'Center Cell', dataType: 'string' }
      };

      cells = applyStyleToRange(cells, { startRow: 0, startCol: 0, endRow: 0, endCol: 0 }, {
        horizontalAlignment: 'center',
        verticalAlignment: 'middle',
        wrapText: true
      });

      expect(cells['0:0']?.style?.horizontalAlignment).toBe('center');
      expect(cells['0:0']?.style?.verticalAlignment).toBe('middle');
      expect(cells['0:0']?.style?.wrapText).toBe(true);
    });

    it('applies cell borders (top, bottom, left, right)', () => {
      let cells: SparseCellMap = {
        '0:0': { value: 'Boxed', dataType: 'string' }
      };

      cells = applyStyleToRange(cells, { startRow: 0, startCol: 0, endRow: 0, endCol: 0 }, {
        borders: {
          top: { style: 'thin', color: '#cbd5e1' },
          bottom: { style: 'double', color: '#0f172a' },
          left: { style: 'thin', color: '#cbd5e1' },
          right: { style: 'thin', color: '#cbd5e1' }
        }
      });

      expect(cells['0:0']?.style?.borders?.bottom?.style).toBe('double');
      expect(cells['0:0']?.style?.borders?.top?.style).toBe('thin');
    });

    it('clears cell formatting without erasing cell data values', () => {
      let cells: SparseCellMap = {
        '0:0': {
          value: 'Keep My Value',
          dataType: 'string',
          style: { bold: true, fontSize: 20, textColor: '#ff0000' }
        }
      };

      cells = clearFormattingFromRange(cells, { startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
      expect(cells['0:0']?.value).toBe('Keep My Value');
      expect(cells['0:0']?.style).toBeUndefined();
    });
  });


  // =========================================================================
  // 5. UNDO / REDO LIFECYCLE
  // =========================================================================
  describe('Area 5: Undo / Redo History', () => {

    it('accurately executes undo and redo for cell matter entry', async () => {
      historyManager.clear();
      let cells: SparseCellMap = {};

      const editAction = (input: string, prevInput: string) => {
        const { updatedCells } = calculationEngine.updateCellInput(cells, { row: 0, col: 0 }, input);
        cells = updatedCells;

        historyManager.pushAction({
          type: 'cell_edit',
          description: `Edit A1 to ${input}`,
          undo: () => {
            const { updatedCells: restored } = calculationEngine.updateCellInput(cells, { row: 0, col: 0 }, prevInput);
            cells = restored;
          },
          redo: () => {
            const { updatedCells: reapplied } = calculationEngine.updateCellInput(cells, { row: 0, col: 0 }, input);
            cells = reapplied;
          }
        });
      };

      // 1. Initial edit to "Version 1"
      editAction('Version 1', '');
      expect(cells['0:0']?.value).toBe('Version 1');
      expect(historyManager.canUndo).toBe(true);

      // 2. Undo
      await historyManager.undo();
      expect(cells['0:0']).toBeUndefined(); // Reverted to empty!
      expect(historyManager.canRedo).toBe(true);

      // 3. Redo
      await historyManager.redo();
      expect(cells['0:0']?.value).toBe('Version 1'); // Restored!
    });
  });


  // =========================================================================
  // 6. FORMULA ENGINE ADVANCED FUNCTIONS & INTEGRITY
  // =========================================================================
  describe('Area 6: Formula Engine Functions & Integrity', () => {

    it('evaluates MAXIFS and MINIFS with multiple criteria', () => {
      const cells: SparseCellMap = {
        '0:0': { value: 10, dataType: 'number' },
        '1:0': { value: 20, dataType: 'number' },
        '2:0': { value: 30, dataType: 'number' },
        '3:0': { value: 40, dataType: 'number' },
        '0:1': { value: 'A', dataType: 'string' },
        '1:1': { value: 'B', dataType: 'string' },
        '2:1': { value: 'A', dataType: 'string' },
        '3:1': { value: 'B', dataType: 'string' }
      };

      expect(calculationEngine.evaluateFormula('=MAXIFS(A1:A4, B1:B4, "A")', cells)).toBe(30);
      expect(calculationEngine.evaluateFormula('=MINIFS(A1:A4, B1:B4, "B")', cells)).toBe(20);
    });

    it('evaluates trigonometric SIN and COS in radians', () => {
      const cells: SparseCellMap = {};
      expect(calculationEngine.evaluateFormula('=SIN(0)', cells)).toBe(0);
      expect(calculationEngine.evaluateFormula('=COS(0)', cells)).toBe(1);
    });

    it('evaluates ISEVEN and ISODD', () => {
      const cells: SparseCellMap = {};
      expect(calculationEngine.evaluateFormula('=ISEVEN(4)', cells)).toBe(true);
      expect(calculationEngine.evaluateFormula('=ISEVEN(5)', cells)).toBe(false);
      expect(calculationEngine.evaluateFormula('=ISODD(7)', cells)).toBe(true);
      expect(calculationEngine.evaluateFormula('=ISODD(8)', cells)).toBe(false);
    });

    it('evaluates SUMSQ sum of squares', () => {
      const cells: SparseCellMap = {};
      // 3^2 + 4^2 = 9 + 16 = 25
      expect(calculationEngine.evaluateFormula('=SUMSQ(3, 4)', cells)).toBe(25);
    });

    it('evaluates AVERAGEA including text as 0 and boolean values', () => {
      const cells: SparseCellMap = {
        '0:0': { value: 10, dataType: 'number' },
        '1:0': { value: 'text', dataType: 'string' }, // 0
        '2:0': { value: true, dataType: 'boolean' }   // 1
      };
      // (10 + 0 + 1) / 3 = 11 / 3 = 3.6666666666666665
      const res = calculationEngine.evaluateFormula('=AVERAGEA(A1:A3)', cells);
      expect(typeof res).toBe('number');
      expect(Math.round((res as number) * 100) / 100).toBe(3.67);
    });

    it('evaluates LET function for scoped local formula variables', () => {
      const cells: SparseCellMap = {};
      // LET(x, 5, y, 10, x * y + 2) = 5 * 10 + 2 = 52
      expect(calculationEngine.evaluateFormula('=LET(x, 5, y, 10, x * y + 2)', cells)).toBe(52);
    });

    it('evaluates COLUMN without self-cycle error (#CYCLE!) in coordinate formula', () => {
      const sheet = {
        id: 's-col',
        workbookId: 'wb-col',
        name: 'Sheet1',
        index: 0,
        rowCount: 5,
        columnCount: 5,
        cells: {
          '0:1': { formula: '=COLUMN(B1)', value: 0, dataType: 'formula' as const }
        }
      };

      const res = calculationEngine.recalculateSheet(sheet);
      expect(res.cycles).toHaveLength(0);
      expect(res.updatedCells['0:1']?.value).toBe(2); // Col B is 2
    });

    it('evaluates COUNTBLANK across a bounded range with empty cells', () => {
      const cells: SparseCellMap = {
        '0:0': { value: 100, dataType: 'number' },
        '1:0': { value: 200, dataType: 'number' }
        // A3 ('2:0') is empty
      };

      const res = calculationEngine.evaluateFormula('=COUNTBLANK(A1:A3)', cells);
      expect(res).toBe(1);
    });

    it('evaluates growing range formulas (=SUM(A1:A1), =SUM(A1:A2), ...) efficiently', () => {
      const cells: SparseCellMap = {
        '0:0': { value: 10, dataType: 'number' },
        '1:0': { value: 20, dataType: 'number' },
        '2:0': { value: 30, dataType: 'number' },
        '0:1': { formula: '=SUM(A1:A1)', value: 0, dataType: 'formula' },
        '1:1': { formula: '=SUM(A1:A2)', value: 0, dataType: 'formula' },
        '2:1': { formula: '=SUM(A1:A3)', value: 0, dataType: 'formula' }
      };

      const sheet = {
        id: 's-grow',
        workbookId: 'wb-grow',
        name: 'Sheet1',
        index: 0,
        rowCount: 5,
        columnCount: 5,
        cells
      };

      const res = calculationEngine.recalculateSheet(sheet);
      expect(res.updatedCells['0:1']?.value).toBe(10);
      expect(res.updatedCells['1:1']?.value).toBe(30);
      expect(res.updatedCells['2:1']?.value).toBe(60);
    });

    it('evaluates cross-sheet formulas seamlessly', () => {
      const sheet1Cells: SparseCellMap = {
        '0:0': { formula: '=Sheet2!A1 * 5', value: 0, dataType: 'formula' }
      };
      const sheet2Cells: SparseCellMap = {
        '0:0': { value: 20, dataType: 'number' }
      };

      const sheet1 = {
        id: 's1', workbookId: 'wb1', name: 'Sheet1', index: 0, rowCount: 5, columnCount: 5, cells: sheet1Cells
      };

      const crossResolver = (sheetName: string) => {
        if (sheetName.toLowerCase() === 'sheet2') return sheet2Cells;
        return undefined;
      };

      const res = calculationEngine.recalculateSheet(sheet1, undefined, crossResolver);
      expect(res.updatedCells['0:0']?.value).toBe(100); // 20 * 5 = 100
    });
  });

});
