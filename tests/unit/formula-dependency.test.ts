import { describe, it, expect, beforeEach } from 'vitest';
import { calculationEngine } from '@/engine/calculation/engine';
import { FormulaError } from '@/engine/calculation/errors';
import { Cell } from '@/types/cell';
import { Sheet } from '@/types/sheet';

describe('Dependency Graph & Automatic Recalculation', () => {
  beforeEach(() => {
    calculationEngine.clear();
  });

  it('updates dependencies and recalculates downstream cells when upstream changes', () => {
    let cells: Record<string, Cell> = {};

    // 1. Enter A1 = 10
    const res1 = calculationEngine.updateCellInput(cells, { row: 0, col: 0 }, '10');
    cells = res1.updatedCells;
    expect(cells['0:0']?.value).toBe(10);

    // 2. Enter A2 = 20
    const res2 = calculationEngine.updateCellInput(cells, { row: 1, col: 0 }, '20');
    cells = res2.updatedCells;
    expect(cells['1:0']?.value).toBe(20);

    // 3. Enter A3 = =A1 + A2 (should be 30)
    const res3 = calculationEngine.updateCellInput(cells, { row: 2, col: 0 }, '=A1 + A2');
    cells = res3.updatedCells;
    expect(cells['2:0']?.value).toBe(30);

    // 4. Enter B1 = =A3 * 2 (should be 60)
    const res4 = calculationEngine.updateCellInput(cells, { row: 0, col: 1 }, '=A3 * 2');
    cells = res4.updatedCells;
    expect(cells['0:1']?.value).toBe(60);

    // 5. Change A1 from 10 to 50:
    // A3 should recalculate to 70 (50 + 20)
    // B1 should recalculate to 140 (70 * 2)
    const res5 = calculationEngine.updateCellInput(cells, { row: 0, col: 0 }, '50');
    cells = res5.updatedCells;

    expect(cells['0:0']?.value).toBe(50);
    expect(cells['2:0']?.value).toBe(70);
    expect(cells['0:1']?.value).toBe(140);
    expect(res5.recalculatedCount).toBe(2);
  });

  it('detects circular references and assigns #CYCLE! without entering infinite loop', () => {
    let cells: Record<string, Cell> = {};

    // A1 = =B1 + 1
    const res1 = calculationEngine.updateCellInput(cells, { row: 0, col: 0 }, '=B1 + 1');
    cells = res1.updatedCells;
    // B1 is empty (0), so A1 evaluates to 1 initially
    expect(cells['0:0']?.value).toBe(1);

    // B1 = =A1 + 1 (Creates circular dependency A1 -> B1 -> A1)
    const res2 = calculationEngine.updateCellInput(cells, { row: 0, col: 1 }, '=A1 + 1');
    cells = res2.updatedCells;

    // Both should safely evaluate to #CYCLE! without stack overflow or freeze
    expect(cells['0:1']?.value).toBe(FormulaError.CYCLE);
    expect(cells['0:1']?.dataType).toBe('error');
    expect(cells['0:0']?.value).toBe(FormulaError.CYCLE);
    expect(cells['0:0']?.dataType).toBe('error');
  });

  it('recalculates full sheet on initial load or reload', () => {
    const rawSheet: Sheet = {
      id: 'sheet-1',
      workbookId: 'wb-1',
      name: 'Sheet1',
      index: 0,
      rowCount: 100,
      columnCount: 26,
      cells: {
        '0:0': { value: 100, dataType: 'number' },
        '1:0': { value: 200, dataType: 'number' },
        '2:0': { value: null, formula: '=SUM(A1:A2)', dataType: 'formula' },
        '0:1': { value: null, formula: '=IF(A3 > 250, "High", "Low")', dataType: 'formula' }
      }
    };

    const { updatedCells, cycles } = calculationEngine.recalculateSheet(rawSheet);

    expect(cycles.length).toBe(0);
    expect(updatedCells['2:0']?.value).toBe(300);
    expect(updatedCells['0:1']?.value).toBe('High');
  });

  it('removes dependencies when a formula is overwritten with a constant', () => {
    let cells: Record<string, Cell> = {};

    // A1 = 10, A2 = =A1 * 2
    cells = calculationEngine.updateCellInput(cells, { row: 0, col: 0 }, '10').updatedCells;
    cells = calculationEngine.updateCellInput(cells, { row: 1, col: 0 }, '=A1 * 2').updatedCells;
    expect(cells['1:0']?.value).toBe(20);

    // Overwrite A2 with constant 999
    cells = calculationEngine.updateCellInput(cells, { row: 1, col: 0 }, '999').updatedCells;
    expect(cells['1:0']?.value).toBe(999);
    expect(cells['1:0']?.formula).toBeUndefined();

    // Now change A1 to 50: A2 should NOT change because dependency was severed!
    cells = calculationEngine.updateCellInput(cells, { row: 0, col: 0 }, '50').updatedCells;
    expect(cells['1:0']?.value).toBe(999);
  });
});
