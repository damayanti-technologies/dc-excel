import { describe, it, expect, beforeEach } from 'vitest';
import { workbookService } from '@/services';
import { sheetRepository } from '@/storage/repositories/sheet-repository';
import { clearAllStores } from '@/storage/indexeddb/database';
import { calculationEngine } from '@/engine/calculation';
import { Sheet } from '@/types/sheet';

describe('Formula Persistence & Recovery', () => {
  beforeEach(async () => {
    await clearAllStores();
    calculationEngine.clear();
  });

  it('persists formula sources and calculated results into IndexedDB and restores them on load', async () => {
    const { initialSheet } = await workbookService.createWorkbook('Formula Test Workbook');

    // Simulate user editing cells A1, A2, and A3
    let cells = initialSheet.cells;
    cells = calculationEngine.updateCellInput(cells, { row: 0, col: 0 }, '100').updatedCells;
    cells = calculationEngine.updateCellInput(cells, { row: 1, col: 0 }, '200').updatedCells;
    cells = calculationEngine.updateCellInput(cells, { row: 2, col: 0 }, '=SUM(A1:A2)').updatedCells;

    const sheetToSave: Sheet = {
      ...initialSheet,
      cells
    };

    // Save to IndexedDB
    await sheetRepository.save(sheetToSave);

    // Retrieve from IndexedDB as if opening after page reload
    const restoredSheet = await sheetRepository.getById(initialSheet.id);
    expect(restoredSheet).not.toBeNull();
    expect(restoredSheet!.cells['0:0']?.value).toBe(100);
    expect(restoredSheet!.cells['1:0']?.value).toBe(200);
    expect(restoredSheet!.cells['2:0']?.formula).toBe('=SUM(A1:A2)');
    expect(restoredSheet!.cells['2:0']?.value).toBe(300);

    // Now modify A1 in storage and test full recalculation recovery
    restoredSheet!.cells['0:0'] = { value: 500, dataType: 'number' };
    const { updatedCells, cycles } = calculationEngine.recalculateSheet(restoredSheet!);

    expect(cycles.length).toBe(0);
    expect(updatedCells['0:0']?.value).toBe(500);
    expect(updatedCells['2:0']?.value).toBe(700); // 500 + 200
  });
});
