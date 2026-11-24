import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { recoveryService } from '@/services/recovery-service';
import { clearAllStores, closeDatabase } from '@/storage/indexeddb/database';
import { workbookRepository } from '@/storage/repositories/workbook-repository';
import { sheetRepository } from '@/storage/repositories/sheet-repository';
import { Workbook } from '@/types/workbook';
import { Sheet } from '@/types/sheet';

describe('RecoveryService (Crash Recovery & Checkpointing)', () => {
  const mockWorkbook: Workbook = {
    id: 'wb-crash-test',
    name: 'Crashed Financial Model',
    sheetIds: ['sheet-crash-1'],
    activeSheetId: 'sheet-crash-1',
    createdAt: 1000,
    updatedAt: 1000,
    revision: 2,
  };

  const mockSheet: Sheet = {
    id: 'sheet-crash-1',
    workbookId: 'wb-crash-test',
    name: 'Q3 Summary',
    index: 0,
    rowCount: 20,
    columnCount: 10,
    cells: {
      '0:0': { value: 'Revenue', dataType: 'string' },
      '0:1': { value: 500000, dataType: 'number' },
    },
  };

  beforeEach(async () => {
    await clearAllStores();
  });

  afterEach(async () => {
    await clearAllStores();
    await closeDatabase();
  });

  it('saves an uncommitted recovery checkpoint marked as dirty', async () => {
    await recoveryService.saveCheckpoint(mockWorkbook, [mockSheet], 3);

    const recovery = await recoveryService.checkRecovery('wb-crash-test');
    expect(recovery).not.toBeNull();
    expect(recovery?.workbookId).toBe('wb-crash-test');
    expect(recovery?.workbookName).toBe('Crashed Financial Model');
    expect(recovery?.pendingChangeCount).toBe(3);
    expect(recovery?.isDirty).toBe(true);
    expect(recovery?.sheetsSnapshot.length).toBe(1);
    expect(recovery?.sheetsSnapshot[0]!.cells['0:1']!.value).toBe(500000);
  });

  it('lists all pending uncommitted recoveries across workbooks', async () => {
    const wb2: Workbook = { ...mockWorkbook, id: 'wb-crash-2', name: 'Second Crashed' };
    await recoveryService.saveCheckpoint(mockWorkbook, [mockSheet], 1);
    await recoveryService.saveCheckpoint(wb2, [mockSheet], 2);

    const pending = await recoveryService.getAllPendingRecoveries();
    expect(pending.length).toBe(2);
    expect(pending.map((r) => r.workbookId)).toContain('wb-crash-test');
    expect(pending.map((r) => r.workbookId)).toContain('wb-crash-2');
  });

  it('restores recovery checkpoint into primary repositories and clears dirty state', async () => {
    await recoveryService.saveCheckpoint(mockWorkbook, [mockSheet], 5);

    const restored = await recoveryService.restoreRecovery('wb-crash-test');
    expect(restored).not.toBeNull();
    expect(restored?.workbook.name).toBe('Crashed Financial Model');
    expect(restored?.sheets.length).toBe(1);

    // Verify it was committed to workbookRepository and sheetRepository
    const inDbWb = await workbookRepository.getById('wb-crash-test');
    expect(inDbWb).not.toBeNull();
    expect(inDbWb?.name).toBe('Crashed Financial Model');

    const inDbSheets = await sheetRepository.getByWorkbookId('wb-crash-test');
    expect(inDbSheets.length).toBe(1);

    // Verify recovery record was cleared
    const remaining = await recoveryService.checkRecovery('wb-crash-test');
    expect(remaining).toBeNull();
  });

  it('discards recovery checkpoint when user rejects recovery', async () => {
    await recoveryService.saveCheckpoint(mockWorkbook, [mockSheet], 1);

    expect(await recoveryService.checkRecovery('wb-crash-test')).not.toBeNull();

    await recoveryService.discardRecovery('wb-crash-test');

    expect(await recoveryService.checkRecovery('wb-crash-test')).toBeNull();
  });
});
