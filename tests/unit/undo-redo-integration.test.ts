import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { historyManager } from '@/engine/history/history-manager';
import { useSheetStore } from '@/stores/sheet-store';
import { calculationEngine } from '@/engine/calculation';
import { Sheet } from '@/types/sheet';

describe('Undo / Redo Integration', () => {
  const initialSheet: Sheet = {
    id: 'sheet-test',
    workbookId: 'wb-test',
    name: 'Sheet1',
    index: 0,
    rowCount: 10,
    columnCount: 10,
    cells: {},
  };

  beforeEach(() => {
    historyManager.clear();
    useSheetStore.getState().setActiveSheet({ ...initialSheet });
  });

  afterEach(() => {
    historyManager.clear();
  });

  it('undoes and redoes a cell value edit using setAllCells', async () => {
    const store = useSheetStore.getState();
    const targetCoord = { row: 0, col: 0 }; // A1
    const prevInput = '';
    const currentInput = '=100*25';

    // 1. Commit edit
    const { updatedCells } = calculationEngine.updateCellInput(
      store.activeSheet!.cells,
      targetCoord,
      currentInput
    );
    useSheetStore.getState().setAllCells(updatedCells);

    // Verify cell A1 is calculated
    expect(useSheetStore.getState().activeSheet?.cells['0:0']?.value).toBe(2500);
    expect(useSheetStore.getState().activeSheet?.cells['0:0']?.formula).toBe('=100*25');

    // 2. Register history action
    historyManager.pushAction({
      type: 'cell_edit',
      description: 'Edit A1',
      undo: () => {
        const sheet = useSheetStore.getState().activeSheet;
        if (!sheet) return;
        const { updatedCells: restoredCells } = calculationEngine.updateCellInput(
          sheet.cells,
          targetCoord,
          prevInput
        );
        useSheetStore.getState().setAllCells(restoredCells);
      },
      redo: () => {
        const sheet = useSheetStore.getState().activeSheet;
        if (!sheet) return;
        const { updatedCells: reappliedCells } = calculationEngine.updateCellInput(
          sheet.cells,
          targetCoord,
          currentInput
        );
        useSheetStore.getState().setAllCells(reappliedCells);
      },
    });

    expect(historyManager.canUndo).toBe(true);

    // 3. Undo
    await historyManager.undo();
    expect(useSheetStore.getState().activeSheet?.cells['0:0']).toBeUndefined();
    expect(historyManager.canUndo).toBe(false);
    expect(historyManager.canRedo).toBe(true);

    // 4. Redo
    await historyManager.redo();
    expect(useSheetStore.getState().activeSheet?.cells['0:0']?.value).toBe(2500);
    expect(useSheetStore.getState().activeSheet?.cells['0:0']?.formula).toBe('=100*25');
    expect(historyManager.canUndo).toBe(true);
    expect(historyManager.canRedo).toBe(false);
  });
});
