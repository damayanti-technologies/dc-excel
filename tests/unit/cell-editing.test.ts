import { describe, it, expect } from 'vitest';
import { useSelectionStore } from '@/stores/selection-store';
import { calculationEngine } from '@/engine/calculation';
import { Cell } from '@/types/cell';

describe('Cell Editing & Formula Bar Synchronization', () => {
  it('starts editing with initial value and updates editingValue in store', () => {
    const store = useSelectionStore.getState();

    // Select cell B2 (row 1, col 1)
    store.setActiveCell({ row: 1, col: 1 });
    expect(useSelectionStore.getState().activeCell).toEqual({ row: 1, col: 1 });
    expect(useSelectionStore.getState().editingCell).toBeNull();

    // Start editing with typing "=SUM("
    store.startEditing({ row: 1, col: 1 }, '=SUM(');
    expect(useSelectionStore.getState().editingCell).toEqual({ row: 1, col: 1 });
    expect(useSelectionStore.getState().editingValue).toBe('=SUM(');

    // Update value as user types
    store.setEditingValue('=SUM(A1:A5)');
    expect(useSelectionStore.getState().editingValue).toBe('=SUM(A1:A5)');

    // Stop editing
    store.stopEditing();
    expect(useSelectionStore.getState().editingCell).toBeNull();
    expect(useSelectionStore.getState().editingValue).toBe('');
  });

  it('cancels editing on stopEditing without persisting temporary value', () => {
    const store = useSelectionStore.getState();
    store.setActiveCell({ row: 0, col: 0 });

    store.startEditing({ row: 0, col: 0 }, 'Draft Text');
    expect(useSelectionStore.getState().editingValue).toBe('Draft Text');

    // Cancel edit
    store.stopEditing();
    expect(useSelectionStore.getState().editingCell).toBeNull();
  });

  it('simulates editing commit workflow updating cell data and recalculating dependents', () => {
    let cells: Record<string, Cell> = {};

    // 1. User enters A1 = 150
    cells = calculationEngine.updateCellInput(cells, { row: 0, col: 0 }, '150').updatedCells;
    expect(cells['0:0']?.value).toBe(150);
    expect(cells['0:0']?.dataType).toBe('number');

    // 2. User enters A2 = 250
    cells = calculationEngine.updateCellInput(cells, { row: 1, col: 0 }, '250').updatedCells;
    expect(cells['1:0']?.value).toBe(250);

    // 3. User enters A3 = =SUM(A1:A2)
    cells = calculationEngine.updateCellInput(cells, { row: 2, col: 0 }, '=SUM(A1:A2)').updatedCells;
    expect(cells['2:0']?.value).toBe(400);
    expect(cells['2:0']?.formula).toBe('=SUM(A1:A2)');

    // 4. User edits A1 to 1000
    cells = calculationEngine.updateCellInput(cells, { row: 0, col: 0 }, '1000').updatedCells;
    expect(cells['0:0']?.value).toBe(1000);
    expect(cells['2:0']?.value).toBe(1250); // 1000 + 250
  });

  it('clears cell content when user presses Delete / Backspace', () => {
    let cells: Record<string, Cell> = {
      '0:0': { value: 100, dataType: 'number' },
      '1:0': { value: 200, formula: '=A1 * 2', dataType: 'formula' }
    };

    // Recalculate sheet to initialize dependencies
    cells = calculationEngine.recalculateSheet({
      id: 's1',
      workbookId: 'w1',
      name: 'Sheet1',
      index: 0,
      rowCount: 10,
      columnCount: 10,
      cells
    }).updatedCells;

    expect(cells['1:0']?.value).toBe(200);

    // Clear A1 (empty string)
    cells = calculationEngine.updateCellInput(cells, { row: 0, col: 0 }, '').updatedCells;
    expect(cells['0:0']).toBeUndefined();

    // A2 should recalculate with A1 being empty (0) -> 0 * 2 = 0
    expect(cells['1:0']?.value).toBe(0);
  });
});
