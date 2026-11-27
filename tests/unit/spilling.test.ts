import { describe, it, expect } from 'vitest';
import { CalculationEngine } from '@/engine/calculation/engine';
import { FormulaError } from '@/engine/calculation/errors';
import { Cell } from '@/types/cell';
import { Sheet } from '@/types/sheet';

describe('Dynamic Array Formula Spilling', () => {
  const engine = new CalculationEngine();

  it('spills TEXTSPLIT across columns horizontally', () => {
    const sheet: Sheet = {
      id: 's1',
      workbookId: 'wb1',
      index: 0,
      name: 'Sheet1',
      rowCount: 10,
      columnCount: 10,
      cells: {
        '0:0': { value: null, formula: '=TEXTSPLIT("North,South,East,West", ",")', dataType: 'formula' }
      }
    };

    const { updatedCells } = engine.recalculateSheet(sheet);
    expect(updatedCells['0:0']?.value).toBe('North');
    expect(updatedCells['0:1']?.value).toBe('South');
    expect(updatedCells['0:1']?.spillParent).toBe('0:0');
    expect(updatedCells['0:2']?.value).toBe('East');
    expect(updatedCells['0:2']?.spillParent).toBe('0:0');
    expect(updatedCells['0:3']?.value).toBe('West');
    expect(updatedCells['0:3']?.spillParent).toBe('0:0');
  });

  it('spills SORT vertically down rows', () => {
    const sheet: Sheet = {
      id: 's1',
      workbookId: 'wb1',
      index: 0,
      name: 'Sheet1',
      rowCount: 10,
      columnCount: 10,
      cells: {
        '0:0': { value: 30, dataType: 'number' },
        '1:0': { value: 10, dataType: 'number' },
        '2:0': { value: 20, dataType: 'number' },
        '0:1': { value: null, formula: '=SORT(A1:A3)', dataType: 'formula' }
      }
    };

    const { updatedCells } = engine.recalculateSheet(sheet);
    expect(updatedCells['0:1']?.value).toBe(10);
    expect(updatedCells['1:1']?.value).toBe(20);
    expect(updatedCells['1:1']?.spillParent).toBe('0:1');
    expect(updatedCells['2:1']?.value).toBe(30);
    expect(updatedCells['2:1']?.spillParent).toBe('0:1');
  });

  it('spills UNIQUE values vertically', () => {
    const sheet: Sheet = {
      id: 's1',
      workbookId: 'wb1',
      index: 0,
      name: 'Sheet1',
      rowCount: 10,
      columnCount: 10,
      cells: {
        '0:0': { value: 'Apple', dataType: 'string' },
        '1:0': { value: 'Banana', dataType: 'string' },
        '2:0': { value: 'Apple', dataType: 'string' },
        '3:0': { value: 'Cherry', dataType: 'string' },
        '0:1': { value: null, formula: '=UNIQUE(A1:A4)', dataType: 'formula' }
      }
    };

    const { updatedCells } = engine.recalculateSheet(sheet);
    expect(updatedCells['0:1']?.value).toBe('Apple');
    expect(updatedCells['1:1']?.value).toBe('Banana');
    expect(updatedCells['1:1']?.spillParent).toBe('0:1');
    expect(updatedCells['2:1']?.value).toBe('Cherry');
    expect(updatedCells['2:1']?.spillParent).toBe('0:1');
    expect(updatedCells['3:1']).toBeUndefined();
  });

  it('spills FILTER matching rows across 2D grid', () => {
    const sheet: Sheet = {
      id: 's1',
      workbookId: 'wb1',
      index: 0,
      name: 'Sheet1',
      rowCount: 10,
      columnCount: 10,
      cells: {
        '0:0': { value: 'Alice', dataType: 'string' },
        '0:1': { value: 100, dataType: 'number' },
        '1:0': { value: 'Bob', dataType: 'string' },
        '1:1': { value: 50, dataType: 'number' },
        '2:0': { value: 'Charlie', dataType: 'string' },
        '2:1': { value: 150, dataType: 'number' },
        '0:3': { value: null, formula: '=FILTER(A1:B3, B1:B3 > 75)', dataType: 'formula' }
      }
    };

    const { updatedCells } = engine.recalculateSheet(sheet);
    expect(updatedCells['0:3']?.value).toBe('Alice');
    expect(updatedCells['0:4']?.value).toBe(100);
    expect(updatedCells['0:4']?.spillParent).toBe('0:3');
    expect(updatedCells['1:3']?.value).toBe('Charlie');
    expect(updatedCells['1:3']?.spillParent).toBe('0:3');
    expect(updatedCells['1:4']?.value).toBe(150);
    expect(updatedCells['1:4']?.spillParent).toBe('0:3');
  });

  it('detects collision and returns #SPILL! when a neighbouring cell is blocked', () => {
    const sheet: Sheet = {
      id: 's1',
      workbookId: 'wb1',
      index: 0,
      name: 'Sheet1',
      rowCount: 10,
      columnCount: 10,
      cells: {
        '0:0': { value: null, formula: '=TEXTSPLIT("A,B,C", ",")', dataType: 'formula' },
        '0:2': { value: 'I am blocking C1', dataType: 'string' }
      }
    };

    const { updatedCells } = engine.recalculateSheet(sheet);
    expect(updatedCells['0:0']?.value).toBe(FormulaError.SPILL);
    expect(updatedCells['0:0']?.dataType).toBe('error');
    expect(updatedCells['0:1']).toBeUndefined();
    expect(updatedCells['0:2']?.value).toBe('I am blocking C1');
  });

  it('clears spilled children when anchor formula is deleted or replaced', () => {
    let cells: Record<string, Cell> = {
      '0:0': { value: null, formula: '=TEXTSPLIT("X,Y,Z", ",")', dataType: 'formula' }
    };

    const sheet: Sheet = { id: 's1', workbookId: 'wb1', index: 0, name: 'Sheet1', rowCount: 10, columnCount: 10, cells };
    const { updatedCells } = engine.recalculateSheet(sheet);
    expect(updatedCells['0:1']?.value).toBe('Y');
    expect(updatedCells['0:2']?.value).toBe('Z');

    // Replace A1 with single text 'Done'
    const res = engine.updateCellInput(updatedCells, { row: 0, col: 0 }, 'Done');
    expect(res.updatedCells['0:0']?.value).toBe('Done');
    expect(res.updatedCells['0:1']).toBeUndefined();
    expect(res.updatedCells['0:2']).toBeUndefined();
  });
});
